import React from "react";

interface AdPlaceholderProps {
  className?: string;
  type?: "banner" | "rectangle";
}

export default function AdPlaceholder({ className = "", type = "rectangle" }: AdPlaceholderProps) {
  const dimensions = type === "banner" ? "w-full h-[90px]" : "w-full h-[250px] md:w-[300px]";

  return (
    <div className={`bg-white/5 border border-dashed border-white/20 rounded-xl flex items-center justify-center text-white/30 text-sm font-mono ${dimensions} ${className}`}>
      Espaço para anúncio
    </div>
  );
}
