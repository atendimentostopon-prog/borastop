import React, { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
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
    <div className={`bg-black/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden ${className}`}>
      {/* Header — clicável no mobile para recolher */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between px-4 py-3 bg-brand-purple/40 border-b border-white/10 font-bold text-sm shrink-0 hover:bg-brand-purple/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={15} />
          <span>Chat</span>
          {messages.length > 0 && (
            <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">{messages.length}</span>
          )}
        </div>
        <span className="lg:hidden text-white/40">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </button>

      {/* Body — recolhível no mobile */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col min-h-0 flex-1"
          >
            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
              {messages.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-6">Nenhuma mensagem ainda</p>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'}`}
                    >
                      {msg.isSystem ? (
                        <span className="text-xs text-white/40 italic bg-white/5 px-3 py-1 rounded-full">{msg.text}</span>
                      ) : (
                        <div className="flex flex-col max-w-[90%]">
                          <span className="text-xs text-white/50 ml-2 mb-1">{msg.sender}</span>
                          <div className="bg-white/10 px-3 py-2 rounded-2xl rounded-tl-sm text-sm">{msg.text}</div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t border-white/10 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Digite algo..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-blue transition-colors"
              />
              <button
                onClick={handleSend}
                className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center text-black hover:bg-cyan-400 transition-colors shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
