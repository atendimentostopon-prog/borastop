'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LetterIntroProps {
  letter: string;
  onComplete?: () => void;
}

export default function LetterIntro({ letter, onComplete }: LetterIntroProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-bg/90 backdrop-blur-xl"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ 
                type: 'spring',
                damping: 12,
                stiffness: 100,
                duration: 0.6
              }}
              className="w-48 h-48 md:w-64 md:h-64 bg-brand-yellow rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(253,224,71,0.3)] border-8 border-brand-purple"
            >
              <span className="text-8xl md:text-[10rem] font-black italic text-brand-purple drop-shadow-xl">
                {letter}
              </span>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute -bottom-16 left-0 right-0 text-center"
            >
              <h2 className="text-2xl font-black uppercase italic text-white tracking-widest">
                Letra do Round
              </h2>
            </motion.div>

            {/* Partículas de fundo */}
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{ 
                  scale: [0, 1, 0],
                  x: (i % 2 === 0 ? 1 : -1) * (100 + Math.random() * 100),
                  y: (i < 3 ? 1 : -1) * (100 + Math.random() * 100)
                }}
                transition={{ 
                  duration: 2,
                  delay: 0.2 + (i * 0.1),
                  repeat: Infinity
                }}
                className="absolute top-1/2 left-1/2 w-4 h-4 bg-brand-yellow rounded-full blur-sm opacity-50"
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
