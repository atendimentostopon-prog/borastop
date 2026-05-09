'use client';
import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import CategoryInput from "@/components/game/CategoryInput";
import Scoreboard from "@/components/game/Scoreboard";
import TimerBar from "@/components/game/TimerBar";
import ChatBox from "@/components/game/ChatBox";
import Button from "@/components/ui/Button";
import AdPlaceholder from "@/components/game/AdPlaceholder";
import PulseGlow from "@/components/animations/PulseGlow";
import ValidationConfirmStatus from "@/components/game/ValidationConfirmStatus";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { Player } from "@/types/game";

// Helper com cast para 'any' para evitar o erro de inferência 'never' do Supabase v2 com strict mode
const db = supabase as any;
import { getRemainingSeconds } from "@/lib/game/timer";
import { 
  calculateCategoryAnswerUpdates, 
  calculateScoresByPlayer 
} from "@/lib/game/scoring";
import { getRandomLetter } from "@/lib/game/letters";
import { groupAnswersByCategory, getConfirmedPlayerIds, getVotesForAnswerGroup } from "@/lib/game/validation";
import { autoValidateAnswer } from "@/lib/game/autoValidator";
import { ThumbsUp, ThumbsDown, AlertCircle, CheckCircle } from "lucide-react";
import LetterIntro from "@/components/ui/LetterIntro";
import { useToast } from "@/components/ui/ToastProvider";
import { audioSystem } from "@/lib/audio";

const VALIDATION_SECS = 20;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return "";
  let sid = localStorage.getItem("bora_stop_session_id");
  if (!sid) { sid = crypto.randomUUID(); localStorage.setItem("bora_stop_session_id", sid); }
  return sid;
}

