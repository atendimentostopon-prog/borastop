import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-brand-card rounded-3xl border border-white/5 overflow-hidden", className)}>
      {children}
    </div>
  );
}
