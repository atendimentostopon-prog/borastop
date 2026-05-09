'use client';

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe, Lock, Plus, X, Eye, EyeOff, Users, Timer, Trophy, Sparkles, CheckCircle2 } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/game/generateRoomCode";
import { MOCK_CATEGORIES } from "@/lib/mock/categories";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DEFAULT_LETTERS = "ABCDEFGHIJKLMNOPRSTUV".split("");

export default function CreateRoomPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rounds, setRounds] = useState(5);
  const [roundTime, setRoundTime] = useState(60);
  const [maxPlayers, setMaxPlayers] = useState(8);

  const [categories, setCategories] = useState<{ name: string, id: string | null }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [selectedLetters, setSelectedLetters] = useState<string[]>(DEFAULT_LETTERS);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("bora_stop_nickname");
    if (saved) {
      setNickname(saved);
      setName(`Sala do ${saved}`);
    } else {
      router.push("/");
    }

    const initialCats = MOCK_CATEGORIES.map(c => ({ name: c.name, id: null }));
    setCategories(initialCats);
    setSelectedCategories(initialCats.slice(0, 5).map(c => c.name));
  }, [router]);

  const toggleCategory = (catName: string) => {
    setError("");
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
    setError("");
    setSelectedLetters(prev =>
      prev.includes(letter)
        ? prev.filter(l => l !== letter)
        : [...prev, letter]
    );
  };

  const handleCreateRoom = async () => {
    setError("");
    if (!name.trim()) { setError("Dê um nome épico para sua sala."); return; }
    if (isPrivate && (!password.trim() || password.trim().length < 3)) {
      setError("Salas privadas exigem uma senha de segurança (mín. 3).");
      return;
    }
    if (selectedCategories.length < 5) { setError("Escolha pelo menos 5 categorias."); return; }
    if (selectedLetters.length < 5) { setError("Escolha pelo menos 5 letras."); return; }

    setIsLoading(true);
    const code = generateRoomCode();

    try {
      // 1. Criar sala com players_count = 1 (host)
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
          players_count: 1 // Começa com o Host
        } as any)
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Criar host na room_players
      const { error: playerError } = await (supabase.from('room_players') as any)
        .insert({
          room_id: (room as any).id,
          nickname,
          is_host: true
        } as any);

      if (playerError) throw playerError;

      // 3. Processar Categorias (Simplificado para performance)
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
      setError("Falha crítica ao criar arena. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <PageContainer className="max-w-5xl relative">
      <div className="absolute inset-0 bg-game-grid opacity-5 pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 relative z-10">
        <div className="flex items-center gap-6">
          <Link href="/rooms">
            <motion.div whileHover={{ scale: 1.1, x: -5 }} whileTap={{ scale: 0.9 }}>
              <Button variant="secondary" className="w-14 h-14 !p-0 rounded-3xl bg-white/5 border-white/10">
                <ArrowLeft size={24} />
              </Button>
            </motion.div>
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic text-white neon-text">Configurar Arena</h1>
            <p className="text-brand-yellow font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
              <Sparkles size={12} /> Personalize sua experiência de jogo
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-white/40">Limite Global</p>
            <p className="text-sm font-bold text-white">Até 10 Jogadores</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 pb-32">
        {/* Lado Esquerdo: Configurações Gerais */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="game-card p-8 bg-brand-card/40 backdrop-blur-2xl border-white/5"
          >
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Globe size={18} />
              </div>
              <h2 className="text-xl font-black uppercase italic text-white/80 tracking-tight">Definições da Sala</h2>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${!isPrivate ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_20px_rgba(0,194,255,0.2)]' : 'bg-black/20 border-white/5 opacity-50 hover:opacity-80'}`}
                >
                  <Globe className={!isPrivate ? "text-brand-blue" : "text-white/40"} size={32} />
                  <span className="font-black uppercase italic text-xs tracking-widest">Pública</span>
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${isPrivate ? 'bg-brand-yellow/10 border-brand-yellow shadow-[0_0_20px_rgba(255,215,0,0.2)]' : 'bg-black/20 border-white/5 opacity-50 hover:opacity-80'}`}
                >
                  <Lock className={isPrivate ? "text-brand-yellow" : "text-white/40"} size={32} />
                  <span className="font-black uppercase italic text-xs tracking-widest">Privada</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2 mb-2 block group-focus-within:text-brand-purple transition-colors">Nome da Arena</label>
                  <Input
                    placeholder="Dê um nome épico..."
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    className="input-game h-16 text-lg px-6"
                  />
                </div>

                <AnimatePresence>
                  {isPrivate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-yellow ml-2 mb-2 block">Chave de Acesso</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 3 caracteres..."
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-16 bg-brand-yellow/5 border-2 border-brand-yellow/20 rounded-[1.5rem] px-6 text-white focus:border-brand-yellow outline-none transition-all"
                        />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-brand-yellow/50">
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">
                      <Trophy size={12} /> Rodadas
                    </label>
                    <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="select-game h-14 w-full px-4 rounded-2xl bg-black/40 border-2 border-white/5 text-white font-bold outline-none focus:border-brand-purple">
                      {[3, 5, 8, 10, 12, 15, 20].map(v => <option key={v} value={v}>{v} Rounds</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">
                      <Timer size={12} /> Tempo (s)
                    </label>
                    <select value={roundTime} onChange={(e) => setRoundTime(Number(e.target.value))} className="select-game h-14 w-full px-4 rounded-2xl bg-black/40 border-2 border-white/5 text-white font-bold outline-none focus:border-brand-purple">
                      {[30, 45, 60, 90, 120, 180, 240, 300].map(v => <option key={v} value={v}>{v} seg</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">
                      <Users size={12} /> Players
                    </label>
                    <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="select-game h-14 w-full px-4 rounded-2xl bg-black/40 border-2 border-white/5 text-white font-bold outline-none focus:border-brand-purple">
                      {[2, 4, 6, 8, 10].map(v => <option key={v} value={v}>{v} Players</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card de Letras - Compacto e Visual */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="game-card p-8 bg-brand-card/40 border-white/5">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                  <span className="font-black italic">A-Z</span>
                </div>
                <h2 className="text-xl font-black uppercase italic text-white/80">Roleta de Letras</h2>
              </div>
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${selectedLetters.length < 5 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-brand-green/20 text-brand-green border border-brand-green/30'}`}>
                {selectedLetters.length} ATIVAS
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
              {ALPHABET.map(letter => {
                const isSelected = selectedLetters.includes(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => toggleLetter(letter)}
                    className={`h-10 sm:h-12 flex items-center justify-center rounded-xl font-black text-lg transition-all duration-300 border-2 ${isSelected ? 'bg-brand-purple border-brand-yellow text-brand-yellow shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-black/40 border-white/5 text-white/20 hover:border-white/20 hover:text-white/40'}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Lado Direito: Categorias e Status */}
        <div className="lg:col-span-5 space-y-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="game-card p-8 bg-brand-card/40 border-white/5 h-full">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                  <Plus size={18} />
                </div>
                <h2 className="text-xl font-black uppercase italic text-white/80">Categorias</h2>
              </div>
              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${selectedCategories.length < 5 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-brand-green/20 text-brand-green border border-brand-green/30'}`}>
                {selectedCategories.length} / 12
              </span>
            </div>

            <div className="space-y-6">
              <form onSubmit={handleAddCategory} className="relative flex gap-2">
                <Input
                  placeholder="Nova categoria..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="input-game h-12 flex-1"
                />
                <Button type="submit" variant="secondary" className="game-button px-4 rounded-xl">
                  <Plus size={20} />
                </Button>
              </form>

              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                <AnimatePresence>
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.name);
                    return (
                      <motion.button
                        layout
                        key={cat.name}
                        onClick={() => toggleCategory(cat.name)}
                        className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 border-2 flex items-center gap-2 ${isSelected ? 'bg-brand-purple/20 border-brand-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/40 border-white/5 text-white/30 hover:border-white/20'}`}
                      >
                        {isSelected && <CheckCircle2 size={12} className="text-brand-green" />}
                        {cat.name}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-4">Dica de mestre</p>
                <p className="text-xs text-white/60 italic leading-relaxed">
                  "Quanto mais categorias você escolher, mais desafiador fica o jogo. Experimente letras difíceis como X e Z para rodadas insanas!"
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50"
      >
        <div className="bg-brand-card/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="hidden sm:flex flex-col ml-6">
            <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Status da Arena</span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-white">{name || 'Sem nome'}</span>
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link href="/rooms" className="w-1/2 sm:w-auto">
              <Button variant="ghost" className="w-full sm:px-8 font-black uppercase italic tracking-widest text-white/40 hover:text-white">Desistir</Button>
            </Link>
            <Button
              variant="primary"
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="game-button w-1/2 sm:w-auto sm:px-12 h-16 text-lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>CRIANDO...</span>
                </div>
              ) : (
                <span className="flex items-center gap-3">
                  INICIAR PARTIDA <Sparkles size={20} />
                </span>
              )}
            </Button>
          </div>
        </div>
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-16 left-1/2 -translate-x-1/2 w-full max-w-lg">
            <div className="bg-red-500/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-2xl text-center border border-red-400">
              {error}
            </div>
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  );
}
