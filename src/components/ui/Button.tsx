'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export default function Button({
  className,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    default: 'bg-brand-purple text-white hover:bg-brand-purple-light shadow-[0_4px_0_#4A148C] active:shadow-none active:translate-y-1',
    primary: 'bg-brand-yellow text-brand-purple hover:brightness-110 shadow-[0_4px_0_#B8860B] active:shadow-none active:translate-y-1',
    secondary: 'bg-white/5 text-white hover:bg-white/10 border border-white/10 shadow-xl',
    outline: 'bg-transparent border-2 border-white/20 text-white hover:bg-white/5 hover:border-white/40',
    ghost: 'bg-transparent text-white/60 hover:text-white hover:bg-white/5',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_0_#991B1B] active:shadow-none active:translate-y-1',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center font-black uppercase italic tracking-widest rounded-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none overflow-hidden group',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <span className="flex items-center gap-2">{children}</span>
      )}
    </button>
  );
}
