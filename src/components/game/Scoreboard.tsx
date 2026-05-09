import React from "react";
import type { Player } from "@/types/game";

interface ScoreboardProps {
  players: Player[];
  className?: string;
}

export default function Scoreboard({ players, className = "" }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const colors = ["bg-rose-500", "bg-blue-500", "bg-brand-green", "bg-yellow-500", "bg-purple-500"];

  return (
    <div className={`bg-black/30 border border-white/10 rounded-2xl flex flex-col overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-white/10 bg-black/20 shrink-0">
        <h3 className="font-bold text-center text-white/80 uppercase tracking-wider text-sm">🏆 Placar</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
        {sorted.length === 0 && (
          <p className="text-white/30 text-xs text-center py-4">Nenhum jogador ainda</p>
        )}
        {sorted.map((p, i) => {
          const bg = colors[p.name.length % colors.length];
          return (
            <div key={p.id} className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-xl px-3 py-2">
              <span className="text-white/40 font-bold text-xs w-4 shrink-0">{i + 1}.</span>
              <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center font-bold text-sm border border-white/20 shrink-0`}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-sm flex-1 truncate">{p.name}</span>
              <span className="text-brand-yellow font-bold text-sm shrink-0">{p.score ?? 0} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
