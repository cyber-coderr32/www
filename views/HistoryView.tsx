
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundService } from '../services/soundService';
import { History, Search, Filter, Calendar, ChevronRight } from 'lucide-react';

interface HistoryViewProps {
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
  const [activeType, setActiveType] = useState('ALL');
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('crypton_tickets_ao');
    if (saved) {
      try {
        setTickets(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden font-sans">
      <header className="px-4 py-3 bg-[#049444] flex items-center justify-between z-30 shadow-md">
        <button onClick={() => { soundService.playUISelect(); onBack(); }} className="p-1.5 text-white bg-white/10 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-sm font-black uppercase italic tracking-tight">Histórico de <span className="text-[#FFCC00]">Apostas</span></h2>
        <div className="w-10" />
      </header>

      <nav className="bg-[#131d27] px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        {['ALL', 'SPORTS', 'CASINO', 'AVIATOR'].map(type => (
          <button 
            key={type}
            onClick={() => { soundService.playUISelect(); setActiveType(type); }}
            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeType === type ? 'bg-[#049444] text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
          >
            {type === 'ALL' ? 'Tudo' : type}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-24">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
             <History className="w-16 h-16 opacity-20 mb-4" />
             <p className="text-xs font-black uppercase tracking-widest">Nenhuma aposta encontrada</p>
             <p className="text-[9px] font-bold uppercase mt-2 opacity-50">Joga agora para veres os teus prémios!</p>
          </div>
        ) : (
          tickets.map((t, i) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#131d27] rounded-3xl border border-white/5 p-4 flex items-center justify-between group hover:border-[#049444]/50 transition-colors"
            >
               <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.status === 'WON' ? 'bg-[#049444]/20 border-[#049444]/30' : 'bg-red-500/20 border-red-500/30'} border`}>
                     <Trophy className={`w-6 h-6 ${t.status === 'WON' ? 'text-[#049444]' : 'text-red-500'}`} />
                  </div>
                  <div>
                     <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-tighter">Bithete #{t.id}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${t.status === 'WON' ? 'bg-[#049444] text-white' : 'bg-red-500 text-white'}`}>{t.status}</span>
                     </div>
                     <p className="text-[8px] text-slate-500 font-bold uppercase">{t.timestamp} • {t.selections?.length || 1} Seleções</p>
                  </div>
               </div>
               
               <div className="text-right">
                  <p className={`text-sm font-black ${t.status === 'WON' ? 'text-[#049444]' : 'text-white/50'}`}>
                    {t.totalReturn > 0 ? `+${(t.totalReturn || 0).toFixed(2)} USDT` : `${(t.stake || 0).toFixed(2)} USDT`}
                  </p>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[8px] font-black uppercase tracking-widest text-[#FFCC00]">Detalhes</span>
                     <ChevronRight className="w-3 h-3 text-[#FFCC00]" />
                  </div>
               </div>
            </motion.div>
          ))
        )}
        
        <div className="pt-6">
           <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest">Resumo Mensal</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Volume Total</span>
                    <span className="text-sm font-black">0.00 USDT</span>
                 </div>
                 <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Total de Ganhos</span>
                    <span className="text-sm font-black text-[#049444]">0.00 USDT</span>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

const Trophy = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.703 2.703 0 01-3 0 2.703 2.703 0 01-3 0 2.703 2.703 0 01-3 0 2.704 2.704 0 01-1.5-.454M2.25 12c0 4.418 4.03 8 9 8s9-3.582 9-8M2.25 12c0-4.418 4.03-8 9-8s9 3.582 9 8M2.25 12l3-3m16.5 3l-3-3m-10.5 0h6m-6 3h6m-13.5 0h.008v.008H3.75V15zm0-6h.008v.008H3.75V9zm16.5 0h.008v.008h-.008V9zm0 6h.008v.008h-.008V15z"/></svg>
);

export default HistoryView;
