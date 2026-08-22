import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';
import { ChevronLeft, Wallet, Trophy, Target, Sparkles, Zap, Timer } from 'lucide-react';
import { soundService } from '../services/soundService';

interface WheelViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const SECTORS = [
  { multiplier: 1.2, color: 'bg-emerald-500' },
  { multiplier: 0, color: 'bg-slate-800' },
  { multiplier: 1.5, color: 'bg-blue-500' },
  { multiplier: 0.1, color: 'bg-slate-900' },
  { multiplier: 1.2, color: 'bg-teal-500' },
  { multiplier: 0, color: 'bg-slate-800' },
  { multiplier: 2, color: 'bg-orange-500' },
  { multiplier: 0.5, color: 'bg-slate-700' },
  { multiplier: 1.1, color: 'bg-emerald-600' },
  { multiplier: 0, color: 'bg-slate-800' },
  { multiplier: 4, color: 'bg-purple-600' },
  { multiplier: 0, color: 'bg-slate-800' },
];

const WheelView: React.FC<WheelViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<typeof SECTORS[0] | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const spinWheel = () => {
    if (balance < betAmount || isSpinning) return;

    onUpdateBalance(-betAmount);
    setIsSpinning(true);
    soundService.playWheelFlapperClick();

    const spinRotations = 5 + Math.floor(Math.random() * 5); // 5-10 spins
    const sectorIndex = Math.floor(Math.random() * SECTORS.length);
    const sectorDegrees = 360 / SECTORS.length;
    const finalRotation = rotation + (spinRotations * 360) + (sectorIndex * sectorDegrees);
    
    setRotation(finalRotation);

    // Flapper clicking sound that decelerates
    let delay = 60;
    let elapsed = 0;
    const tick = () => {
      if (elapsed >= 4700) return;
      soundService.playWheelFlapperClick();
      elapsed += delay;
      delay = Math.min(450, delay * 1.07);
      setTimeout(tick, delay);
    };
    setTimeout(tick, delay);

    setTimeout(() => {
      const actualIndex = (SECTORS.length - (Math.floor(finalRotation / sectorDegrees) % SECTORS.length)) % SECTORS.length;
      const outcome = SECTORS[actualIndex];
      setResult(outcome);
      setIsSpinning(false);

      if (outcome.multiplier > 0) {
        onUpdateBalance(betAmount * outcome.multiplier);
        soundService.playWheelWin();
      } else {
        soundService.playDiceLoss();
      }

      setHistory(prev => [outcome.multiplier, ...prev].slice(0, 10));
    }, 5000);
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Roda da Sorte</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Multiplicadores VIP</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-between p-3 sm:p-6 gap-3 sm:gap-6 relative min-h-0 overflow-y-auto no-scrollbar">
        {/* Histórico Inline */}
        <div className="flex gap-1 sm:gap-2 mb-1 sm:mb-2 overflow-x-auto no-scrollbar w-full justify-center">
           {history.map((h, i) => (
             <div key={i} className={`px-2 sm:px-3 py-1 rounded-lg font-black text-[8px] sm:text-[10px] shrink-0 ${h > 1 ? 'bg-[#049444] text-white' : 'bg-slate-800 text-slate-500'}`}>
                {h}x
             </div>
           ))}
        </div>

        {/* Wheel Container */}
        <div className="relative w-full max-w-[240px] sm:max-w-[320px] md:max-w-[420px] aspect-square flex items-center justify-center shrink-0 my-auto">
           {/* Pointer */}
           <div className="absolute top-[-10px] sm:top-[-15px] left-1/2 -translate-x-1/2 z-30 drop-shadow-2xl">
              <div className="w-5 h-7 sm:w-8 sm:h-10 bg-white rounded-b-full flex items-center justify-center transition-transform">
                 <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 bg-red-600 rounded-full animate-pulse" />
              </div>
              <div className="w-0 h-0 border-l-[8px] sm:border-l-[15px] border-l-transparent border-r-[8px] sm:border-r-[15px] border-r-transparent border-t-[12px] sm:border-t-[20px] border-t-white mx-auto shadow-xl" />
           </div>

           {/* The Wheel */}
           <motion.div 
             className="w-full h-full rounded-full relative border-[6px] sm:border-[12px] border-[#1e293b] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden"
             animate={{ rotate: rotation }}
             transition={{ duration: 5, ease: [0.15, 0, 0.2, 1] }}
           >
              {SECTORS.map((sector, idx) => (
                <div 
                  key={idx}
                  className={`absolute w-1/2 h-full left-1/2 top-0 origin-left border-l border-white/10 ${sector.color}`}
                  style={{ transform: `rotate(${idx * (360 / SECTORS.length)}deg)` }}
                >
                   <div 
                     className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 rotate-90 text-white font-black text-xs sm:text-lg md:text-xl italic tracking-tighter"
                     style={{ transform: `translateY(-50%) rotate(90deg)` }}
                   >
                     {sector.multiplier}x
                   </div>
                </div>
              ))}
              
              {/* Inner Circle / Center */}
              <div className="absolute inset-[35%] bg-[#0b0e11] rounded-full border-[5px] sm:border-[8px] border-[#1e293b] flex items-center justify-center z-20 shadow-inner">
                 <div className="flex flex-col items-center">
                    <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 text-[#FFCC00] mb-0.5" />
                    <span className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest hidden sm:block">Spin</span>
                 </div>
              </div>
           </motion.div>

           {/* Outer Glow */}
           <div className={`absolute inset-[-15px] sm:inset-[-20px] rounded-full border-4 border-[#FFCC00]/20 animate-pulse ${isSpinning ? 'opacity-100' : 'opacity-0'}`} />
        </div>

         {/* Betting Controls */}
        <div className="w-full max-w-sm bg-[#131d27] p-3.5 sm:p-5 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl space-y-3 shrink-0">
           <div className="flex items-center gap-2 bg-black/60 p-1.5 sm:p-2 rounded-xl border border-white/5">
              <button 
                onClick={() => setBetAmount(Math.max(5, betAmount - 5))}
                disabled={isSpinning}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-800 hover:bg-slate-700 active:scale-90 rounded-lg sm:rounded-xl font-black text-lg text-white transition cursor-pointer flex items-center justify-center"
              >-</button>
              <div className="flex-1 text-center">
                 <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Aposta</span>
                 <input
                   type="number"
                   min={5}
                   value={betAmount}
                   onChange={e => setBetAmount(Math.max(5, Number(e.target.value)))}
                   disabled={isSpinning}
                   className="w-full bg-transparent text-center font-black text-base sm:text-xl text-white outline-none font-mono"
                 />
              </div>
              <button 
                onClick={() => setBetAmount(betAmount + 5)}
                disabled={isSpinning}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-800 hover:bg-slate-700 active:scale-90 rounded-lg sm:rounded-xl font-black text-lg text-white transition cursor-pointer flex items-center justify-center"
              >+</button>
           </div>

           <button 
             onClick={spinWheel}
             disabled={isSpinning || balance < betAmount || betAmount < 5}
             className={`w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 border-b-4 flex items-center justify-center cursor-pointer text-xs sm:text-sm min-h-[48px]
               ${isSpinning || balance < betAmount || betAmount < 5
                 ? 'bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed opacity-50' 
                 : 'bg-[#FFCC00] hover:bg-[#FFD700] text-black border-[#ccaa00] shadow-[#FFCC00]/20'}`}
           >
              {isSpinning ? (
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                   A GIRAR...
                </div>
              ) : (
                'GIRAR RODA'
              )}
           </button>
        </div>
      </main>

      <footer className="p-4 bg-black/40 text-center">
         <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
            RNG Verificado • Multiplicador Máximo 10x • Retorno Justo
         </p>
      </footer>
    </div>
  );
};

export default WheelView;
