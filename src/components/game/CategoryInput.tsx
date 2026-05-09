'use client';

import React from 'react';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface CategoryInputProps {
  category: string;
  letter: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function CategoryInput({ category, letter, value, onChange, disabled }: CategoryInputProps) {
  const isInvalid = value.length > 0 && value[0].toUpperCase() !== letter.toUpperCase();

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-white/40 uppercase tracking-widest pl-1">
        {category}
      </label>
      <div className="relative group">
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all",
          value.length > 0 ? (isInvalid ? "bg-red-500" : "bg-brand-green") : "bg-white/10"
        )} />
        <Input
          placeholder={`Digite um(a) ${category.toLowerCase()}...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "pl-6 py-6 text-lg font-bold tracking-wide transition-all",
            isInvalid ? "border-red-500/50 bg-red-500/5" : (value.length > 0 ? "border-brand-green/50 bg-brand-green/5" : "")
          )}
        />
      </div>
    </div>
  );
}
