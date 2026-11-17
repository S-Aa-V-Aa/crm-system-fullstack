import { useState, useCallback, type ReactNode } from 'react';
import { ToastContext, type ToastType } from '../hooks/useToast';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastProviderProps {
  children: ReactNode;
}

const TOAST_STYLES: Record<ToastType, { container: string; indicator: string }> = {
  success: {
    container: 'bg-white border-emerald-200 text-slate-800',
    indicator: 'bg-emerald-500',
  },
  error: {
    container: 'bg-white border-red-200 text-slate-800',
    indicator: 'bg-red-500',
  },
  info: {
    container: 'bg-white border-slate-200 text-slate-800',
    indicator: 'bg-slate-600',
  },
};

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Автоматичне приховування сповіщення через 3.5 секунди
      window.setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Контейнер сповіщень у правому нижньому куті екрана */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-md text-xs font-medium transition-all ${style.container}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.indicator}`} />
                <span className="leading-relaxed">{toast.message}</span>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors shrink-0"
                aria-label="Закрити сповіщення"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};