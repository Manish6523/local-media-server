"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400" },
  error: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-400" },
  info: { bg: "bg-violet-500/10", border: "border-violet-500/20", icon: "text-violet-400" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400" },
};

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      // Max 3 toasts
      return next.slice(-3);
    });

    // Auto-dismiss after 3s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast container — bottom right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((t) => {
          const colors = TOAST_COLORS[t.type];
          const Icon = TOAST_ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${colors.bg} ${colors.border} animate-in slide-in-from-right-5 fade-in duration-300 max-w-sm`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${colors.icon}`} />
              <span className="text-sm text-white/80 font-medium flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="text-white/30 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
