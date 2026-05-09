'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  PlusCircle, 
  LayoutGrid, 
  Settings, 
  HelpCircle, 
  Globe, 
  Trophy, 
  User as UserIcon,
  ChevronRight,
  Info,
  Eye,
  EyeOff
} from "lucide-react";
import GameLogo from "@/components/game/GameLogo";
import GameButton from "@/components/game/GameButton";
import GameModal from "@/components/game/GameModal";
import { supabase } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/game/generateRoomCode";
import { MOCK_CATEGORIES } from "@/lib/mock/categories";
import { useToast } from "@/components/ui/ToastProvider";

export default function Home() {
  const router = useRouter();
  const { addToast } = useToast();
  const [nickname, setNickname] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("bora_stop_nickname");
    if (saved) setNickname(saved);
  }, []);

  const saveNickname = () => {
    const cleanNick = nickname.trim();
    if (!cleanNick) {
      addToast("Digite seu apelido, herói!", "error");
      return false;
    }
    localStorage.setItem("bora_stop_nickname", cleanNick);
    return true;
  };

  const handlePlayNow = async () => {
    if (!saveNickname()) return;
    setIsSearching(true);

    try {
      // 1. Search for available public rooms
      const { data: rooms, error: searchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_private', false)
        .eq('status', 'lobby')
        .lt('players_count', 8)
        .order('players_count', { ascending: false })
        .limit(1);

      if (searchError) throw searchError;

      if (rooms && rooms.length > 0) {
        // Join existing room
        router.push(`/lobby/${rooms[0].code}`);
      } else {
        // 2. No room found, create a quick one
        const code = generateRoomCode();
        const { error: createError } = await supabase
          .from('rooms')
          .insert({
            code,
            name: `Sala de ${nickname}`,
            max_players: 8,
            rounds: 5,
            round_duration: 60,
            is_private: false,
            status: 'lobby',
            categories: MOCK_CATEGORIES.slice(0, 5).map(c => c.name),
            created_by: nickname
          });

        if (createError) throw createError;
        router.push(`/lobby/${code}`);
      }
    } catch (err) {
      console.error("Matchmaking error:", err);
      addToast("Erro ao encontrar partida. Tente novamente!", "error");
      setIsSearching(false);
    }
  };

  const handleCreateRoom = () => {
    if (!saveNickname()) return;
    setIsCreateModalOpen(true);
  };

  const confirmCreateRoom = () => {
    setIsCreateModalOpen(false);
    if (isPrivate) {
      router.push(`/create-room?private=true&password=${encodeURIComponent(password)}`);
    } else {
      router.push('/create-room');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-12 relative h-full">
      {/* Top Bar Icons */}
      <div className="absolute top-6 right-8 flex items-center gap-4 z-10">
        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/60 hover:text-white border border-white/5">
          <Settings size={20} />
        </button>
        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-white/60 hover:text-white border border-white/5">
          <HelpCircle size={20} />
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 text-xs font-bold text-white/60">
          <Globe size={14} />
          PT-BR
        </div>
      </div>

      {/* Main Logo Area */}
      <div className="flex flex-col items-center justify-center mb-12">
        <GameLogo size="lg" className="mb-2" />
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-purple/20 rounded-full border border-brand-purple/30">
          <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">Beta Online</span>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-y-auto no-scrollbar">
        
        {/* Left Side: Profile */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="game-card p-8 flex flex-col items-center text-center relative overflow-hidden group">
            {/* Avatar Glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-blue/10 blur-3xl group-hover:bg-brand-blue/20 transition-all" />
            
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue p-1 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                <div className="w-full h-full rounded-full bg-[#1A1C26] flex items-center justify-center overflow-hidden">
                  <UserIcon size={48} className="text-white/20" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-brand-yellow flex items-center justify-center border-4 border-[#0F111A] shadow-xl">
                <span className="text-black font-black italic text-xs">27</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block text-left px-1">
                  Nickname
                </label>
                <input 
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Seu nome no game..."
                  className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-4 py-3 font-black text-white placeholder:text-white/10 outline-none focus:border-brand-purple transition-all"
                />
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-brand-yellow italic">GOLD RANK</span>
                  <span className="text-[10px] font-bold text-white/40 italic">2.430 / 3.500 XP</span>
                </div>
                <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "65%" }}
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-blue rounded-full shadow-[0_0_10px_rgba(0,212,255,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="game-card p-6 border-brand-blue/20 bg-brand-blue/5">
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={18} className="text-brand-yellow" />
              <span className="text-xs font-black uppercase italic tracking-tighter">Temporada 8</span>
            </div>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Termina em 12d 08h</p>
          </div>
        </div>

        {/* Center Side: Main Buttons */}
        <div className="lg:col-span-6 flex flex-col justify-center gap-6">
          <GameButton 
            title={isSearching ? "PROCURANDO..." : "JOGAR"}
            subtitle="Encontrar partida agora"
            icon={Play}
            variant="accent"
            onClick={handlePlayNow}
            disabled={isSearching}
            className="w-full h-28"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GameButton 
              title="CRIAR SALA"
              subtitle="Chame seus amigos"
              icon={PlusCircle}
              variant="secondary"
              onClick={handleCreateRoom}
              className="h-28 md:h-32"
            />
            <GameButton 
              title="SALAS"
              subtitle="Entrar em uma sala"
              icon={LayoutGrid}
              variant="primary"
              onClick={() => {
                if (!saveNickname()) return;
                router.push('/rooms');
              }}
              className="h-28 md:h-32"
            />
          </div>
        </div>

        {/* Right Side: How to play */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="game-card p-6 flex-1 flex flex-col border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-6">
              <Info size={18} className="text-brand-blue" />
              <span className="text-xs font-black uppercase italic tracking-tighter">Como Jogar</span>
            </div>
            
            <div className="space-y-6 flex-1">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand-purple flex-shrink-0 flex items-center justify-center font-black text-xs italic">1</div>
                <p className="text-xs text-white/70 leading-relaxed font-bold">Sorteamos uma letra aleatória para a rodada.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand-blue flex-shrink-0 flex items-center justify-center font-black text-xs italic">2</div>
                <p className="text-xs text-white/70 leading-relaxed font-bold">Preencha cada categoria com palavras que começam com essa letra.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand-yellow flex-shrink-0 flex items-center justify-center font-black text-xs italic text-black">3</div>
                <p className="text-xs text-white/70 leading-relaxed font-bold">Seja o mais rápido a apertar o botão STOP para vencer!</p>
              </div>
            </div>

            <button className="mt-6 flex items-center justify-center gap-2 p-4 w-full bg-white/5 hover:bg-white/10 rounded-2xl transition-all group border border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">Ver Tutorial</span>
              <ChevronRight size={14} className="text-white/40 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Footer Tip */}
      <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4 text-white/40">
          <div className="p-2 bg-brand-yellow/10 rounded-xl">
            <Play size={14} className="text-brand-yellow" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-md">
            <span className="text-white/60">DICA RÁPIDA:</span> Use palavras menos óbvias para ganhar mais pontos e surpreender seus adversários!
          </p>
        </div>

        <div className="flex items-center gap-6">
          <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-brand-blue transition-colors">Instagram</a>
          <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-brand-purple transition-colors">Discord</a>
          <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors">Termos</a>
        </div>
      </div>

      {/* Create Room Modal */}
      <GameModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Criar Nova Sala"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setIsPrivate(false)}
              className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${!isPrivate ? 'bg-brand-purple/20 border-brand-purple shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-black/20 border-white/5 opacity-50 hover:opacity-80'}`}
            >
              <LayoutGrid size={24} className={!isPrivate ? 'text-brand-purple' : 'text-white/40'} />
              <div className="text-center">
                <span className="block text-xs font-black uppercase italic tracking-tighter">Sala Pública</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-white/40 mt-1">Todos podem entrar</span>
              </div>
            </button>
            <button 
              onClick={() => setIsPrivate(true)}
              className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${isPrivate ? 'bg-brand-blue/20 border-brand-blue shadow-[0_0_20px_rgba(0,212,255,0.2)]' : 'bg-black/20 border-white/5 opacity-50 hover:opacity-80'}`}
            >
              <div className="relative">
                <LayoutGrid size={24} className={isPrivate ? 'text-brand-blue' : 'text-white/40'} />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-yellow rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-black rounded-full" />
                </div>
              </div>
              <div className="text-center">
                <span className="block text-xs font-black uppercase italic tracking-tighter">Sala Privada</span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-white/40 mt-1">Apenas com senha</span>
              </div>
            </button>
          </div>

          <AnimatePresence>
            {isPrivate && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block px-1">
                  Senha da Sala
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ex: 1234"
                    className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-4 py-4 font-black text-white placeholder:text-white/10 outline-none focus:border-brand-blue transition-all pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <GameButton 
            title="CONFIRMAR"
            subtitle={isPrivate ? "Criar sala privada" : "Criar sala pública"}
            onClick={confirmCreateRoom}
            variant={isPrivate ? "primary" : "secondary"}
            className="w-full"
          />
        </div>
      </GameModal>

      {/* Matchmaking Overlay */}
      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#05060B]/90 backdrop-blur-md"
          >
            <div className="relative mb-12">
              {/* Radar Animation */}
              <div className="absolute inset-0 scale-[2.5] bg-brand-blue/20 rounded-full animate-ping" />
              <div className="absolute inset-0 scale-[2] bg-brand-purple/20 rounded-full animate-ping animation-delay-500" />
              
              <div className="w-40 h-40 rounded-full border-4 border-white/10 flex items-center justify-center relative bg-black/40">
                <GameLogo size="sm" />
                <div className="absolute inset-0 rounded-full border-t-4 border-brand-blue animate-spin" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2 neon-text-blue">
              Procurando Partida...
            </h2>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 animate-pulse">
              Aguarde, estamos conectando você
            </p>

            <button 
              onClick={() => setIsSearching(false)}
              className="mt-12 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
