import React from "react";

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
    <div className="flex flex-col gap-1">
      <label className="text-sm font-bold text-white/80 uppercase tracking-wider ml-1">{category}</label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-white text-lg outline-none focus:border-brand-green focus:bg-brand-green/10 transition-colors shadow-inner"
        placeholder={`Sua resposta...`}
      />
    </div>
  );
}
