import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, CheckCircle2 } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt if user hasn't dismissed it in this session
      const dismissed = sessionStorage.getItem('cryptonbet_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt on iOS if not dismissed
    if (isIosDevice && !sessionStorage.getItem('cryptonbet_pwa_dismissed')) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    sessionStorage.setItem('cryptonbet_pwa_dismissed', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <>
      {/* Floating Bottom PWA Install Banner */}
      <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md bg-slate-900/95 backdrop-blur-xl border border-[#049444]/40 p-3.5 sm:p-4 rounded-2xl shadow-2xl z-[900] text-white animate-bounce-short">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#049444] rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shrink-0">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-xs sm:text-sm text-white uppercase tracking-tight">CryptonBet App</h4>
                <span className="bg-[#049444]/20 text-[#049444] text-[8px] font-black px-1.5 py-0.5 rounded border border-[#049444]/30 uppercase">
                  PWA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium line-clamp-1">
                Instale no seu ecrã inicial para acesso rápido e direto!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-[#049444] hover:bg-[#037235] text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-[1000] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#049444] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                C
              </div>
              <div>
                <h3 className="font-black text-sm uppercase text-white">Instalar CryptonBet no iPhone</h3>
                <p className="text-xs text-slate-400">Siga os 2 passos no seu Safari:</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#049444]/20 text-[#049444] font-black flex items-center justify-center shrink-0 text-xs">1</div>
                <p className="text-slate-200">Toque no botão <span className="font-black text-white inline-flex items-center gap-1 bg-slate-700 px-1.5 py-0.5 rounded"><Share className="w-3 h-3 text-blue-400" /> Partilhar</span> na barra do browser Safari.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#049444]/20 text-[#049444] font-black flex items-center justify-center shrink-0 text-xs">2</div>
                <p className="text-slate-200">Role para baixo e selecione <span className="font-black text-white inline-flex items-center gap-1 bg-slate-700 px-1.5 py-0.5 rounded"><PlusSquare className="w-3 h-3 text-green-400" /> Adicionar ao Ecrã Principal</span>.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full bg-[#049444] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
