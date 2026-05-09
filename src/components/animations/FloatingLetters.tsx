'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const LETTERS = ['A', 'B', 'C', 'S', 'T', 'P', 'R', 'M'];

interface FloatingLetterProps {
  letter: string;
  initialX: number;
  initialY: number;
  delay: number;
  duration: number;
  scale: number;
}

export default function FloatingLetters() {
  const [elements, setElements] = useState<FloatingLetterProps[]>([]);

  useEffect(() => {
    // Generate static initial positions to prevent hydration mismatch, 
    // or just generate on client-side only. 8 is enough and better for mobile performance.
    const newElements = Array.from({ length: 8 }).map((_, i) => ({
      letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 15 + Math.random() * 20,
      scale: 0.5 + Math.random() * 1.5,
    }));
    setElements(newElements);
  }, []);

  if (elements.length === 0) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {elements.map((el, idx) => (
        <motion.div
          key={idx}
          className="absolute text-brand-purple font-black italic opacity-[0.03] select-none"
          initial={{ 
            x: `${el.initialX}vw`, 
            y: `${el.initialY}vh`,
            scale: el.scale,
            rotate: 0
          }}
          animate={{ 
            y: [`${el.initialY}vh`, `${el.initialY - 20}vh`, `${el.initialY + 20}vh`, `${el.initialY}vh`],
            x: [`${el.initialX}vw`, `${el.initialX + 10}vw`, `${el.initialX - 10}vw`, `${el.initialX}vw`],
            rotate: [0, 90, 180, 360]
          }}
          transition={{
            duration: el.duration,
            repeat: Infinity,
            delay: el.delay,
            ease: "linear"
          }}
          style={{ fontSize: '10rem', willChange: 'transform' }}
        >
          {el.letter}
        </motion.div>
      ))}
    </div>
  );
}
