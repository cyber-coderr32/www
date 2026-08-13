import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, Trophy, Hash, Sparkles, Zap, RotateCcw, Play } from 'lucide-react';
import { soundService } from '../services/soundService';

interface KenoViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const NUMBERS = Array.from({ length: 40 }, (_, i) => i + 1);

const KenoView: React.FC<KenoViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [winAmount, setWinAmount] = useState<number | null>(null);

  const toggleNumber = (num: number) => {
    if (isDrawing) return;
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
      setDrawnNumbers([]);
      setWinAmount(null);
    } else if (selectedNumbers.length < 10) {
      setSelectedNumbers(prev => [...prev, num]);
      soundService.playTick();
    }
  };

  const clearSelection = () => {
    if (isDrawing) return;
    setSelectedNumbers([]);
    setDrawnNumbers([]);
    setWinAmount(null);
  };

  const autoPick = () => {
    if (isDrawing) return;
    const picks: number[] = [];
    while (picks.length < 10) {
      const num = Math.floor(Math.random() * 40) + 1;
      if (!picks.includes(num)) picks.push(num);
    }
    setSelectedNumbers(picks);
    soundService.playUISelect();
  };

  const handlePlay = async () => {
    if (balance < betAmount || betAmount < 5 || selectedNumbers.length === 0 || isDrawing) return;

    onUpdateBalance(-betAmount);
    setIsDrawing(true);
    setDrawnNumbers([]);
    setWinAmount(null);
    soundService.playSpin();

    const result: number[] = [];
    while (result.length < 10) {
      const num = Math.floor(Math.random() * 40) + 1;
      if (!result.includes(num)) result.push(num);
    }

    // Drawing animation
    for (let i = 0; i < result.length; i++) {
      await new Promise(r => setTimeout(r, 200));
      setDrawnNumbers(prev => [...prev, result[i]]);
      soundService.playMultiplierStep(i);
    }

    // Check winnings
    const matches = result.filter(n => selectedNumbers.includes(n)).length;
    let multiplier = 0;
    
    // Simple payout table for 10 picks
    const payouts: Record<number, number> = {
      0: 0, 1: 0, 2: 0, 3: 1, 4: 2, 5: 5, 6: 15, 7: 50, 8: 200, 9: 1000, 10: 5000
    };
    
    // Scale payout based on number of picks (normalized to 10)
    const factor = 10 / selectedNumbers.length;
    multiplier = (payouts[Math.floor(matches * factor)] || 0);

    if (multiplier > 0) {
      const win = betAmount * multiplier;
      setWinAmount(win);
      onUpdateBalance(win);
      soundService.playWin();
    } else {
      setWinAmount(0);
      soundService.playLoss();
    }

    setIsDrawing(false);

    // Auto-clear selection for the next round after a delay so user can see matches
    setTimeout(() => {
      setSelectedNumbers([]);
      setDrawnNumbers([]);
      setWinAmount(null);
    }, 3000);
  };

  const matchedCount = drawnNumbers.filter(n => selectedNumbers.includes(n)).length;

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Crypton Keno</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sorteio de Números</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-2.5 sm:p-4 gap-3 sm:gap-4 overflow-y-auto no-scrollbar min-h-0">
        {/* Painel de Controle LESTE */}
        <div className="w-full md:w-80 flex flex-col gap-3 shrink-0">
           <div className="bg-[#131d27] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 space-y-3 sm:space-y-6 w-full">
              <div>
                <div className="flex justify-between items-center mb-1.5 sm:mb-3">
                   <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Sua Aposta</span>
                   <span className="text-[9px] sm:text-[10px] font-black text-white opacity-40">{betAmount} USDT</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5">
                   <button onClick={() => setBetAmount(Math.max(5, betAmount - 5))} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-white text-sm sm:text-base cursor-pointer flex items-center justify-center">-</button>
                   <input
                     type="number"
                     min={5}
                     value={betAmount}
                     onChange={e => setBetAmount(Math.max(5, Number(e.target.value)))}
                     disabled={isDrawing}
                     className="flex-1 bg-transparent text-center font-black text-white text-sm sm:text-base font-mono outline-none"
                   />
                   <button onClick={() => setBetAmount(betAmount + 5)} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-white text-sm sm:text-base cursor-pointer flex items-center justify-center">+</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                 <button onClick={autoPick} disabled={isDrawing} className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] border border-white/5 cursor-pointer min-h-[36px]">AUTO PICK</button>
                 <button onClick={clearSelection} disabled={isDrawing} className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] border border-white/5 cursor-pointer min-h-[36px]">LIMPAR</button>
              </div>

              <button 
                onClick={handlePlay}
                disabled={isDrawing || selectedNumbers.length === 0 || balance < betAmount || betAmount < 5}
                className={`w-full py-3 sm:py-5 rounded-xl sm:rounded-3xl font-black text-sm sm:text-xl uppercase tracking-widest border-b-4 sm:border-b-8 shadow-2xl flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer min-h-[48px]
                  ${isDrawing || selectedNumbers.length === 0 || balance < betAmount || betAmount < 5
                    ? 'bg-slate-800 text-slate-600 border-slate-950 cursor-not-allowed'
                    : 'bg-[#049444] hover:bg-[#037235] text-white border-[#025628] shadow-[#049444]/20'}`}
              >
                 {isDrawing ? 'A SORTEAR...' : 'JOGAR'}
                 <span className="text-[8px] sm:text-[10px] opacity-60 mt-0.5 sm:mt-1 uppercase font-black">{selectedNumbers.length} SELEC.</span>
              </button>
           </div>

           <div className="bg-[#131d27] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 hidden sm:block">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                 <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Acertos</span>
                 <span className="text-xs sm:text-sm font-black text-[#FFCC00]">{matchedCount} / {selectedNumbers.length}</span>
              </div>
              <div className="space-y-1 opacity-60">
                 {[4, 5, 6, 7, 8, 9, 10].map(m => (
                    <div key={m} className={`flex justify-between text-[9px] sm:text-[10px] font-black transition-colors ${matchedCount === m ? 'text-[#049444] scale-105 opacity-100' : 'text-slate-500'}`}>
                       <span>{m} ACERTOS</span>
                       <span>{(m * betAmount * 2).toFixed(2)} USDT</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Grelha de Números */}
        <div className="flex-1 bg-[#131d27]/40 rounded-2xl sm:rounded-[3rem] border border-white/5 relative p-1 sm:p-2 flex flex-col items-center justify-center min-h-0 overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(4,148,68,0.05)_0%,_transparent_70%)] opacity-30" />
           
           <div className="grid grid-cols-5 sm:grid-cols-8 gap-0.5 sm:gap-1 relative z-10 w-full max-w-xl content-center justify-items-center">
              {NUMBERS.map(num => {
                const isSelected = selectedNumbers.includes(num);
                const isDrawn = drawnNumbers.includes(num);
                const isMatch = isSelected && isDrawn;

                return (
                  <motion.div 
                    key={num}
                    onClick={() => toggleNumber(num)}
                    whileTap={!isDrawing ? { scale: 0.9 } : {}}
                    className={`w-full h-8 sm:h-10 rounded-md sm:rounded-xl border-b-2 sm:border-b-4 flex items-center justify-center font-black transition-all cursor-pointer text-[10px] sm:text-sm md:text-base
                      ${isMatch 
                        ? 'bg-[#049444] border-green-900 text-white shadow-[0_0_20px_rgba(4,148,68,0.5)] scale-110 z-20' 
                        : isDrawn 
                          ? 'bg-red-500 border-red-900 text-white animate-pulse' 
                          : isSelected 
                            ? 'bg-[#FFCC00] border-yellow-700 text-black' 
                            : 'bg-slate-800 border-slate-950 text-slate-500 hover:border-slate-400'}`}
                  >
                     {num}
                  </motion.div>
                );
              })}
           </div>


           {/* Win Banner */}
           <AnimatePresence>
             {winAmount !== null && winAmount > 0 && (
                <motion.div 
                  initial={{ y: 100, opacity: 0 }} animate={{ y: -50, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#049444] px-12 py-4 rounded-full border-4 border-white shadow-2xl flex items-center gap-4"
                >
                   <Sparkles className="text-white animate-spin" />
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white/80 uppercase">VOCÊ GANHOU</span>
                      <span className="text-2xl font-black text-white leading-none">{winAmount.toFixed(2)} USDT</span>
                   </div>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </main>

      <footer className="p-4 bg-black/40 text-center flex items-center justify-center gap-6">
         <div className="flex items-center gap-2">
            <Hash className="w-3 h-3 text-[#FFCC00]" />
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">SORTEIO RNCALEATÓRIO</span>
         </div>
         <div className="flex items-center gap-2">
            <Trophy className="w-3 h-3 text-[#049444]" />
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">JACKPOT 5,000X</span>
         </div>
      </footer>
    </div>
  );
};

export default KenoView;
