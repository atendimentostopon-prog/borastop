'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import Scoreboard from "@/components/game/Scoreboard";
import ChatBox from "@/components/game/ChatBox";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TimerBar from "@/components/game/TimerBar";
import CategoryInput from "@/components/game/CategoryInput";
import LetterIntro from "@/components/ui/LetterIntro";
import AdPlaceholder from "@/components/game/AdPlaceholder";
import ValidationConfirmStatus from "@/components/game/ValidationConfirmStatus";
import { useToast } from "@/components/ui/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { Player, ChatMessage, Room } from "@/types/game";
import { getRandomLetter } from "@/lib/game/letters";
import { MOCK_PLAYERS } from "@/lib/mock/players";
import { MOCK_MESSAGES } from "@/lib/mock/messages";
import { MOCK_CATEGORIES } from "@/lib/mock/categories";
import { audioSystem } from "@/lib/audio";
import { calculateCategoryAnswerUpdates, calculateScoresByPlayer } from "@/lib/game/scoring";
import { autoValidateAnswer } from "@/lib/game/autoValidator";

// Helper com cast para 'any' para evitar o erro de inferência 'never' do Supabase v2 com strict mode
const db = supabase as any;

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoundRow = Database['public']['Tables']['rounds']['Row'];
type PlayerRow = Database['public']['Tables']['room_players']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type AnswerRow = Database['public']['Tables']['answers']['Row'];
type ValidationVoteRow = Database['public']['Tables']['validation_votes']['Row'];
type ValidationConfirmRow = Database['public']['Tables']['validation_confirmations']['Row'];

