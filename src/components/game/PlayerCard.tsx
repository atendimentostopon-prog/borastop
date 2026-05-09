'use client';

import { motion } from "framer-motion";
import { User, Shield, Zap, Circle, CheckCircle2 } from "lucide-react";
import { Player } from "@/types/game";

interface PlayerCardProps {
  player: Player;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`relative group overflow-hidden bg-brand-card/20 backdrop-blur-xl border border-white/5 p-6 rounded-3xl transition-all duration-300 hover:bg-white/5 ${player.isReady ? 'border-brand-green/30' : ''}`}
    >
      {/* Background Decorativo Baseado no Status */}
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${player.isReady ? 'bg-brand-green' : 'bg-brand-purple'}`} />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-5">
          {/* Avatar Area */}
          <div className="relative">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${player.isReady ? 'bg-brand-green/10 border-brand-green shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
              <User size={32} className={`transition-colors duration-500 ${player.isReady ? 'text-brand-green' : 'text-white/20'}`} />
            </div>
            
            {/* Online/Offline Status Indicator */}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-brand-card flex items-center justify-center ${player.isOnline ? 'bg-brand-green' : 'bg-red-500'}`}>
              {player.isOnline ? (
                <Zap size={8} className="text-white fill-current" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black uppercase italic text-white group-hover:text-brand-purple transition-colors">{player.name}</h3>
              {player.isHost && (
                <div className="bg-brand-yellow/10 text-brand-yellow p-1 rounded-lg border border-brand-yellow/20" title="Host da Sala">
                  <Shield size={14} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Nível 1</span>
               <div className="w-1 h-1 rounded-full bg-white/10" />
               <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{player.score || 0} XP</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <AnimatePresence mode="wait">
            {player.isReady ? (
              <motion.div
                key="ready"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex flex-col items-end gap-1"
              >
                <div className="bg-brand-green/20 text-brand-green px-4 py-1.5 rounded-full border border-brand-green/30 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">PRONTO</span>
                </div>
                <span className="text-[8px] font-bold text-brand-green/40 uppercase">AGUARDANDO...</span>
              </motion.div>
            ) : (
              <motion.div
                key="not-ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-end gap-1"
              >
                <div className="bg-white/5 text-white/20 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
                  <Circle size={14} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">PREPARANDO</span>
                </div>
                <span className="text-[8px] font-bold text-white/10 uppercase">EM BREVE...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

import { AnimatePresence } from "framer-motion";
