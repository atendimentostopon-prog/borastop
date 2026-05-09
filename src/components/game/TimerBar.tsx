import React from "react";
import { Timer } from "lucide-react";
import { motion } from "framer-motion";

interface TimerBarProps {
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
}

export default function TimerBar({ timeRemaining, totalTime }: TimerBarProps) {
  const percentage = Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));
  
  // Change color based on remaining time
  let colorClass = "bg-brand-green";
  if (percentage < 50) colorClass = "bg-brand-yellow";
  if (timeRemaining <= 10) colorClass = "bg-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]";

  const isDanger = timeRemaining <= 10 && timeRemaining > 0;
  const isCritical = timeRemaining <= 5 && timeRemaining > 0;

  return (
    <motion.div 
      className="w-full flex items-center gap-4"
      animate={isCritical ? { x: [-4, 4, -4, 4, 0] } : isDanger ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
      transition={isDanger ? { repeat: Infinity, duration: 0.5 } : {}}
    >
      <div className="flex items-center gap-2 font-mono font-bold text-2xl w-24">
        <Timer className={timeRemaining <= 10 ? "text-red-500" : "text-white"} />
        <span className={timeRemaining <= 10 ? "text-red-500" : "text-white"}>
          {timeRemaining}s
        </span>
      </div>
      <div className={`flex-1 h-6 bg-black/50 rounded-full overflow-hidden border ${timeRemaining <= 10 ? 'border-red-500/50' : 'border-white/10'}`}>
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-linear rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </motion.div>
  );
}
