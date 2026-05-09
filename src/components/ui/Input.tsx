import React, { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {label && <label className="text-white/80 font-bold ml-1">{label}</label>}
      <input
        className={`w-full bg-black/40 border-2 ${
          error ? "border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "border-white/10 focus:border-brand-blue focus:shadow-[0_0_15px_rgba(0,194,255,0.4)]"
        } rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none transition-all duration-300 ${className}`}
        {...props}
      />
      {error && <span className="text-red-400 text-sm ml-1">{error}</span>}
    </div>
  );
}
