'use client';

import React from 'react';
import { Crown, CheckCircle2, User } from 'lucide-react';
import { Player } from '@/types/game';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: Player;
  isMe?: boolean;
  showStatus?: boolean;
}

export default function PlayerCard({ player, isMe = false, showStatus = true }: PlayerCardProps) {
  const initials = player.name.charAt(0).toUpperCase();
  
  // Cores baseadas no nome do jogador para avatares consistentes
  const bgColors = [
    'bg-brand-purple',
    'bg-brand-blue',
    'bg-brand-green',
    'bg-red-500',
    'bg-pink-500',
    'bg-orange-500'
  ];
  const avatarBg = bgColors[player.name.length % bgColors.length];

  return (
    <div className={cn(
      "relative group bg-brand-card/40 backdrop-blur-md rounded-2xl p-4 border transition-all duration-300",
      isMe ? "border-brand-yellow ring-2 ring-brand-yellow/20" : "border-white/5 hover:border-white/20",
      player.isReady ? "shadow-[0_0_20px_rgba(74,222,128,0.1)]" : ""
    )}>
      <div className="flex items-center gap-4">
        {/* Avatar Section */}
        <div className="relative">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl transform group-hover:rotate-6 transition-transform",
            avatarBg
          )}>
            {initials}
          </div>
          
          {player.isHost && (
            <div className="absolute -top-2 -right-2 bg-brand-yellow p-1 rounded-lg text-brand-purple shadow-lg rotate-12">
              <Crown size={14} fill="currentColor" />
            </div>
          )}

          {isMe && (
            <div className="absolute -bottom-1 -left-1 bg-brand-blue p-1 rounded-lg text-black shadow-lg">
              <User size={10} fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white truncate uppercase tracking-tight">
              {player.name} {isMe && <span className="text-white/40 italic lowercase font-medium">(você)</span>}
            </h3>
          </div>
          <div className="text-xs font-black text-brand-yellow mt-0.5 uppercase tracking-widest">
            {player.score ?? 0} Pontos
          </div>
        </div>

        {/* Status Indicator */}
        {showStatus && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
            player.isReady 
              ? "bg-brand-green/20 border-brand-green/30 text-brand-green" 
              : "bg-black/20 border-white/5 text-white/20"
          )}>
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {player.isReady ? 'PRONTO' : 'PENDENTE'}
            </span>
            <CheckCircle2 size={14} className={player.isReady ? 'opacity-100' : 'opacity-20'} />
          </div>
        )}
      </div>
    </div>
  );
}
