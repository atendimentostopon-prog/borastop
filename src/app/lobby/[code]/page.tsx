'use client';

import { use } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Settings, Users, Lock, Sparkles, Gamepad2, Rocket, Share2, Info, X } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import PlayerCard from "@/components/game/PlayerCard";
import ChatBox from "@/components/game/ChatBox";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { Player, ChatMessage } from "@/types/game";
import { getRandomLetter } from "@/lib/game/letters";

const db = supabase as any;

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoomPlayerRow = Database['public']['Tables']['room_players']['Row'];
type RoomPlayerInsert = Database['public']['Tables']['room_players']['Insert'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
type RoundInsert = Database['public']['Tables']['rounds']['Insert'];

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { code } = use(params);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [myNickname, setMyNickname] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const realtimeChannelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMyNickname(localStorage.getItem("bora_stop_nickname") || "");
    }
  }, []);

  useEffect(() => {
    const nickname = localStorage.getItem("bora_stop_nickname");
    if (!nickname) { router.push("/"); return; }

    const loadInitialData = async () => {
      try {
        const { data: roomData, error: roomError } = await db
          .from('rooms')
          .select('*')
          .eq('code', code)
          .single();

        if (roomError || !roomData) throw new Error("Arena não localizada no radar.");
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
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadInitialData();
    return () => { if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current); };
  }, [code, router]);

  const insertPlayerAndJoin = async (roomId: string, nickname: string) => {
    try {
      const { data: newPlayer, error: insertError } = await db
        .from('room_players')
        .insert({ room_id: roomId, nickname, is_host: false } as RoomPlayerInsert)
        .select().single();

      if (insertError) throw insertError;
      const typedPlayer = newPlayer as RoomPlayerRow;
      setMyPlayerId(typedPlayer.id);
      await finishJoin(roomId, typedPlayer.id);
    } catch (err) {
      setError("Acesso negado. Tente outro nome ou sala.");
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) { setPasswordError("Senha obrigatória."); return; }
    setIsJoining(true);
    if (passwordInput.trim() !== room?.password) {
      setPasswordError("Chave de acesso inválida.");
      setIsJoining(false);
      return;
    }
    const nickname = localStorage.getItem("bora_stop_nickname");
    if (nickname && room) await insertPlayerAndJoin(room.id, nickname);
    setIsJoining(false);
    setShowPasswordModal(false);
  };

  const finishJoin = async (roomId: string, currentPlayerId: string) => {
    try {
      const { data: playersData } = await db.from('room_players').select('*').eq('room_id', roomId).order('joined_at', { ascending: true });
      if (playersData) setPlayers((playersData as RoomPlayerRow[]).map(p => ({ id: p.id, name: p.nickname, isReady: p.is_ready, score: p.score })));
      
      const { data: messagesData } = await db.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
      if (messagesData) setMessages((messagesData as MessageRow[]).map(m => ({ id: m.id, playerId: m.player_id, playerName: m.nickname, text: m.message, isSystem: m.is_system })));

      setupRealtime(roomId, currentPlayerId);
    } finally { setLoading(false); }
  };

  const setupRealtime = (roomId: string, currentPlayerId: string) => {
    const channel = supabase
      .channel(`lobby-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const onlineIds = Object.values(channel.presenceState<{ player_id: string }>()).flatMap(p => p.map(x => x.player_id));
        setPlayers(prev => prev.map(p => ({ ...p, isOnline: onlineIds.includes(p.id) })));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newP = payload.new as RoomPlayerRow;
          setPlayers(prev => [...prev, { id: newP.id, name: newP.nickname, isReady: newP.is_ready, score: newP.score }]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedP = payload.new as RoomPlayerRow;
          setPlayers(prev => prev.map(p => p.id === updatedP.id ? { ...p, isReady: updatedP.is_ready, score: updatedP.score } : p));
        } else if (payload.eventType === 'DELETE') {
          setPlayers(prev => prev.filter(p => p.id !== (payload.old as any).id));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        const newMsg = payload.new as MessageRow;
        setMessages(prev => [...prev, { id: newMsg.id, playerId: newMsg.player_id, playerName: newMsg.nickname, text: newMsg.message, isSystem: newMsg.is_system }]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if ((payload.new as RoomRow).status === 'playing') router.push(`/game/${code}`);
      })
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ player_id: currentPlayerId }); });

    realtimeChannelRef.current = channel;
  };

  const toggleReady = async () => {
    if (!myPlayerId) return;
    const myPlayer = players.find(p => p.id === myPlayerId);
    if (!myPlayer) return;
    const newStatus = !myPlayer.isReady;
    setPlayers(prev => prev.map(p => myPlayerId === p.id ? { ...p, isReady: newStatus } : p));
    await db.from('room_players').update({ is_ready: newStatus }).eq('id', myPlayerId);
  };

  const startGame = async () => {
    if (!room?.id || isStarting) return;
    setIsStarting(true);
    try {
      if (players.length < 2 || !players.every(p => p.isReady)) {
        alert("Todos os jogadores devem estar PRONTOS!");
        setIsStarting(false);
        return;
      }
      const letter = getRandomLetter(room.allowed_letters ?? []);
      await db.from('rounds').insert({ room_id: room.id, round_number: 1, letter, status: 'playing', started_at: new Date().toISOString() } as RoundInsert);
      await db.from('rooms').update({ status: 'playing', current_round: 1 }).eq('id', room.id);
    } catch (err) {
      console.error(err);
      setIsStarting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !room) return;
    const nickname = localStorage.getItem("bora_stop_nickname") || "Jogador";
    try {
      await db.from('messages').insert({
        room_id: room.id,
        player_id: myPlayerId || null,
        nickname,
        message: text.trim(),
        is_system: false,
      } as MessageInsert);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <PageContainer className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div className="w-20 h-20 bg-brand-purple/20 rounded-full border-4 border-brand-purple/40 border-t-brand-purple animate-spin" />
      <h2 className="text-xl font-black uppercase italic animate-pulse">Sincronizando com a Arena...</h2>
    </PageContainer>
  );

  if (showPasswordModal && room) return (
    <PageContainer className="flex items-center justify-center min-h-[70vh]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="game-card max-w-md p-10 text-center">
        <Lock size={60} className="mx-auto text-brand-yellow mb-6 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
        <h2 className="text-3xl font-black uppercase italic mb-2">Arena Privada</h2>
        <p className="text-white/50 text-sm mb-8">Essa partida exige uma chave de segurança.</p>
        <Input type="password" placeholder="SENHA DA SALA" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} error={passwordError} className="input-game text-center h-16 text-2xl tracking-[0.3em]" />
        <div className="mt-8 space-y-4">
          <Button fullWidth onClick={handlePasswordSubmit} disabled={isJoining} className="game-button h-16 text-lg">ENTRAR AGORA</Button>
          <Link href="/rooms" className="block text-white/30 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">Abortar Missão</Link>
        </div>
      </motion.div>
    </PageContainer>
  );

  const amIHost = room?.host_nickname === myNickname;
  const myPlayer = players.find(p => p.id === myPlayerId);

  return (
    <PageContainer className="relative">
      <div className="absolute inset-0 bg-game-grid opacity-5 pointer-events-none" />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Lado Esquerdo: Players & Sala */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-brand-card/30 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-brand-purple/10 rounded-[2rem] border border-brand-purple/20 flex items-center justify-center text-brand-purple shadow-inner">
                <Gamepad2 size={40} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 block mb-1">Código de Acesso</span>
                <h1 className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-brand-yellow neon-text">
                  {room?.code}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black uppercase italic text-xs"
              >
                <Share2 size={18} className="text-brand-blue" /> Convidar Amigos
              </motion.button>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                <Settings size={20} />
              </div>
            </div>
          </motion.div>

          <div className="game-card flex-1 p-8 bg-brand-card/20 min-h-[500px]">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Users className="text-brand-blue" size={24} />
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white/80">Lista de Jogadores</h2>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                <span className="text-sm font-black italic">{players.length} / {room?.max_players || 10}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {players.map((player, idx) => (
                  <motion.div key={player.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
                    <PlayerCard player={player} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Lado Direito: Chat & Ações */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-brand-card/20 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white/20 mb-2">
              <Info size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Configurações Ativas</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Rodadas</p>
                <p className="text-xl font-black italic text-white">{room?.total_rounds}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Tempo</p>
                <p className="text-xl font-black italic text-brand-yellow">{room?.round_time}s</p>
              </div>
            </div>
          </div>

          <ChatBox messages={messages} onSendMessage={handleSendMessage} className="flex-1 min-h-[400px] bg-brand-card/10!" />

          <div className="space-y-4 pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={toggleReady}
              className={`w-full h-20 rounded-[2rem] border-4 transition-all duration-500 font-black uppercase italic tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 ${myPlayer?.isReady ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-brand-green/10 border-brand-green text-brand-green shadow-[0_0_30px_rgba(34,197,94,0.2)]'}`}
            >
              {myPlayer?.isReady ? 'CANCELAR PRONTO' : 'ESTOU PRONTO'}
              {myPlayer?.isReady ? <X size={24} /> : <Rocket size={24} />}
            </motion.button>

            {amIHost && (
              <div className="space-y-3">
                <Button
                  onClick={startGame}
                  variant="primary"
                  className="game-button w-full h-20 text-2xl font-black italic tracking-widest"
                  disabled={isStarting || players.length < 2 || !players.every(p => p.isReady)}
                >
                  {isStarting ? 'LANÇANDO...' : 'INICIAR ARENA'}
                  <Sparkles size={24} className="ml-4" />
                </Button>
                
                <AnimatePresence>
                  {(players.length < 2 || !players.every(p => p.isReady)) && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-[10px] font-black uppercase text-brand-yellow tracking-[0.3em] animate-pulse">
                      Aguardando esquadrão ficar pronto...
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
