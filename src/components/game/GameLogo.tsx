'use client';

import { motion } from "framer-motion";

interface GameLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function GameLogo({ size = "md", className = "" }: GameLogoProps) {
  const sizes = {
    sm: "text-2xl",
    md: "text-5xl md:text-7xl",
    lg: "text-7xl md:text-9xl"
  };

  return (
    <motion.div 
      className={`font-black uppercase tracking-tighter italic ${sizes[size]} ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05, rotate: -2, textShadow: "0px 0px 8px rgba(255,214,0,0.8)" }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    >
      <span className="text-transparent bg-clip-text bg-gradient-to-br from-brand-yellow via-yellow-400 to-orange-500 drop-shadow-[0_4px_0_#b89b00]">
        Bora
      </span>
      <span className="text-white drop-shadow-[0_4px_0_#6A1B9A]"> Stop</span>
    </motion.div>
  );
}
