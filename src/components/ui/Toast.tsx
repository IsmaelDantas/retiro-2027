import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const typeConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-success-light',
    border: 'border-success',
    text: 'text-success',
  },
  error: {
    icon: XCircle,
    bg: 'bg-danger-light',
    border: 'border-danger',
    text: 'text-danger',
  },
  info: {
    icon: Info,
    bg: 'bg-primary-50',
    border: 'border-primary-500',
    text: 'text-primary-600',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg
              animate-toast-in
              ${config.bg} ${config.border}
            `}
            role="alert"
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.text}`} />
            <p className="text-sm text-text-primary flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 text-text-tertiary hover:text-text-primary cursor-pointer"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
