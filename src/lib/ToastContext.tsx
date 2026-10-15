import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
  confirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const addToast = (type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const confirm = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setConfirmState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || '確定',
      cancelLabel: options.cancelLabel || '取消',
      onConfirm: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        options.onConfirm();
      },
      onCancel: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        if (options.onCancel) options.onCancel();
      },
    });
  };

  const toastMethods = {
    success: (title: string, message?: string, duration?: number) => addToast('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) => addToast('error', title, message, duration || 5000),
    warning: (title: string, message?: string, duration?: number) => addToast('warning', title, message, duration),
    info: (title: string, message?: string, duration?: number) => addToast('info', title, message, duration),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, confirm }}>
      {children}

      {/* Floating Toasts at Top Center */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto bg-wabi-paper/95 backdrop-blur-md border border-wabi-accent/40 rounded-2xl p-4 shadow-xl shadow-wabi-ink/5 flex items-start gap-3.5"
            >
              <div className="mt-0.5 flex-shrink-0">
                {t.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600" />}
                {t.type === 'error' && <AlertCircle size={18} className="text-rose-600" />}
                {t.type === 'warning' && <AlertTriangle size={18} className="text-amber-600" />}
                {t.type === 'info' && <Info size={18} className="text-wabi-stone" />}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-bold text-wabi-ink leading-snug">{t.title}</h4>
                {t.message && (
                  <p className="text-[11px] text-wabi-stone mt-1 leading-relaxed whitespace-pre-line break-words">
                    {t.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-wabi-stone/50 hover:text-wabi-ink p-1 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* In-app Confirmation Modal */}
      <AnimatePresence>
        {confirmState.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={confirmState.onCancel}
              className="absolute inset-0 bg-wabi-ink/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-wabi-paper border border-wabi-accent/50 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4"
            >
              <div className="space-y-1.5">
                <h3 className="text-base font-serif font-bold text-wabi-ink">{confirmState.title}</h3>
                <p className="text-xs text-wabi-stone leading-relaxed whitespace-pre-line">
                  {confirmState.message}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={confirmState.onCancel}
                  className="px-4 py-2 rounded-xl text-xs text-wabi-stone hover:bg-wabi-accent/20 transition-colors"
                >
                  {confirmState.cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={confirmState.onConfirm}
                  className="px-4 py-2 bg-wabi-ink text-wabi-paper rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {confirmState.confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
