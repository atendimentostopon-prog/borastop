'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverScale?: boolean;
}

export default function AnimatedCard({ 
  children, 
  className, 
  delay = 0,
  hoverScale = false
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.23, 1, 0.32, 1] // easeOutQuint
      }}
      whileHover={hoverScale ? { scale: 1.02, transition: { duration: 0.2 } } : undefined}
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  );
}