function useDebounce<T>(v: T, d: number): T {
  const [dv, setDv] = useState<T>(v);
  useEffect(() => { const h = setTimeout(() => setDv(v), d); return () => clearTimeout(h); }, [v, d]);
  return dv;
}

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Database['public']['Tables']['rooms']['Row'] | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [round, setRound] = useState<Database['public']['Tables']['rounds']['Row'] | null>(null);
  const [myNickname, setMyNickname] = useState<string>("");
  const [myPid, setMyPid] = useState<string | null>(null);
  const [localAns, setLocalAns] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nick = localStorage.getItem("bora_stop_nickname") || "";
      setMyNickname(nick);
    }
  }, []);
  const debAns = useDebounce(localAns, 500);
  const [answers, setAnswers] = useState<Database['public']['Tables']['answers']['Row'][]>([]);
  const [votes, setVotes] = useState<Database['public']['Tables']['validation_votes']['Row'][]>([]);
  const [confirms, setConfirms] = useState<Database['public']['Tables']['validation_confirmations']['Row'][]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [valTimeLeft, setValTimeLeft] = useState(0);
  const [introPhase, setIntroPhase] = useState<'intro' | 'playing'>('intro');
  const [hasShownIntro, setHasShownIntro] = useState(false);
  const { addToast } = useToast();

  const roomRef = useRef<Database['public']['Tables']['rooms']['Row'] | null>(null);
  const roundRef = useRef<Database['public']['Tables']['rounds']['Row'] | null>(null);
  const myPidRef = useRef<string | null>(null);
  const categoriesRef = useRef<{ id: string, name: string }[]>([]);
  const playersRef = useRef<Player[]>([]);
  const localAnsRef = useRef<Record<string, string>>({});
  const finishingRef = useRef(false);
  const finalizingRef = useRef(false);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => { localAnsRef.current = localAns; }, [localAns]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { myPidRef.current = myPid; }, [myPid]);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // Auto-save
  useEffect(() => {
    if (round?.status === 'playing' && myPidRef.current) saveAll(debAns);
  }, [debAns]);

  const saveAll = useCallback(async (ans: Record<string, string>) => {
    const pid = myPidRef.current; const r = roundRef.current; const rm = roomRef.current;
    if (!pid || !r || !rm) return;
    const rows = categoriesRef.current.map(c => ({
      room_id: rm.id, round_id: r.id, player_id: pid,
      category_id: c.id, answer: (ans[c.id] || "").trim(), points: 0, is_valid: null
    }));
    await db.from('answers').upsert(rows, {
      onConflict: 'room_id,round_id,player_id,category_id'
    });
  }, []);

  const fetchValidation = useCallback(async (roundId: string) => {
    const { data: allAns } = await db.from('answers').select('*').eq('round_id', roundId);
    const { data: allVotes } = await db.from('validation_votes').select('*').eq('round_id', roundId);
    const { data: allConfirms } = await db.from('validation_confirmations').select('*').eq('round_id', roundId);
    if (allAns) setAnswers(allAns as Database['public']['Tables']['answers']['Row'][]);
    if (allVotes) setVotes(allVotes as Database['public']['Tables']['validation_votes']['Row'][]);
    if (allConfirms) setConfirms(allConfirms as Database['public']['Tables']['validation_confirmations']['Row'][]);
  }, []);

  const setupRealtime = useCallback((roomId: string, currentPlayerId: string) => {
    if (chanRef.current) supabase.removeChannel(chanRef.current);
    const ch = supabase.channel(`game-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = ch.presenceState();
        const onlineIds = Object.values(newState).flatMap((p) => (p as unknown as { player_id: string }[]).map((x) => x.player_id));
        setPlayers(prev => prev.map(p => ({ ...p, isOnline: onlineIds.includes(p.id) })));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, p => {
        const newRoom = p.new as Database['public']['Tables']['rooms']['Row'];
        setRoom(newRoom);
        roomRef.current = newRoom;
        if (newRoom.status === 'finished') router.push(`/results/${code}`);
        if (newRoom.status === 'playing') { finishingRef.current = false; finalizingRef.current = false; setLocalAns({}); setAnswers([]); setVotes([]); setConfirms([]); }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${roomId}` }, p => {
        if (p.eventType === 'DELETE') return;
        const r = p.new as Database['public']['Tables']['rounds']['Row'];
        setRound(r); roundRef.current = r;
        finalizingRef.current = false;
        if (r.status === 'playing' && p.eventType === 'INSERT') {
          setIntroPhase('intro');
          setHasShownIntro(false);
          addToast(`Rodada ${r.round_number} começou!`, 'info');
        }
        if (r.status === 'reviewing') {
          fetchValidation(r.id);
          if (p.old && (p.old as any).status === 'playing') {
             audioSystem.play('stop');
             addToast('ALGUÉM APERTOU STOP!', 'warning');
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `room_id=eq.${roomId}` }, p => {
        if (p.eventType === 'DELETE') return;
        const newAns = p.new as Database['public']['Tables']['answers']['Row'];
        setAnswers(prev => prev.find(a => a.id === newAns.id) ? prev.map(a => a.id === newAns.id ? newAns : a) : [...prev, newAns]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validation_votes' }, p => {
        if (p.eventType === 'DELETE') { setVotes(prev => prev.filter(v => v.id !== (p.old as any).id)); return; }
        const newVote = p.new as Database['public']['Tables']['validation_votes']['Row'];
        setVotes(prev => {
          const same = (v: Database['public']['Tables']['validation_votes']['Row']) => v.round_id === newVote.round_id && v.category_id === newVote.category_id && v.normalized_answer === newVote.normalized_answer && v.voter_id === newVote.voter_id;
          return prev.find(same) ? prev.map(v => same(v) ? newVote : v) : [...prev, newVote];
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'validation_confirmations' }, p => {
        const newConf = p.new as Database['public']['Tables']['validation_confirmations']['Row'];
        setConfirms(prev => {
          const same = (c: Database['public']['Tables']['validation_confirmations']['Row']) => c.round_id === newConf.round_id && c.category_id === newConf.category_id && c.player_id === newConf.player_id;
          return prev.find(same) ? prev : [...prev, newConf];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, p => {
        const newPl = p.new as Database['public']['Tables']['room_players']['Row'];
        setPlayers(prev => prev.map(pl => pl.id === newPl.id ? { ...pl, score: newPl.score } : pl));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ player_id: currentPlayerId, online_at: new Date().toISOString() });
        }
      });
    chanRef.current = ch;
  }, [code, fetchValidation, router]);

  useEffect(() => {
    (async () => {
      const { data: rm, error: e1 } = await db.from('rooms').select('*').eq('code', code).single();
      if (e1 || !rm) return;
      setRoom(rm as Database['public']['Tables']['rooms']['Row']); roomRef.current = rm;
      if (rm.status === 'finished') { router.push(`/results/${code}`); return; }

      const { data: playersData, error: e2 } = await db.from('room_players').select('*').eq('room_id', rm.id);
      if (playersData) {
        const typedPlayers = playersData as Database['public']['Tables']['room_players']['Row'][];
        setPlayers(typedPlayers.map(p => ({ id: p.id, name: p.nickname, score: p.score })));
        const nick = localStorage.getItem("bora_stop_nickname");
        const me = typedPlayers.find(p => p.nickname === nick);
        if (me) { setMyPid(me.id); myPidRef.current = me.id; }
      }

      const { data: rc, error: e3 } = await db.from('room_categories').select('category_id, categories(id, name)').eq('room_id', rm.id);
      if (rc) { 
        const cats = (rc as any[]).map(x => ({ id: x.categories.id, name: x.categories.name })); 
        setCategories(cats); 
        categoriesRef.current = cats; 
      }

      const { data: rdRaw } = await db.from('rounds').select('*').eq('room_id', rm.id).eq('round_number', rm.current_round).maybeSingle();
      if (rdRaw) { 
        setRound(rdRaw as Database['public']['Tables']['rounds']['Row']); roundRef.current = rdRaw; 
        if (rdRaw.status === 'reviewing') await fetchValidation(rdRaw.id); 
      }

      setupRealtime(rm.id, myPidRef.current || '');
      setLoading(false);
    })();
    return () => { if (chanRef.current) supabase.removeChannel(chanRef.current); };
  }, [code]);

  useEffect(() => {
    if (!room || !round) return;
    const iv = setInterval(async () => {
      if (round.status === 'playing' && introPhase === 'playing') {
        const rem = getRemainingSeconds(round.started_at ?? '', room.round_time);
        setTimeLeft(rem);
        if (rem === 10) audioSystem.play('danger');
        if (rem <= 0 && !finishingRef.current) { finishingRef.current = true; addToast("Tempo esgotado!", 'error'); await stopRound(true); }
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
    
    const isHost = room.host_nickname === myNickname;
    if (isHost && confirmed.length >= playersRef.current.length && playersRef.current.length > 0) {
      finalizeCategory(round, cat, playersRef.current);
    }
  }, [confirms, round, room, myNickname]);

  const stopRound = async (timeOut = false) => {
    const r = roundRef.current;
    const rm = roomRef.current;
    if (!r || r.status !== 'playing' || !rm) return;

    try {
      await db.from('rounds').update({ 
          status: 'reviewing', 
          ended_at: new Date().toISOString(), 
          validation_category_index: 0, 
          validation_started_at: new Date().toISOString() 
        }).eq('id', r.id);

      await db.from('rooms').update({ status: 'voting' }).eq('id', rm.id);
    } catch (err) {
      console.error("Erro ao parar rodada:", err);
    }
  };

  const handleVote = async (normAns: string, catId: string, vote: 'valid' | 'invalid') => {
    const pid = myPidRef.current; const r = roundRef.current;
    if (!pid || !r) return;
    audioSystem.play('vote');
    setVotes(prev => {
      const same = (v: any) => v.round_id === r.id && v.category_id === catId && v.normalized_answer === normAns && v.voter_id === pid;
      const nv: Database['public']['Tables']['validation_votes']['Row'] = { 
      round_id: r.id, category_id: catId, normalized_answer: normAns, 
      voter_id: pid, vote, id: 'opt-' + normAns + pid, created_at: new Date().toISOString() 
    };
      return prev.find(same) ? prev.map(v => same(v) ? nv : v) : [...prev, nv];
    });
    await db.from('validation_votes').upsert({
      round_id: r.id, category_id: catId, normalized_answer: normAns, voter_id: pid, vote
    }, { onConflict: 'round_id,category_id,normalized_answer,voter_id' });
  };

  const handleConfirm = async () => {
    const pid = myPidRef.current; const r = roundRef.current;
    if (!pid || !r) return;
    const catIndex = r.validation_category_index ?? 0;
    const cat = categoriesRef.current[catIndex];
    if (!cat) return;
    const already = confirms.find(c => c.round_id === r.id && c.category_id === cat.id && c.player_id === pid);
    if (already) return;
    setConfirms(prev => [...prev, { round_id: r.id, category_id: cat.id, player_id: pid, id: 'opt-' + pid, confirmed_at: new Date().toISOString() }]);
    await db.from('validation_confirmations').upsert({
      round_id: r.id, category_id: cat.id, player_id: pid, confirmed_at: new Date().toISOString()
    }, { onConflict: 'round_id,category_id,player_id' });
  };

  const finalizeCategory = async (r: Database['public']['Tables']['rounds']['Row'], cat: { id: string, name: string }, pls: Player[]) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    try {
      const { data: freshAns } = await db.from('answers').select('*').eq('round_id', r.id);
      const { data: freshVotes } = await db.from('validation_votes').select('*').eq('round_id', r.id);
      
      if (!freshAns || !freshVotes) throw new Error("Falha ao buscar dados para finalização");

      const updates = calculateCategoryAnswerUpdates({
        answers: freshAns,
        votes: freshVotes,
        roundId: r.id,
        categoryId: cat.id
      });

      await Promise.all(updates.map(upd => 
        db.from('answers').update({ points: upd.points, is_valid: upd.is_valid }).eq('id', upd.id)
      ));

      await updateRoomPlayerScores();
      await advanceToNextCategoryOrFinishRound(r);

    } catch (err) {
      console.error("Erro ao finalizar categoria:", err);
    } finally {
      setTimeout(() => { finalizingRef.current = false; }, 1000);
    }
  };

  const updateRoomPlayerScores = async () => {
    const rm = roomRef.current;
    if (!rm) return;
    const { data: allAnswers } = await db.from('answers').select('player_id, points').eq('room_id', rm.id);
    if (!allAnswers) return;
    const playerScores = calculateScoresByPlayer(allAnswers);
    await Promise.all(Object.entries(playerScores).map(([pid, score]) => 
      db.from('room_players').update({ score }).eq('id', pid)
    ));
  };

  const advanceToNextCategoryOrFinishRound = async (r: Database['public']['Tables']['rounds']['Row']) => {
    if (!r) return;
    const nextIndex = (r.validation_category_index ?? 0) + 1;
    
    if (nextIndex < categoriesRef.current.length) {
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

  const isReviewing = round.status === 'reviewing' || room.status === 'voting';
  const isFinished = round.status === 'finished';
  
  // No SSR, myNickname estará vazio, o que é seguro. amIHost será falso inicialmente.
  const amIHost = room.host_nickname === myNickname;
  
  const catIndex = round.validation_category_index ?? 0;
  const currentCat = categories[catIndex];
  const myConfirm = (currentCat && round && myPid) 
    ? confirms.find(c => c.round_id === round.id && c.category_id === currentCat.id && c.player_id === myPid) 
    : null;
  const confirmedIds = currentCat ? getConfirmedPlayerIds(confirms, round.id, currentCat.id) : [];

  return (
    <>
      {round.status === 'playing' && introPhase === 'intro' && !hasShownIntro && (
        <LetterIntro 
          letter={round.letter} 
          onComplete={() => {
            setIntroPhase('playing');
            setHasShownIntro(true);
          }} 
        />
      )}
      {/* Layout de game: grid com sidebar lateral */}
      <div className="w-full max-w-[1400px] mx-auto px-3 py-3 md:py-4 flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-4 min-h-0">
        {/* Coluna principal */}
        <div className="flex flex-col gap-4 min-w-0">
          <AnimatePresence mode="wait">
            {!isReviewing && !isFinished && introPhase === 'playing' && (
              <motion.div key="playing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-brand-card backdrop-blur-md rounded-3xl p-6 border border-white/10 flex flex-col items-center gap-6 shadow-2xl">
                <div className="w-full flex justify-between items-center">
                  <span className="text-white/60 font-bold text-sm bg-black/40 px-4 py-2 rounded-xl">RODADA {room.current_round}/{room.total_rounds}</span>
                  <span className="font-mono font-bold bg-brand-yellow text-brand-purple px-4 py-2 rounded-xl">#{code}</span>
                </div>
                <div className="flex flex-col items-center my-4">
                  <span className="text-white/50 font-bold tracking-widest uppercase mb-2">Letra Sorteada</span>
                  <div className="text-8xl md:text-9xl font-black italic text-brand-green drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]">{round.letter}</div>
                </div>
                <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5">
                  <TimerBar timeRemaining={timeLeft} totalTime={room.round_time} />
                </div>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {categories.map((cat, index) => (
                    <CategoryInput 
                      key={cat.id} 
                      category={cat.name} 
                      value={localAns[cat.id] || ""}
                      onChange={e => setLocalAns(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      onBlur={() => saveAll(localAnsRef.current)} 
                      autoFocus={index === 0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const nextInputs = Array.from(document.querySelectorAll('input[data-cat-index]')) as HTMLInputElement[];
                          const next = nextInputs.find(input => parseInt(input.getAttribute('data-cat-index') || '0') === index + 1);
                          if (next) next.focus();
                        }
                      }}
                      inputRef={(el) => {
                        if (el) el.setAttribute('data-cat-index', index.toString());
                      }}
                    />
                  ))}
                </div>
                <div className="w-full mt-6">
                  <PulseGlow color="red-500">
                    <Button onClick={() => { finishingRef.current = true; stopRound(false); }} variant="danger" size="lg" className="w-full py-6 text-3xl font-black italic">STOP!</Button>
                  </PulseGlow>
                </div>
              </motion.div>
            )}

            {isReviewing && currentCat && (
              <motion.div key={`val-${catIndex}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                className="bg-brand-card backdrop-blur-md rounded-3xl p-6 border border-white/10 flex flex-col gap-5 shadow-2xl relative overflow-hidden">
                <div className="text-center flex flex-col items-center border-b border-white/10 pb-5">
                  <div className="text-white/50 font-bold tracking-widest text-sm mb-1">VALIDAÇÃO {catIndex + 1}/{categories.length}</div>
                  <h2 className="text-5xl font-black uppercase text-brand-yellow">{currentCat.name}</h2>
                  <div className="absolute top-4 right-6 opacity-10 text-8xl font-black italic text-white pointer-events-none">{round.letter}</div>
                </div>
                <TimerBar timeRemaining={valTimeLeft} totalTime={VALIDATION_SECS} />
                {valTimeLeft <= 0 && (
                  <div className="text-center text-brand-yellow font-bold text-sm animate-pulse">
                    ⏰ Tempo esgotado! Confirme sua avaliação para continuar.
                  </div>
                )}

                <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1">
                  {groupAnswersByCategory(answers, players, currentCat.id).length === 0
                    ? <div className="text-center p-8 text-white/40 font-bold text-lg">Ninguém respondeu esta categoria!</div>
                    : groupAnswersByCategory(answers, players, currentCat.id).map(g => {
                        const { validVotes, invalidVotes } = getVotesForAnswerGroup({ votes, roundId: round.id, categoryId: currentCat.id, normalizedAnswer: g.normalizedAnswer });
                        const myVote = votes.find(v => v.normalized_answer === g.normalizedAnswer && v.voter_id === myPid && v.category_id === currentCat.id)?.vote;
                        const auto = autoValidateAnswer({ answer: g.displayAnswer, categoryName: currentCat.name, letter: round.letter });
                        return (
                          <motion.div 
                            key={g.normalizedAnswer} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 ${
                              validVotes > invalidVotes ? (g.playerIds.length > 1 ? 'bg-brand-yellow/10 border-brand-yellow/50 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-brand-green/10 border-brand-green/50 drop-shadow-[0_0_15px_rgba(46,204,113,0.3)]') :
                              invalidVotes > validVotes ? 'bg-red-500/10 border-red-500/50 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                              'bg-black/30 border-white/10'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <span className={`text-2xl font-bold ${
                                  validVotes > invalidVotes ? (g.playerIds.length > 1 ? 'text-brand-yellow' : 'text-brand-green') :
                                  invalidVotes > validVotes ? 'text-red-500' : 'text-white'
                                }`}>{g.displayAnswer}</span>
                                <p className="text-sm text-white/50 font-medium">Por: <span className="text-white/80">{g.playerNames.join(", ")}</span></p>
                              </div>
                              <div className="flex bg-black/50 rounded-xl p-1 border border-white/5 shrink-0 shadow-inner">
                                <button onClick={() => handleVote(g.normalizedAnswer, currentCat.id, 'valid')} disabled={!!myConfirm}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40 ${myVote === 'valid' ? 'bg-brand-green text-black shadow-[0_0_10px_rgba(46,204,113,0.5)]' : 'text-white/70 hover:bg-white/10'}`}>
                                  <ThumbsUp size={16} /> Vale ({validVotes})
                                </button>
                                <button onClick={() => handleVote(g.normalizedAnswer, currentCat.id, 'invalid')} disabled={!!myConfirm}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40 ${myVote === 'invalid' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-white/70 hover:bg-white/10'}`}>
                                  <ThumbsDown size={16} /> Não Vale ({invalidVotes})
                                </button>
                              </div>
                            </div>
                            {auto.suggestedValid === false && (
                              <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                <AlertCircle size={14} /> {auto.reason}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                </div>

                <ValidationConfirmStatus confirmedPlayerIds={confirmedIds} players={players} hasConfirmed={!!myConfirm} />

                <div className="pt-2 border-t border-white/10">
                  {myConfirm ? (
                    <div className="flex flex-col items-center gap-2 p-4 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                      <div className="flex items-center gap-2 text-brand-green font-bold"><CheckCircle size={20} /> Avaliação enviada!</div>
                      {confirmedIds.length < players.length
                        ? <p className="text-white/40 text-sm animate-pulse">Aguardando os outros jogadores...</p>
                        : <p className="text-brand-yellow text-sm font-bold animate-pulse">Calculando pontos...</p>}
                    </div>
                  ) : (
                    <Button onClick={handleConfirm} size="lg" fullWidth>Avaliar</Button>
                  )}
                </div>
              </motion.div>
            )}

            {isFinished && (
              <motion.div key="finished" initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-brand-card rounded-3xl p-10 border border-brand-green/50 flex flex-col items-center gap-8 shadow-[0_0_80px_rgba(46,204,113,0.3)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-brand-green/20 to-transparent pointer-events-none" />
                <div className="text-center relative z-10">
                  <motion.h2 
                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-5xl font-black uppercase text-brand-green mb-4 drop-shadow-[0_0_20px_rgba(46,204,113,0.8)]"
                  >
                    Rodada Finalizada!
                  </motion.h2>
                  <p className="text-white/80 font-medium text-lg">Pontuação calculada com sucesso.</p>
                </div>
                {amIHost
                  ? <PulseGlow color="brand-green">
                      <Button onClick={startNextRound} size="lg" className="w-full px-12 py-6 text-2xl font-black relative z-10">{room.current_round >= room.total_rounds ? "Ver Ranking Final" : "Próxima Rodada"}</Button>
                    </PulseGlow>
                  : <div className="text-center text-brand-yellow font-bold p-4 bg-brand-yellow/10 border border-brand-yellow/20 rounded-xl w-full max-w-sm animate-pulse relative z-10">Aguardando o host iniciar...</div>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ad abaixo do painel principal */}
          <div className="shrink-0">
            <AdPlaceholder type="banner" />
          </div>
        </div>

        {/* Sidebar direita: placar + chat com alturas fixas */}
        <div className="flex flex-col gap-3 lg:h-[calc(100vh-80px)] lg:sticky lg:top-4">
          <Scoreboard players={players} className="shrink-0 max-h-[220px]" />
          <ChatBox messages={[]} className="flex-1 min-h-[180px] lg:min-h-0" />
        </div>
      </div>
    </>
  );
}
