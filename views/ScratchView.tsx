import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, Sparkles, Trophy, Eraser, Zap, RotateCcw } from 'lucide-react';
import { soundService } from '../services/soundService';

interface ScratchViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const CARDS = [
  { id: 'BRONZE', name: 'Bronze', cost: 10, maxWin: 500, color: 'from-orange-400 to-orange-700' },
  { id: 'SILVER', name: 'Prata', cost: 50, maxWin: 2500, color: 'from-slate-300 to-slate-500' },
  { id: 'GOLD', name: 'Ouro', cost: 200, maxWin: 10000, color: 'from-yellow-400 to-yellow-600' },
];

const ScratchView: React.FC<ScratchViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [selectedTier, setSelectedTier] = useState(CARDS[0]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [grid, setGrid] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(9).fill(false));
  const [winAmount, setWinAmount] = useState<number | null>(null);

  const buyTicket = () => {
    if (balance < selectedTier.cost || isRevealing) return;

    onUpdateBalance(-selectedTier.cost);
    setIsRevealing(true);
    setRevealed(new Array(9).fill(false));
    setWinAmount(null);
    soundService.playUISelect();

    // Genetic win logic
    const chance = Math.random();
    let values: number[] = [];
    let possibleWin = 0;

    if (chance > 0.7) { // 30% chance of some win
      const multipliers = [0.5, 1, 2, 5, 10, 20, 50];
      const selectedMult = multipliers[Math.floor(Math.random() * multipliers.length)];
      possibleWin = selectedTier.cost * selectedMult;
      
      // Place at least 3 matching symbols
      const symbol = selectedMult;
      values = new Array(9).fill(0).map(() => multipliers[Math.floor(Math.random() * multipliers.length)]);
      const winIndices: number[] = [];
      while(winIndices.length < 3) {
        const idx = Math.floor(Math.random() * 9);
        if(!winIndices.includes(idx)) winIndices.push(idx);
      }
      winIndices.forEach(idx => values[idx] = symbol);
    } else {
      const multipliers = [0.1, 0.5, 1, 2, 5];
      values = new Array(9).fill(0).map(() => multipliers[Math.floor(Math.random() * multipliers.length)]);
    }

    setGrid(values);
  };

  const revealCell = (index: number) => {
    if (!isRevealing || revealed[index]) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);
    soundService.playTick();

    if (newRevealed.every(v => v)) {
      checkWin();
    }
  };

  const revealAll = () => {
    if (!isRevealing) return;
    setRevealed(new Array(9).fill(true));
    checkWin();
  };

  const checkWin = () => {
    // Count matches
    const counts: Record<number, number> = {};
    grid.forEach(val => counts[val] = (counts[val] || 0) + 1);
    
    let totalWin = 0;
    Object.entries(counts).forEach(([val, count]) => {
      if (count >= 3) {
        totalWin = selectedTier.cost * Number(val);
      }
    });

    if (totalWin > 0) {
      setWinAmount(totalWin);
      onUpdateBalance(totalWin);
      soundService.playWin();
    } else {
      setWinAmount(0);
      soundService.playLoss();
    }
    
    setTimeout(() => setIsRevealing(false), 2000);
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Raspadinha Instantânea</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sorte na Hora</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 gap-6 overflow-y-auto no-scrollbar">
        {/* Tier Selector */}
        <div className="w-full max-w-md grid grid-cols-3 gap-3">
           {CARDS.map(card => (
             <button 
               key={card.id}
               onClick={() => setSelectedTier(card)}
               disabled={isRevealing}
               className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${selectedTier.id === card.id ? 'border-[#FFCC00] bg-white/5 scale-105' : 'border-transparent bg-black/20 opacity-60'}`}
             >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                   <Eraser className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-black text-white uppercase">{card.name}</span>
                <span className="text-[8px] font-bold text-slate-500">{card.cost} USDT</span>
             </button>
           ))}
        </div>

        {/* Scratch Area */}
        <div className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px] aspect-square bg-[#131d27] rounded-2xl sm:rounded-[2.5rem] border border-white/5 p-3 sm:p-4 shadow-2xl flex flex-col gap-4 sm:gap-6">
           <div className="flex justify-between items-center px-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Raspa 3 para vencer</span>
              {isRevealing && (
                <button onClick={revealAll} className="text-[10px] font-black text-[#FFCC00] uppercase underline decoration-2 underline-offset-4">Revelar Tudo</button>
              )}
           </div>

           <div className="grid grid-cols-3 gap-2 flex-1">
              {revealed.map((isRevealed, idx) => (
                <motion.div 
                  key={idx}
                  onClick={() => revealCell(idx)}
                  className={`relative rounded-2xl cursor-pointer overflow-hidden transition-all duration-500 border-2 ${isRevealing ? (isRevealed ? 'bg-black/40 border-white/5' : 'bg-slate-700 border-slate-600') : 'bg-slate-800/20 border-white/5 border-dashed cursor-not-allowed'}`}
                  whileTap={isRevealing && !isRevealed ? { scale: 0.95 } : {}}
                >
                   <AnimatePresence mode="wait">
                     {isRevealed ? (
                        <motion.div 
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="w-full h-full flex flex-col items-center justify-center"
                        >
                           <span className="text-xl md:text-2xl font-black text-white italic">{grid[idx]}x</span>
                           <span className="text-[8px] font-bold text-slate-500 uppercase">Multi</span>
                        </motion.div>
                     ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                           <Eraser className="w-8 h-8 text-white" />
                        </div>
                     )}
                   </AnimatePresence>
                </motion.div>
              ))}
           </div>

           {winAmount !== null && winAmount > 0 && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }}
                className="absolute inset-0 z-30 bg-[#049444]/90 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center border-4 border-white"
              >
                 <Sparkles className="w-16 h-16 text-white mb-4 animate-bounce" />
                 <h3 className="text-4xl font-black italic text-white uppercase tracking-tighter leading-none mb-2">VITORIA MEGA!</h3>
                 <span className="text-xl font-black text-white opacity-80 mb-6 uppercase tracking-widest">GANHOU {winAmount.toFixed(2)} USDT</span>
                 <button onClick={buyTicket} className="px-8 py-3 bg-white text-[#049444] font-black uppercase tracking-widest rounded-xl">JOGAR NOVAMENTE</button>
              </motion.div>
           )}

           {!isRevealing && winAmount === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-x-0 -bottom-12 text-center"
              >
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tenta o Bilhete {selectedTier.name} de Ouro!</span>
              </motion.div>
           )}
        </div>

        {/* Action Button */}
        {!isRevealing && winAmount === null && (
          <button 
            onClick={buyTicket}
            disabled={balance < selectedTier.cost}
            className={`w-full max-w-sm py-6 rounded-3xl font-black text-xl uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 border-b-8 flex flex-col items-center justify-center
              ${balance < selectedTier.cost 
                ? 'bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed' 
                : 'bg-[#FFCC00] hover:bg-[#FFD700] text-black border-[#ccaa00] shadow-[#FFCC00]/20'}`}
          >
             COMPRAR BILHETE
             <span className="text-[10px] opacity-60 mt-1 font-black">CUSTO: {selectedTier.cost} USDT</span>
          </button>
        )}

        {winAmount !== null && !isRevealing && (
           <button 
             onClick={() => { setWinAmount(null); buyTicket(); }}
             className="w-full max-w-sm py-6 bg-white/5 hover:bg-white/10 rounded-3xl font-black text-xl uppercase tracking-widest text-white border border-white/10 flex items-center justify-center gap-3"
           >
              <RotateCcw className="w-6 h-6" />
              NOVO BILHETE
           </button>
        )}
      </main>

      <footer className="p-4 text-center">
         <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
            Prémio Máximo {selectedTier.maxWin.toFixed(2)} USDT • 95% RTP • Diversão Instantânea
         </p>
      </footer>
    </div>
  );
};

export default ScratchView;
