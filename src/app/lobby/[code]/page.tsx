'use client';

import { use } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Settings, Users, Lock, Sparkles, Gamepad2, Rocket, Share2, Info, X, LogOut, ArrowLeft } from "lucide-react";
import PlayerCard from "@/components/game/PlayerCard";
import ChatBox from "@/components/game/ChatBox";
import GameButton from "@/components/game/GameButton";
import GameModal from "@/components/game/GameModal";
import { supabase } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { Player, ChatMessage } from "@/types/game";
import { getRandomLetter } from "@/lib/game/letters";
import { useToast } from "@/components/ui/ToastProvider";

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
  const { addToast } = useToast();

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
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

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
    setPlayers(prev => prev.map(p => p.id === myPlayerId ? { ...p, isReady: newStatus } : p));
    await db.from('room_players').update({ is_ready: newStatus }).eq('id', myPlayerId);
  };

  const startGame = async () => {
    if (!room?.id || isStarting) return;
    setIsStarting(true);
    try {
      if (players.length < 2 || !players.every(p => p.isReady)) {
        addToast("Todos os jogadores devem estar PRONTOS!", "error");
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

  const handleExitRoom = async () => {
    if (myPlayerId) {
       await db.from('room_players').delete().eq('id', myPlayerId);
    }
    router.push('/');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="w-20 h-20 bg-brand-purple/20 rounded-full border-4 border-brand-purple/40 border-t-brand-purple animate-spin" />
      <h2 className="text-xl font-black uppercase italic animate-pulse">Sincronizando com a Arena...</h2>
    </div>
  );

  if (showPasswordModal && room) return (
    <div className="flex items-center justify-center h-full">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="game-card max-w-md p-10 text-center bg-[#151722]">
        <Lock size={60} className="mx-auto text-brand-yellow mb-6 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
        <h2 className="text-3xl font-black uppercase italic mb-2">Arena Privada</h2>
        <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-8">Essa partida exige uma chave de segurança.</p>
        <div className="space-y-4">
           <input 
             type="password" 
             placeholder="SENHA DA SALA" 
             value={passwordInput} 
             onChange={(e) => {
               setPasswordInput(e.target.value);
               setPasswordError("");
             }} 
             className={`w-full h-16 bg-black/40 border-2 rounded-2xl px-6 text-center text-2xl font-black tracking-[0.3em] outline-none transition-all ${passwordError ? 'border-red-500' : 'border-white/5 focus:border-brand-yellow'}`} 
           />
           {passwordError && <p className="text-red-500 text-[10px] font-black uppercase">{passwordError}</p>}
        </div>
        <div className="mt-8 space-y-4">
          <GameButton title="ENTRAR AGORA" onClick={handlePasswordSubmit} disabled={isJoining} variant="accent" className="w-full h-16 rounded-2xl" />
          <button 
            onClick={() => router.push('/rooms')}
            className="block w-full text-white/30 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors"
          >
            Abortar Missão
          </button>
        </div>
      </motion.div>
    </div>
  );

  const amIHost = room?.host_nickname === myNickname;
  const myPlayer = players.find(p => p.id === myPlayerId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Lobby Header */}
      <div className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsExitModalOpen(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white border border-white/5"
          >
            <LogOut size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white neon-text">
              {room?.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[10px] text-brand-yellow font-black uppercase tracking-[0.2em] flex items-center gap-2">
                 <Hash size={10} /> {room?.code}
               </span>
               <span className="w-1 h-1 bg-white/10 rounded-full" />
               <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">{room?.is_private ? 'Privada' : 'Pública'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 flex items-center gap-2"
          >
            <Share2 size={18} className="text-brand-blue" />
            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-white/60">Convidar</span>
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20">
            <Settings size={20} />
          </div>
        </div>
      </div>

      {/* Lobby Content */}
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-fit pb-24">
          
          {/* Players Grid */}
          <div className="lg:col-span-8 space-y-6">
            <div className="game-card p-8 bg-white/[0.01] border-white/5 min-h-[500px]">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Users className="text-brand-blue" size={24} />
                  <h2 className="text-2xl font-black uppercase italic tracking-tight text-white/80">Lista de Jogadores</h2>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                  <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                  <span className="text-[10px] font-black italic tracking-widest">{players.length} / {room?.max_players || 10}</span>
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

          {/* Sidebar: Chat & Configs */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="game-card p-6 border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-2 text-white/20 mb-4">
                <Info size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Configurações Ativas</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Rodadas</p>
                  <p className="text-xl font-black italic text-white leading-none">{room?.total_rounds}</p>
                </div>
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Tempo</p>
                  <p className="text-xl font-black italic text-brand-yellow leading-none">{room?.round_time}s</p>
                </div>
              </div>
            </div>

            <ChatBox messages={messages} onSendMessage={handleSendMessage} className="flex-1 min-h-[400px]" />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0F111A] via-[#0F111A]/90 to-transparent z-50">
        <div className="flex items-center justify-between max-w-5xl mx-auto bg-[#1A1C26] p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="hidden md:flex items-center gap-6 ml-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.2em]">Sua Condição</span>
              <span className={`text-sm font-black italic uppercase ${myPlayer?.isReady ? 'text-brand-green' : 'text-brand-yellow'}`}>
                {myPlayer?.isReady ? 'Pronto para o Combate' : 'Preparando Equipamento'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <GameButton 
              title={myPlayer?.isReady ? "NÃO ESTOU PRONTO" : "ESTOU PRONTO"}
              subtitle={myPlayer?.isReady ? "Aguardar um pouco mais" : "Confirmar minha entrada"}
              icon={myPlayer?.isReady ? X : Rocket}
              variant={myPlayer?.isReady ? "danger" : "primary"}
              onClick={toggleReady}
              className="flex-1 md:w-64 h-20 rounded-2xl"
            />
            
            {amIHost && (
              <GameButton 
                title={isStarting ? "LANÇANDO..." : "INICIAR ARENA"}
                subtitle={isStarting ? "Boa sorte!" : "Começar a partida"}
                icon={Sparkles}
                variant="accent"
                onClick={startGame}
                disabled={isStarting || players.length < 2 || !players.every(p => p.isReady)}
                className="flex-1 md:w-64 h-20 rounded-2xl"
              />
            )}
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <GameModal 
        isOpen={isExitModalOpen} 
        onClose={() => setIsExitModalOpen(false)}
        title="Abortar Missão?"
      >
        <div className="space-y-8 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
            <LogOut size={40} />
          </div>
          <p className="text-white/60 font-bold uppercase tracking-widest text-xs leading-relaxed">
            Deseja realmente sair da arena? <br /> Seu progresso será perdido.
          </p>
          <div className="flex gap-4">
             <button 
               onClick={() => setIsExitModalOpen(false)}
               className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
             >
               Não, Continuar
             </button>
             <button 
               onClick={handleExitRoom}
               className="flex-1 h-14 rounded-2xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
             >
               Sim, Sair
             </button>
          </div>
        </div>
      </GameModal>
    </div>
  );
}
