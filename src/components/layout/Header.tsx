import Link from "next/link";
import GameLogo from "@/components/game/GameLogo";

export default function Header() {
  return (
    <header className="w-full p-4 md:p-6 bg-black/20 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="transition-transform hover:scale-105">
          <GameLogo size="sm" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/rooms" className="text-white/80 hover:text-white transition-colors font-bold">
            Salas
          </Link>
          <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center font-bold border-2 border-brand-blue cursor-pointer">
            T
          </div>
        </div>
      </div>
    </header>
  );
}
