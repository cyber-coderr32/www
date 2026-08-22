import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, Trophy, Target, Sparkles, Zap, Shield, ChevronUp } from 'lucide-react';
import { soundService } from '../services/soundService';

interface TowerViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const ROWS = 9;
const COLS = 4;

const TowerView: React.FC<TowerViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [currentRow, setCurrentRow] = useState(0);
  const [grid, setGrid] = useState<number[][]>([]); // 1 for safe, 0 for mine
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
  const [multiplier, setMultiplier] = useState(1);

  const multipliers = {
    EASY: [1.2, 1.6, 2.1, 2.9, 3.8, 5.2, 7.1, 9.8, 13.5],
    MEDIUM: [1.5, 2.5, 4.2, 7.0, 11.8, 19.8, 33.2, 55.8, 93.5],
    HARD: [2.0, 4.5, 10.2, 23.0, 52.0, 118, 265, 600, 1350]
  };

  const startNewGame = () => {
    if (balance < betAmount || betAmount < 5 || gameState === 'PLAYING') return;

    onUpdateBalance(-betAmount);
    setGameState('PLAYING');
    setCurrentRow(0);
    setMultiplier(1);
    setRevealed({});

    // Generate path
    const newGrid: number[][] = [];
    const minesCount = difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : 3;

    for (let r = 0; r < ROWS; r++) {
      const row = new Array(COLS).fill(1);
      const minesIndices: number[] = [];
      while (minesIndices.length < minesCount) {
        const idx = Math.floor(Math.random() * COLS);
        if (!minesIndices.includes(idx)) {
          minesIndices.push(idx);
          row[idx] = 0;
        }
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    soundService.playUISelect();
  };

  const handleTileClick = (row: number, col: number) => {
    if (gameState !== 'PLAYING' || row !== currentRow) return;

    const key = `${row}-${col}`;
    setRevealed(prev => ({ ...prev, [key]: true }));

    if (grid[row][col] === 1) {
      // Safe
      const newMultiplier = multipliers[difficulty][row];
      setMultiplier(newMultiplier);
      soundService.playTowerFloorAscent(row + 1);

      if (row === ROWS - 1) {
        setGameState('WON');
        onUpdateBalance(betAmount * newMultiplier);
        soundService.playSlotJackpot();
      } else {
        setCurrentRow(row + 1);
      }
    } else {
      // Mine
      setGameState('LOST');
      soundService.playTowerTrap();
    }
  };

  const cashout = () => {
    if (gameState !== 'PLAYING' || currentRow === 0) return;
    onUpdateBalance(betAmount * multiplier);
    setGameState('WON');
    soundService.playMinesCashout();
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Crypton Tower</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Torre dos Ganhos</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-2.5 sm:p-4 gap-3 sm:gap-4 overflow-y-auto no-scrollbar min-h-0">
        {/* Painel Lateral */}
        <div className="w-full md:w-80 flex flex-col gap-3 shrink-0">
           <div className="bg-[#131d27] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 space-y-3 sm:space-y-6 w-full">
              <div>
                 <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-3 block">Dificuldade</span>
                 <div className="grid grid-cols-3 gap-1 sm:gap-2">
                    {['EASY', 'MEDIUM', 'HARD'].map(d => (
                      <button 
                        key={d}
                        onClick={() => setDifficulty(d as any)}
                        disabled={gameState === 'PLAYING'}
                        className={`py-2 rounded-xl font-black text-[10px] transition-all min-h-[36px] ${difficulty === d ? 'bg-[#049444] text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                      >
                         {d}
                      </button>
                    ))}
                 </div>
              </div>

              <div>
                 <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-3 block">Aposta</span>
                 <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5">
                    <button onClick={() => setBetAmount(Math.max(5, betAmount - 5))} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-white text-base cursor-pointer flex items-center justify-center">-</button>
                    <input
                      type="number"
                      min={5}
                      value={betAmount}
                      onChange={e => setBetAmount(Math.max(5, Number(e.target.value)))}
                      disabled={gameState === 'PLAYING'}
                      className="flex-1 bg-transparent text-center font-black text-white text-sm sm:text-base outline-none font-mono"
                    />
                    <button onClick={() => setBetAmount(betAmount + 5)} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-white text-base cursor-pointer flex items-center justify-center">+</button>
                 </div>
              </div>

              {gameState === 'PLAYING' ? (
                <button 
                  onClick={cashout}
                  disabled={currentRow === 0}
                  className="w-full py-3.5 sm:py-5 bg-[#FFCC00] hover:bg-[#FFD700] text-black rounded-xl sm:rounded-3xl font-black text-sm sm:text-xl uppercase tracking-widest border-b-4 sm:border-b-8 border-[#ccaa00] shadow-2xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[48px]"
                >
                  RETIRAR {(betAmount * multiplier).toFixed(2)} USDT
                </button>
              ) : (
                <button 
                  onClick={startNewGame}
                  disabled={balance < betAmount || betAmount < 5}
                  className={`w-full py-3.5 sm:py-5 rounded-xl sm:rounded-3xl font-black text-sm sm:text-xl uppercase tracking-widest border-b-4 sm:border-b-8 shadow-2xl transition-all active:scale-95 cursor-pointer min-h-[48px] ${balance < betAmount || betAmount < 5 ? 'bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed' : 'bg-[#049444] hover:bg-[#037235] text-white border-[#025628]'}`}
                >
                  JOGAR
                </button>
              )}
           </div>

           <div className="bg-[#131d27] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5 hidden sm:block overflow-y-auto max-h-[220px] no-scrollbar">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 italic">Caminho</span>
              <div className="space-y-0.5 sm:space-y-1">
                 {[...multipliers[difficulty]].reverse().map((m, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black ${ROWS - 1 - i === currentRow && gameState === 'PLAYING' ? 'bg-[#049444] text-white scale-105' : 'bg-black/20 text-slate-300'}`}>
                       <span>Nível {ROWS - i}</span>
                       <span>{m.toFixed(1)}x</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Arena da Torre */}
        <div className="flex-1 bg-[#131d27]/40 rounded-2xl sm:rounded-[3rem] border border-white/5 relative flex items-center justify-center p-3 sm:p-4 min-h-[380px] overflow-hidden">
           <div className="flex flex-col-reverse gap-1 sm:gap-1.5 w-full max-w-[220px] sm:max-w-[300px] my-auto">
              {[...Array(ROWS)].map((_, r) => (
                <div key={r} className={`grid grid-cols-4 gap-1 sm:gap-1.5 transition-all duration-300 ${currentRow === r && gameState === 'PLAYING' ? 'opacity-100 scale-105 z-10' : r < currentRow ? 'opacity-40' : 'opacity-25'}`}>
                   {[...Array(COLS)].map((_, c) => {
                      const isRevealed = revealed[`${r}-${c}`];
                      const isMine = grid[r]?.[c] === 0;
                      return (
                        <motion.div 
                          key={c}
                          onClick={() => handleTileClick(r, c)}
                          className={`aspect-square rounded-lg sm:rounded-xl border-b-2 sm:border-b-4 transition-all flex items-center justify-center cursor-pointer
                            ${isRevealed 
                              ? (isMine ? 'bg-red-600 border-red-900' : 'bg-[#049444] border-green-900') 
                              : (r === currentRow && gameState === 'PLAYING' ? 'bg-slate-700 border-slate-900 hover:bg-slate-600 shadow-md' : 'bg-slate-800 border-slate-950')}`}
                          whileTap={currentRow === r ? { scale: 0.9 } : {}}
                        >
                           {isRevealed ? (
                             isMine ? <Zap className="text-white w-4 h-4 sm:w-6 sm:h-6" /> : <Shield className="text-white w-4 h-4 sm:w-6 sm:h-6" />
                           ) : r === currentRow && gameState === 'PLAYING' ? (
                             <ChevronUp className="text-[#FFCC00] w-3.5 h-3.5 sm:w-5 sm:h-5 animate-bounce" />
                           ) : null}
                        </motion.div>
                      );
                   })}
                </div>
              ))}
           </div>


           {/* Feedback Overlays */}
           <AnimatePresence>
              {gameState === 'WON' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-20 bg-[#049444]/90 backdrop-blur-md rounded-[3rem] flex flex-col items-center justify-center text-center p-8"
                >
                   <Trophy className="w-20 h-20 text-white mb-4 animate-bounce" />
                   <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter mb-4">VITÓRIA!</h2>
                   <div className="bg-white/10 px-6 py-2 rounded-full font-black text-white text-xl mb-8">
                      GANHOU {(betAmount * multiplier).toFixed(2)} USDT
                   </div>
                   <button onClick={() => setGameState('IDLE')} className="px-10 py-4 bg-white text-[#049444] font-black uppercase tracking-widest rounded-2xl">JOGAR NOVAMENTE</button>
                </motion.div>
              )}
              {gameState === 'LOST' && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                   className="absolute inset-0 z-20 bg-red-600/90 backdrop-blur-md rounded-[3rem] flex flex-col items-center justify-center text-center p-8"
                >
                   <Zap className="w-20 h-20 text-white mb-4 animate-pulse" />
                   <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter mb-4">BOOM!</h2>
                   <p className="text-white/80 font-bold uppercase tracking-widest mb-8">A torre colapsou desta vez</p>
                   <button onClick={() => setGameState('IDLE')} className="px-10 py-4 bg-white text-red-600 font-black uppercase tracking-widest rounded-2xl">TENTAR DE NOVO</button>
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </main>

      <footer className="p-4 bg-black/40 text-center flex items-center justify-center gap-6">
         <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-[#049444]" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">JUSTIÇA GARANTIDA</span>
         </div>
         <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#FFCC00]" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">MULTI ATÉ 1350X</span>
         </div>
      </footer>
    </div>
  );
};

export default TowerView;
