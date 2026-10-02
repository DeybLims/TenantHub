"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "error" | "success";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastApi {
  error: (title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
}

const DISMISS_AFTER_MS: Record<ToastVariant, number> = {
  error: 8000,
  success: 4500,
};

const noop = () => {};
const ToastContext = createContext<ToastApi>({ error: noop, success: noop });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(
      () => onDismiss(toast.id),
      DISMISS_AFTER_MS[toast.variant],
    );
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.variant, onDismiss]);

  const isError = toast.variant === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card"
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${isError ? "text-red-500" : "text-emerald-500"}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-gray-500">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="rounded-lg p-0.5 text-gray-400 hover:bg-gray-100"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = ++nextId.current;
      // Keep the stack short; the oldest notice goes first.
      setToasts((current) => [...current.slice(-3), { id, variant, title, message }]);
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({
      error: (title, message) => push("error", title, message),
      success: (title, message) => push("success", title, message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
