'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import RoomCard from "@/components/game/RoomCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AdPlaceholder from "@/components/game/AdPlaceholder";
import { Search, Plus } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Room } from "@/types/game";
import { MOCK_ROOMS } from "@/lib/mock/rooms";
import AnimatedCard from "@/components/animations/AnimatedCard";
import { motion, AnimatePresence } from "framer-motion";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setRooms(MOCK_ROOMS);
      setLoading(false);
      return;
    }

    const fetchRooms = async () => {
      try {
        const { data, error } = await (supabase
          .from('rooms') as any)
          .select('*')
          .eq('status', 'lobby')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Formatar para o tipo Room do front
        const formatted = (data as any[] || []).map(r => ({
          id: r.id,
          code: r.code,
          name: r.name,
          isPrivate: r.is_private,
          playersCount: 0, // Precisaríamos contar os players, mock para fase 2
          maxPlayers: r.max_players,
          rounds: r.total_rounds,
          status: r.status
        }));
        
        setRooms(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();

    // Supabase Realtime para rooms
    const subscription = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, payload => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <h1 className="text-4xl md:text-5xl font-black uppercase italic text-white drop-shadow-[0_2px_0_#6A1B9A]">
          Salas Disponíveis
        </h1>
        <Link href="/create-room">
          <Button className="flex items-center gap-2">
            <Plus size={20} />
            Criar Sala
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="relative w-full">
            <Input placeholder="Buscar sala por nome ou código..." className="pl-12" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
          </div>

          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="text-center text-white/50 py-8">Carregando salas...</div>
            ) : rooms.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-white/50 py-8 bg-black/20 rounded-xl border border-white/5"
              >
                Nenhuma sala disponível no momento.<br/>
                Seja o primeiro a criar uma!
              </motion.div>
            ) : (
              <AnimatePresence>
                {rooms.map((room, idx) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <RoomCard room={room} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <AnimatedCard delay={0.2} className="hidden lg:block">
            <div className="bg-brand-card backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-xl mb-4">Informações</h3>
              <p className="text-sm text-white/70 mb-4">
                Selecione uma sala ao lado para entrar ou clique no botão acima para criar sua própria sala e convidar amigos.
              </p>
              <div className="w-full h-px bg-white/10 my-4"></div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Salas ativas:</span>
                <span className="font-bold text-brand-yellow">{rooms.length}</span>
              </div>
            </div>
          </AnimatedCard>
          <AdPlaceholder type="rectangle" className="hidden lg:flex" />
          <AdPlaceholder type="banner" className="lg:hidden" />
        </div>
      </div>
    </PageContainer>
  );
}
