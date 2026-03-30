"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  exiting?: boolean;
};

type ToastContextType = {
  toast: (message: string, type?: "success" | "error" | "info") => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-6 sm:bottom-6 sm:w-80">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 ${
                t.exiting
                  ? "opacity-0 translate-y-2 scale-95"
                  : "opacity-100 translate-y-0 scale-100 animate-slide-in-bottom"
              } ${
                t.type === "error"
                  ? "border-destructive/20 bg-destructive/95 text-white"
                  : t.type === "success"
                    ? "border-primary/20 bg-primary/95 text-white"
                    : "border-border bg-card/95 text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
