import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export default function Input({ className, error, ...props }: InputProps) {
  return (
    <div className="w-full space-y-1">
      <input
        className={cn(
          'w-full bg-black/30 border-2 border-white/5 rounded-2xl px-5 py-4 text-white font-bold placeholder:text-white/20 outline-none transition-all focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/20',
          error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-2 italic">
          {error}
        </p>
      )}
    </div>
  );
}
