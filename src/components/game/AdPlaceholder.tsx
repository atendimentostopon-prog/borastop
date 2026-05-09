import React from 'react';

interface AdPlaceholderProps {
  type: 'banner' | 'rectangle';
  className?: string;
}

export default function AdPlaceholder({ type, className = '' }: AdPlaceholderProps) {
  return (
    <div className={`bg-white/5 border border-dashed border-white/10 rounded-xl flex items-center justify-center overflow-hidden ${type === 'banner' ? 'h-24 w-full' : 'h-64 w-full'} ${className}`}>
      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">
        Publicidade {type === 'banner' ? 'Horizontal' : 'Quadrada'}
      </span>
    </div>
  );
}
