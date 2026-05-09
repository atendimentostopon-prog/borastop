import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function GameLogo({ size = 'md', className }: GameLogoProps) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-7xl',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 40,
  };

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      <div className="flex items-center gap-2">
        <h1 className={cn("font-black italic uppercase tracking-tighter text-white drop-shadow-[0_4px_0_#6A1B9A]", sizes[size])}>
          Bora <span className="text-brand-yellow">Stop!</span>
        </h1>
        <Sparkles className="text-brand-yellow animate-pulse" size={iconSizes[size]} />
      </div>
      <div className={cn(
        "bg-brand-purple text-white px-3 py-1 rounded-full font-black uppercase italic tracking-widest border border-white/20 -mt-1 shadow-lg",
        size === 'lg' ? 'text-xs' : 'text-[8px]'
      )}>
        Edição Multiplayer
      </div>
    </div>
  );
}
