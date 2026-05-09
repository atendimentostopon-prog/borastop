'use client';

import { use } from "react";
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
type RoundRow = Database['public']['Tables']['rounds']['Row'];

interface DeletePayloadOld {
  id: string;
}

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { code } = use(params);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [myNickname, setMyNickname] = useState<string>("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMyNickname(localStorage.getItem("bora_stop_nickname") || "");
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const realtimeChannelRef = useRef<any>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const mockRoom: RoomRow = {
        id: "mock-id",
        code: code,
        name: "Sala Mock",
        is_private: false,
        password: null,
        status: "lobby",
        host_nickname: MOCK_PLAYERS[0].name,
        max_players: 8,
        round_time: 60,
        total_rounds: 5,
        current_round: 0,
        allowed_letters: "ABCDEFGHIJKLMNOPRSTUV".split(""),
        created_at: new Date().toISOString(),
      };
      setRoom(mockRoom);
      setPlayers(MOCK_PLAYERS);
      setMessages(MOCK_MESSAGES);
      setLoading(false);
      return;
    }

    const nickname = localStorage.getItem("bora_stop_nickname");
    if (!nickname) {
      router.push("/");
      return;
    }

    const loadInitialData = async () => {
      try {
        const { data: roomData, error: roomError } = await db
          .from('rooms')
          .select('*')
          .eq('code', code)
          .single();

        if (roomError || !roomData) throw new Error("Sala não encontrada");
        const typedRoom = roomData as RoomRow;
        setRoom(typedRoom);

        const { data: myPlayer } = await db
          .from('room_players')
          .select('*')
          .eq('room_id', typedRoom.id)
          .eq('nickname', nickname)
          .maybeSingle();

        if (myPlayer) {
          const typedPlayer = myPlayer as RoomPlayerRow;
          setMyPlayerId(typedPlayer.id);
          await finishJoin(typedRoom.id, typedPlayer.id);
        } else {
          if (typedRoom.is_private) {
            setShowPasswordModal(true);
            setLoading(false);
          } else {
            await insertPlayerAndJoin(typedRoom.id, nickname);
          }
        }
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Erro ao carregar sala";
        setError(message);
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [code, router]);

  const insertPlayerAndJoin = async (roomId: string, nickname: string) => {
    try {
      const insertPayload: RoomPlayerInsert = {
        room_id: roomId,
        nickname,
        is_host: false,
      };
      const { data: newPlayer, error: insertError } = await db
        .from('room_players')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newPlayer) throw new Error("Falha ao criar jogador");

      const typedPlayer = newPlayer as RoomPlayerRow;
      setMyPlayerId(typedPlayer.id);
      await finishJoin(roomId, typedPlayer.id);
    } catch (err: unknown) {
      console.error(err);
      setError("Erro ao entrar na sala. Talvez você já esteja nela ou o nome esteja em uso.");
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError("");
    if (!passwordInput.trim()) {
      setPasswordError("Digite a senha.");
      return;
    }
    setIsJoining(true);

    if (passwordInput.trim() !== room?.password) {
      setPasswordError("Senha incorreta.");
      setIsJoining(false);
      return;
    }

    const nickname = localStorage.getItem("bora_stop_nickname");
    if (!nickname || !room) return;
    await insertPlayerAndJoin(room.id, nickname);
    setIsJoining(false);
    setShowPasswordModal(false);
  };

  const finishJoin = async (roomId: string, currentPlayerId: string) => {
    try {
      const { data: playersData } = await db
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (playersData) {
        setPlayers((playersData as RoomPlayerRow[]).map(p => ({
          id: p.id,
          name: p.nickname,
          isReady: p.is_ready,
          score: p.score,
        })));
      }

      const { data: messagesData } = await db
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        setMessages((messagesData as MessageRow[]).map(m => ({
          id: m.id,
          playerId: m.player_id,
          playerName: m.nickname,
          text: m.message,
          isSystem: m.is_system,
        })));
      }

      setupRealtime(roomId, currentPlayerId);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = (roomId: string, currentPlayerId: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const channel = supabase
      .channel(`lobby-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<{ player_id: string }>();
        const onlineIds = Object.values(newState).flatMap(presences =>
          presences.map(x => x.player_id)
        );
        setPlayers(prev => prev.map(p => ({ ...p, isOnline: onlineIds.includes(p.id) })));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newP = payload.new as RoomPlayerRow;
          setPlayers(prev => {
            if (prev.some(p => p.id === newP.id)) return prev;
            return [...prev, { id: newP.id, name: newP.nickname, isReady: newP.is_ready, score: newP.score }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedP = payload.new as RoomPlayerRow;
          setPlayers(prev => {
            const exists = prev.find(p => p.id === updatedP.id);
            if (exists && exists.isReady === updatedP.is_ready && exists.score === updatedP.score) {
              return prev;
            }
            return prev.map(p =>
              p.id === updatedP.id
                ? { ...p, isReady: updatedP.is_ready, score: updatedP.score }
                : p
            );
          });
        } else if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as DeletePayloadOld).id;
          setPlayers(prev => prev.filter(p => p.id !== deletedId));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        const newMsg = payload.new as MessageRow;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, {
            id: newMsg.id,
            playerId: newMsg.player_id,
            playerName: newMsg.nickname,
            text: newMsg.message,
            isSystem: newMsg.is_system,
          }];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const updatedRoom = payload.new as RoomRow;
        if (updatedRoom.status === 'playing') {
          router.push(`/game/${code}`);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ player_id: currentPlayerId, online_at: new Date().toISOString() });
        }
      });

    realtimeChannelRef.current = channel;
  };

  const toggleReady = async () => {
    if (!isSupabaseConfigured || !myPlayerId) return;
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return;

    const newStatus = !myPlayer.isReady;

    setPlayers(prev => prev.map(p => p.id === myPlayerId ? { ...p, isReady: newStatus } : p));

    await db
      .from('room_players')
      .update({ is_ready: newStatus })
      .eq('id', myPlayerId);
  };

  const [isStarting, setIsStarting] = useState(false);

  const startGame = async () => {
    if (!isSupabaseConfigured || !room?.id || isStarting) {
      if (!isSupabaseConfigured) router.push(`/game/${code}`);
      return;
    }

    setIsStarting(true);
    try {
      const { data: dbPlayers } = await db
        .from('room_players')
        .select('is_ready')
        .eq('room_id', room.id);

      const typedPlayers = dbPlayers as { is_ready: boolean }[] | null;

      if (!typedPlayers || typedPlayers.length < 2 || !typedPlayers.every(p => p.is_ready)) {
        alert("Não é possível iniciar. Aguarde todos os jogadores ficarem prontos.");
        setIsStarting(false);
        return;
      }

      const { data: existingRound } = await db
        .from('rounds')
        .select('id')
        .eq('room_id', room.id)
        .eq('round_number', 1)
        .maybeSingle();

      if (!existingRound) {
        const letter = getRandomLetter(room.allowed_letters ?? []);

        const roundPayload: RoundInsert = {
          room_id: room.id,
          round_number: 1,
          letter,
          status: 'playing',
          started_at: new Date().toISOString(),
        };

        const { error: roundError } = await db
          .from('rounds')
          .insert(roundPayload);

        if (roundError) throw roundError;
      }

      const { error: roomError } = await db
        .from('rooms')
        .update({ status: 'playing', current_round: 1 })
        .eq('id', room.id);

      if (roomError) throw roomError;

    } catch (err: unknown) {
      console.error("Erro ao iniciar jogo:", err);
      setIsStarting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    if (!isSupabaseConfigured) {
      setMessages(prev => [...prev, { id: Math.random().toString(), playerName: "Você", text, isSystem: false }]);
      return;
    }

    const nickname = localStorage.getItem("bora_stop_nickname") || "Jogador";

    try {
      if (!room) return;

      const msgPayload: MessageInsert = {
        room_id: room.id,
        player_id: myPlayerId || null,
        nickname,
        message: text.trim(),
        is_system: false,
      };

      const { data, error: msgError } = await db
        .from('messages')
        .insert(msgPayload)
        .select()
        .single();

      if (msgError) throw msgError;

      if (data) {
        const typed = data as MessageRow;
        setMessages(prev => {
          if (prev.some(m => m.id === typed.id)) return prev;
          return [...prev, {
            id: typed.id,
            playerId: typed.player_id,
            playerName: typed.nickname,
            text: typed.message,
            isSystem: typed.is_system,
          }];
        });
      }
    } catch (err: unknown) {
      console.error(err);
      alert("Erro ao enviar mensagem.");
    }
  };

  if (loading) {
    return <PageContainer className="flex items-center justify-center min-h-[50vh]"><div className="text-white/50 text-xl animate-pulse">Carregando sala...</div></PageContainer>;
  }

  if (showPasswordModal && room) {
    return (
      <PageContainer className="flex flex-col items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md flex flex-col gap-6 items-center text-center">
          <div className="w-16 h-16 bg-brand-purple/20 rounded-full flex items-center justify-center text-brand-blue mb-2">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase italic">Sala Privada</h2>
          <p className="text-white/70">Digite a senha para entrar na sala <strong>{room.name}</strong></p>

          <div className="w-full">
            <Input
              type="password"
              placeholder="Senha..."
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError("");
              }}
              error={passwordError}
              className="text-center text-lg tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePasswordSubmit();
              }}
            />
          </div>

          <div className="w-full flex flex-col gap-3 mt-4">
            <Button size="lg" fullWidth onClick={handlePasswordSubmit} disabled={isJoining}>
              {isJoining ? "Verificando..." : "Entrar"}
            </Button>
            <Link href="/rooms" className="w-full">
              <Button variant="secondary" fullWidth>Voltar</Button>
            </Link>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (error || !room) {
    return (
      <PageContainer className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <div className="text-red-400 text-xl">{error || "Sala não encontrada"}</div>
        <Link href="/rooms">
          <Button>Voltar para as salas</Button>
        </Link>
      </PageContainer>
    );
  }

  const amIHost = room.host_nickname === myNickname;
  const myPlayer = players.find(p => p.id === myPlayerId);

  return (
    <PageContainer>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-brand-card backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-white/60 font-bold uppercase text-sm tracking-widest">Código da Sala</span>
              <div className="text-4xl md:text-6xl font-black font-mono tracking-wider text-brand-yellow drop-shadow-[0_2px_0_#b89b00]">
                {room.code}
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
              <Button variant="secondary" className="flex items-center gap-2" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                <Copy size={18} /> Copiar Link
              </Button>
              <div className="text-sm text-center text-white/50 flex items-center justify-center gap-1">
                <Settings size={14} /> {room.total_rounds} rodadas • {room.max_players}s
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-brand-blue" />
                Jogadores
              </h2>
              <span className="bg-white/10 px-3 py-1 rounded-full text-sm">{players.length}/{room.max_players}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {players.map(player => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          <AdPlaceholder type="banner" />
        </div>

        <div className="flex flex-col gap-6 h-full">
          <ChatBox messages={messages} onSendMessage={handleSendMessage} className="flex-1 min-h-[300px]" />

          <div className="flex flex-col gap-3">
            <Button
              onClick={toggleReady}
              variant="secondary"
              size="lg"
              className={`w-full border-2 ${myPlayer?.isReady ? 'border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'border-brand-green bg-brand-green/10 text-brand-green hover:bg-brand-green/20'}`}
            >
              {myPlayer?.isReady ? "Não estou pronto" : "Estou Pronto"}
            </Button>

            {amIHost && (
              <div className="flex flex-col gap-2">
                <PulseGlow
                  active={players.length >= 2 && players.every(p => p.isReady) && room.status === 'lobby'}
                  color="brand-blue"
                >
                  <Button
                    onClick={startGame}
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isStarting || players.length < 2 || !players.every(p => p.isReady) || room.status !== 'lobby'}
                  >
                    {isStarting ? "Iniciando..." : "Começar Jogo"}
                  </Button>
                </PulseGlow>
                {players.length < 2 && (
                  <span className="text-center text-sm text-brand-yellow font-bold animate-pulse">Aguardando mais jogadores...</span>
                )}
                {players.length >= 2 && !players.every(p => p.isReady) && (
                  <span className="text-center text-sm text-brand-yellow font-bold animate-pulse">Aguardando todos ficarem prontos...</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
