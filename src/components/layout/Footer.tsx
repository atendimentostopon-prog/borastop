import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full py-8 px-6 border-t border-white/5 bg-black/20 mt-auto z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-white/30 text-xs font-bold uppercase tracking-widest">
          © 2026 BORA STOP! - FEITO COM ❤️ PARA A GALERA
        </div>
        <div className="flex gap-6 text-white/30 text-[10px] font-black uppercase tracking-tighter">
          <a href="#" className="hover:text-brand-yellow transition-colors">Termos</a>
          <a href="#" className="hover:text-brand-yellow transition-colors">Privacidade</a>
          <a href="#" className="hover:text-brand-yellow transition-colors">Suporte</a>
        </div>
      </div>
    </footer>
  );
}
