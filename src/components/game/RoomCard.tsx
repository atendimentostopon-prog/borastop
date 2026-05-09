import React from "react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { Users, Lock, Globe, Clock } from "lucide-react";
import type { Room } from "@/types/game";

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-blue/50 transition-colors">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">{room.name}</span>
          {room.isPrivate ? (
            <Lock size={16} className="text-red-400" />
          ) : (
            <Globe size={16} className="text-brand-green" />
          )}
        </div>
        <div className="text-sm text-white/50 font-mono">#{room.code}</div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 bg-black/40 px-4 py-2 rounded-lg">
        <div className="flex items-center gap-1">
          <Users size={16} className="text-brand-blue" />
          <span>{room.playersCount}/{room.maxPlayers}</span>
        </div>
        <div className="w-px h-4 bg-white/20 hidden md:block"></div>
        <div className="flex items-center gap-1">
          <Clock size={16} className="text-brand-yellow" />
          <span>{room.rounds || room.total_rounds} rodadas</span>
        </div>
      </div>

      <Link href={`/lobby/${room.code}`}>
        <Button variant="primary" size="sm">Entrar</Button>
      </Link>
    </div>
  );
}