export default function GamePage({ params }: { params: Promise<{ code: string }> | { code: string } }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [code, setCode] = useState<string>("");
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [round, setRound] = useState<RoundRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLetterIntro, setShowLetterIntro] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  
  // Estado para Fase de Validação Social (Fase 4)
  const [allAnswers, setAllAnswers] = useState<AnswerRow[]>([]);
  const [validationVotes, setValidationVotes] = useState<ValidationVoteRow[]>([]);
  const [myConfirmations, setMyConfirmations] = useState<Record<string, boolean>>({});
  const [allConfirmations, setAllConfirmations] = useState<ValidationConfirmRow[]>([]);

  // Refs para Realtime
  const roomRef = useRef<RoomRow | null>(null);
  const roundRef = useRef<RoundRow | null>(null);
  const playersRef = useRef<Player[]>([]);

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setCode(resolvedParams.code);
    }
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!code) return;

    const nickname = localStorage.getItem('stopon_nickname');
    if (!nickname) { router.push('/'); return; }

    const initializeGame = async () => {
      if (!isSupabaseConfigured) {
        setPlayers(MOCK_PLAYERS);
        setCategories(MOCK_CATEGORIES.slice(0, 6).map((c, i) => ({ id: i.toString(), name: c, created_at: '' })));
        setLoading(false);
        return;
      }

      try {
        const { data: rm } = await db.from('rooms').select('*').eq('code', code).single();
        if (!rm) { router.push('/rooms'); return; }
        setRoom(rm); roomRef.current = rm;

        const { data: rd } = await db.from('rounds').select('*').eq('room_id', rm.id).order('round_number', { ascending: false }).limit(1).single();
        if (!rd) { router.push(`/lobby/${code}`); return; }
        setRound(rd); roundRef.current = rd;
        if (rd.status === 'playing') setShowLetterIntro(true);

        const { data: cats } = await db.from('room_categories').select('categories(*)').eq('room_id', rm.id);
        if (cats) setCategories((cats as any[]).map(c => c.categories));

        const { data: ps } = await db.from('room_players').select('*').eq('room_id', rm.id);
        if (ps) {
          const formatted = (ps as PlayerRow[]).map(p => ({
            id: p.id, name: p.nickname, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.nickname}`,
            isReady: p.is_ready, isHost: p.is_host, score: p.score
          }));
          setPlayers(formatted); playersRef.current = formatted;
          const me = (ps as PlayerRow[]).find(p => p.nickname === nickname);
          if (me) { setLocalPlayerId(me.id); setIsHost(me.is_host); }
        }

        if (rd.status === 'reviewing' || rd.status === 'finished') {
           fetchReviewData(rd.id, rm.id);
        }

        const channel = supabase.channel(`game:${code}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${rd.id}` }, (payload) => {
            const nextRound = payload.new as RoundRow;
            setRound(nextRound); roundRef.current = nextRound;
            if (nextRound.status === 'stopped') {
               audioSystem.play('stop_button');
               addToast("STOP! Alguém parou o jogo!", 'warning');
               saveMyAnswers(nextRound.id, localPlayerId!);
            }
            if (nextRound.status === 'reviewing') {
               fetchReviewData(nextRound.id, rm.id);
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'validation_votes', filter: `round_id=eq.${rd.id}` }, () => {
             fetchReviewData(roundRef.current!.id, roomRef.current!.id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'validation_confirmations', filter: `round_id=eq.${rd.id}` }, () => {
             fetchReviewData(roundRef.current!.id, roomRef.current!.id);
          })
          .subscribe();

        setLoading(false);
        return () => { supabase.removeChannel(channel); };
      } catch (err) { console.error(err); setLoading(false); }
    };

    initializeGame();
  }, [code, router]);

  const fetchReviewData = async (roundId: string, roomId: string) => {
    const { data: ans } = await db.from('answers').select('*').eq('round_id', roundId);
    if (ans) setAllAnswers(ans as AnswerRow[]);

    const { data: vts } = await db.from('validation_votes').select('*').eq('round_id', roundId);
    if (vts) setValidationVotes(vts as ValidationVoteRow[]);

    const { data: cfms } = await db.from('validation_confirmations').select('*').eq('round_id', roundId);
    if (cfms) setAllConfirmations(cfms as ValidationConfirmRow[]);
  };

  const saveMyAnswers = async (roundId: string, playerId: string) => {
    const entries = Object.entries(myAnswers).map(([catId, val]) => ({
      round_id: roundId,
      player_id: playerId,
      category_id: catId,
      answer_text: val,
      normalized_answer: val.trim().toLowerCase()
    }));
    await db.from('answers').upsert(entries, { onConflict: 'round_id,player_id,category_id' });
  };

  const handleStop = async () => {
    if (!round || !localPlayerId) return;
    await db.from('rounds').update({ status: 'stopped', stopped_by: localPlayerId }).eq('id', round.id);
  };

  const submitVote = async (catId: string, normalizedAnswer: string, vote: 'valid' | 'invalid') => {
    if (!round || !localPlayerId) return;
    const voteData = { round_id: round.id, category_id: catId, normalized_answer: normalizedAnswer, voter_id: localPlayerId, vote };
    await db.from('validation_votes').upsert(voteData, { onConflict: 'round_id,category_id,normalized_answer,voter_id' });
  };

  const confirmCategoryValidation = async (catId: string) => {
    if (!round || !localPlayerId) return;
    await db.from('validation_confirmations').upsert({ round_id: round.id, category_id: catId, player_id: localPlayerId });
    setMyConfirmations(prev => ({ ...prev, [catId]: true }));
    
    // Checar se todos confirmaram essa categoria
    const { data: cfms } = await db.from('validation_confirmations').select('player_id').eq('round_id', round.id).eq('category_id', catId);
    const activePlayers = playersRef.current.length;
    if (cfms && cfms.length >= activePlayers) {
       advanceValidation();
    }
  };

  const advanceValidation = async () => {
    if (!isHost) return;
    const r = roundRef.current; if (!r) return;
    const nextIndex = (r.validation_category_index || 0) + 1;
    
    if (nextIndex < categories.length) {
      await db.from('rounds')
        .update({ 
          validation_category_index: nextIndex, 
          validation_started_at: new Date().toISOString() 
        })
        .eq('id', r.id);
    } else {
        audioSystem.play('round_end');
        addToast("Rodada finalizada!", 'success');
        await db.from('rounds')
          .update({ status: 'finished' })
          .eq('id', r.id);
        
      // Se for a última rodada da sala, já podemos marcar a sala como finished também? 
      // O prompt diz que o host clica em "Ver Ranking Final" que leva pros resultados.
    }
  };

  const startNextRound = async () => {
    const rm = roomRef.current; const r = roundRef.current;
    if (!rm || !r) return;
    if (rm.current_round >= rm.total_rounds) { 
      await db.from('rooms').update({ status: 'finished' }).eq('id', rm.id); 
      router.push(`/results/${code}`); 
      return; 
    }
    const { data: rdsRaw } = await db.from('rounds').select('letter').eq('room_id', rm.id);
    const used = (rdsRaw as { letter: string }[] | null)?.map((x) => x.letter) ?? [];
    const letter = getRandomLetter(rm.allowed_letters || [], used);
    const next = rm.current_round + 1;
    await db.from('rounds').insert({ room_id: rm.id, round_number: next, letter, status: 'playing', started_at: new Date().toISOString() });
    await db.from('rooms').update({ status: 'playing', current_round: next }).eq('id', rm.id);
  };

  if (loading || !room || !round) return <div className="flex items-center justify-center min-h-[50vh]"><div className="text-white/50 animate-pulse text-xl">Carregando...</div></div>;

  const isPlaying = round.status === 'playing';
  const isReviewing = round.status === 'reviewing';
  const isFinished = round.status === 'finished';
  const currentCat = categories[round.validation_category_index || 0];

  return (
    <PageContainer>
       <AnimatePresence>
        {showLetterIntro && (
          <LetterIntro 
            letter={round.letter} 
            onComplete={() => { setShowLetterIntro(false); audioSystem.play('game_start'); }} 
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4">
        {/* Header do Jogo */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-yellow rounded-2xl flex items-center justify-center text-brand-purple text-4xl font-black italic shadow-lg rotate-3">
              {round.letter}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic leading-none">{room.name}</h1>
              <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Rodada {round.round_number}/{room.total_rounds}</span>
            </div>
          </div>
          
          <div className="flex-grow max-w-md w-full">
            <TimerBar active={isPlaying} duration={60} onTimeUp={handleStop} />
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-black/20 px-4 py-2 rounded-xl border border-white/5 flex flex-col items-center">
              <span className="text-[10px] font-bold text-white/40 uppercase">Status</span>
              <span className="text-xs font-black text-brand-yellow uppercase italic">{round.status}</span>
            </div>
            <Button variant="outline" className="hidden md:flex" onClick={() => router.push('/rooms')}>Sair</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Central: Jogo ou Validação */}
          <div className="lg:col-span-8 space-y-6">
            {isPlaying ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat, idx) => (
                  <motion.div key={cat.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                    <CategoryInput 
                      category={cat.name} 
                      letter={round.letter}
                      value={myAnswers[cat.id] || ''}
                      onChange={(val) => setMyAnswers(prev => ({ ...prev, [cat.id]: val }))}
                    />
                  </motion.div>
                ))}
                <div className="md:col-span-2 mt-4">
                  <Button fullWidth size="lg" variant="primary" className="h-20 text-2xl shadow-[0_8px_0_#B8860B]" onClick={handleStop}>STOP!</Button>
                </div>
              </div>
            ) : isReviewing && currentCat ? (
              <Card className="p-8 border-brand-purple/50 bg-brand-card/90 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={120} /></div>
                <div className="text-center mb-8 relative">
                  <span className="text-sm font-bold text-brand-yellow uppercase tracking-[0.3em]">Validando Categoria</span>
                  <h2 className="text-5xl font-black uppercase italic text-white my-2">{currentCat.name}</h2>
                </div>

                {/* Lista de Respostas Únicas para Votação */}
                <div className="space-y-4 mb-8">
                   {Array.from(new Set(allAnswers.filter(a => a.category_id === currentCat.id).map(a => a.normalized_answer))).map((normAns) => {
                      const votesForThis = validationVotes.filter(v => v.category_id === currentCat.id && v.normalized_answer === normAns);
                      const myVote = votesForThis.find(v => v.voter_id === localPlayerId)?.vote;
                      const validCount = votesForThis.filter(v => v.vote === 'valid').length;
                      const invalidCount = votesForThis.filter(v => v.vote === 'invalid').length;
                      const totalPossible = players.length;

                      return (
                        <div key={normAns} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-brand-yellow font-black uppercase">{round.letter}</div>
                            <span className="text-2xl font-black uppercase">{normAns || <em className="text-white/20">Vazio</em>}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                                onClick={() => submitVote(currentCat.id, normAns, 'invalid')}
                                className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-all ${myVote === 'invalid' ? 'bg-red-500 border-red-400 text-white shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                             >
                               <AlertCircle size={18} /> {invalidCount}
                             </button>
                             <button 
                                onClick={() => submitVote(currentCat.id, normAns, 'valid')}
                                className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-all ${myVote === 'valid' ? 'bg-green-500 border-green-400 text-white shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                             >
                               <CheckCircle2 size={18} /> {validCount}
                             </button>
                          </div>
                        </div>
                      );
                   })}
                </div>

                <div className="flex flex-col items-center gap-4 border-t border-white/10 pt-8">
                   <ValidationConfirmStatus 
                      players={players} 
                      confirmations={allConfirmations.filter(c => c.category_id === currentCat.id)} 
                   />
                   <Button 
                      size="lg" 
                      className="px-12 h-16 shadow-xl"
                      variant={myConfirmations[currentCat.id] ? 'secondary' : 'primary'}
                      onClick={() => confirmCategoryValidation(currentCat.id)}
                      disabled={myConfirmations[currentCat.id]}
                   >
                     {myConfirmations[currentCat.id] ? 'Aguardando outros...' : 'Confirmar Avaliação'}
                   </Button>
                </div>
              </Card>
            ) : isFinished ? (
              <Card className="p-12 text-center space-y-6 bg-brand-card/90 border-brand-yellow/30">
                 <Trophy className="mx-auto text-brand-yellow animate-bounce" size={80} />
                 <h2 className="text-4xl font-black uppercase italic">Rodada Finalizada!</h2>
                 <p className="text-white/60">Todos os pontos foram calculados e sincronizados.</p>
                 <div className="flex justify-center gap-4">
                    {isHost ? (
                      <Button size="lg" onClick={startNextRound}>Próxima Rodada</Button>
                    ) : (
                      <div className="text-sm font-bold text-brand-yellow uppercase animate-pulse">Aguardando Host...</div>
                    )}
                 </div>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 bg-black/20 rounded-3xl border border-white/5 italic text-white/30 font-bold uppercase tracking-widest">
                Aguardando finalização do round...
              </div>
            )}
          </div>

          {/* Lateral: Score e Chat */}
          <div className="lg:col-span-4 space-y-6">
            <Scoreboard players={players} />
            <ChatBox messages={messages} onSendMessage={() => {}} className="h-[300px]" />
            <AdPlaceholder type="rectangle" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
