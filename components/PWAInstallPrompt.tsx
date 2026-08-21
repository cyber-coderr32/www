import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Zap, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false);
  const [showAndroidManualInstructions, setShowAndroidManualInstructions] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Verificar se o app já está a correr no modo PWA instalado (Standalone)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detectar se é dispositivo iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Escutar o evento nativo de instalação do navegador (Chrome, Edge, Android, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Mostrar o popup para instalar PWA UMA ÚNICA VEZ ao abrir o site no navegador
    const timer = setTimeout(() => {
      const alreadyShown = localStorage.getItem('cryptonbet_pwa_prompt_shown');
      if (!isStandalone && !alreadyShown) {
        setShowModal(true);
      }
    }, 1000);

    // Escutar se o app foi instalado com sucesso
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowModal(false);
      setShowIOSInstructions(false);
      setShowAndroidManualInstructions(false);
      localStorage.setItem('cryptonbet_pwa_prompt_shown', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    localStorage.setItem('cryptonbet_pwa_prompt_shown', 'true');
    if (isIOS) {
      setShowModal(false);
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setShowModal(false);
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Erro ao chamar prompt nativo:', err);
        setShowModal(false);
        setShowAndroidManualInstructions(true);
      }
    } else {
      setShowModal(false);
      setShowAndroidManualInstructions(true);
    }
  };

  const handleDismissModal = () => {
    // Guarda que já foi mostrado uma vez, não voltará a incomodar
    localStorage.setItem('cryptonbet_pwa_prompt_shown', 'true');
    setShowModal(false);
  };

  if (isInstalled) return null;

  return (
    <>
      {/* POPUP DE INSTALAÇÃO PWA (Aparece uma única vez ao abrir o site) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-gradient-to-b from-[#0e171f] via-[#0b1016] to-[#080d12] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-white shadow-2xl relative overflow-hidden"
            >
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Botão Fechar */}
              <button
                onClick={handleDismissModal}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Ícone e Título */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-[#049444] to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-500/25 shrink-0 border border-emerald-400/40">
                  C
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      App Oficial PWA
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black px-1.5 py-0.5 rounded-full">
                      Grátis
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white uppercase">
                    Instalar CryptonBet
                  </h3>
                </div>
              </div>

              {/* Vantagens */}
              <div className="space-y-2.5 mb-6">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Instale a aplicação oficial no seu telemóvel ou computador para a melhor experiência:
                </p>

                <div className="bg-white/5 rounded-2xl p-3.5 space-y-2 border border-white/5 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Acesso direto e instantâneo com 1 toque</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Modo Ecrã Inteiro sem barras do navegador</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Menor consumo de internet e carregamento rápido</span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2.5">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 bg-gradient-to-r from-[#049444] via-emerald-500 to-teal-500 hover:from-[#037c39] hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
                >
                  <Download className="w-4 h-4 animate-bounce" />
                  <span>Instalar Aplicativo Agora</span>
                </button>

                <button
                  onClick={handleDismissModal}
                  className="w-full py-2.5 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Continuar no Navegador
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GUIA DE INSTALAÇÃO NO IOS SAFARI */}
      <AnimatePresence>
        {showIOSInstructions && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-[10000] p-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-[#0e171f] border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#049444] to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  C
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-white">Instalar no iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Siga os 2 passos no Safari:</p>
                </div>
              </div>

              <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-xs">1</div>
                  <p className="text-slate-200">
                    Toque no botão <span className="font-black text-white inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded border border-white/10"><Share className="w-3.5 h-3.5 text-blue-400" /> Partilhar</span> na barra inferior do Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-xs">2</div>
                  <p className="text-slate-200">
                    Role para baixo e toque em <span className="font-black text-white inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded border border-white/10"><PlusSquare className="w-3.5 h-3.5 text-emerald-400" /> Adicionar ao Ecrã Principal</span>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GUIA DE INSTALAÇÃO MANUAL NO ANDROID / OUTROS BROWSERS */}
      <AnimatePresence>
        {showAndroidManualInstructions && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-[10000] p-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-[#0e171f] border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => setShowAndroidManualInstructions(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#049444] to-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  C
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-white">Instalar no Android / Navegador</h3>
                  <p className="text-xs text-slate-400">Instalação direta no navegador:</p>
                </div>
              </div>

              <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-xs">1</div>
                  <p className="text-slate-200">
                    Toque no menu dos <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">3 pontinhos (⋮)</span> no canto superior do navegador Chrome.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-xs">2</div>
                  <p className="text-slate-200">
                    Selecione <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">"Instalar aplicativo"</span> ou <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">"Adicionar ao ecrã principal"</span>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAndroidManualInstructions(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                Concluído
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
