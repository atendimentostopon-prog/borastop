'use client';

import React, { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, ChevronDown, ChevronUp, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/types/game";

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage?: (text: string) => void;
  className?: string;
}

export default function ChatBox({ messages, onSendMessage, className = "" }: ChatBoxProps) {
  const [inputText, setInputText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, collapsed]);

  const handleSend = () => {
    if (!inputText.trim() || !onSendMessage) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className={`bg-brand-card/20 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl transition-all duration-500 ${collapsed ? 'h-16' : 'h-full'} ${className}`}>
      {/* Header — Translucent & Premium */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5 font-black uppercase italic text-xs tracking-[0.2em] shrink-0 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <MessageSquare size={16} className="text-brand-blue" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-green rounded-full animate-pulse" />
          </div>
          <span className="text-white/60">Transmissão Local</span>
          {messages.length > 0 && (
            <span className="bg-brand-blue/20 text-brand-blue text-[10px] px-2 py-0.5 rounded-lg border border-brand-blue/30">{messages.length}</span>
          )}
        </div>
        <div className="text-white/20">
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </button>

      {/* Body — Scrolable area */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 opacity-20 grayscale py-10">
                  <Radio size={40} className="mb-2 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Silêncio na Arena</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'}`}
                    >
                      {msg.isSystem ? (
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
                          <span className="w-1.5 h-1.5 bg-brand-yellow rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-white/40 italic uppercase tracking-wider">{msg.text}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col max-w-[85%] group">
                          <span className="text-[10px] font-black text-brand-blue/60 uppercase tracking-widest ml-3 mb-1 group-hover:text-brand-blue transition-colors">
                            {msg.playerName}
                          </span>
                          <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-3 rounded-[1.5rem] rounded-tl-sm text-sm text-white/80 shadow-lg relative overflow-hidden">
                            {msg.text}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area — Sleek and Modern */}
            <div className="p-4 bg-black/20 border-t border-white/5 flex gap-3 shrink-0">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="ENVIE UMA MENSAGEM..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold tracking-wider outline-none focus:border-brand-blue focus:bg-white/10 transition-all placeholder:text-white/20 uppercase"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-20">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                className="w-14 h-14 rounded-2xl bg-brand-blue flex items-center justify-center text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all"
              >
                <Send size={20} className="fill-black" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
