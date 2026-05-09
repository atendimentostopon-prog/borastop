'use client';

import React, { ButtonHTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles = "font-bold rounded-xl flex items-center justify-center gap-2 relative overflow-hidden";
  
  const variants = {
    primary: "bg-brand-yellow text-brand-purple shadow-[0_4px_0_#b89b00]",
    secondary: "bg-brand-purple text-white shadow-[0_4px_0_#320935]",
    danger: "bg-red-500 text-white shadow-[0_4px_0_#991b1b]",
    ghost: "bg-transparent text-white/80 hover:text-white"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl"
  };

  return (
    <motion.button
      whileHover={{ 
        scale: 1.05, 
        y: -2,
        boxShadow: variant === 'primary' ? '0px 0px 15px rgba(255, 214, 0, 0.6)' : undefined
      }}
      whileTap={{ scale: 0.95, y: 2 }}
      className={cn(baseStyles, variants[variant], sizes[size], fullWidth ? "w-full" : "", className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
