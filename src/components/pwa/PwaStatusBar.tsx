import { useEffect, useState } from 'react';
import { WifiOff, Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)').matches : false
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    triggerInstall,
  };
}

export function PwaStatusBar() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { canInstall, triggerInstall } = usePwaInstall();
  const [dismissedInstall, setDismissedInstall] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline && (!canInstall || dismissedInstall)) {
    return null;
  }

  return (
    <div className="space-y-2 mb-4">
      {!isOnline && (
        <div
          role="status"
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium"
        >
          <WifiOff className="w-4 h-4 text-amber-700 flex-shrink-0" aria-hidden="true" />
          <span>Sem conexão com a internet. Você está vendo os dados salvos em cache.</span>
        </div>
      )}

      {isOnline && canInstall && !dismissedInstall && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-primary-50 border border-primary-200 text-primary-900 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="w-4 h-4 text-primary-600 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">Instalar Retiro 2027 na tela inicial do celular</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => void triggerInstall()}
              className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold cursor-pointer min-h-[36px]"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={() => setDismissedInstall(true)}
              aria-label="Dispensar aviso de instalação"
              className="p-1.5 rounded-lg text-primary-700 hover:bg-primary-100 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
