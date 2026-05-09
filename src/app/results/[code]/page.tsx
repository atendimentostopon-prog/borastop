'use client';

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy, Home, RotateCw, Star, Zap, Target, XCircle, Crown, Sparkles, Medal } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import Button from "@/components/ui/Button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Player } from "@/types/game";
import { audioSystem } from "@/lib/audio";

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadResults(); }, [code]);

  const loadResults = async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data: rm } = await supabase.from('rooms').select('id').eq('code', code).single() as any;
      if (!rm) return;
      const { data: pls } = await supabase.from('room_players').select('*').eq('room_id', rm.id).order('score', { ascending: false });
      const { data: ans } = await supabase.from('answers').select('*').eq('room_id', rm.id);
      if (pls) {
        setPlayers((pls as any[]).map(p => {
          const pAns = (ans as any[] | null)?.filter(a => a.player_id === p.id) || [];
          return {
            id: p.id, name: p.nickname, score: p.score || 0, isReady: false,
            stats: {
              valid: pAns.filter(a => a.is_valid && a.points === 10).length,
              repeated: pAns.filter(a => a.is_valid && a.points === 5).length,
              invalid: pAns.filter(a => a.is_valid === false).length
            }
          };
        }));
      }
    } catch (e) { console.error("Error loading results", e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!loading && players.length > 0) {
      audioSystem.play('win');
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [loading, players]);

  if (loading) return <PageContainer className="flex items-center justify-center min-h-[70vh]"><div className="w-16 h-16 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" /></PageContainer>;

  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const podium = sorted.slice(0, 3);
  const others = sorted.slice(3);

  return (
    <PageContainer className="relative overflow-hidden py-12">
      <div className="absolute inset-0 bg-game-grid opacity-5 pointer-events-none" />
      
      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20 relative z-10">
        <div className="inline-flex items-center gap-3 bg-brand-yellow/10 border border-brand-yellow/20 px-8 py-3 rounded-full mb-6">
          <Crown className="text-brand-yellow" size={24} />
          <span className="text-sm font-black uppercase italic tracking-[0.3em] text-brand-yellow">Hall da Fama • Arena {code}</span>
        </div>
        <h1 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter neon-text mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]">CAMPEÕES!</h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.4em] text-sm italic">A batalha cessou. Os mestres foram coroados.</p>
      </motion.div>

      {/* Podium Section */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-6 mb-24 relative z-10">
        <AnimatePresence>
          {/* Second Place */}
          {podium[1] && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-[2rem] bg-white/5 border-2 border-white/10 flex items-center justify-center relative mb-4 group hover:border-brand-blue/50 transition-all">
                <span className="text-5xl font-black italic text-white/20 group-hover:text-brand-blue/40 transition-colors">{podium[1].name.charAt(0)}</span>
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-xl bg-gray-400 flex items-center justify-center text-black shadow-lg">
                  <Medal size={24} />
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl w-48 text-center backdrop-blur-xl">
                <p className="font-black uppercase italic text-xs text-white/60 truncate mb-1">{podium[1].name}</p>
                <p className="text-2xl font-black italic text-brand-blue">{podium[1].score}</p>
              </div>
              <div className="w-48 h-32 bg-gradient-to-t from-white/5 to-white/10 rounded-t-3xl mt-4 border-t border-x border-white/5" />
            </motion.div>
          )}

          {/* First Place */}
          {podium[0] && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center">
              <div className="w-48 h-48 rounded-[3rem] bg-brand-yellow/10 border-4 border-brand-yellow/50 flex items-center justify-center relative mb-6 shadow-[0_0_50px_rgba(255,215,0,0.2)] group hover:scale-105 transition-all">
                <span className="text-7xl font-black italic text-brand-yellow drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">{podium[0].name.charAt(0)}</span>
                <div className="absolute -top-8 -right-8 w-20 h-20 rounded-[2rem] bg-brand-yellow flex items-center justify-center text-black shadow-2xl animate-bounce">
                  <Trophy size={40} />
                </div>
                <div className="absolute -bottom-4 bg-brand-yellow text-black px-6 py-1 rounded-full text-xs font-black italic uppercase tracking-widest">KING</div>
              </div>
              <div className="bg-brand-yellow/20 border border-brand-yellow/30 p-6 rounded-[2.5rem] w-64 text-center backdrop-blur-2xl shadow-2xl">
                <p className="font-black uppercase italic text-lg text-white mb-1 truncate">{podium[0].name}</p>
                <p className="text-4xl font-black italic text-brand-yellow">{podium[0].score}</p>
              </div>
              <div className="w-64 h-48 bg-gradient-to-t from-brand-yellow/10 to-brand-yellow/20 rounded-t-[3rem] mt-4 border-t border-x border-brand-yellow/20 relative">
                <Sparkles className="absolute top-4 left-4 text-brand-yellow/30" />
                <Sparkles className="absolute bottom-4 right-4 text-brand-yellow/30" />
              </div>
            </motion.div>
          )}

          {/* Third Place */}
          {podium[2] && (
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-[1.5rem] bg-white/5 border-2 border-white/10 flex items-center justify-center relative mb-4 group hover:border-brand-purple/50 transition-all">
                <span className="text-4xl font-black italic text-white/10 group-hover:text-brand-purple/40 transition-colors">{podium[2].name.charAt(0)}</span>
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-lg bg-amber-700 flex items-center justify-center text-white shadow-lg">
                  <Star size={20} fill="currentColor" />
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl w-40 text-center backdrop-blur-xl">
                <p className="font-black uppercase italic text-[10px] text-white/40 truncate mb-1">{podium[2].name}</p>
                <p className="text-xl font-black italic text-brand-purple">{podium[2].score}</p>
              </div>
              <div className="w-40 h-24 bg-gradient-to-t from-white/5 to-white/10 rounded-t-2xl mt-4 border-t border-x border-white/5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Others Ranking & Stats */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 relative z-10">
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black uppercase italic tracking-[0.4em] text-white/30 mb-2 flex items-center gap-2">
            <Target size={14} /> Desempenho dos Gladiadores
          </h3>
          <div className="flex flex-col gap-3">
            {sorted.map((p, idx) => (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + idx * 0.1 }} key={p.id} className="bg-brand-card/20 border border-white/5 rounded-3xl p-5 flex items-center justify-between group hover:bg-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center font-black italic text-white/20 group-hover:text-brand-blue/50 transition-colors">#{idx + 1}</div>
                  <div>
                    <p className="font-black uppercase italic text-sm text-white/80">{p.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] font-black text-brand-green uppercase flex items-center gap-1"><Zap size={10} /> {(p as any).stats.valid}</span>
                      <span className="text-[10px] font-black text-brand-yellow uppercase flex items-center gap-1"><Star size={10} /> {(p as any).stats.repeated}</span>
                      <span className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1"><XCircle size={10} /> {(p as any).stats.invalid}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black italic text-white group-hover:text-brand-blue transition-colors">{p.score}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/10">PTS</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-brand-card/20 border border-white/5 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center backdrop-blur-3xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-5">
             <Trophy size={150} />
           </div>
           <Sparkles size={40} className="text-brand-yellow mb-6 animate-pulse" />
           <h4 className="text-2xl font-black uppercase italic tracking-tight text-white mb-4">A Glória é Eterna!</h4>
           <p className="text-white/40 text-sm font-medium mb-8 leading-relaxed">Cada batalha no Bora Stop é uma nova lenda sendo escrita. Desafie seus amigos novamente e prove quem é o verdadeiro mestre das palavras.</p>
           
           <div className="flex flex-col w-full gap-4">
             <Link href={`/lobby/${code}`}>
               <Button size="lg" fullWidth className="game-button h-20 text-xl font-black italic tracking-widest">
                 NOVA BATALHA <RotateCw size={24} className="ml-4" />
               </Button>
             </Link>
             <Link href="/">
               <Button variant="secondary" size="lg" fullWidth className="h-16 text-sm font-black italic tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                 RETORNAR AO QG <Home size={20} className="ml-4" />
               </Button>
             </Link>
           </div>
        </div>
      </div>

    </PageContainer>
  );
}
