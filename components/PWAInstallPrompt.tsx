import React, { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PWAInstallPrompt: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    setIsInstalled(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
      setMessage('Aplicativo instalado com sucesso.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installEvent) {
      setMessage('O Chrome ainda não liberou a instalação para esta página. Abra o endereço publicado diretamente (não a pré-visualização do v0), confirme HTTPS e tente novamente.');
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    setInstallEvent(null);
    setMessage(choice.outcome === 'accepted' ? 'Confirme a instalação na janela do Chrome.' : 'Instalação cancelada.');
  };

  if (isInstalled) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[9999] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      {message && (
        <p className="max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-right text-xs font-semibold text-white shadow-lg">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={installApp}
        className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black uppercase text-white shadow-xl shadow-emerald-950/40 transition hover:bg-emerald-500 active:scale-95"
        aria-label="Instalar aplicativo CryptonBet"
      >
        Instalar aplicativo
      </button>
    </div>
  );
};

export default PWAInstallPrompt;
