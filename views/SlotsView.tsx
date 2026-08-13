
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { soundService } from '../services/soundService';

interface SlotsViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const SYMBOLS = [
  { char: 'J', color: 'text-slate-500', value: 2, weight: 25 },
  { char: 'Q', color: 'text-blue-500', value: 3, weight: 20 },
  { char: 'K', color: 'text-purple-500', value: 5, weight: 15 },
  { char: 'A', color: 'text-red-500', value: 8, weight: 12 },
  { char: '🍒', color: '', value: 15, weight: 8 },
  { char: '🔔', color: '', value: 25, weight: 5 },
  { char: '💎', color: '', value: 50, weight: 2 },
  { char: '7️⃣', color: '', value: 100, weight: 1 },
  { char: '⭐', color: 'text-yellow-400', value: 200, weight: 1 },
];

const SYMBOL_POOL: number[] = [];
SYMBOLS.forEach((s, index) => {
  for (let i = 0; i < s.weight; i++) {
    SYMBOL_POOL.push(index);
  }
});

const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 0, 2, 0, 0],
];

const SlotsView: React.FC<SlotsViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [grid, setGrid] = useState<number[][]>([
    [0, 1, 2, 3, 4], [5, 6, 7, 0, 1], [2, 3, 4, 5, 6]
  ]);
  const [spinning, setSpinning] = useState([false, false, false, false, false]);
  const [stopping, setStopping] = useState([false, false, false, false, false]);
  const [winLines, setWinLines] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [bet, setBet] = useState(10);
  const isSpinning = spinning.some(s => s);

  const getRandomSymbolIndex = () => SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];

  const checkWins = (currentGrid: number[][]) => {
    let totalWin = 0;
    const activeWinLines: number[] = [];
    PAYLINES.forEach((line, index) => {
      const symbolsInLine = line.map((row, col) => SYMBOLS[currentGrid[row][col]]);
      const firstSymbol = symbolsInLine[0];
      let matchCount = 1;
      for (let i = 1; i < symbolsInLine.length; i++) {
        const isWild = symbolsInLine[i].char === '⭐' || firstSymbol.char === '⭐';
        if (symbolsInLine[i].char === firstSymbol.char || isWild) matchCount++;
        else break;
      }
      if (matchCount >= 3) {
        const baseValue = firstSymbol.char === '⭐' ? symbolsInLine[1].value : firstSymbol.value;
        const payoutMultiplier = matchCount === 3 ? 0.8 : matchCount === 4 ? 2 : 8;
        totalWin += (baseValue * (bet / 10)) * payoutMultiplier;
        activeWinLines.push(index);
      }
    });
    return { totalWin, activeWinLines };
  };

  const spin = () => {
    if (balance < bet || bet < 5 || isSpinning) return;
    setWinLines([]);
    setLastWin(0);
    onUpdateBalance(-bet);
    soundService.playChip();
    setSpinning([true, true, true, true, true]);
    setStopping([false, false, false, false, false]);

    const newGrid = Array(3).fill(0).map(() => Array(5).fill(0).map(() => getRandomSymbolIndex()));

    spinning.forEach((_, i) => {
      setTimeout(() => {
        setStopping(prev => { const n = [...prev]; n[i] = true; return n; });
        setTimeout(() => {
          setSpinning(prev => { const n = [...prev]; n[i] = false; return n; });
          soundService.playUISelect();
          if (i === 4) {
            const { totalWin, activeWinLines } = checkWins(newGrid);
            setGrid(newGrid);
            if (totalWin > 0) {
              setLastWin(totalWin);
              setWinLines(activeWinLines);
              onUpdateBalance(totalWin);
              soundService.playJackpot();
            } else {
              soundService.playTick();
            }
          }
        }, 150); 
      }, 800 + (i * 300));
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#05070a] text-white select-none">
      <div className="p-4 flex items-center gap-4 bg-[#049444] border-b border-black/10 shadow-2xl z-[100] sticky top-0 text-white">
        <button onClick={() => { soundService.playUISelect(); onBack(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#FFCC00] cursor-pointer z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex flex-col">
          <h2 className="font-black uppercase text-[10px] tracking-[0.3em] text-[#FFCC00] leading-none opacity-80">CRYPTON SLOTS</h2>
          <h2 className="font-black uppercase text-xl tracking-tighter italic">VEGAS <span className="text-[#FFCC00]">GOLD</span></h2>
        </div>
        <div className="ml-auto bg-black/20 px-4 py-2 rounded-xl border border-white/10 flex flex-col items-end shadow-inner">
          <span className="text-[9px] font-bold text-white/50 uppercase leading-none mb-1">Banca</span>
          <span className="font-mono font-bold text-[#FFCC00] text-lg">{balance.toFixed(2)} Kz</span>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto no-scrollbar bg-[#0b0e11] min-h-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          
          {/* Painel Lateral de Apostas */}
          <div className="lg:col-span-4 bg-[#131d27] p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl space-y-4 order-2 lg:order-1">
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Último Ganho</span>
              <div className={`text-2xl sm:text-3xl font-black font-mono transition-all ${lastWin > 0 ? 'text-[#FFCC00] scale-105' : 'text-slate-700'}`}>
                {lastWin > 0 ? `+${lastWin.toFixed(2)} USDT` : '0.00 USDT'}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linhas de Pagamento (20 Linhas Ativas)</span>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] text-slate-300 font-bold flex justify-between items-center">
                <span>Multip. de Símbolos Raros:</span>
                <span className="text-[#FFCC00] font-black">Até 200x ⭐</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor da Aposta (USDT)</span>
              <div className="flex items-center justify-between gap-2 bg-black/60 p-2 rounded-xl border border-white/10">
                <button 
                  onClick={() => { soundService.playUISelect(); setBet(Math.max(5, bet - 5)); }} 
                  disabled={isSpinning} 
                  className="w-10 h-10 bg-white/10 rounded-lg font-black text-lg text-white hover:bg-white/20 active:scale-90 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0"
                >
                  -
                </button>
                <div className="text-center">
                  <span className="text-base font-black font-mono text-white">{bet} USDT</span>
                </div>
                <button 
                  onClick={() => { soundService.playUISelect(); setBet(bet + 5); }} 
                  disabled={isSpinning} 
                  className="w-10 h-10 bg-white/10 rounded-lg font-black text-lg text-white hover:bg-white/20 active:scale-90 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            <button 
              onClick={spin} 
              disabled={isSpinning || balance < bet || bet < 5} 
              className={`w-full py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex flex-col items-center justify-center border-b-4 cursor-pointer text-sm min-h-[50px] ${isSpinning || balance < bet || bet < 5 ? 'bg-slate-800 text-slate-600 border-slate-900 border-b-0 cursor-not-allowed' : 'bg-[#049444] hover:bg-[#037235] text-white border-[#025a2a] shadow-[#049444]/30'}`}
            >
              {isSpinning ? <span className="animate-pulse text-white/50">GIRANDO...</span> : <span>GIRAR SLOTS (20 LINHAS)</span>}
            </button>
          </div>

          {/* Arena do Slot Machine */}
          <div className="lg:col-span-8 bg-gradient-to-b from-[#1e293b] to-[#0f172a] p-3 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border-[4px] sm:border-[6px] border-[#2d3a4d] shadow-[0_0_100px_rgba(0,0,0,0.8)] order-1 lg:order-2 min-h-[380px] sm:min-h-[460px] flex flex-col justify-center">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 bg-black/90 p-2 sm:p-4 rounded-xl sm:rounded-2xl overflow-hidden relative shadow-[inset_0_0_40px_rgba(0,0,0,1)]">
              {winLines.length > 0 && !isSpinning && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 500 300" preserveAspectRatio="none">
                    {winLines.map((lineIdx) => (
                      <polyline key={lineIdx} points={PAYLINES[lineIdx].map((row, col) => `${50 + col * 100},${50 + row * 100}`).join(' ')} fill="none" stroke="#FFCC00" strokeWidth="4" className="animate-pulse" style={{ filter: 'drop-shadow(0 0 10px #FFCC00)' }} />
                    ))}
                  </svg>
                </div>
              )}

              {[0, 1, 2, 3, 4].map((col) => (
                <div key={col} className={`flex flex-col gap-1.5 sm:gap-2 transition-transform duration-150 ${spinning[col] ? 'animate-reel-spin blur-[2px]' : stopping[col] ? 'animate-reel-bounce' : ''}`}>
                  {[0, 1, 2].map((row) => {
                    const symbol = SYMBOLS[grid[row][col]];
                    const isWinningSymbol = winLines.some(l => PAYLINES[l][col] === row);
                    return (
                      <div key={`${row}-${col}`} className={`h-20 sm:h-28 md:h-36 bg-gradient-to-b from-[#111827] to-[#020617] rounded-lg sm:rounded-2xl flex items-center justify-center text-3xl sm:text-4xl md:text-5xl border border-white/5 relative overflow-hidden transition-all duration-300 ${isWinningSymbol && !isSpinning ? 'ring-2 sm:ring-4 ring-[#FFCC00] shadow-[0_0_30px_rgba(255,204,0,0.4)] z-20 scale-105 bg-yellow-500/10' : 'opacity-90'}`}>
                        <span className={`${symbol.color} ${isWinningSymbol && !isSpinning ? 'animate-bounce' : ''} drop-shadow-lg`}>
                          {spinning[col] ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char : symbol.char}
                        </span>
                        {spinning[col] && <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] animate-pulse" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes reel-spin {
          0% { transform: translateY(0); }
          50% { transform: translateY(15px); opacity: 0.6; }
          100% { transform: translateY(0); }
        }
        @keyframes reel-bounce {
          0% { transform: translateY(30px); }
          40% { transform: translateY(-15px); }
          70% { transform: translateY(8px); }
          100% { transform: translateY(0); }
        }
        .animate-reel-spin { animation: reel-spin 0.08s infinite linear; }
        .animate-reel-bounce { animation: reel-bounce 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
};

export default SlotsView;
