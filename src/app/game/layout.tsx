import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jogo | Bora Stop",
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    // Layout sem footer para tela de jogo
    <div className="flex-1 flex flex-col min-h-0">
      {children}
    </div>
  );
}
