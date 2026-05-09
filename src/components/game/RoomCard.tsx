import React from "react";
import Link from "next/link";
import { Users, Trophy, ChevronRight, Lock, Globe, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Room } from "@/types/game";

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  const isFull = (room.playersCount || 0) >= room.maxPlayers;

  return (
    <Link href={`/lobby/${room.code}`} className="block group">
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-purple to-brand-yellow rounded-[2rem] blur opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
        
        <div className="relative bg-brand-card/90 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 transition-all duration-300 group-hover:border-white/20 group-hover:-translate-y-1 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all duration-500 shadow-inner">
                <Gamepad2 size={32} />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-2xl text-white uppercase italic tracking-tight group-hover:text-brand-yellow transition-colors">
                    {room.name}
                  </h3>
                  {room.isPrivate ? (
                    <Lock size={14} className="text-brand-yellow" />
                  ) : (
                    <Globe size={14} className="text-brand-blue" />
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                  <span className="flex items-center gap-1.5">
                    <Trophy size={12} className="text-brand-yellow/50" />
                    {room.rounds || room.total_rounds} Rodadas
                  </span>
                  <span className="w-1 h-1 bg-white/10 rounded-full" />
                  <span className="text-brand-purple/60">Modo Clássico</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-8 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Capacidade</span>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${isFull ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-brand-green/10 border-brand-green/20 text-brand-green'}`}>
                  <Users size={16} />
                  <span className="font-mono font-black text-lg">
                    {room.playersCount}/{room.maxPlayers}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Sala</span>
                <span className="font-mono font-black text-brand-yellow text-xl tracking-[0.2em]">{room.code}</span>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-brand-purple group-hover:text-white transition-all duration-300 shadow-xl group-hover:rotate-12">
                <ChevronRight size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
