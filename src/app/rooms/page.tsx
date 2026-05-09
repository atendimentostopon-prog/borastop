'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, RefreshCcw, Gamepad2 } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import RoomCard from "@/components/game/RoomCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabase/client";
import { Room } from "@/types/game";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRooms = async () => {
    try {
      // Usando uma contagem direta da tabela room_players para precisão absoluta
      const { data, error } = await (supabase
        .from('rooms') as any)
        .select(`
          *,
          room_players:room_players(count)
        `)
        .eq('status', 'lobby')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formatted = (data as any[] || []).map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        isPrivate: r.is_private,
        // O Supabase retorna a contagem dentro de um array ou objeto dependendo da versão
        playersCount: r.room_players?.[0]?.count || r.players_count || 0,
        maxPlayers: r.max_players,
        rounds: r.total_rounds,
        status: r.status
      }));
      
      setRooms(formatted);
    } catch (err) {
      console.error('Erro ao buscar arenas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    // Sincronização Realtime Dupla: Rooms (metadados) e Room Players (contagem)
    const roomsChannel = supabase
      .channel('lobby_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, () => {
        // Atualiza a lista sempre que alguém entrar ou sair de qualquer sala em lobby
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, []);

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer className="relative">
      {/* Background Decorativo sutil */}
      <div className="absolute inset-0 bg-game-grid opacity-10 pointer-events-none" />

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 relative z-10">
        <div className="flex flex-col items-center md:items-start">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl md:text-6xl font-black uppercase italic text-white neon-text"
          >
            Salas Ativas
          </motion.h1>
          <p className="text-brand-yellow font-bold uppercase tracking-[0.2em] text-xs mt-2">
            Escolha seu campo de batalha
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={fetchRooms} className="game-button p-4 rounded-2xl">
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          </Button>
          <Link href="/create-room">
            <Button variant="primary" size="lg" className="game-button px-8">
              <Plus size={24} className="mr-2" />
              Criar Nova
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-brand-purple/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition-all" />
            <Input 
              placeholder="Buscar pelo nome ou código..." 
              className="input-game pl-16 w-full text-lg h-16" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-purple transition-colors" size={24} />
          </div>

          <div className="flex flex-col gap-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCcw size={40} className="animate-spin text-brand-purple" />
                <span className="font-black uppercase italic tracking-widest text-white/30">Localizando Salas...</span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 bg-brand-card/30 rounded-[3rem] border-2 border-dashed border-white/5"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-white/20">
                  <Gamepad2 size={40} />
                </div>
                <h3 className="text-xl font-bold mb-2">Nenhuma sala encontrada</h3>
                <p className="text-white/40 text-center max-w-xs">
                  Não há salas {searchTerm ? `com "${searchTerm}"` : 'disponíveis'} agora. Que tal criar uma?
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredRooms.map((room, idx) => (
                  <motion.div
                    key={room.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05, type: 'spring' }}
                  >
                    <RoomCard room={room} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Sidebar AAA */}
        <div className="flex flex-col gap-6">
          <div className="game-card border-brand-purple/20 bg-brand-purple/5 p-6 rounded-[2rem] border backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple mb-4">Estatísticas</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white/40">Total de Salas</span>
                <span className="text-2xl font-black italic text-white">{rooms.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white/40">Jogadores Online</span>
                <span className="text-2xl font-black italic text-brand-yellow">
                  {rooms.reduce((acc, r) => acc + (r.playersCount || 0), 0)}
                </span>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-black/40 border border-white/5">
              <p className="text-[10px] font-medium leading-relaxed text-white/50 italic">
                "O Stop Online definitivo. Entre em uma sala e mostre quem é o mestre das palavras!"
              </p>
            </div>
          </div>
          
          <div className="w-full h-40 bg-brand-card/50 rounded-[2.5rem] border border-white/5 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Anúncio Espacial</span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
