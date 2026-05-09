"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextData {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md min-w-[250px]
                ${toast.type === 'success' ? 'bg-brand-green/20 border-brand-green text-brand-green' : ''}
                ${toast.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' : ''}
                ${toast.type === 'warning' ? 'bg-brand-yellow/20 border-brand-yellow text-brand-yellow' : ''}
                ${toast.type === 'info' ? 'bg-brand-blue/20 border-brand-blue text-brand-blue' : ''}
              `}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
              <span className="font-medium text-sm text-white drop-shadow-md">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
