"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioSystem } from '@/lib/audio';

interface LetterIntroProps {
  letter: string;
  onComplete: () => void;
}

export default function LetterIntro({ letter, onComplete }: LetterIntroProps) {
  const [phase, setPhase] = useState<'countdown' | 'letter'>('countdown');
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (phase === 'countdown') {
      if (count > 0) {
        audioSystem.play('tick');
        const timer = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase('letter');
        audioSystem.play('start');
      }
    } else if (phase === 'letter') {
      const timer = setTimeout(() => {
        onComplete();
      }, 2500); // Show letter for 2.5 seconds
      return () => clearTimeout(timer);
    }
  }, [count, phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {phase === 'countdown' ? (
          <motion.div
            key={`count-${count}`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-8xl md:text-9xl font-black text-brand-yellow drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]"
          >
            {count}
          </motion.div>
        ) : (
          <motion.div
            key="letter"
            initial={{ scale: 0.2, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0, filter: "blur(20px)" }}
            transition={{ 
              type: "spring", 
              damping: 12, 
              stiffness: 100,
              duration: 0.8
            }}
            className="flex flex-col items-center justify-center"
          >
            <span className="text-2xl md:text-4xl text-brand-blue/80 font-bold mb-4 tracking-[0.2em] uppercase">
              A Letra é
            </span>
            <div className="relative">
              <div className="absolute inset-0 bg-brand-yellow blur-[60px] opacity-40 rounded-full"></div>
              <span className="relative text-[12rem] md:text-[18rem] font-black text-white leading-none drop-shadow-[0_0_40px_rgba(250,204,21,0.8)]">
                {letter.toUpperCase()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
