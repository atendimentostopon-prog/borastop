'use client';

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, Zap, Timer, Trophy, MessageSquare, Info, Rocket, Sparkles, X, Hash } from "lucide-react";
import CategoryInput from "@/components/game/CategoryInput";
import Scoreboard from "@/components/game/Scoreboard";
import TimerBar from "@/components/game/TimerBar";
import ChatBox from "@/components/game/ChatBox";
import GameButton from "@/components/game/GameButton";
import LetterIntro from "@/components/ui/LetterIntro";
import ValidationConfirmStatus from "@/components/game/ValidationConfirmStatus";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { Player, ChatMessage } from "@/types/game";
import { getRemainingSeconds } from "@/lib/game/timer";
import { calculateCategoryAnswerUpdates, calculateScoresByPlayer } from "@/lib/game/scoring";
import { getRandomLetter } from "@/lib/game/letters";
import { groupAnswersByCategory, getConfirmedPlayerIds, getVotesForAnswerGroup } from "@/lib/game/validation";
import { autoValidateAnswer } from "@/lib/game/autoValidator";
import { audioSystem } from "@/lib/audio";
import { useToast } from "@/components/ui/ToastProvider";

const db = supabase as any;
const VALIDATION_SECS = 20;

function useDebounce<T>(v: T, d: number): T {
  const [dv, setDv] = useState<T>(v);
  useEffect(() => { const h = setTimeout(() => setDv(v), d); return () => clearTimeout(h); }, [v, d]);
  return dv;
}

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Database['public']['Tables']['rooms']['Row'] | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [round, setRound] = useState<Database['public']['Tables']['rounds']['Row'] | null>(null);
  const [myNickname, setMyNickname] = useState<string>("");
  const [myPid, setMyPid] = useState<string | null>(null);
  const [localAns, setLocalAns] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Database['public']['Tables']['answers']['Row'][]>([]);
  const [votes, setVotes] = useState<Database['public']['Tables']['validation_votes']['Row'][]>([]);
  const [confirms, setConfirms] = useState<Database['public']['Tables']['validation_confirmations']['Row'][]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [valTimeLeft, setValTimeLeft] = useState(0);
  const [introPhase, setIntroPhase] = useState<'intro' | 'playing'>('intro');
  const [hasShownIntro, setHasShownIntro] = useState(false);

  const debAns = useDebounce(localAns, 500);
  const roomRef = useRef<any>(null);
  const roundRef = useRef<any>(null);
  const myPidRef = useRef<string | null>(null);
  const categoriesRef = useRef<any[]>([]);
  const finishingRef = useRef(false);
  const finalizingRef = useRef(false);
  const chanRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMyNickname(localStorage.getItem("bora_stop_nickname") || "");
    }
  }, []);

  useEffect(() => {
    if (round?.status === 'playing' && myPidRef.current) {
      saveAll(debAns);
    }
  }, [debAns]);

  const saveAll = useCallback(async (ans: Record<string, string>) => {
    const pid = myPidRef.current; const r = roundRef.current; const rm = roomRef.current;
    if (!pid || !r || !rm) return;
    const rows = categoriesRef.current.map(c => ({
      room_id: rm.id, round_id: r.id, player_id: pid,
      category_id: c.id, answer: (ans[c.id] || "").trim(), points: 0, is_valid: null
    }));
    await db.from('answers').upsert(rows, { onConflict: 'room_id,round_id,player_id,category_id' });
  }, []);

  const fetchValidation = useCallback(async (roundId: string) => {
    const { data: allAns } = await db.from('answers').select('*').eq('round_id', roundId);
    const { data: allVotes } = await db.from('validation_votes').select('*').eq('round_id', roundId);
    const { data: allConfirms } = await db.from('validation_confirmations').select('*').eq('round_id', roundId);
    if (allAns) setAnswers(allAns);
    if (allVotes) setVotes(allVotes);
    if (allConfirms) setConfirms(allConfirms);
  }, []);

  const setupRealtime = useCallback((roomId: string, currentPlayerId: string) => {
    if (chanRef.current) supabase.removeChannel(chanRef.current);
    const ch = supabase.channel(`game-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const onlineIds = Object.values(ch.presenceState<{ player_id: string }>()).flatMap(p => p.map(x => x.player_id));
        setPlayers(prev => prev.map(p => ({ ...p, isOnline: onlineIds.includes(p.id) })));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, p => {
        const newRoom = p.new as any;
        setRoom(newRoom); roomRef.current = newRoom;
        if (newRoom.status === 'finished') router.push(`/results/${code}`);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${roomId}` }, p => {
        if (p.eventType === 'DELETE') return;
        const r = p.new as any;
        setRound(r); roundRef.current = r;
        if (r.status === 'reviewing') fetchValidation(r.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `room_id=eq.${roomId}` }, p => {
        if (p.eventType === 'DELETE') return;
        const newAns = p.new as any;
        setAnswers(prev => prev.find(a => a.id === newAns.id) ? prev.map(a => a.id === newAns.id ? newAns : a) : [...prev, newAns]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, p => {
        const newMsg = p.new as any;
        setMessages(prev => [...prev, { id: newMsg.id, playerId: newMsg.player_id, playerName: newMsg.nickname, text: newMsg.message, isSystem: newMsg.is_system }]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validation_votes' }, p => {
        if (p.eventType === 'DELETE') return;
        const newVote = p.new as any;
        setVotes(prev => {
          const same = (v: any) => v.round_id === newVote.round_id && v.category_id === newVote.category_id && v.normalized_answer === newVote.normalized_answer && v.voter_id === newVote.voter_id;
          return prev.find(same) ? prev.map(v => same(v) ? newVote : v) : [...prev, newVote];
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'validation_confirmations' }, p => {
        const newConf = p.new as any;
        setConfirms(prev => [...prev, newConf]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, p => {
        const newPl = p.new as any;
        setPlayers(prev => prev.map(pl => pl.id === newPl.id ? { ...pl, score: newPl.score } : pl));
      })
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await ch.track({ player_id: currentPlayerId }); });
    chanRef.current = ch;
  }, [code, fetchValidation, router]);

  useEffect(() => {
    (async () => {
      const { data: rm } = await db.from('rooms').select('*').eq('code', code).single();
      if (!rm) return;
      setRoom(rm); roomRef.current = rm;
      if (rm.status === 'finished') { router.push(`/results/${code}`); return; }

      const { data: playersData } = await db.from('room_players').select('*').eq('room_id', rm.id);
      if (playersData) {
        setPlayers(playersData.map((p: any) => ({ id: p.id, name: p.nickname, score: p.score })));
        const nick = localStorage.getItem("bora_stop_nickname");
        const me = playersData.find((p: any) => p.nickname === nick);
        if (me) { setMyPid(me.id); myPidRef.current = me.id; }
      }

      const { data: rc } = await db.from('room_categories').select('category_id, categories(id, name)').eq('room_id', rm.id);
      if (rc) {
        const cats = rc.map((x: any) => ({ id: x.categories.id, name: x.categories.name }));
        setCategories(cats); categoriesRef.current = cats;
      }

      const { data: rdRaw } = await db.from('rounds').select('*').eq('room_id', rm.id).eq('round_number', rm.current_round).maybeSingle();
      if (rdRaw) {
        setRound(rdRaw); roundRef.current = rdRaw;
        if (rdRaw.status === 'reviewing') fetchValidation(rdRaw.id);
      }

      const { data: msgs } = await db.from('messages').select('*').eq('room_id', rm.id).order('created_at', { ascending: true });
      if (msgs) setMessages(msgs.map((m: any) => ({ id: m.id, playerId: m.player_id, playerName: m.nickname, text: m.message, isSystem: m.is_system })));

      setupRealtime(rm.id, myPidRef.current || '');
      setLoading(false);
    })();
    return () => { if (chanRef.current) supabase.removeChannel(chanRef.current); };
  }, [code, setupRealtime]);

  useEffect(() => {
    if (!room || !round) return;
    const iv = setInterval(() => {
      if (round.status === 'playing' && introPhase === 'playing') {
        const rem = getRemainingSeconds(round.started_at ?? '', room.round_time);
        setTimeLeft(rem);
        if (rem === 10) audioSystem.play('danger');
        if (rem <= 0 && !finishingRef.current) { finishingRef.current = true; stopRound(); }
      } else if (round.status === 'reviewing' && round.validation_started_at) {
        const rem = getRemainingSeconds(round.validation_started_at ?? '', VALIDATION_SECS);
        setValTimeLeft(Math.max(0, rem));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [room, round, introPhase]);

  useEffect(() => {
    if (!round || round.status !== 'reviewing' || !room || finalizingRef.current) return;
    const catIndex = round.validation_category_index ?? 0;
    const cat = categoriesRef.current[catIndex];
    if (!cat) return;
    const confirmed = getConfirmedPlayerIds(confirms, round.id, cat.id);
    if (room.host_nickname === myNickname && confirmed.length >= players.length && players.length > 0) {
      finalizeCategory(round, cat);
    }
  }, [confirms, round, room, myNickname, players.length]);

  const stopRound = async () => {
    const r = roundRef.current;
    if (!r || r.status !== 'playing') return;
    audioSystem.play('stop');
    await db.from('rounds').update({ status: 'reviewing', ended_at: new Date().toISOString(), validation_category_index: 0, validation_started_at: new Date().toISOString() }).eq('id', r.id);
    await db.from('rooms').update({ status: 'voting' }).eq('id', room?.id);
  };

  const handleVote = async (normAns: string, catId: string, vote: 'valid' | 'invalid') => {
    if (!myPid || !round) return;
    audioSystem.play('vote');
    await db.from('validation_votes').upsert({ round_id: round.id, category_id: catId, normalized_answer: normAns, voter_id: myPid, vote }, { onConflict: 'round_id,category_id,normalized_answer,voter_id' });
  };

  const handleConfirm = async () => {
    if (!myPid || !round) return;
    const cat = categories[round.validation_category_index ?? 0];
    if (!cat) return;
    await db.from('validation_confirmations').upsert({ round_id: round.id, category_id: cat.id, player_id: myPid, confirmed_at: new Date().toISOString() }, { onConflict: 'round_id,category_id,player_id' });
  };

  const finalizeCategory = async (r: any, cat: any) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    try {
      const { data: freshAns } = await db.from('answers').select('*').eq('round_id', r.id).eq('category_id', cat.id);
      const { data: freshVotes } = await db.from('validation_votes').select('*').eq('round_id', r.id).eq('category_id', cat.id);
      if (freshAns && freshVotes) {
        const updates = calculateCategoryAnswerUpdates({ answers: freshAns, votes: freshVotes, roundId: r.id, categoryId: cat.id });
        await Promise.all(updates.map(u => db.from('answers').update({ points: u.points, is_valid: u.is_valid }).eq('id', u.id)));
        const { data: allAns } = await db.from('answers').select('player_id, points').eq('room_id', room?.id);
        if (allAns) {
          const scores = calculateScoresByPlayer(allAns);
          await Promise.all(Object.entries(scores).map(([pid, s]) => db.from('room_players').update({ score: s }).eq('id', pid)));
        }
      }
      const nextIdx = (r.validation_category_index ?? 0) + 1;
      if (nextIdx < categories.length) {
        await db.from('rounds').update({ validation_category_index: nextIdx, validation_started_at: new Date().toISOString() }).eq('id', r.id);
      } else {
        audioSystem.play('round_end');
        await db.from('rounds').update({ status: 'finished' }).eq('id', r.id);
      }
    } finally { setTimeout(() => finalizingRef.current = false, 1000); }
  };

  const startNextRound = async () => {
    if (!room || !round) return;
    if (room.current_round >= room.total_rounds) {
      await db.from('rooms').update({ status: 'finished' }).eq('id', room.id);
      router.push(`/results/${code}`);
      return;
    }
    const { data: rds } = await db.from('rounds').select('letter').eq('room_id', room.id);
    const used = rds?.map((x: any) => x.letter) || [];
    const letter = getRandomLetter(room.allowed_letters || [], used);
    const next = room.current_round + 1;
    await db.from('rounds').insert({ room_id: room.id, round_number: next, letter, status: 'playing', started_at: new Date().toISOString() });
    await db.from('rooms').update({ status: 'playing', current_round: next }).eq('id', room.id);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !room) return;
    await db.from('messages').insert({ room_id: room.id, player_id: myPid, nickname: myNickname, message: text.trim(), is_system: false });
  };

  if (loading || !room || !round) return <div className="flex items-center justify-center h-full"><div className="w-16 h-16 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" /></div>;

  const amIHost = room.host_nickname === myNickname;
  const isReviewing = round.status === 'reviewing';
  const isFinished = round.status === 'finished';
  const currentCat = categories[round.validation_category_index ?? 0];
  const myConfirm = myPid && currentCat ? confirms.find(c => c.round_id === round.id && c.category_id === currentCat.id && c.player_id === myPid) : null;
  const confirmedIds = currentCat ? getConfirmedPlayerIds(confirms, round.id, currentCat.id) : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      
      {/* Intro Overlay */}
      {round.status === 'playing' && introPhase === 'intro' && !hasShownIntro && (
        <div className="absolute inset-0 z-[100] bg-[#05060B]/95 backdrop-blur-2xl">
          <LetterIntro letter={round.letter} onComplete={() => { setIntroPhase('playing'); setHasShownIntro(true); }} />
        </div>
      )}

      {/* Game Header Area */}
      <div className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-purple/10 rounded-[1.5rem] border border-brand-purple/20 flex items-center justify-center text-brand-purple shadow-inner">
            <span className="text-4xl font-black italic tracking-tighter">{round.letter}</span>
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
              Rodada {room.current_round} de {room.total_rounds}
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[10px] text-brand-yellow font-black uppercase tracking-[0.2em] flex items-center gap-2">
                 <Timer size={10} /> {isReviewing ? 'Fase de Avaliação' : 'Em Combate'}
               </span>
               <span className="w-1 h-1 bg-white/10 rounded-full" />
               <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Sala: {room.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           {round.status === 'playing' && (
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Tempo Restante</span>
                <span className={`text-4xl font-black italic tabular-nums leading-none ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {timeLeft}s
                </span>
             </div>
           )}
           <div className="w-px h-12 bg-white/5 hidden md:block" />
           <div className="hidden md:flex flex-col items-center">
             <Trophy size={24} className="text-brand-yellow mb-1" />
             <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">RANKING</span>
           </div>
        </div>
      </div>

      {/* Game Main View */}
      <div className="flex-1 overflow-hidden p-8 flex gap-8">
        
        {/* Play/Review Area */}
        <div className="flex-1 h-full overflow-y-auto no-scrollbar pb-32">
          <AnimatePresence mode="wait">
            {!isReviewing && !isFinished && introPhase === 'playing' && (
              <motion.div key="play" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((cat, idx) => (
                    <div key={cat.id} className="relative group">
                      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-brand-purple rounded-lg z-10 border border-brand-yellow/30 shadow-lg">
                        <span className="text-[9px] font-black uppercase italic tracking-widest text-white">{cat.name}</span>
                      </div>
                      <input 
                        type="text"
                        value={localAns[cat.id] || ""}
                        onChange={e => setLocalAns(prev => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder={`Digite aqui...`}
                        className="w-full bg-white/[0.03] hover:bg-white/[0.05] border-2 border-white/5 focus:border-brand-purple rounded-[1.5rem] px-6 py-6 font-black text-xl text-white outline-none transition-all placeholder:text-white/5 uppercase italic"
                        autoFocus={idx === 0}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-6 pt-8 mt-8 border-t border-white/5">
                  <div className="flex-1 bg-black/40 rounded-3xl p-6 border border-white/5">
                    <div className="flex justify-between mb-3 px-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Progresso da Rodada</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-blue italic">{Math.round((timeLeft/room.round_time)*100)}%</span>
                    </div>
                    <TimerBar timeRemaining={timeLeft} totalTime={room.round_time} />
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    onClick={stopRound}
                    className="h-28 px-12 bg-red-600 hover:bg-red-500 rounded-[2rem] text-white font-black italic text-5xl tracking-tighter shadow-[0_0_50px_rgba(220,38,38,0.4)] border-b-8 border-red-800 transition-all active:border-b-0 active:translate-y-2 uppercase"
                  >
                    STOP!
                  </motion.button>
                </div>
              </motion.div>
            )}

            {isReviewing && currentCat && (
              <motion.div key="review" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 h-full flex flex-col">
                <div className="flex flex-col items-center text-center bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                  <div className="bg-brand-yellow/10 border border-brand-yellow/20 px-6 py-1.5 rounded-full mb-4">
                    <span className="text-[10px] font-black uppercase italic tracking-[0.2em] text-brand-yellow">
                      Avaliando: {currentCat.name} • {round.validation_category_index! + 1}/{categories.length}
                    </span>
                  </div>
                  <h2 className="text-6xl font-black uppercase italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    O que disseram?
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                  {groupAnswersByCategory(answers, players, currentCat.id).map(g => {
                    const { validVotes, invalidVotes } = getVotesForAnswerGroup({ votes, roundId: round.id, categoryId: currentCat.id, normalizedAnswer: g.normalizedAnswer });
                    const myVote = votes.find(v => v.normalized_answer === g.normalizedAnswer && v.voter_id === myPid && v.category_id === currentCat.id)?.vote;
                    const auto = autoValidateAnswer({ answer: g.displayAnswer, categoryName: currentCat.name, letter: round.letter });
                    
                    return (
                      <motion.div key={g.normalizedAnswer} layout className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 flex items-center justify-between group">
                        <div className="flex flex-col">
                           <div className="flex items-center gap-3">
                             <span className="text-3xl font-black italic uppercase text-white leading-none">{g.displayAnswer}</span>
                             {auto.suggestedValid === false && (
                               <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-red-500" title={auto.reason}>
                                 <AlertCircle size={14} />
                               </div>
                             )}
                           </div>
                           <span className="text-[9px] font-black uppercase text-white/20 mt-2 italic tracking-widest">Jogadores: {g.playerNames.join(", ")}</span>
                        </div>
                        
                        <div className="flex gap-2 bg-black/40 p-2 rounded-2xl">
                          <button 
                            onClick={() => handleVote(g.normalizedAnswer, currentCat.id, 'valid')}
                            disabled={!!myConfirm}
                            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black italic transition-all ${myVote === 'valid' ? 'bg-brand-green text-black' : 'text-white/20 hover:text-white/40'}`}
                          >
                            <ThumbsUp size={18} /> {validVotes}
                          </button>
                          <button 
                            onClick={() => handleVote(g.normalizedAnswer, currentCat.id, 'invalid')}
                            disabled={!!myConfirm}
                            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black italic transition-all ${myVote === 'invalid' ? 'bg-red-500 text-white' : 'text-white/20 hover:text-white/40'}`}
                          >
                            <ThumbsDown size={18} /> {invalidVotes}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="bg-[#1A1C26] p-6 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 w-full">
                    <ValidationConfirmStatus confirmedPlayerIds={confirmedIds} players={players} hasConfirmed={!!myConfirm} />
                  </div>
                  <GameButton 
                    title={myConfirm ? "AGUARDANDO..." : "CONFIRMAR VOTOS"}
                    subtitle={myConfirm ? "Sua parte está feita" : "Finalizar avaliação"}
                    icon={myConfirm ? CheckCircle : Rocket}
                    variant={myConfirm ? "secondary" : "primary"}
                    onClick={handleConfirm}
                    disabled={!!myConfirm}
                    className="w-full md:w-80 h-20 rounded-2xl"
                  />
                </div>
              </motion.div>
            )}

            {isFinished && (
              <motion.div key="finish" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center gap-8">
                 <div className="w-32 h-32 bg-brand-green/10 rounded-[3rem] border-2 border-brand-green/30 flex items-center justify-center text-brand-green mb-4 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                   <Trophy size={64} />
                 </div>
                 <div>
                    <h2 className="text-6xl font-black uppercase italic tracking-tighter text-white mb-2">Fim da Rodada!</h2>
                    <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.4em]">O destino foi traçado</p>
                 </div>
                 
                 {amIHost ? (
                    <GameButton 
                      title={room.current_round >= room.total_rounds ? "RESULTADO FINAL" : "PRÓXIMA RODADA"}
                      subtitle="Continuar a jornada"
                      icon={Sparkles}
                      variant="accent"
                      onClick={startNextRound}
                      className="w-80 h-24 rounded-[2rem]"
                    />
                 ) : (
                    <div className="bg-brand-yellow/5 border border-brand-yellow/20 px-8 py-4 rounded-full">
                      <span className="text-brand-yellow font-black uppercase italic tracking-widest animate-pulse">Aguardando o Host...</span>
                    </div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:flex w-80 flex-col gap-6 h-full">
           <div className="game-card p-6 border-white/5 bg-white/[0.01] flex flex-col h-[350px]">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                 <Trophy size={18} className="text-brand-yellow" />
                 <h3 className="text-lg font-black uppercase italic text-white/80">Placar Atual</h3>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                {players.sort((a,b) => (b.score||0)-(a.score||0)).map((p, idx) => (
                  <div key={p.id} className="bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black italic ${idx < 3 ? 'text-brand-yellow' : 'text-white/20'}`}>#{idx+1}</span>
                      <span className="text-xs font-black uppercase text-white/80 italic">{p.name}</span>
                    </div>
                    <span className="text-xs font-black text-brand-blue">{p.score || 0}</span>
                  </div>
                ))}
              </div>
           </div>

           <ChatBox messages={messages} onSendMessage={handleSendMessage} className="flex-1 min-h-[300px]" />
        </div>
      </div>
    </div>
  );
}
