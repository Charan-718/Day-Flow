import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircleIcon, CloseIcon, InfoIcon, XCircleIcon } from './icons';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (variant: ToastVariant, message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// DESIGN_SYSTEM §18.3 — success auto-dismisses, error persists until the user acts on it.
const AUTO_DISMISS_MS: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 5000,
  error: null,
};

const MAX_VISIBLE = 3;

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircleIcon; classes: string }> = {
  success: {
    icon: CheckCircleIcon,
    classes: 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]',
  },
  error: {
    icon: XCircleIcon,
    classes: 'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]',
  },
  info: {
    icon: InfoIcon,
    classes: 'border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent)]',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const schedule = useCallback(
    (id: string, variant: ToastVariant) => {
      const duration = AUTO_DISMISS_MS[variant];
      if (duration == null) return;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
    },
    [dismiss]
  );

  const pause = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback<ToastContextValue['showToast']>(
    (variant, message, action) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, variant, message, action }]);
      schedule(id, variant);
    },
    [schedule]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-stretch gap-2 p-3 sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-auto sm:items-end sm:p-4">
        {toasts.map((t) => {
          const { icon: Icon, classes } = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role={t.variant === 'error' ? 'alert' : 'status'}
              aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => schedule(t.id, t.variant)}
              onFocus={() => pause(t.id)}
              onBlur={() => schedule(t.id, t.variant)}
              className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border px-4 py-3 shadow-lg sm:max-w-sm ${classes}`}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-1 rounded text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
