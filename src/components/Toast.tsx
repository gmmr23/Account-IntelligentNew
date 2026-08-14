import React, { useEffect } from 'react';
import { CheckCircle, Info, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'error';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: (id: string) => void; key?: string }) {
  useEffect(() => {
    const duration = toast.type === 'error' ? 2000 : 4500;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, onClose, toast.type]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-xs font-semibold ${
        toast.type === 'success'
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
          : toast.type === 'error'
          ? 'bg-rose-50 border-rose-100 text-rose-800'
          : 'bg-blue-50 border-blue-100 text-blue-800'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {toast.type === 'success' ? (
          <CheckCircle size={15} className="text-emerald-600 stroke-[2.5]" />
        ) : toast.type === 'error' ? (
          <AlertCircle size={15} className="text-rose-600 stroke-[2.5]" />
        ) : (
          <Info size={15} className="text-blue-600 stroke-[2.5]" />
        )}
      </div>
      <div className="flex-1 leading-normal">{toast.text}</div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-slate-400 hover:text-slate-700 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
