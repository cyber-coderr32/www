import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, MonitorOff, QrCode, Copy, Check, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const DesktopRestrictionOverlay: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [allowOverride, setAllowOverride] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      // Check if width is desktop size (> 1024px) and user hasn't explicitly overridden
      if (window.innerWidth >= 1024) {
        setIsDesktop(true);
      } else {
        setIsDesktop(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isDesktop || allowOverride) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-[#070a0e] text-slate-100 flex flex-col items-center justify-center p-6 select-none overflow-y-auto">
      {/* Background ambient glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#049444]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FFCC00]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative max-w-xl w-full bg-[#0e1620]/90 border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl backdrop-blur-2xl text-center space-y-6 overflow-hidden"
      >
        {/* Top glowing line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#049444] to-transparent" />

        {/* Brand Logo Header */}
        <div className="flex items-center justify-center gap-2">
          <div className="bg-[#049444] px-3.5 py-1 rounded-lg shadow-lg transform -rotate-1 flex items-center">
            <span className="text-white font-black italic text-xl tracking-tighter">CRYPTON</span>
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase italic text-[#FFCC00]">BET</span>
        </div>

        {/* Visual Graphic - Phone/Tablet Devices */}
        <div className="relative flex justify-center items-center py-4">
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#049444]/20 to-[#FFCC00]/10 border border-[#049444]/40 flex items-center justify-center shadow-[0_0_50px_rgba(4,148,68,0.25)] text-[#049444]"
          >
            <Smartphone className="w-12 h-12" />
          </motion.div>

          <div className="absolute -right-2 top-2 w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Tablet className="w-5 h-5" />
          </div>

          <div className="absolute -left-2 bottom-2 w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <MonitorOff className="w-5 h-5" />
          </div>
        </div>

        {/* Headline & Description */}
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-[10px] uppercase tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5" /> Acesso Restrito a Dispositivos Móveis
          </span>

          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight">
            Disponível Apenas em <span className="text-[#049444]">Telemóveis & Tablets</span>
          </h1>

          <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-md mx-auto">
            A plataforma CryptonBet foi otimizada para ecossistemas móveis (iOS, Android, iPadOS). Para apostar com segurança e desfrutar da melhor experiência, aceda através do seu telemóvel ou tablet.
          </p>
        </div>

        {/* Supported Devices Badges */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-1">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase text-slate-300">Android</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-1">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-black uppercase text-slate-300">iPhone</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-1">
            <Tablet className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] font-black uppercase text-slate-300">iPad / Tablet</span>
          </div>
        </div>

        {/* QR Code / Copy Link Section */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-300">
            <span className="flex items-center gap-1.5 text-[#FFCC00]">
              <QrCode className="w-4 h-4" /> Copia o Link para abrir no telemóvel
            </span>
            <button
              onClick={copyUrl}
              className="px-3 py-1.5 bg-[#049444] hover:bg-[#037a37] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Developer / Inspector Override Option */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold uppercase">
            Estás a usar modo de inspeção?
          </span>
          <button
            onClick={() => setAllowOverride(true)}
            className="text-[10px] text-slate-400 hover:text-amber-400 font-bold uppercase tracking-wider transition-colors underline cursor-pointer flex items-center gap-1"
          >
            Simular no Computador <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
export default DesktopRestrictionOverlay;
