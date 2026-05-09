'use client';
import { CheckCircle, Clock } from "lucide-react";
import { Player } from "@/types/game";

interface Props {
  confirmations: any[];
  players: Player[];
}

export default function ValidationConfirmStatus({ confirmations, players }: Props) {
  const confirmedPlayerIds = confirmations.map(c => c.player_id);
  const pending = players.filter(p => !confirmedPlayerIds.includes(p.id));

  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col gap-3 w-full max-w-md">
      <div className="flex items-center justify-between">
        <span className="text-white/60 font-bold text-sm uppercase tracking-wider">Status das Avaliações</span>
        <span className="font-bold text-brand-yellow">{confirmedPlayerIds.length}/{players.length}</span>
      </div>
      <div className="flex flex-col gap-1">
        {players.map(p => {
          const done = confirmedPlayerIds.includes(p.id);
          return (
            <div key={p.id} className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all ${done ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-black/20 text-white/40 border border-transparent'}`}>
              {done ? <CheckCircle size={15} className="shrink-0" /> : <Clock size={15} className="shrink-0 animate-pulse" />}
              <span className="truncate">{p.name}</span>
              {done && <span className="ml-auto text-[10px] font-black uppercase italic opacity-70">Finalizou</span>}
            </div>
          );
        })}
      </div>
      {pending.length > 0 && (
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center animate-pulse mt-2">
          Aguardando: {pending.map(p => p.name).join(", ")}...
        </p>
      )}
    </div>
  );
}
