"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type GlassToastTone = "info" | "success" | "error";

export interface GlassToastOptions {
  tone?: GlassToastTone;
  duration?: number;
}

interface ToastRecord {
  id: number;
  message: string;
  tone: GlassToastTone;
  duration: number;
}

interface GlassToastContextValue {
  showToast: (message: string, options?: GlassToastOptions) => void;
}

const GlassToastContext = createContext<GlassToastContextValue | null>(null);

const DEFAULT_DURATION = 3200;

export function GlassToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: GlassToastOptions) => {
      setToasts((current) => {
        const id = Date.now() + Math.random();
        const tone = options?.tone ?? "info";
        const duration = Math.max(1200, options?.duration ?? DEFAULT_DURATION);
        const nextToast: ToastRecord = { id, message, tone, duration };
        window.setTimeout(() => removeToast(id), duration);
        return [...current, nextToast];
      });
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <GlassToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[2000] flex justify-center px-4 sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-2">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  role="status"
                  className={`glass-card glass-card--muted glass-card--translucent flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-right shadow-lg shadow-black/5 backdrop-blur-xl ${
                    toast.tone === "success"
                      ? "border border-white/40 text-[var(--color-foreground)]"
                      : toast.tone === "error"
                        ? "border border-[#ff6b6b]/30 text-[#ffefef]"
                        : "border border-white/30 text-[var(--color-foreground)]"
                  }`}
                >
                  <span className="block flex-1 leading-5">{toast.message}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </GlassToastContext.Provider>
  );
}

export function useGlassToast() {
  const context = useContext(GlassToastContext);
  if (!context) {
    throw new Error("useGlassToast must be used within a GlassToastProvider");
  }
  return context;
}
