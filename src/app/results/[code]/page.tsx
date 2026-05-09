'use client';

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PlayerCard from "@/components/game/PlayerCard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AdPlaceholder from "@/components/game/AdPlaceholder";
import { Trophy, Home, RotateCw } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Player } from "@/types/game";
import AnimatedCard from "@/components/animations/AnimatedCard";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { audioSystem } from "@/lib/audio";

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [code]);

  const loadResults = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const { data: roomData } = await supabase.from('rooms').select('id').eq('code', code).single() as any;
      if (!roomData) return;

      const { data: playersData } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id)
        .order('score', { ascending: false });

      const { data: answersData } = await supabase
        .from('answers')
        .select('*')
        .eq('room_id', roomData.id);

      if (playersData) {
        setPlayers((playersData as any[]).map(p => {
          const pAnswers = (answersData as any[] | null)?.filter(a => a.player_id === p.id) || [];
          const valid = pAnswers.filter(a => a.is_valid && a.points === 10).length;
          const repeated = pAnswers.filter(a => a.is_valid && a.points === 5).length;
          const invalid = pAnswers.filter(a => a.is_valid === false).length;
          return {
            id: p.id,
            name: p.nickname,
            score: p.score || 0,
            isReady: false,
            stats: { valid, repeated, invalid }
          };
        }));
      }
    } catch (e) {
      console.error("Error loading results", e);
    } finally {
      setLoading(false);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const winner = sortedPlayers[0];

  useEffect(() => {
    if (!loading && players.length > 0) {
      audioSystem.play('win');
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FDE047', '#4ADE80', '#A78BFA', '#F87171']
      });
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 80, origin: { x: 0.2, y: 0.6 } });
        confetti({ particleCount: 100, spread: 80, origin: { x: 0.8, y: 0.6 } });
      }, 1000);
    }
  }, [loading, players]);

  if (loading) {
     return <PageContainer className="flex items-center justify-center min-h-[50vh]"><div className="text-white/50 text-xl animate-pulse">Calculando resultados...</div></PageContainer>;
  }

  if (players.length === 0) {
    return (
      <PageContainer className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <div className="text-red-400 text-xl">Não foi possível carregar os resultados.</div>
        <Link href="/">
          <Button>Voltar para Home</Button>
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col items-center py-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-5xl md:text-7xl font-black uppercase italic text-brand-yellow drop-shadow-[0_4px_0_#b89b00] mb-2">
          Fim de Jogo!
        </h1>
        <p className="text-xl text-white/70">A partida na sala #{code} terminou.</p>
      </motion.div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {winner && (
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-brand-yellow/20 blur-xl rounded-full"></div>
              <div className="w-40 h-40 bg-brand-yellow rounded-full flex items-center justify-center text-7xl font-bold border-8 border-brand-purple z-10 relative shadow-[0_0_40px_rgba(255,215,0,0.5)]">
                {winner.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -top-6 -right-6 text-brand-yellow drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-20 rotate-12">
                <Trophy size={64} fill="currentColor" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black mb-2">{winner.name}</h2>
            <div className="bg-brand-purple px-6 py-2 rounded-full font-mono text-xl text-brand-yellow font-bold border border-brand-purple-light">
              {winner.score} pontos
            </div>
          </motion.div>
        )}

        <AnimatedCard className="flex flex-col gap-4">
          <h3 className="font-bold text-center text-white/50 uppercase tracking-widest mb-2">Ranking Final</h3>
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {sortedPlayers.map((player, index) => (
                <motion.div 
                  key={player.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (index * 0.1) }}
                  className="relative"
                >
                  <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm z-10 shadow-lg ${
                    index === 0 ? "bg-brand-yellow text-brand-purple" : 
                    index === 1 ? "bg-gray-300 text-gray-800" : 
                    index === 2 ? "bg-amber-700 text-white" : 
                    "bg-black/50 text-white/50"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="pl-6">
                    <PlayerCard player={player} showStatus={false} />
                    {(player as any).stats && (
                      <div className="flex gap-2 text-xs font-bold mt-2 ml-14">
                        <span className="text-brand-green bg-brand-green/10 px-2 py-1 rounded-md">{(player as any).stats.valid} Válidas</span>
                        <span className="text-brand-yellow bg-brand-yellow/10 px-2 py-1 rounded-md">{(player as any).stats.repeated} Repetidas</span>
                        <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded-md">{(player as any).stats.invalid} Inválidas</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </AnimatedCard>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mb-12"
      >
        <Link href={`/lobby/${code}`} className="w-full">
          <Button size="lg" fullWidth className="gap-3">
            <RotateCw size={24} /> Jogar Novamente
          </Button>
        </Link>
        <Link href="/" className="w-full">
          <Button variant="secondary" size="lg" fullWidth className="gap-3 border-2 border-brand-purple-light">
            <Home size={24} /> Voltar para Home
          </Button>
        </Link>
      </motion.div>

      <div className="w-full max-w-2xl">
        <AdPlaceholder type="banner" />
      </div>
    </PageContainer>
  );
}
