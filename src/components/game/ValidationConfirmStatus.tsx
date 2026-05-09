'use client';
import { CheckCircle, Clock } from "lucide-react";

interface Props {
  confirmedPlayerIds: string[];
  players: { id: string; name: string }[];
  hasConfirmed: boolean;
}

export default function ValidationConfirmStatus({ confirmedPlayerIds, players, hasConfirmed }: Props) {
  const pending = players.filter(p => !confirmedPlayerIds.includes(p.id));
  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-white/60 font-bold text-sm uppercase tracking-wider">Avaliações</span>
        <span className="font-bold text-brand-yellow">{confirmedPlayerIds.length}/{players.length}</span>
      </div>
      <div className="flex flex-col gap-1">
        {players.map(p => {
          const done = confirmedPlayerIds.includes(p.id);
          return (
            <div key={p.id} className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all ${done ? 'bg-brand-green/10 text-brand-green' : 'bg-black/20 text-white/40'}`}>
              {done ? <CheckCircle size={15} className="shrink-0" /> : <Clock size={15} className="shrink-0 animate-pulse" />}
              {p.name}
              {done && <span className="ml-auto text-xs opacity-70">avaliou ✓</span>}
            </div>
          );
        })}
      </div>
      {hasConfirmed && pending.length > 0 && (
        <p className="text-white/40 text-xs text-center animate-pulse">
          Aguardando: {pending.map(p => p.name).join(", ")}...
        </p>
      )}
    </div>
  );
}
