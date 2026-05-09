'use client';

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ArrowLeft, Globe, Lock, Plus, X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/game/generateRoomCode";
import AnimatedCard from "@/components/animations/AnimatedCard";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_CATEGORIES } from "@/lib/mock/categories";

const DEFAULT_CATEGORIES = MOCK_CATEGORIES.map(c => c.name);

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

    // Inicializa as categorias com as padrões
    const initialCats = DEFAULT_CATEGORIES.map(c => ({ name: c, id: null }));
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
    const isDuplicate = categories.some(c => c.name.toLowerCase() === catName.toLowerCase());

    if (!isDuplicate) {
      setCategories(prev => [...prev, { name: catName, id: null }]);
    }

    // Select it if not already selected
    const selectedDuplicate = selectedCategories.some(c => c.toLowerCase() === catName.toLowerCase());
    if (!selectedDuplicate) {
      setSelectedCategories(prev => [...prev, catName]);
    }

    setNewCategory("");
    setError("");
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

    if (!nickname.trim()) {
      router.push("/");
      return;
    }
    if (!name.trim()) {
      setError("Dê um nome para a sala.");
      return;
    }
    if (isPrivate && (!password.trim() || password.trim().length < 3)) {
      setError("Salas privadas precisam de uma senha com pelo menos 3 caracteres.");
      return;
    }
    if (selectedCategories.length < 5) {
      setError("Escolha pelo menos 5 categorias para criar a sala.");
      return;
    }
    if (selectedLetters.length < 5) {
      setError("Escolha pelo menos 5 letras para o sorteio.");
      return;
    }

    setIsLoading(true);

    const code = generateRoomCode();

    try {
      // 1. Process categories in DB
      // Fetch existing
      const { data: existingCats } = await supabase.from('categories').select('*');

      const dbCategoryIds: string[] = [];

      for (const catName of selectedCategories) {
        let dbCat = existingCats?.find((c: any) => c.name.toLowerCase() === catName.toLowerCase());

        if (!dbCat) {
          // Insert new
          const { data: newDbCat, error: insertCatError } = await supabase
            .from('categories')
            .insert({ name: catName } as any)
            .select()
            .single();

          if (insertCatError) throw insertCatError;
          dbCat = newDbCat as any;
        }

        if (!dbCat) {
          console.error("Categoria não encontrada:", catName);
          continue;
        }

        dbCategoryIds.push((dbCat as any).id);
      }

      // 2. Criar sala
      const { data: room, error: roomError } = await (supabase.from('rooms') as any)
        .insert({
          code,
          name: name.trim(),
          is_private: isPrivate,
          password: isPrivate ? password.trim() : null,
          host_nickname: nickname,
          total_rounds: rounds,
          round_time: roundTime,
          status: 'lobby',
          allowed_letters: selectedLetters
        } as any)
        .select()
        .single();

      if (roomError) throw roomError;

      // 3. Criar host
      const { error: playerError } = await (supabase.from('room_players') as any)
        .insert({
          room_id: (room as any).id,
          nickname,
          is_host: true
        } as any);

      if (playerError) throw playerError;

      // 4. Associar categorias
      const catInserts = dbCategoryIds.map(catId => ({
        room_id: (room as any).id,
        category_id: catId
      }));
      const { error: roomCatError } = await (supabase.from('room_categories') as any).insert(catInserts as any);

      if (roomCatError) throw roomCatError;

      router.push(`/lobby/${code}`);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao criar sala. Tente novamente mais tarde.");
      setIsLoading(false);
    }
  };

  return (
    <PageContainer className="max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/rooms">
          <Button variant="ghost" className="w-12 h-12 !p-0 rounded-full bg-white/5">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-3xl md:text-4xl font-black uppercase italic text-white drop-shadow-[0_2px_0_#6A1B9A]">
          Configurar Sala
        </h1>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-white px-4 py-3 rounded-xl mb-6 text-center font-bold">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-6">

        {/* Card: Configurações Gerais */}
        <AnimatedCard delay={0.1}>
          <Card className="flex flex-col gap-6">
            <h2 className="text-xl font-bold border-b border-white/10 pb-2">Geral</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="secondary"
                className={`border-2 ${!isPrivate ? 'border-brand-blue bg-brand-blue/20' : 'border-transparent bg-black/40'}`}
                onClick={() => { setIsPrivate(false); setError(""); }}
              >
                <Globe className={!isPrivate ? "text-brand-blue" : "text-white/50"} />
                Sala Pública
              </Button>
              <Button
                variant="secondary"
                className={`border-2 ${isPrivate ? 'border-brand-blue bg-brand-blue/20' : 'border-transparent bg-black/40'}`}
                onClick={() => { setIsPrivate(true); setError(""); }}
              >
                <Lock className={isPrivate ? "text-brand-blue" : "text-white/50"} />
                Sala Privada
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
              <Input
                label="Nome da Sala"
                placeholder="Ex: Galera do Fundão"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
              />
              <AnimatePresence>
                {isPrivate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-white/80 font-bold ml-1">Senha da Sala *</label>
                      <div className="relative w-full">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite a senha da sala"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(""); }}
                          autoComplete="new-password"
                          className="w-full bg-black/40 border-2 border-white/10 focus:border-brand-blue focus:shadow-[0_0_15px_rgba(0,194,255,0.4)] rounded-xl px-4 py-3 pr-12 text-white placeholder:text-white/30 outline-none transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors duration-200 p-1 rounded-lg"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-white/80 font-bold ml-1">Rodadas</label>
                <select
                  className="bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-blue w-full appearance-none cursor-pointer"
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                >
                  <option value="3">3 rodadas</option>
                  <option value="5">5 rodadas</option>
                  <option value="8">8 rodadas</option>
                  <option value="10">10 rodadas</option>
                  <option value="12">12 rodadas</option>
                  <option value="15">15 rodadas</option>
                  <option value="20">20 rodadas</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white/80 font-bold ml-1">Tempo por Rodada</label>
                <select
                  className="bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-blue w-full appearance-none cursor-pointer"
                  value={roundTime}
                  onChange={(e) => setRoundTime(Number(e.target.value))}
                >
                  <option value="30">30 segundos</option>
                  <option value="45">45 segundos</option>
                  <option value="60">60 segundos</option>
                  <option value="90">90 segundos</option>
                  <option value="120">120 segundos</option>
                  <option value="150">150 segundos (2 min 30s)</option>
                  <option value="180">180 segundos (3 min)</option>
                  <option value="240">240 segundos (4 min)</option>
                  <option value="300">300 segundos (5 min)</option>
                </select>
              </div>
            </div>
          </Card>
        </AnimatedCard>

        {/* Card: Categorias */}
        <AnimatedCard delay={0.2}>
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-2 gap-2">
              <h2 className="text-xl font-bold">Categorias</h2>
              <motion.span
                key={selectedCategories.length}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-sm px-3 py-1 rounded-full font-bold ${selectedCategories.length < 5 ? 'bg-red-500/20 text-red-300' : 'bg-brand-green/20 text-brand-green'}`}
              >
                {selectedCategories.length} selecionadas (mínimo 5)
              </motion.span>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2">
              <Input
                placeholder="Criar nova categoria..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="secondary" className="px-4">
                <Plus size={20} />
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 mt-2">
              <AnimatePresence>
                {categories.map((cat, idx) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={cat.name}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${isSelected
                        ? 'bg-brand-blue/20 border-brand-blue text-white'
                        : 'bg-black/40 border-white/10 text-white/50 hover:bg-white/5'
                        }`}
                    >
                      {cat.name}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </Card>
        </AnimatedCard>

        {/* Card: Letras */}
        <AnimatedCard delay={0.3}>
          <Card className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h2 className="text-xl font-bold">Letras do Sorteio</h2>
              <motion.span
                key={selectedLetters.length}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-sm px-3 py-1 rounded-full font-bold ${selectedLetters.length < 5 ? 'bg-red-500/20 text-red-300' : 'bg-brand-green/20 text-brand-green'}`}
              >
                {selectedLetters.length} selecionadas (mínimo 5)
              </motion.span>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {ALPHABET.map(letter => {
                const isSelected = selectedLetters.includes(letter);
                return (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    key={letter}
                    type="button"
                    onClick={() => toggleLetter(letter)}
                    className={`w-12 h-12 rounded-xl text-lg font-black italic border-2 transition-colors flex items-center justify-center ${isSelected
                      ? 'bg-brand-purple border-brand-yellow text-brand-yellow'
                      : 'bg-black/40 border-white/10 text-white/30 hover:bg-white/5'
                      }`}
                  >
                    {letter}
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </AnimatedCard>

        {/* Sticky Actions */}
        <div className="sticky bottom-4 z-50 flex justify-end gap-4 mt-4 bg-brand-card/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
          <Link href="/rooms">
            <Button variant="ghost" size="lg">Cancelar</Button>
          </Link>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="min-w-[200px]"
          >
            {isLoading ? "Criando..." : "Criar Sala Agora"}
          </Button>
        </div>

      </div>
    </PageContainer>
  );
}
