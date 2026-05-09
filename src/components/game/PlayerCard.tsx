'use client';

import React from "react";
import { motion } from "framer-motion";
import type { Player } from "@/types/game";

interface PlayerCardProps {
  player: Player;
  showStatus?: boolean;
}

export default function PlayerCard({ player, showStatus = true }: PlayerCardProps) {
  // Generate random pastel color based on name length for avatar
  const colors = ["bg-rose-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"];
  const bgColor = colors[player.name.length % colors.length];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-between transition-opacity ${player.isOnline === false ? 'opacity-40 grayscale' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center font-bold text-xl border-2 border-white/20`}>
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${player.isOnline !== false ? 'bg-brand-green' : 'bg-gray-500'}`} title={player.isOnline !== false ? 'Online' : 'Offline'} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold">{player.name}</span>
          {player.score !== undefined && (
            <span className="text-sm text-brand-yellow font-bold">{player.score} pts</span>
          )}
        </div>
      </div>
      
      {showStatus && (
        <motion.div 
          animate={player.isReady ? { scale: [1, 1.1, 1], boxShadow: ["0px 0px 0px rgba(0,255,128,0)", "0px 0px 8px rgba(0,255,128,0.6)", "0px 0px 0px rgba(0,255,128,0)"] } : {}}
          transition={player.isReady ? { repeat: Infinity, duration: 2 } : {}}
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            player.isReady ? "bg-brand-green/20 text-brand-green border border-brand-green/30" : "bg-white/10 text-white/50"
          }`}
        >
          {player.isReady ? "PRONTO" : "AGUARDANDO"}
        </motion.div>
      )}
    </motion.div>
  );
}
