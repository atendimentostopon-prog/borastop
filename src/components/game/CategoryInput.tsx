import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface CategoryInputProps {
  category: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

export default function CategoryInput({ category, value = "", onChange, onBlur, onKeyDown, autoFocus, inputRef }: CategoryInputProps) {
  return (
    <div className="flex flex-col gap-2 group">
      <div className="flex items-center justify-between px-2">
        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-brand-blue/30 rounded-full group-focus-within:bg-brand-blue animate-pulse" />
          {category}
        </label>
        {value.length > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-brand-green">
            <Sparkles size={12} />
          </motion.div>
        )}
      </div>
      <div className="relative overflow-hidden rounded-2xl">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-base font-bold outline-none focus:border-brand-blue focus:bg-white/10 transition-all shadow-inner placeholder:text-white/10 placeholder:font-normal uppercase tracking-wide"
          placeholder="..."
        />
        {/* Animated border line */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-brand-blue w-0 group-focus-within:w-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
      </div>
    </div>
  );
}
