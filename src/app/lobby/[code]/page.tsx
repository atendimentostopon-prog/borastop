'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PlayerCard from "@/components/game/PlayerCard";
import ChatBox from "@/components/game/ChatBox";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import AdPlaceholder from "@/components/game/AdPlaceholder";
import PulseGlow from "@/components/animations/PulseGlow";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Settings, Users, Lock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { Player, ChatMessage } from "@/types/game";
import { getRandomLetter } from "@/lib/game/letters";
import { MOCK_PLAYERS } from "@/lib/mock/players";
import { MOCK_MESSAGES } from "@/lib/mock/messages";

// Helper com cast para 'any' para evitar o erro de inferência 'never' do Supabase v2 com strict mode
// mas mantendo o uso de tipos Database para as linhas.
const db = supabase as any;

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoomPlayerRow = Database['public']['Tables']['room_players']['Row'];
type RoomPlayerInsert = Database['public']['Tables']['room_players']['Insert'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
type RoundInsert = Database['public']['Tables']['rounds']['Insert'];

export default function LobbyPage({ params }: { params: Promise<{ code: string }> | { code: string } }) {
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  
  // Usar refs para evitar stale closures em callbacks de tempo real
  const playersRef = useRef<Player[]>([]);
  const roomRef = useRef<RoomRow | null>(null);

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setCode(resolvedParams.code);
    }
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!code) return;

    const nickname = localStorage.getItem('stopon_nickname') || `Jogador ${Math.floor(Math.random() * 1000)}`;
    
    const fetchRoomData = async () => {
      if (!isSupabaseConfigured) {
        setPlayers(MOCK_PLAYERS);
        setMessages(MOCK_MESSAGES);
        setLoading(false);
        return;
      }

      try {
        // 1. Buscar a sala
        const { data: roomData, error: roomError } = await db
          .from('rooms')
          .select('*')
          .eq('code', code)
          .single();

        if (roomError || !roomData) {
          console.error("Sala não encontrada");
          router.push('/rooms');
          return;
        }

        if (roomData.status === 'playing') {
          router.push(`/game/${code}`);
          return;
        }

        setRoom(roomData);
        roomRef.current = roomData;

        // 2. Tentar entrar na sala
        const { data: existingPlayers } = await db
          .from('room_players')
          .select('*')
          .eq('room_id', roomData.id);

        // Se a sala estiver cheia e o jogador não estiver nela, barrar
        const isAlreadyIn = (existingPlayers as RoomPlayerRow[])?.some(p => p.nickname === nickname);
        if (!isAlreadyIn && (existingPlayers as RoomPlayerRow[])?.length >= roomData.max_players) {
          alert("Sala cheia!");
          router.push('/rooms');
          return;
        }

        // Inserir ou recuperar player
        let myId: string;
        if (isAlreadyIn) {
          myId = (existingPlayers as RoomPlayerRow[]).find(p => p.nickname === nickname)!.id;
        } else {
          const newPlayer: RoomPlayerInsert = {
            room_id: roomData.id,
            nickname: nickname,
            is_host: (existingPlayers as RoomPlayerRow[] || []).length === 0,
            is_ready: false
          };
          const { data: pData, error: pError } = await db
            .from('room_players')
            .insert(newPlayer)
            .select()
            .single();
          
          if (pError) throw pError;
          myId = (pData as RoomPlayerRow).id;

          // Se for o primeiro a entrar, marcar como host da sala no banco
          if (newPlayer.is_host) {
             await db.from('rooms').update({ host_id: myId }).eq('id', roomData.id);
          }
        }

        setLocalPlayerId(myId);
        
        // 3. Buscar mensagens iniciais
        const { data: msgData } = await db
          .from('messages')
          .select('*')
          .eq('room_id', roomData.id)
          .order('created_at', { ascending: true });
        
        if (msgData) {
          setMessages((msgData as MessageRow[]).map(m => ({
            id: m.id,
            sender: m.nickname,
            text: m.content,
            time: new Date(m.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: m.is_system
          })));
        }

        // 4. Configurar Realtime
        const roomChannel = supabase.channel(`room:${code}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'room_players', 
            filter: `room_id=eq.${roomData.id}` 
          }, (payload) => {
            refreshPlayers(roomData.id);
          })
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'rooms', 
            filter: `id=eq.${roomData.id}` 
          }, (payload) => {
            const updatedRoom = payload.new as RoomRow;
            setRoom(updatedRoom);
            roomRef.current = updatedRoom;
            if (updatedRoom.status === 'playing') {
              router.push(`/game/${code}`);
            }
          })
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `room_id=eq.${roomData.id}` 
          }, (payload) => {
            const m = payload.new as MessageRow;
            setMessages(prev => [...prev, {
              id: m.id,
              sender: m.nickname,
              text: m.content,
              time: new Date(m.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSystem: m.is_system
            }]);
          })
          .subscribe();

        refreshPlayers(roomData.id);
        setLoading(false);

        return () => {
          supabase.removeChannel(roomChannel);
        };

      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    const refreshPlayers = async (roomId: string) => {
      const { data } = await db
        .from('room_players')
        .select('*')
        .eq('room_id', roomId);
      
      if (data) {
        const formatted = (data as RoomPlayerRow[]).map(p => ({
          id: p.id,
          name: p.nickname,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.nickname}`,
          isReady: p.is_ready,
          isHost: p.is_host,
          score: p.score
        }));
        setPlayers(formatted);
        playersRef.current = formatted;

        const me = formatted.find(p => p.name === nickname);
        if (me) {
          setIsHost(me.isHost);
          setIsReady(me.isReady);
        }
      }
    };

    fetchRoomData();
  }, [code, router]);

  const toggleReady = async () => {
    if (!isSupabaseConfigured || !localPlayerId) {
      setIsReady(!isReady);
      return;
    }

    const nextState = !isReady;
    setIsReady(nextState);

    await db.from('room_players')
      .update({ is_ready: nextState })
      .eq('id', localPlayerId);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const nickname = localStorage.getItem('stopon_nickname') || 'Anônimo';

    if (isSupabaseConfigured && room) {
      const newMsg: MessageInsert = {
        room_id: room.id,
        nickname,
        content: text,
        is_system: false
      };
      await db.from('messages').insert(newMsg);
    } else {
      const mockMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: nickname,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, mockMsg]);
    }
  };

  const startGame = async () => {
    if (!room) return;
    
    // Na fase 3, aqui sorteamos a letra e criamos a primeira rodada
    if (isSupabaseConfigured) {
      // 1. Sortear letra inicial (usando lib/game/letters)
      const letter = getRandomLetter(room.allowed_letters || []);
      
      // 2. Criar a primeira rodada
      const newRound: RoundInsert = {
        room_id: room.id,
        round_number: 1,
        letter,
        status: 'playing',
        started_at: new Date().toISOString()
      };
      
      await db.from('rounds').insert(newRound);

      // 3. Atualizar sala para 'playing'
      await db.from('rooms')
        .update({ 
          status: 'playing',
          current_round: 1
        })
        .eq('id', room.id);
    } else {
      router.push(`/game/${code}`);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    alert("Código copiado!");
  };

  if (loading) return <div className="min-h-screen bg-brand-bg flex items-center justify-center text-white/50 animate-pulse font-bold uppercase tracking-widest">Sincronizando com a sala...</div>;

  const readyCount = players.filter(p => p.isReady).length;
  const canStart = isHost && readyCount >= 1; // Pelo menos o host (ou outro) pronto para teste, idealmente >= 2

  return (
    <PageContainer>
      <div className="max-w-6xl mx-auto">
        {/* Top Header do Lobby */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-brand-yellow font-black uppercase italic tracking-tighter text-sm mb-1">
              {room?.is_private ? <Lock size={14} /> : <Users size={14} />}
              {room?.is_private ? 'Sala Privada' : 'Sala Pública'}
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic text-white drop-shadow-[0_2px_0_#6A1B9A]">
              {room?.name || 'Carregando...'}
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-black/20 p-2 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="px-4">
              <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">Código da Sala</span>
              <span className="text-2xl font-black text-brand-yellow font-mono tracking-wider uppercase">{code}</span>
            </div>
            <button 
              onClick={copyCode}
              className="p-4 bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl transition-all active:scale-95 shadow-lg"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna da Esquerda: Jogadores */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black uppercase italic flex items-center gap-2">
                <Users className="text-brand-yellow" />
                Jogadores ({players.length}/{room?.max_players || 8})
              </h2>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{readyCount} prontos</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <PlayerCard player={player} isMe={player.id === localPlayerId} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Slots vazios */}
              {Array.from({ length: Math.max(0, (room?.max_players || 4) - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="border-2 border-dashed border-white/5 rounded-2xl h-24 flex items-center justify-center opacity-30">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/20 italic">Aguardando...</span>
                </div>
              ))}
            </div>

            {/* Ações do Lobby */}
            <Card className="p-8 bg-brand-card/90 backdrop-blur-md border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h3 className="font-black uppercase italic text-xl">
                  {isReady ? 'Você está pronto!' : 'Preparado para o Stop?'}
                </h3>
                <p className="text-sm text-white/50">
                  O jogo começará assim que o host der o sinal.
                </p>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <Button 
                  variant={isReady ? 'secondary' : 'default'}
                  size="lg"
                  className={`flex-grow md:flex-none px-12 h-16 text-lg shadow-xl transition-all ${isReady ? 'ring-4 ring-green-500/20' : ''}`}
                  onClick={toggleReady}
                >
                  {isReady ? 'Estou Pronto!' : 'Ficar Pronto'}
                </Button>

                {isHost && (
                  <PulseGlow color="rgba(255, 215, 0, 0.3)" active={canStart}>
                    <Button 
                      variant="primary"
                      size="lg"
                      className="h-16 px-8 shadow-[0_6px_0_#B8860B] active:translate-y-1 active:shadow-none disabled:opacity-30 disabled:grayscale transition-all"
                      disabled={!canStart}
                      onClick={startGame}
                    >
                      COMEÇAR
                    </Button>
                  </PulseGlow>
                )}
              </div>
            </Card>
          </div>

          {/* Coluna da Direita: Chat e Infos */}
          <div className="lg:col-span-4 space-y-6">
             <ChatBox 
              messages={messages} 
              onSendMessage={sendMessage}
              className="h-[500px] lg:h-[600px]"
             />
             
             <Card className="p-6 bg-brand-purple/20 border-white/10">
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-brand-yellow rounded-lg text-brand-purple">
                   <Settings size={18} />
                 </div>
                 <h4 className="font-black uppercase italic text-sm tracking-widest">Regras da Sala</h4>
               </div>
               <ul className="space-y-3">
                 <li className="flex justify-between text-xs font-medium">
                   <span className="text-white/40">Rodadas:</span>
                   <span className="font-bold">{room?.total_rounds || 5}</span>
                 </li>
                 <li className="flex justify-between text-xs font-medium">
                   <span className="text-white/40">Categorias:</span>
                   <span className="font-bold">6 Ativas</span>
                 </li>
                 <li className="flex justify-between text-xs font-medium">
                   <span className="text-white/40">Tempo por Round:</span>
                   <span className="font-bold">Ilimitado</span>
                 </li>
               </ul>
             </Card>

             <AdPlaceholder type="rectangle" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
