
import React from 'react';
import { motion } from 'motion/react';
import { soundService } from '../services/soundService';
import { Gift, Zap, Trophy, PlaneTakeoff, ShieldCheck } from 'lucide-react';
import { ViewState } from '../types';

interface PromotionsViewProps {
  onBack: () => void;
  onAction: (game: ViewState) => void;
}

const PROMOS = [
  {
    id: 1,
    title: 'Bónus de Primeiro Depósito',
    desc: 'Dobra o teu saldo até 50.000 Kz no primeiro depósito.',
    code: 'CRYPTON200',
    icon: <Gift className="w-8 h-8 text-[#FFCC00]" />,
    color: 'from-emerald-900 to-[#049444]',
    tag: 'BOAS-VINDAS'
  },
  {
    id: 2,
    title: 'Seguro de Combinadas',
    desc: 'Se falhares um jogo na tua combinada de 5+, recebes 50% de volta.',
    code: 'SAFEBET',
    icon: <ShieldCheck className="w-8 h-8 text-blue-400" />,
    color: 'from-blue-900 to-indigo-800',
    tag: 'SPORTS'
  },
  {
    id: 3,
    title: 'Multiplicador Aviator',
    desc: 'Joga Aviator entre as 18h e 20h e ganha apostas grátis.',
    game: 'AVIATOR' as ViewState,
    icon: <PlaneTakeoff className="w-8 h-8 text-red-500" />,
    color: 'from-red-950 to-red-800',
    tag: 'HOT'
  }
];

const PromotionsView: React.FC<PromotionsViewProps> = ({ onBack, onAction }) => {
  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden font-sans">
      <header className="px-4 py-3 bg-[#049444] flex items-center justify-between z-30 shadow-md">
        <button onClick={() => { soundService.playUISelect(); onBack(); }} className="p-1.5 text-white bg-white/10 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-sm font-black uppercase italic tracking-tight">Promoções <span className="text-[#FFCC00]">Crypton</span></h2>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-24">
        {PROMOS.map((promo, idx) => (
          <motion.div 
            key={promo.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${promo.color} border border-white/5 shadow-2xl`}
          >
            <div className="p-6 flex flex-col gap-4 relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-black/30 rounded-2xl border border-white/10">
                  {promo.icon}
                </div>
                <span className="px-3 py-1 bg-white/10 rounded-full text-[8px] font-black tracking-widest border border-white/10">
                  {promo.tag}
                </span>
              </div>
              
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-1">{promo.title}</h3>
                <p className="text-[10px] text-white/70 font-bold leading-relaxed">{promo.desc}</p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                {promo.code ? (
                  <div className="flex-1 bg-black/40 px-4 py-3 rounded-xl border border-dashed border-white/20 flex justify-between items-center group">
                    <span className="text-xs font-mono font-black text-[#FFCC00]">{promo.code}</span>
                    <button className="text-[8px] font-black uppercase text-white/50 group-hover:text-white transition-colors">Copiar</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { soundService.playUISelect(); promo.game && onAction(promo.game); }}
                    className="flex-1 bg-[#FFCC00] text-black py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-transform"
                  >
                    Aproveitar Agora
                  </button>
                )}
              </div>
            </div>
            
            {/* Background Decoration */}
            <div className="absolute right-[-10%] top-[-10%] opacity-10 blur-2xl pointer-events-none">
               <div className="w-40 h-40 bg-white rounded-full" />
            </div>
          </motion.div>
        ))}

        <div className="bg-[#131d27] p-6 rounded-3xl border border-white/5 text-center space-y-4">
           <Zap className="w-10 h-10 text-[#FFCC00] mx-auto animate-pulse" />
           <div>
              <h4 className="text-sm font-black uppercase tracking-widest">Aposta Grátis Diária</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-relaxed">Faz 3 apostas em qualquer mercado e ganha uma bónus grátis para usares onde quiseres.</p>
           </div>
           <button className="w-full py-3 bg-[#049444] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#037235] transition-colors">Ver Missões</button>
        </div>
      </main>
    </div>
  );
};

export default PromotionsView;
