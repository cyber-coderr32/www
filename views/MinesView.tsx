
import React, { useState, useEffect, useCallback } from 'react';
import { soundService } from '../services/soundService';

interface MinesViewProps {
  balance: number;
  isDemo?: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const MINES_PRESETS = [1, 3, 5, 13, 24];

const MinesView: React.FC<MinesViewProps> = ({ balance, isDemo, onUpdateBalance, onBack }) => {
  const [bet, setBet] = useState(10);
  const [minesCount, setMinesCount] = useState(3);
  const [grid, setGrid] = useState<('MINE' | 'SAFE' | null)[]>(Array(25).fill(null));
  const [minesPositions, setMinesPositions] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'ENDED'>('IDLE');
  const [revealedCount, setRevealedCount] = useState(0);
  const [winStatus, setWinStatus] = useState<'WIN' | 'LOSS' | null>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 786);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 786);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateMultiplier = (revealed: number) => {
    if (revealed === 0) return 1;
    let mult = 1;
    for (let i = 0; i < revealed; i++) {
      mult *= (25 - i) / (25 - minesCount - i);
    }
    // "Bait" logic: Demo mode pays slightly more visually
    const edge = isDemo ? 0.999 : 0.96; 
    return mult * edge; 
  };

  const startGame = () => {
    if (balance < bet || bet < 5) return;
    onUpdateBalance(-bet);
    
    // Initial positions
    const pos: number[] = [];
    while (pos.length < minesCount) {
      const r = Math.floor(Math.random() * 25);
      if (!pos.includes(r)) pos.push(r);
    }
    setMinesPositions(pos);
    setGrid(Array(25).fill(null));
    setGameState('PLAYING');
    setRevealedCount(0);
    setWinStatus(null);
    soundService.playChip();
  };

  const handleReveal = (index: number) => {
    if (gameState !== 'PLAYING' || grid[index] !== null) return;

    const savedSettings = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
    const advLevel = savedSettings.houseAdvantageLevel || 'MEDIUM';
    const isBaiting = savedSettings.baitingMode !== false;

    // HOUSE LOGIC: "The Platform Never Loses" (Only in Real Mode)
    let isHit = minesPositions.includes(index);
    const currentMult = calculateMultiplier(revealedCount);

    // Dynamic difficulty adjustment
    if (!isDemo && !isHit && revealedCount >= 1 && (bet >= 500 || currentMult > 1.5)) {
      const houseAdvantageRoll = Math.random();
      // Adjust thresholds based on Admin advantage level
      let strikeThreshold = currentMult > 5 ? 0.45 : 0.18; 
      
      if (advLevel === 'EXTREME') strikeThreshold *= 1.5;
      if (advLevel === 'LOW') strikeThreshold *= 0.3;

      if (houseAdvantageRoll < strikeThreshold) {
        isHit = true;
        setMinesPositions(prev => {
          const newMines = [...prev];
          const switchIdx = Math.floor(Math.random() * newMines.length);
          newMines[switchIdx] = index;
          return newMines;
        });
      }
    } else if (isDemo && isHit && revealedCount < 3 && isBaiting) {
        // "Lucky Charm" for demo users
        if (Math.random() > 0.4) {
            isHit = false;
            setMinesPositions(prev => {
                const newMines = prev.filter(p => p !== index);
                let r = Math.floor(Math.random() * 25);
                while (newMines.includes(r) || r === index) r = Math.floor(Math.random() * 25);
                newMines.push(r);
                return newMines;
            });
        }
    }

    if (isHit) {
      const newGrid = [...grid];
      // Note: minesPositions may have updated in state, but we need the current hit
      const finalMines = minesPositions.includes(index) ? minesPositions : [...minesPositions.filter((_, i) => i !== 0), index];
      finalMines.forEach(p => newGrid[p] = 'MINE');
      setGrid(newGrid);
      setGameState('ENDED');
      setWinStatus('LOSS');
      soundService.playLoss();
    } else {
      const newGrid = [...grid];
      newGrid[index] = 'SAFE';
      setGrid(newGrid);
      setRevealedCount(prev => prev + 1);
      soundService.playTick();
    }
  };

  const cashOut = () => {
    const win = bet * calculateMultiplier(revealedCount);
    onUpdateBalance(win);
    setGameState('ENDED');
    setWinStatus('WIN');
    soundService.playWin();
  };

  const currentMultiplier = calculateMultiplier(revealedCount);

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      <div className="p-2 sm:p-4 flex bg-[#131d27] border-b border-white/5 items-center gap-2 sm:gap-4 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-amber-500 active:scale-90 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="font-black uppercase text-xs sm:text-base md:text-xl italic tracking-tighter">MINES <span className="text-amber-500">PRO</span></h2>
        <div className="ml-auto bg-black/40 px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl border border-white/5 font-mono font-bold text-green-400 text-xs sm:text-base shrink-0">{balance.toFixed(2)} USDT</div>
      </div>

      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto no-scrollbar min-h-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          
          {/* Painel Lateral de Apostas (Controles) */}
          <div className="lg:col-span-4 bg-[#131d27] p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl space-y-4 order-2 lg:order-1">
            <div className="flex justify-between items-center bg-black/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Multiplicador</span>
                <span className="font-black text-[#FFCC00] font-mono text-2xl sm:text-3xl">{currentMultiplier.toFixed(2)}x</span>
              </div>
              {gameState === 'PLAYING' && revealedCount > 0 ? (
                <button 
                  onClick={cashOut} 
                  className="bg-orange-500 hover:bg-orange-400 text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-black uppercase shadow-xl shadow-orange-500/20 active:scale-95 transition-all text-xs sm:text-sm border-b-4 border-orange-700 animate-in zoom-in cursor-pointer min-h-[44px]"
                >
                  SAIR {(bet * currentMultiplier).toFixed(2)} USDT
                </button>
              ) : (
                <div className="text-right">
                  <span className="block text-[9px] font-black text-slate-500 uppercase">Lucro Potencial</span>
                  <span className="text-slate-300 font-black text-sm sm:text-base font-mono">{(bet * currentMultiplier).toFixed(2)} USDT</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
               <div className="space-y-1">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quantia da Aposta</span>
                  <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 p-1.5 rounded-xl">
                     <button onClick={() => setBet(Math.max(5, Math.floor(bet / 2)))} className="w-10 h-10 bg-white/10 rounded-lg text-xs font-black text-white hover:bg-white/20 active:scale-90 cursor-pointer flex items-center justify-center">½</button>
                     <input 
                       type="number" 
                       min={5}
                       value={bet} 
                       onChange={e => setBet(Math.max(5, Number(e.target.value)))} 
                       disabled={gameState === 'PLAYING'} 
                       className="flex-1 bg-slate-900/90 text-white border border-white/20 rounded-lg py-2 outline-none font-black text-sm text-center focus:border-[#FFCC00] focus:text-[#FFCC00] shadow-inner min-w-0 font-mono" 
                     />
                     <button onClick={() => setBet(bet * 2)} className="w-10 h-10 bg-white/10 rounded-lg text-xs font-black text-white hover:bg-white/20 active:scale-90 cursor-pointer flex items-center justify-center">2x</button>
                  </div>
               </div>

               <div className="space-y-1">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número de Minas ({minesCount})</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {MINES_PRESETS.map(m => (
                      <button
                        key={m}
                        disabled={gameState === 'PLAYING'}
                        onClick={() => setMinesCount(m)}
                        className={`py-2 rounded-xl font-black text-xs transition-all border-b cursor-pointer active:scale-95
                          ${minesCount === m 
                            ? 'bg-amber-500 border-amber-700 text-white shadow-lg shadow-amber-500/20' 
                            : 'bg-white/5 border-black/40 text-slate-400 hover:bg-white/10'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            {gameState !== 'PLAYING' ? (
              <button 
                onClick={startGame} 
                disabled={balance < bet || bet < 5}
                className={`w-full py-4 bg-[#049444] hover:bg-[#037235] text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl border-b-4 border-[#025628] active:scale-95 transition-all text-sm cursor-pointer min-h-[50px]
                  ${balance < bet || bet < 5 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              >
                APOSTAR E JOGAR
              </button>
            ) : (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center text-xs text-blue-300 font-bold">
                Jogo em andamento... Clique nos quadros para encontrar gemas 💎
              </div>
            )}
          </div>

          {/* Arena Principal de Campo Minado */}
          <div className="lg:col-span-8 bg-[#131d27]/70 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center min-h-[380px] sm:min-h-[460px] relative order-1 lg:order-2">
            <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full max-w-[320px] sm:max-w-[420px] aspect-square relative z-10 my-auto">
              {grid.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => handleReveal(i)}
                  disabled={gameState !== 'PLAYING' || cell !== null}
                  className={`rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center text-2xl sm:text-3xl shadow-xl border-b-2 sm:border-b-4 relative overflow-hidden touch-manipulation min-h-[48px]
                    ${cell === null ? 'bg-[#1a2c38] hover:bg-[#243745] active:translate-y-1 border-black/40' : 
                      cell === 'SAFE' ? 'bg-[#049444] border-[#025628] shadow-[#049444]/30' : 'bg-red-500 border-red-800 shadow-red-500/30'}
                    ${gameState === 'ENDED' && cell === null && minesPositions.includes(i) ? 'bg-red-500/40 border-red-900/40 opacity-60' : ''}
                  `}
                >
                  {cell === 'SAFE' && (
                    <div className="flex flex-col items-center">
                      <span className="drop-shadow-[0_0_12px_white]">💎</span>
                    </div>
                  )}
                  {cell === 'MINE' && <span className="drop-shadow-[0_0_12px_black]">💣</span>}
                  {gameState === 'ENDED' && cell === null && minesPositions.includes(i) && <span className="text-xs sm:text-sm opacity-50">💣</span>}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MinesView;
