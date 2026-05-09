import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Star, Target } from "lucide-react";
import type { Player } from "@/types/game";

interface ScoreboardProps {
  players: Player[];
  className?: string;
}

export default function Scoreboard({ players, className = "" }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  
  const getRankIcon = (index: number) => {
    switch(index) {
      case 0: return <Trophy size={14} className="text-brand-yellow" />;
      case 1: return <Medal size={14} className="text-gray-300" />;
      case 2: return <Star size={14} className="text-amber-700" />;
      default: return <Target size={12} className="text-white/20" />;
    }
  };

  return (
    <div className={`bg-brand-card/20 backdrop-blur-3xl border border-white/5 rounded-[2rem] flex flex-col overflow-hidden shadow-2xl ${className}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 bg-white/5 shrink-0 flex items-center justify-between">
        <h3 className="font-black italic uppercase tracking-[0.2em] text-[10px] text-white/40 flex items-center gap-2">
          <div className="w-1 h-1 bg-brand-yellow rounded-full animate-ping" />
          Live Ranking
        </h3>
        <span className="text-[10px] font-black text-white/20">{players.length} Players</span>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {sorted.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/20 text-[10px] font-black uppercase tracking-widest text-center py-10 italic">
              Aguardando gladiadores...
            </motion.p>
          ) : (
            sorted.map((p, i) => (
              <motion.div 
                layout
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 group hover:bg-white/10 transition-all ${i === 0 ? 'ring-1 ring-brand-yellow/20 bg-brand-yellow/5' : ''}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center font-black italic text-sm border border-white/10 ${i === 0 ? 'text-brand-yellow' : 'text-white/40'}`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-black border border-white/10 rounded-lg flex items-center justify-center shadow-lg">
                    {getRankIcon(i)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase italic text-xs text-white/80 truncate group-hover:text-white transition-colors">
                    {p.name}
                  </p>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                    #{i + 1} Position
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <motion.p 
                    key={p.score}
                    initial={{ scale: 1.2, color: "#fbbf24" }}
                    animate={{ scale: 1, color: "#fbbf24" }}
                    className="text-lg font-black italic tracking-tight"
                  >
                    {p.score ?? 0}
                  </motion.p>
                  <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter -mt-1">Points</p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer Decoration */}
      <div className="p-4 bg-white/5 border-t border-white/5 opacity-30 flex justify-center gap-1">
        {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 bg-white/20 rounded-full" />)}
      </div>
    </div>
  );
}
