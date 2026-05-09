import React from "react";
import Link from "next/link";
import { Users, Trophy, ChevronRight, Lock, Globe } from "lucide-react";
import type { Room } from "@/types/game";

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  return (
    <Link href={`/lobby/${room.code}`} className="block">
      <div className="group bg-brand-card/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 transition-all hover:border-brand-purple hover:bg-brand-purple/5 hover:-translate-y-1 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-xl text-white group-hover:text-brand-purple transition-colors uppercase tracking-tight">
                {room.name}
              </h3>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {room.isPrivate ? (
                  <>
                    <Lock size={10} className="text-brand-yellow" />
                    <span>Privada</span>
                  </>
                ) : (
                  <>
                    <Globe size={10} className="text-brand-blue" />
                    <span>Pública</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
                <Users size={14} className="text-brand-purple" />
                <span>{room.playersCount}/{room.maxPlayers} Jogadores</span>
              </div>
              <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-widest">
                <Trophy size={14} className="text-brand-yellow" />
                <span>{room.rounds} Rodadas</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Código</span>
              <span className="font-mono font-black text-brand-yellow tracking-widest text-lg">{room.code}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-brand-purple group-hover:text-white transition-all shadow-inner">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
