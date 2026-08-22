
import React, { useState } from 'react';
import { soundService } from '../services/soundService';

interface CoinFlipViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const CoinFlipView: React.FC<CoinFlipViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [bet, setBet] = useState(10);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [streak, setStreak] = useState(0);

  const flip = (choice: 'HEADS' | 'TAILS') => {
    if (flipping || ((balance < bet || bet < 5) && streak === 0)) return;
    
    if (streak === 0) onUpdateBalance(-bet);
    
    setFlipping(true);
    setResult(null);
    soundService.playCoinToss();

    setTimeout(() => {
      const outcome = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
      setResult(outcome);
      setFlipping(false);
      soundService.playCoinCatch();
      
      if (outcome === choice) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        soundService.playCoinStreak(nextStreak);
      } else {
        setStreak(0);
        soundService.playDiceLoss();
      }
    }, 1200);
  };

  const cashOut = () => {
    const mult = Math.pow(1.95, streak);
    const win = bet * mult;
    onUpdateBalance(win);
    setStreak(0);
    setResult(null);
    soundService.playCoinCashout();
  };

  const currentMultiplier = streak > 0 ? Math.pow(1.95, streak) : 1;

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white">
      <div className="p-4 flex bg-[#131d27] border-b border-white/5 items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-yellow-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="font-black uppercase text-xl italic tracking-tighter">COIN <span className="text-yellow-500">FLIP</span></h2>
        <div className="ml-auto bg-black/40 px-4 py-2 rounded-xl border border-white/5 font-mono font-bold text-green-400">{balance.toFixed(2)} USDT</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 gap-6 sm:gap-8 bg-[radial-gradient(circle_at_center,_#2d2d12_0%,_#0b0e11_100%)] overflow-y-auto no-scrollbar min-h-0">
        {/* Coin Area */}
        <div className={`w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-700 border-4 sm:border-8 border-yellow-800 flex items-center justify-center shadow-[0_0_60px_rgba(234,179,8,0.4)] transition-all duration-500 my-auto shrink-0 ${flipping ? 'animate-[spin_0.2s_infinite]' : ''}`}>
           <span className="text-5xl sm:text-7xl font-black text-yellow-900/50 drop-shadow-md">
             {result === 'HEADS' ? '🪙' : result === 'TAILS' ? '🌟' : '?'}
           </span>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Multiplicador Atual</span>
           <span className="text-3xl sm:text-5xl font-black text-yellow-500 font-mono">{currentMultiplier.toFixed(2)}x</span>
           {streak > 0 && <span className="text-xs sm:text-sm font-bold text-white/60 uppercase">🔥 Sequência de {streak}</span>}
        </div>

        <div className="w-full max-w-sm bg-[#131d27] p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4 shrink-0">
           <div className="grid grid-cols-2 gap-3">
              <button onClick={() => flip('HEADS')} disabled={flipping} className="flex flex-col items-center gap-1.5 p-3 sm:p-4 bg-slate-800 hover:bg-slate-700 rounded-xl sm:rounded-2xl border border-white/5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[64px] justify-center">
                 <span className="text-2xl sm:text-3xl">🪙</span>
                 <span className="text-[10px] font-black uppercase text-white">CARA</span>
              </button>
              <button onClick={() => flip('TAILS')} disabled={flipping} className="flex flex-col items-center gap-1.5 p-3 sm:p-4 bg-slate-800 hover:bg-slate-700 rounded-xl sm:rounded-2xl border border-white/5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[64px] justify-center">
                 <span className="text-2xl sm:text-3xl">🌟</span>
                 <span className="text-[10px] font-black uppercase text-white">COROA</span>
              </button>
           </div>

           {streak > 0 ? (
             <button onClick={cashOut} className="w-full py-3.5 sm:py-5 bg-orange-600 hover:bg-orange-500 rounded-xl sm:rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl border-b-4 sm:border-b-8 border-orange-800 active:scale-95 transition-all cursor-pointer min-h-[48px]">
                LEVANTAR {(bet * currentMultiplier).toFixed(2)} USDT
             </button>
           ) : (
             <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                <button onClick={() => setBet(Math.max(5, bet - 5))} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-lg hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center text-white">-</button>
                <input
                  type="number"
                  min={5}
                  value={bet}
                  onChange={e => setBet(Math.max(5, Number(e.target.value)))}
                  className="flex-1 bg-transparent text-center font-black text-lg font-mono text-white outline-none"
                />
                <button onClick={() => setBet(bet + 5)} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-lg hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center text-white">+</button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CoinFlipView;
