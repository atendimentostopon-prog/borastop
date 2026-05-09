'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PulseGlowProps {
  children: ReactNode;
  active?: boolean;
  color?: 'brand-yellow' | 'brand-green' | 'red-500' | 'brand-blue';
  className?: string;
}

export default function PulseGlow({ children, active = true, color = 'brand-yellow', className }: PulseGlowProps) {
  if (!active) {
    return <div className={className}>{children}</div>;
  }

  const colorMap = {
    'brand-yellow': 'rgba(255, 214, 0, 0.4)',
    'brand-green': 'rgba(0, 255, 128, 0.4)',
    'red-500': 'rgba(239, 68, 68, 0.4)',
    'brand-blue': 'rgba(0, 194, 255, 0.4)',
  };

  return (
    <div className={cn("relative", className)}>
      <motion.div
        className="absolute inset-0 rounded-xl z-0"
        animate={{ 
          boxShadow: [
            `0 0 0 0 ${colorMap[color]}`,
            `0 0 20px 10px ${colorMap[color]}`,
            `0 0 0 0 ${colorMap[color]}`
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
