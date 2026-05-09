'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { Settings, Users, Trophy, Layers, Clock, Globe, Lock, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MOCK_CATEGORIES } from "@/lib/mock/categories";
import { generateRoomCode } from "@/lib/game/generateRoomCode";

const DEFAULT_CATEGORIES = [
  "NOME", "COR", "ANIMAL", "FRUTA", "OBJETO", "VERBO"
];

export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [totalRounds, setTotalRounds] = useState(5);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(prev => prev.filter(c => c !== cat));
      }
    } else {
      if (selectedCategories.length < 12) {
        setSelectedCategories(prev => [...prev, cat]);
      }
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    
    setLoading(true);
    const code = generateRoomCode();
    
    try {
      if (!isSupabaseConfigured) {
        console.log("Mocking room creation:", { roomName, code, selectedCategories });
        router.push(`/lobby/${code}`);
        return;
      }

      // 1. Criar a sala (Room)
      const { data: roomData, error: roomError } = await (supabase
        .from('rooms') as any)
        .insert({
          code,
          name: roomName,
          max_players: maxPlayers,
          total_rounds: totalRounds,
          is_private: isPrivate,
          status: 'lobby',
          host_id: null // Ser atualizado quando o host entrar no lobby
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Vincular as categorias selecionadas
      // Primeiro, garantimos que as categorias existem na tabela 'categories'
      const categoryInserts = selectedCategories.map(name => ({ name }));
      const { data: catData, error: catError } = await (supabase
        .from('categories') as any)
        .upsert(categoryInserts, { onConflict: 'name' })
        .select();

      if (catError) throw catError;

      // Agora vinculamos essas categorias à sala recém-criada
      const roomCategoryInserts = catData.map((c: any) => ({
        room_id: roomData.id,
        category_id: c.id
      }));

      const { error: rcError } = await (supabase
        .from('room_categories') as any)
        .insert(roomCategoryInserts);

      if (rcError) throw rcError;

      // 3. Redirecionar para o lobby com o código
      router.push(`/lobby/${code}`);

    } catch (err) {
      console.error("Erro ao criar sala:", err);
      alert("Erro ao criar sala. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-5xl font-black uppercase italic text-white drop-shadow-[0_2px_0_#6A1B9A] flex items-center gap-3">
              <Settings className="text-brand-yellow" size={40} />
              Criar Sala
            </h1>
            <p className="text-white/60 font-medium tracking-wide">Configure sua partida de Bora Stop!</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancelar
            </Button>
            <Button size="lg" onClick={handleCreateRoom} loading={loading}>
              Criar Sala
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Configurações Básicas */}
            <Card className="p-8 space-y-8 bg-brand-card/80 border-white/10 backdrop-blur-md">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-brand-yellow uppercase tracking-widest">
                    <Globe size={16} /> Nome da Sala
                  </label>
                  <Input 
                    placeholder="Ex: Sala dos Amigos, Stop da Galera..." 
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={30}
                    className="text-lg py-6"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-brand-yellow uppercase tracking-widest">
                      <Users size={16} /> Máximo de Jogadores
                    </label>
                    <div className="flex items-center gap-4 bg-black/20 p-1 rounded-xl border border-white/5">
                      {[2, 4, 8, 12, 16].map(num => (
                        <button 
                          key={num}
                          onClick={() => setMaxPlayers(num)}
                          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                            maxPlayers === num ? 'bg-brand-purple text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-brand-yellow uppercase tracking-widest">
                      <Clock size={16} /> Total de Rodadas
                    </label>
                    <div className="flex items-center gap-4 bg-black/20 p-1 rounded-xl border border-white/5">
                      {[3, 5, 10, 15].map(num => (
                        <button 
                          key={num}
                          onClick={() => setTotalRounds(num)}
                          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                            totalRounds === num ? 'bg-brand-purple text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Categorias */}
            <Card className="p-8 space-y-6 bg-brand-card/80 border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-brand-yellow uppercase tracking-widest">
                  <Layers size={16} /> Categorias ({selectedCategories.length}/12)
                </label>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter italic">Selecione pelo menos 1</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MOCK_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-3 rounded-xl border font-bold text-sm transition-all text-left flex items-center justify-between group ${
                      selectedCategories.includes(cat)
                        ? 'bg-brand-purple/40 border-brand-purple text-white'
                        : 'bg-black/20 border-white/5 text-white/40 hover:border-white/20'
                    }`}
                  >
                    {cat}
                    <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                      selectedCategories.includes(cat) 
                        ? 'bg-brand-yellow border-brand-yellow' 
                        : 'border-white/10'
                    }`} />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Privacidade */}
            <Card className="p-8 space-y-6 bg-brand-card/80 border-white/10 backdrop-blur-md">
              <label className="flex items-center gap-2 text-sm font-bold text-brand-yellow uppercase tracking-widest">
                <Shield size={16} /> Visibilidade
              </label>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setIsPrivate(false)}
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex gap-4 ${
                    !isPrivate ? 'bg-brand-purple/20 border-brand-purple' : 'bg-black/10 border-white/5 opacity-50'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${!isPrivate ? 'bg-brand-purple text-white' : 'bg-white/10 text-white/40'}`}>
                    <Globe size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Pública</h4>
                    <p className="text-[10px] text-white/50 font-medium">Qualquer pessoa pode encontrar e entrar.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setIsPrivate(true)}
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex gap-4 ${
                    isPrivate ? 'bg-brand-purple/20 border-brand-purple' : 'bg-black/10 border-white/5 opacity-50'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${isPrivate ? 'bg-brand-purple text-white' : 'bg-white/10 text-white/40'}`}>
                    <Lock size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">Privada</h4>
                    <p className="text-[10px] text-white/50 font-medium">Apenas convidados com o código podem entrar.</p>
                  </div>
                </button>
              </div>
            </Card>

            {/* Resumo */}
            <div className="bg-brand-yellow rounded-2xl p-6 shadow-xl rotate-1">
              <h4 className="text-brand-purple font-black uppercase italic mb-4 flex items-center gap-2">
                <Trophy size={18} /> Resumo
              </h4>
              <ul className="space-y-2">
                <li className="flex justify-between text-xs font-bold text-brand-purple/70 uppercase">
                  <span>Partida:</span>
                  <span className="text-brand-purple">{totalRounds} Rodadas</span>
                </li>
                <li className="flex justify-between text-xs font-bold text-brand-purple/70 uppercase">
                  <span>Limite:</span>
                  <span className="text-brand-purple">{maxPlayers} Jogadores</span>
                </li>
                <li className="flex justify-between text-xs font-bold text-brand-purple/70 uppercase">
                  <span>Categorias:</span>
                  <span className="text-brand-purple">{selectedCategories.length} Selecionadas</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
