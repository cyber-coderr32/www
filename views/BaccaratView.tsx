import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, Trophy, Sparkles, Zap, Shield, Target } from 'lucide-react';
import { soundService } from '../services/soundService';

interface BaccaratViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

type BetTarget = 'PLAYER' | 'BANKER' | 'TIE';

const BaccaratView: React.FC<BaccaratViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedTarget, setSelectedTarget] = useState<BetTarget | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [playerHand, setPlayerHand] = useState<number[]>([]);
  const [bankerHand, setBankerHand] = useState<number[]>([]);
  const [result, setResult] = useState<BetTarget | null>(null);
  const [winStatus, setWinStatus] = useState<'WIN' | 'LOSS' | null>(null);
  const [history, setHistory] = useState<BetTarget[]>([]);

  const calculateScore = (hand: number[]) => {
    const sum = hand.reduce((acc, val) => acc + val, 0);
    return sum % 10;
  };

  const getRandomCard = () => Math.floor(Math.random() * 9) + 1;

  const handlePlay = async () => {
    if (balance < betAmount || betAmount < 5 || !selectedTarget || isSpinning) return;

    onUpdateBalance(-betAmount);
    setIsSpinning(true);
    setResult(null);
    setWinStatus(null);
    setPlayerHand([]);
    setBankerHand([]);
    soundService.playCardSlide();

    await new Promise(r => setTimeout(r, 600));
    
    // Draw initial hands
    const p1 = getRandomCard();
    const b1 = getRandomCard();
    const p2 = getRandomCard();
    const b2 = getRandomCard();

    setPlayerHand([p1, p2]);
    setBankerHand([b1, b2]);
    soundService.playCardSnap();

    let pScore = calculateScore([p1, p2]);
    let bScore = calculateScore([b1, b2]);

    // Simple Baccarat logic (Standard simplified)
    if (pScore < 8 && bScore < 8) {
      if (pScore <= 5) {
        const p3 = getRandomCard();
        setPlayerHand(prev => [...prev, p3]);
        pScore = calculateScore([p1, p2, p3]);
      }
      if (bScore <= 5) {
        const b3 = getRandomCard();
        setBankerHand(prev => [...prev, b3]);
        bScore = calculateScore([b1, b2, b3]);
      }
    }

    await new Promise(r => setTimeout(r, 800));

    let outcome: BetTarget;
    if (pScore > bScore) outcome = 'PLAYER';
    else if (bScore > pScore) outcome = 'BANKER';
    else outcome = 'TIE';

    setResult(outcome);
    setHistory(prev => [outcome, ...prev].slice(0, 10));

    if (outcome === selectedTarget) {
      const multiplier = outcome === 'TIE' ? 9 : 2;
      onUpdateBalance(betAmount * multiplier);
      setWinStatus('WIN');
      soundService.playBlackjackNatural();
    } else {
      setWinStatus('LOSS');
      soundService.playDiceLoss();
    }

    setIsSpinning(false);
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Baccarat Royale</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Elegância e Sorte</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-2.5 sm:p-4 gap-3 sm:gap-4 overflow-y-auto no-scrollbar relative min-h-0">
        {/* Histórico Superior */}
        <div className="flex justify-center gap-1 sm:gap-2 mb-1 sm:mb-2 overflow-x-auto no-scrollbar shrink-0">
           {history.map((h, i) => (
             <div key={i} className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-black border-2 shrink-0 ${h === 'PLAYER' ? 'border-blue-500 text-blue-500' : h === 'BANKER' ? 'border-red-500 text-red-500' : 'border-[#FFCC00] text-[#FFCC00]'}`}>
                {h[0]}
             </div>
           ))}
        </div>

        {/* Mesa de Jogo */}
        <div className="flex-1 bg-[#131d27]/40 rounded-2xl sm:rounded-[3rem] border border-white/5 relative flex flex-col items-center justify-between p-4 sm:p-6 gap-4 sm:gap-8 min-h-0 overflow-hidden my-auto shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(4,148,68,0.05)_0%,_transparent_70%)] opacity-30" />
            
            <div className="grid grid-cols-2 gap-3 sm:gap-12 md:gap-32 relative z-10 w-full max-w-2xl px-2 sm:px-12 my-auto">
               {/* Player Section */}
               <div className="flex flex-col items-center gap-2 sm:gap-6">
                  <div className={`px-3 sm:px-6 py-1 sm:py-2 rounded-full font-black uppercase tracking-widest text-[8px] sm:text-xs border-2 ${result === 'PLAYER' ? 'bg-blue-600 border-white text-white scale-105 shadow-lg shadow-blue-500/20' : 'bg-black/40 border-white/10 text-slate-400'}`}>
                    Jogador
                  </div>
                  <div className="flex gap-1 sm:gap-2 min-h-[80px] sm:min-h-[120px] md:min-h-[160px] items-center">
                    <AnimatePresence>
                      {playerHand.map((card, i) => (
                        <motion.div 
                          key={i} initial={{ x: -100, opacity: 0, rotate: -20 }} animate={{ x: 0, opacity: 1, rotate: 0 }}
                          className="w-10 h-15 sm:w-16 sm:h-24 md:w-24 md:h-36 bg-white rounded-md sm:rounded-xl shadow-xl flex items-center justify-center border-2 sm:border-4 border-black/5 playing-card"
                        >
                           <span className="text-lg sm:text-3xl md:text-5xl font-black text-blue-900">{card}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {playerHand.length > 0 && (
                    <div className="text-base sm:text-3xl font-black text-blue-500 italic">{calculateScore(playerHand)} pts</div>
                  )}
               </div>

               {/* Banker Section */}
               <div className="flex flex-col items-center gap-2 sm:gap-6">
                  <div className={`px-3 sm:px-6 py-1 sm:py-2 rounded-full font-black uppercase tracking-widest text-[8px] sm:text-xs border-2 ${result === 'BANKER' ? 'bg-red-600 border-white text-white scale-105 shadow-lg shadow-red-500/20' : 'bg-black/40 border-white/10 text-slate-400'}`}>
                    Banca
                  </div>
                  <div className="flex gap-1 sm:gap-2 min-h-[80px] sm:min-h-[120px] md:min-h-[160px] items-center">
                    <AnimatePresence>
                      {bankerHand.map((card, i) => (
                        <motion.div 
                          key={i} initial={{ x: 100, opacity: 0, rotate: 20 }} animate={{ x: 0, opacity: 1, rotate: 0 }}
                          className="w-10 h-15 sm:w-16 sm:h-24 md:w-24 md:h-36 bg-white rounded-md sm:rounded-xl shadow-xl flex items-center justify-center border-2 sm:border-4 border-black/5 playing-card"
                        >
                           <span className="text-lg sm:text-3xl md:text-5xl font-black text-red-600">{card}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {bankerHand.length > 0 && (
                    <div className="text-base sm:text-3xl font-black text-red-600 italic">{calculateScore(bankerHand)} pts</div>
                  )}
               </div>
            </div>

            {/* Area de Apostas */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-md px-1 sm:px-4 relative z-10 shrink-0">
               {(['PLAYER', 'TIE', 'BANKER'] as BetTarget[]).map(target => (
                 <button 
                   key={target}
                   onClick={() => !isSpinning && setSelectedTarget(target)}
                   className={`flex flex-col items-center p-2 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all active:scale-95 cursor-pointer
                     ${selectedTarget === target 
                       ? 'bg-white/10 border-[#FFCC00] shadow-[0_0_20px_rgba(255,204,0,0.2)]' 
                       : 'bg-black/40 border-white/5 opacity-60 hover:opacity-100'}`}
                 >
                    <span className={`font-black text-[8px] sm:text-[10px] uppercase mb-0.5 sm:mb-1 tracking-widest ${target === 'PLAYER' ? 'text-blue-500' : target === 'BANKER' ? 'text-red-500' : 'text-[#FFCC00]'}`}>{target}</span>
                    <span className="text-[8px] sm:text-[10px] font-black text-white">{target === 'TIE' ? '9x' : '2x'}</span>
                 </button>
               ))}
            </div>

            {/* FeedBack Banner */}
            {winStatus === 'WIN' && (
               <motion.div 
                 initial={{ scale: 0 }} animate={{ scale: 1 }}
                 className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl sm:rounded-[3rem] p-4"
               >
                  <div className="bg-[#049444] p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border-4 border-white text-center shadow-2xl max-w-xs sm:max-w-none">
                     <Sparkles className="w-10 h-10 sm:w-16 sm:h-16 text-white mx-auto mb-2 sm:mb-4 animate-spin" />
                     <h2 className="text-3xl sm:text-5xl font-black italic text-white uppercase tracking-tighter mb-1 sm:mb-2">VENCEDOR!</h2>
                     <span className="text-sm sm:text-xl font-black text-white/80 uppercase">RECEBEU {(betAmount * (selectedTarget === 'TIE' ? 9 : 2)).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
                  </div>
               </motion.div>
            )}
        </div>

        {/* Rodapé de Ação */}
        <div className="bg-[#131d27] p-3 sm:p-5 rounded-2xl sm:rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-3 sm:gap-4 items-center shrink-0">
           <div className="w-full md:w-auto flex-1 flex items-center gap-2 sm:gap-4 bg-black/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5">
              <button onClick={() => setBetAmount(Math.max(5, betAmount - 5))} className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 hover:bg-white/10 rounded-lg sm:rounded-xl font-black text-sm text-white cursor-pointer flex items-center justify-center">-</button>
              <div className="flex-1 text-center">
                 <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Aposta</span>
                 <input
                   type="number"
                   min={5}
                   value={betAmount}
                   onChange={e => setBetAmount(Math.max(5, Number(e.target.value)))}
                   disabled={isSpinning}
                   className="w-full bg-transparent text-center font-black text-sm sm:text-lg text-white font-mono outline-none"
                 />
              </div>
              <button onClick={() => setBetAmount(betAmount + 5)} className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 hover:bg-white/10 rounded-lg sm:rounded-xl font-black text-sm text-white cursor-pointer flex items-center justify-center">+</button>
           </div>

           <button 
             onClick={handlePlay}
             disabled={isSpinning || !selectedTarget || balance < betAmount}
             className={`w-full md:w-80 py-3.5 sm:py-6 rounded-xl sm:rounded-3xl font-black text-sm sm:text-2xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 border-b-4 sm:border-b-8 flex flex-col items-center justify-center cursor-pointer min-h-[48px]
               ${isSpinning || !selectedTarget || balance < betAmount
                 ? 'bg-slate-800 text-slate-500 border-slate-950 cursor-not-allowed'
                 : 'bg-[#FFCC00] hover:bg-[#FFD700] text-black border-[#ccaa00] shadow-[#FFCC00]/20'}`}
           >
              {isSpinning ? 'DISTRIBUINDO...' : 'DAR CARTAS'}
           </button>
        </div>
      </main>
    </div>
  );
};

export default BaccaratView;
