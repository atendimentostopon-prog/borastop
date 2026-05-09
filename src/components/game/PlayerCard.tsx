'use client';

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, User, Zap } from "lucide-react";
import type { Player } from "@/types/game";

interface PlayerCardProps {
  player: Player;
  showStatus?: boolean;
}

export default function PlayerCard({ player, showStatus = true }: PlayerCardProps) {
  const colors = [
    { bg: "bg-brand-purple/20", border: "border-brand-purple/40", text: "text-brand-purple" },
    { bg: "bg-brand-blue/20", border: "border-brand-blue/40", text: "text-brand-blue" },
    { bg: "bg-brand-yellow/20", border: "border-brand-yellow/40", text: "text-brand-yellow" },
    { bg: "bg-brand-green/20", border: "border-brand-green/40", text: "text-brand-green" },
  ];
  
  const theme = colors[player.name.length % colors.length];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, x: 5 }}
      className={`group relative bg-brand-card/20 backdrop-blur-md border ${player.isReady ? 'border-brand-green/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-white/5'} rounded-3xl p-4 flex items-center justify-between transition-all duration-300 ${player.isOnline === false ? 'opacity-40 grayscale pointer-events-none' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar Container */}
        <div className="relative">
          <div className={`w-14 h-14 rounded-2xl ${theme.bg} ${theme.border} border-2 flex items-center justify-center font-black text-2xl shadow-inner relative overflow-hidden group-hover:rotate-6 transition-transform`}>
            <span className={theme.text}>{player.name.charAt(0).toUpperCase()}</span>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          </div>
          
          {/* Status Dot */}
          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-4 border-black flex items-center justify-center ${player.isOnline !== false ? 'bg-brand-green' : 'bg-gray-500'}`}>
            <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-black italic uppercase text-lg tracking-tight text-white/90 group-hover:text-white transition-colors">
              {player.name}
            </span>
            {player.score !== undefined && player.score > 0 && (
              <div className="flex items-center gap-1 bg-brand-yellow/10 px-2 py-0.5 rounded-lg border border-brand-yellow/20">
                <Zap size={10} className="text-brand-yellow fill-brand-yellow" />
                <span className="text-[10px] font-black text-brand-yellow">{player.score}</span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Competidor</span>
        </div>
      </div>
      
      {showStatus && (
        <div className="flex flex-col items-end gap-1">
          <motion.div 
            animate={player.isReady ? { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-black italic tracking-widest uppercase transition-all duration-500 ${
              player.isReady 
                ? "bg-brand-green text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]" 
                : "bg-white/5 text-white/20 border border-white/5"
            }`}
          >
            {player.isReady ? "PRONTO" : "ESPERANDO"}
          </motion.div>
        </div>
      )}

      {/* Decorative lines */}
      <div className="absolute right-4 bottom-2 opacity-10">
        <div className="w-8 h-1 bg-white/20 rounded-full mb-1" />
        <div className="w-4 h-1 bg-white/20 rounded-full ml-auto" />
      </div>
    </motion.div>
  );
}
