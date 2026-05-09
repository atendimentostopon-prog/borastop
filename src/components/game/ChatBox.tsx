'use client';

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Shield, Zap, Sparkles } from "lucide-react";
import { ChatMessage } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  className?: string;
}

export default function ChatBox({ messages, onSendMessage, className = "" }: ChatBoxProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  return (
    <div className={`flex flex-col bg-brand-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl ${className}`}>
      {/* Header do Chat */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <MessageSquare size={16} />
          </div>
          <h3 className="text-sm font-black uppercase italic tracking-widest text-white/80">Comunicações</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/20">
          <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-brand-blue">RADIO ON</span>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-game-grid bg-[length:30px_30px] opacity-90"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className={`flex flex-col ${msg.isSystem ? 'items-center py-2' : ''}`}
            >
              {msg.isSystem ? (
                <div className="bg-brand-purple/10 border border-brand-purple/20 px-4 py-1 rounded-full flex items-center gap-2">
                  <Sparkles size={12} className="text-brand-purple" />
                  <span className="text-[10px] font-black uppercase text-brand-purple/80 italic tracking-widest">{msg.text}</span>
                </div>
              ) : (
                <div className="max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1 ml-2">
                    <span className="text-[9px] font-black uppercase italic text-brand-blue tracking-tighter">{msg.playerName}</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Agora</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 backdrop-blur-md">
                    <p className="text-xs font-medium text-white/80 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input de Mensagem */}
      <form onSubmit={handleSubmit} className="p-4 bg-black/40 border-t border-white/5">
        <div className="relative group">
          <input
            type="text"
            placeholder="Transmita uma mensagem..."
            className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-6 pr-14 text-xs font-medium text-white placeholder:text-white/20 focus:border-brand-blue focus:bg-white/10 outline-none transition-all"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-brand-blue text-black flex items-center justify-center hover:scale-110 transition-transform active:scale-95 shadow-[0_0_15px_rgba(0,194,255,0.3)]"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
