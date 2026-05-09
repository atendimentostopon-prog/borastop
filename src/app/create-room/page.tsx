'use client';

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe, Lock, Plus, X, Eye, EyeOff, Users, Timer, Trophy, Sparkles, CheckCircle2, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/game/generateRoomCode";
import { MOCK_CATEGORIES } from "@/lib/mock/categories";
import GameButton from "@/components/game/GameButton";
import { useToast } from "@/components/ui/ToastProvider";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DEFAULT_LETTERS = "ABCDEFGHIJKLMNOPRSTUV".split("");

export default function CreateRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(searchParams.get('private') === 'true');
  const [password, setPassword] = useState(searchParams.get('password') || "");
  const [showPassword, setShowPassword] = useState(false);
  const [rounds, setRounds] = useState(5);
  const [roundTime, setRoundTime] = useState(60);
  const [maxPlayers, setMaxPlayers] = useState(8);

  const [categories, setCategories] = useState<{ name: string, id: string | null }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [selectedLetters, setSelectedLetters] = useState<string[]>(DEFAULT_LETTERS);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("bora_stop_nickname");
    if (saved) {
      setNickname(saved);
      setName(`Sala de ${saved}`);
    } else {
      router.push("/");
    }

    const initialCats = MOCK_CATEGORIES.map(c => ({ name: c.name, id: null }));
    setCategories(initialCats);
    setSelectedCategories(initialCats.slice(0, 5).map(c => c.name));
  }, [router]);

  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev =>
      prev.includes(catName)
        ? prev.filter(c => c !== catName)
        : [...prev, catName]
    );
  };

  const handleAddCategory = (e?: FormEvent) => {
    e?.preventDefault();
    if (!newCategory.trim()) return;

    const catName = newCategory.trim();
    if (categories.some(c => c.name.toLowerCase() === catName.toLowerCase())) {
      setNewCategory("");
      return;
    }

    setCategories(prev => [...prev, { name: catName, id: null }]);
    setSelectedCategories(prev => [...prev, catName]);
    setNewCategory("");
  };

  const toggleLetter = (letter: string) => {
    setSelectedLetters(prev =>
      prev.includes(letter)
        ? prev.filter(l => l !== letter)
        : [...prev, letter]
    );
  };

  const handleCreateRoom = async () => {
    if (!name.trim()) { addToast("Dê um nome épico para sua sala.", "error"); return; }
    if (isPrivate && (!password.trim() || password.trim().length < 3)) {
      addToast("Salas privadas exigem uma senha de segurança (mín. 3).", "error");
      return;
    }
    if (selectedCategories.length < 5) { addToast("Escolha pelo menos 5 categorias.", "error"); return; }
    if (selectedLetters.length < 5) { addToast("Escolha pelo menos 5 letras.", "error"); return; }

    setIsLoading(true);
    const code = generateRoomCode();

    try {
      const { data: room, error: roomError } = await (supabase.from('rooms') as any)
        .insert({
          code,
          name: name.trim(),
          is_private: isPrivate,
          password: isPrivate ? password.trim() : null,
          host_nickname: nickname,
          total_rounds: rounds,
          round_time: roundTime,
          max_players: maxPlayers,
          status: 'lobby',
          allowed_letters: selectedLetters,
          players_count: 1
        } as any)
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: playerError } = await (supabase.from('room_players') as any)
        .insert({
          room_id: (room as any).id,
          nickname,
          is_host: true
        } as any);

      if (playerError) throw playerError;

      // Categories
      const { data: existingCats } = await supabase.from('categories').select('*');
      const dbCategoryIds: string[] = [];

      for (const catName of selectedCategories) {
        let dbCat = existingCats?.find((c: any) => c.name.toLowerCase() === catName.toLowerCase());
        if (!dbCat) {
          const { data: newDbCat } = await supabase.from('categories').insert({ name: catName } as any).select().single();
          dbCat = newDbCat as any;
        }
        if (dbCat) dbCategoryIds.push((dbCat as any).id);
      }

      await (supabase.from('room_categories') as any).insert(
        dbCategoryIds.map(catId => ({ room_id: (room as any).id, category_id: catId }))
      );

      router.push(`/lobby/${code}`);
    } catch (err: any) {
      console.error(err);
      addToast("Falha crítica ao criar arena.", "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header Area */}
      <div className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white border border-white/5"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white neon-text">
              Configurar Arena
            </h1>
            <p className="text-[10px] text-brand-yellow font-black uppercase tracking-[0.2em]">
              Personalize sua experiência de jogo
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-white/40">Limite de Jogadores</p>
            <p className="text-sm font-bold text-white">{maxPlayers} Players</p>
          </div>
        </div>
      </div>

      {/* Main Content: Scrollable Form */}
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-fit">
          
          {/* Settings Section */}
          <div className="lg:col-span-7 space-y-8">
            <div className="game-card p-8 bg-white/[0.02] border-white/5">
              <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                <Globe size={18} className="text-brand-blue" />
                <h2 className="text-xl font-black uppercase italic text-white/80 tracking-tight">Definições da Sala</h2>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block px-1">Nome da Sala</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Arena Pro"
                      className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-4 font-black text-white placeholder:text-white/10 outline-none focus:border-brand-purple transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block px-1">Tipo de Sala</label>
                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 h-14">
                      <button 
                        onClick={() => setIsPrivate(false)}
                        className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isPrivate ? 'bg-brand-purple text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Pública
                      </button>
                      <button 
                        onClick={() => setIsPrivate(true)}
                        className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPrivate ? 'bg-brand-blue text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Privada
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isPrivate && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-1"
                    >
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-blue block px-1">Senha de Acesso</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 3 caracteres..."
                          className="w-full bg-brand-blue/5 border-2 border-brand-blue/30 rounded-2xl px-6 py-4 font-black text-white placeholder:text-white/10 outline-none focus:border-brand-blue transition-all"
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-blue/50 hover:text-brand-blue"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block px-1">Rodadas</label>
                    <select 
                      value={rounds} 
                      onChange={(e) => setRounds(Number(e.target.value))}
                      className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-4 py-4 font-black text-white outline-none focus:border-brand-purple transition-all appearance-none cursor-pointer"
                    >
                      {[3, 5, 8, 10, 12, 15, 20].map(v => <option key={v} value={v} className="bg-[#151722]">{v} Rodadas</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block px-1">Tempo (s)</label>
                    <select 
                      value={roundTime} 
                      onChange={(e) => setRoundTime(Number(e.target.value))}
                      className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-4 py-4 font-black text-white outline-none focus:border-brand-purple transition-all appearance-none cursor-pointer"
                    >
                      {[30, 45, 60, 90, 120, 180, 240, 300].map(v => <option key={v} value={v} className="bg-[#151722]">{v} segundos</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block px-1">Max Players</label>
                    <select 
                      value={maxPlayers} 
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-4 py-4 font-black text-white outline-none focus:border-brand-purple transition-all appearance-none cursor-pointer"
                    >
                      {[2, 4, 6, 8, 10, 12, 15].map(v => <option key={v} value={v} className="bg-[#151722]">{v} Jogadores</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Alphabet Section */}
            <div className="game-card p-8 bg-white/[0.02] border-white/5">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Trophy size={18} className="text-brand-purple" />
                  <h2 className="text-xl font-black uppercase italic text-white/80 tracking-tight">Roleta de Letras</h2>
                </div>
                <div className="px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20">
                  <span className="text-[10px] font-black uppercase text-brand-purple italic">{selectedLetters.length} Ativas</span>
                </div>
              </div>

              <div className="grid grid-cols-6 md:grid-cols-13 gap-2">
                {ALPHABET.map(letter => {
                  const isSelected = selectedLetters.includes(letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => toggleLetter(letter)}
                      className={`h-12 rounded-xl font-black text-lg transition-all duration-300 border-2 ${isSelected ? 'bg-brand-purple border-brand-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-black/40 border-white/5 text-white/20 hover:text-white/40'}`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="lg:col-span-5 h-full">
            <div className="game-card p-8 bg-white/[0.02] border-white/5 h-full flex flex-col">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Plus size={18} className="text-brand-yellow" />
                  <h2 className="text-xl font-black uppercase italic text-white/80 tracking-tight">Categorias</h2>
                </div>
                <div className={`px-3 py-1 rounded-full ${selectedCategories.length < 5 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-brand-green/10 border-brand-green/20 text-brand-green'}`}>
                  <span className="text-[10px] font-black uppercase italic">{selectedCategories.length} Selecionadas</span>
                </div>
              </div>

              <div className="space-y-6 flex-1 flex flex-col">
                <form onSubmit={handleAddCategory} className="relative flex gap-2">
                  <input
                    placeholder="Nova categoria..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-3 font-black text-white placeholder:text-white/10 outline-none focus:border-brand-yellow transition-all"
                  />
                  <button type="submit" className="p-3 bg-brand-yellow text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg">
                    <Plus size={24} />
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[400px] pr-2 no-scrollbar">
                  <AnimatePresence>
                    {categories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <motion.button
                          layout
                          key={cat.name}
                          onClick={() => toggleCategory(cat.name)}
                          className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 flex items-center gap-2 ${isSelected ? 'bg-brand-purple/20 border-brand-purple text-white' : 'bg-black/40 border-white/5 text-white/20 hover:text-white/40'}`}
                        >
                          {isSelected && <CheckCircle2 size={12} className="text-brand-green" />}
                          {cat.name}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="mt-auto pt-8">
                  <div className="bg-brand-blue/5 rounded-3xl p-6 border border-brand-blue/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Sparkles size={16} className="text-brand-blue" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Dica Estratégica</span>
                    </div>
                    <p className="text-[10px] text-white/50 font-bold leading-relaxed uppercase tracking-widest italic">
                      "Personalize seu jogo com categorias exclusivas e torne cada partida única!"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0F111A] via-[#0F111A]/80 to-transparent z-50">
        <div className="flex items-center justify-between max-w-5xl mx-auto bg-[#1A1C26] p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="hidden md:flex items-center gap-6 ml-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.2em]">Nome da Arena</span>
              <span className="text-sm font-black italic text-brand-yellow">{name || '---'}</span>
            </div>
            <div className="w-px h-10 bg-white/5" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.2em]">Tipo</span>
              <span className="text-sm font-black italic text-white uppercase">{isPrivate ? 'Privada' : 'Pública'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => router.push('/')}
              className="flex-1 md:px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors italic"
            >
              Cancelar
            </button>
            <GameButton 
              title={isLoading ? "CRIANDO..." : "CRIAR ARENA"}
              subtitle={isLoading ? "Aguarde um momento" : "Iniciar lobby agora"}
              icon={Sparkles}
              variant="secondary"
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="flex-1 md:w-64 h-20 rounded-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
