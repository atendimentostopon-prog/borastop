import React from 'react';
import Link from 'next/link';
import GameLogo from '../game/GameLogo';
import { Trophy, Users, Settings } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full py-4 px-6 flex items-center justify-between z-10 backdrop-blur-md bg-brand-bg/50 border-b border-white/5">
      <Link href="/" className="hover:scale-105 transition-transform">
        <GameLogo size="sm" />
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        <Link href="/rooms" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-brand-yellow transition-colors">
          <Users size={16} /> Salas
        </Link>
        <Link href="#" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-brand-yellow transition-colors">
          <Trophy size={16} /> Ranking
        </Link>
        <Link href="#" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-brand-yellow transition-colors">
          <Settings size={16} /> Opções
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-brand-purple border border-white/20 flex items-center justify-center font-bold text-xs text-white shadow-lg cursor-pointer hover:ring-2 ring-brand-yellow transition-all">
          JD
        </div>
      </div>
    </header>
  );
}
