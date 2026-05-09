'use client';

import { motion } from "framer-motion";
import { Users, Lock, Unlock, Play, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Room } from "@/types/game";
import Button from "@/components/ui/Button";

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  const isFull = room.playersCount >= room.maxPlayers;
  const fillPercentage = (room.playersCount / room.maxPlayers) * 100;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      className="group relative"
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-purple to-brand-blue rounded-[2.5rem] blur opacity-0 group-hover:opacity-20 transition-opacity" />
      
      <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-8 bg-brand-card/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden">
        
        {/* Status Indicator */}
        <div className="absolute top-0 left-0 w-2 h-full bg-brand-purple opacity-50" />

        {/* Room Info */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-3 mb-2">
            {room.isPrivate ? (
              <div className="p-2 rounded-xl bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20">
                <Lock size={16} />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-brand-green/10 text-brand-green border border-brand-green/20">
                <Unlock size={16} />
              </div>
            )}
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              Arena #{room.code}
            </span>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white mb-4 group-hover:text-brand-purple transition-colors">
            {room.name}
          </h3>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black uppercase text-white/30">Rounds</span>
              <span className="text-sm font-black italic text-white">{room.rounds}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black uppercase text-white/30">Status</span>
              <span className="text-xs font-black italic text-brand-blue uppercase">Lobby</span>
            </div>
          </div>
        </div>

        {/* Players Count Visualizer */}
        <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
          <div className="relative w-40 h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${fillPercentage}%` }}
              className={`absolute top-0 left-0 h-full ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-brand-purple to-brand-blue'}`}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[...Array(Math.min(room.playersCount, 4))].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-brand-card bg-white/10 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-brand-purple/20" />
                </div>
              ))}
              {room.playersCount > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-brand-card bg-brand-card flex items-center justify-center text-[10px] font-black text-white/40">
                  +{room.playersCount - 4}
                </div>
              )}
            </div>
            <span className={`text-lg font-black italic ${isFull ? 'text-red-500' : 'text-white'}`}>
              {room.playersCount} / {room.maxPlayers}
            </span>
          </div>
        </div>

        {/* Action */}
        <Link href={`/lobby/${room.code}`} className="w-full md:w-auto">
          <Button 
            disabled={isFull}
            variant={isFull ? "secondary" : "primary"}
            className={`game-button w-full md:w-auto px-10 h-16 text-sm font-black italic tracking-widest ${isFull ? 'opacity-50 grayscale' : ''}`}
          >
            {isFull ? 'LOTADA' : 'ENTRAR'}
            <ChevronRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
