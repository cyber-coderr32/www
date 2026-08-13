
import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Zap, Sparkles } from 'lucide-react';
import { soundService } from '../services/soundService';

interface ComingSoonViewProps {
  title: string;
  onBack: () => void;
}

const ComingSoonView: React.FC<ComingSoonViewProps> = ({ title, onBack }) => {
  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 md:p-6 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button 
          onClick={() => { soundService.playUISelect(); onBack(); }}
          className="w-10 h-10 md:w-12 md:h-12 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center transition-all group active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Crypton Casino</span>
           <h1 className="text-sm md:text-xl font-black uppercase tracking-tighter text-white">{title}</h1>
        </div>
        <div className="w-10 md:w-12" />
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center p-6 text-center">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <motion.div 
             animate={{ 
               scale: [1, 1.2, 1],
               opacity: [0.1, 0.2, 0.1],
               rotate: [0, 90, 0]
             }}
             transition={{ duration: 10, repeat: Infinity }}
             className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-[#049444]/10 rounded-full blur-[120px]"
           />
           <motion.div 
             animate={{ 
               scale: [1.2, 1, 1.2],
               opacity: [0.1, 0.15, 0.1],
               rotate: [0, -90, 0]
             }}
             transition={{ duration: 8, repeat: Infinity }}
             className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-[#FFCC00]/5 rounded-full blur-[100px]"
           />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="z-10 space-y-8"
        >
          <div className="relative inline-block">
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
               className="absolute inset-0 bg-gradient-to-tr from-[#049444] to-[#FFCC00] rounded-full blur-2xl opacity-20"
             />
             <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 flex items-center justify-center relative">
                <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-[#FFCC00]" />
             </div>
          </div>

          <div className="space-y-4">
             <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">
                Brevemente <span className="text-[#049444]">Disponível</span>
             </h2>
             <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                Estamos a preparar o jogo <span className="text-white">{title}</span> com os maiores multiplicadores de Angola.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
                <div className="w-10 h-10 bg-[#049444]/20 rounded-xl flex items-center justify-center">
                   <Zap className="w-5 h-5 text-[#049444]" />
                </div>
                <div>
                   <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">RTP ALTO</span>
                   <span className="text-xs font-black text-white">TAXA DE GANHO 98%</span>
                </div>
             </div>
             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
                <div className="w-10 h-10 bg-[#FFCC00]/20 rounded-xl flex items-center justify-center">
                   <Sparkles className="w-5 h-5 text-[#FFCC00]" />
                </div>
                <div>
                   <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">BÓNUS VIP</span>
                   <span className="text-xs font-black text-white">MULTIPLICADOR 500X</span>
                </div>
             </div>
          </div>

          <button 
            onClick={() => { soundService.playUISelect(); onBack(); }}
            className="px-10 py-5 bg-[#049444] hover:bg-[#037235] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-[#049444]/20 transition-all active:scale-95 border-b-4 border-[#025628]"
          >
            VOLTAR AO LOBBY
          </button>
        </motion.div>
      </main>

      <footer className="p-8 text-center text-slate-600">
         <p className="text-[10px] font-black uppercase tracking-[0.3em]">CryptonBet Angola • Licenciado e Seguro</p>
      </footer>
    </div>
  );
};

export default ComingSoonView;
