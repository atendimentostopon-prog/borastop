'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatingLetters from '@/components/animations/FloatingLetters';
import GameLogo from '@/components/game/GameLogo';
import PageTransition from '@/components/animations/PageTransition';

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('stopon_nickname');
    if (saved) setNickname(saved);
  }, []);

  const handleSaveNickname = (val: string) => {
    setNickname(val);
    localStorage.setItem('stopon_nickname', val);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-brand-bg text-white relative overflow-hidden flex flex-col">
        <FloatingLetters />
        
        <Header />

        <main className="flex-grow flex flex-col items-center justify-center p-6 z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-full max-w-md"
          >
            <div className="flex justify-center mb-8">
              <GameLogo size="lg" />
            </div>

            <Card className="p-8 shadow-2xl border-white/20 backdrop-blur-xl">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-brand-yellow uppercase tracking-wider">Como quer ser chamado?</label>
                  <Input 
                    placeholder="Seu apelido..." 
                    value={nickname}
                    onChange={(e) => handleSaveNickname(e.target.value)}
                    maxLength={15}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <Link href="/create-room" className="block">
                    <Button fullWidth size="lg" className="shadow-[0_4px_0_#4A148C] active:translate-y-1 active:shadow-none transition-all">
                      Criar Nova Sala
                    </Button>
                  </Link>

                  <div className="relative flex items-center justify-center py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <span className="relative px-4 bg-[#2D0A4E] text-white/40 text-xs font-bold uppercase tracking-widest">OU</span>
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Código da sala" 
                      className="flex-grow uppercase font-mono tracking-[0.2em] text-center"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                    />
                    <Link href={`/lobby/${roomCode}`}>
                      <Button variant="secondary" className="px-6 h-full" disabled={roomCode.length < 4}>
                        Entrar
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            <div className="mt-8 flex justify-center gap-4 text-xs font-bold uppercase tracking-widest text-white/40">
              <Link href="/rooms" className="hover:text-brand-yellow transition-colors">Salas Públicas</Link>
              <span>•</span>
              <a href="#" className="hover:text-brand-yellow transition-colors">Como Jogar</a>
              <span>•</span>
              <a href="#" className="hover:text-brand-yellow transition-colors">Privacidade</a>
            </div>
          </motion.div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
