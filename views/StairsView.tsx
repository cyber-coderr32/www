import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, Trophy, Sparkles, Zap, Shield, Signal as StairsIcon } from 'lucide-react';
import { soundService } from '../services/soundService';

interface StairsViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const ROWS = 13;

const StairsView: React.FC<StairsViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [minesCount, setMinesCount] = useState(1);
  const [currentRow, setCurrentRow] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
  const [multiplier, setMultiplier] = useState(1);
  const [grid, setGrid] = useState<number[][]>([]); // 1 for safe, 0 for mine

  const calculateMultiplier = (row: number, mines: number) => {
    // Basic formula for stairs multipliers
    const base = 1 + (mines * 0.15);
    return Math.pow(base, row + 1);
  };

  const startNewGame = () => {
    if (balance < betAmount || betAmount < 5 || gameState === 'PLAYING') return;

    onUpdateBalance(-betAmount);
    setGameState('PLAYING');
    setCurrentRow(0);
    setMultiplier(1);

    const newGrid: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const rowSize = Math.min(r + 2, 7);
      const row = new Array(rowSize).fill(1);
      const minesInRow: number[] = [];
      
      // Limit mines to rowSize - 1 to ensure at least one safe spot
      const actualMines = Math.min(minesCount, rowSize - 1);
      
      while (minesInRow.length < actualMines) {
        const idx = Math.floor(Math.random() * rowSize);
        if (!minesInRow.includes(idx)) {
          minesInRow.push(idx);
          row[idx] = 0;
        }
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    soundService.playUISelect();
  };

  const handleStep = (rowIdx: number, colIdx: number) => {
    if (gameState !== 'PLAYING') return;
    if (rowIdx !== currentRow) return; // Only allow clicking the active row

    if (grid[rowIdx][colIdx] === 1) {
      // Safe
      const nextMultiplier = calculateMultiplier(currentRow, minesCount);
      setMultiplier(nextMultiplier);
      soundService.playWin();
      
      if (currentRow === ROWS - 1) {
        onUpdateBalance(betAmount * nextMultiplier);
        setGameState('WON');
      } else {
        setCurrentRow(prev => prev + 1);
      }
    } else {
      // Mine
      setGameState('LOST');
      soundService.playLoss();
    }
  };

  const cashout = () => {
    if (gameState !== 'PLAYING' || currentRow === 0) return;
    onUpdateBalance(betAmount * multiplier);
    setGameState('WON');
    soundService.playWin();
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Crypton Stairs</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Escadaria da Sorte</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Painel Lateral */}
        <div className="w-full md:w-80 flex flex-col gap-4">
           <div className="bg-[#131d27] p-6 rounded-[2.5rem] border border-white/5 space-y-6">
              <div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Minas p/ Degrau</span>
                 <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(m => (
                      <button 
                        key={m}
                        onClick={() => { soundService.playUISelect(); setMinesCount(m); }}
                        disabled={gameState === 'PLAYING'}
                        className={`py-2 rounded-xl font-black text-sm transition-all ${minesCount === m ? 'bg-[#049444] text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                         {m}
                      </button>
                    ))}
                 </div>
              </div>

              <div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Aposta</span>
                 <div className="flex items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
                    <button onClick={() => { soundService.playUISelect(); setBetAmount(Math.max(5, betAmount - 5)); }} disabled={gameState === 'PLAYING'} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-white disabled:opacity-50 cursor-pointer">-</button>
                    <div className="flex-1 text-center font-black text-white font-mono">{betAmount.toFixed(2)} USDT</div>
                    <button onClick={() => { soundService.playUISelect(); setBetAmount(betAmount + 5); }} disabled={gameState === 'PLAYING'} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-white disabled:opacity-50 cursor-pointer">+</button>
                 </div>
              </div>

              {gameState === 'PLAYING' ? (
                <button 
                  onClick={cashout}
                  disabled={currentRow === 0}
                  className="w-full py-5 bg-[#FFCC00] text-black rounded-3xl font-black text-xl uppercase tracking-widest border-b-8 border-[#ccaa00] shadow-2xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  RECOLHER {(betAmount * multiplier).toFixed(2)} USDT
                </button>
              ) : (
                <button 
                  onClick={startNewGame}
                  disabled={balance < betAmount || betAmount < 5}
                  className={`w-full py-5 rounded-3xl font-black text-xl uppercase tracking-widest border-b-8 shadow-2xl transition-all active:scale-95 cursor-pointer ${balance < betAmount || betAmount < 5 ? 'bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed' : 'bg-[#049444] text-white border-[#025628]'}`}
                >
                  SUBIR ESCADA
                </button>
              )}
           </div>

           <div className="bg-[#131d27] p-5 rounded-3xl border border-white/5 flex-1 relative overflow-hidden flex flex-col justify-center">
              <div className="z-10 relative">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 italic">Progresso VIP</span>
                 <div className="text-center py-6">
                    <span className="text-5xl font-black text-[#FFCC00] italic tracking-tighter leading-none">{multiplier.toFixed(2)}x</span>
                    <span className="block text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mt-2">Multiplicador Atual</span>
                 </div>
                 <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#049444] to-[#049444]" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentRow / ROWS) * 100}%` }}
                    />
                 </div>
              </div>
              <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5" />
           </div>
        </div>

        {/* Arena da Escadaria */}
        <div className="flex-1 bg-[#131d27]/40 rounded-[3rem] border border-white/5 relative flex flex-col items-center justify-center p-8 overflow-y-auto no-scrollbar">
           <div className="flex flex-col-reverse gap-2 w-full max-w-md">
              {[...Array(ROWS)].map((_, r) => (
                <div key={r} className={`flex justify-center gap-2 transition-all duration-500 ${currentRow === r && gameState === 'PLAYING' ? 'scale-110 z-10' : (currentRow > r ? 'opacity-20' : 'opacity-40')}`}>
                   {(grid[r] || new Array(Math.min(r + 2, 7)).fill(1)).map((cell, c) => (
                     <motion.button 
                        key={c}
                        onClick={() => handleStep(r, c)}
                        disabled={gameState !== 'PLAYING' || currentRow !== r}
                        whileHover={currentRow === r && gameState === 'PLAYING' ? { scale: 1.05 } : {}}
                        whileTap={currentRow === r && gameState === 'PLAYING' ? { scale: 0.95 } : {}}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border-b-4 transition-all flex items-center justify-center shadow-xl
                          ${currentRow === r && gameState === 'PLAYING' 
                            ? 'bg-[#FFCC00] border-[#ccaa00] text-black ring-2 ring-[#FFCC00]/20 animate-pulse' 
                            : (currentRow > r && grid[r][c] === 1 ? 'bg-[#049444] border-[#025628] text-white' : 'bg-slate-800 border-slate-900 text-slate-600')}`}
                     >
                        {currentRow === r && gameState === 'PLAYING' ? (
                           <StairsIcon className="w-5 h-5 pointer-events-none" />
                        ) : (currentRow > r && grid[r][c] === 1 ? (
                           <Sparkles className="w-4 h-4 opacity-50" />
                        ) : null)}
                     </motion.button>
                   ))}
                </div>
              ))}
           </div>

           {/* Gameplay Status Overlays */}
           <AnimatePresence>
             {gameState === 'WON' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-30 bg-[#049444]/95 backdrop-blur-xl rounded-[3rem] flex flex-col items-center justify-center text-center p-12"
                >
                   <Trophy className="w-24 h-24 text-white mb-6 animate-bounce" />
                   <h2 className="text-6xl font-black italic text-white uppercase tracking-tighter leading-none mb-4">EXTRAORDINÁRIO!</h2>
                   <div className="text-2xl font-black text-white/90 uppercase tracking-widest mb-10">RECOLHEU {(betAmount * multiplier).toFixed(2)} USDT</div>
                   <button onClick={() => setGameState('IDLE')} className="px-12 py-5 bg-white text-[#049444] font-black uppercase tracking-widest rounded-[2rem] shadow-2xl">PRÓXIMA SUBIDA</button>
                </motion.div>
             )}
             {gameState === 'LOST' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-30 bg-red-600/95 backdrop-blur-xl rounded-[3rem] flex flex-col items-center justify-center text-center p-12"
                >
                   <Zap className="w-24 h-24 text-white mb-6 animate-pulse" />
                   <h2 className="text-6xl font-black italic text-white uppercase tracking-tighter leading-none mb-4">CABUM!</h2>
                   <p className="text-xl font-bold text-white/80 uppercase tracking-widest mb-10">Escorregou nos degraus</p>
                   <button onClick={() => setGameState('IDLE')} className="px-12 py-5 bg-white text-red-600 font-black uppercase tracking-widest rounded-[2rem] shadow-2xl">RECOMEÇAR</button>
                </motion.div>
             )}
           </AnimatePresence>
        </div>
      </main>

      <footer className="p-4 bg-black/40 text-center flex items-center justify-center gap-8">
         <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-[#049444]" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SEGURANÇA ANGOLANA</span>
         </div>
         <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#FFCC00]" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ALGORITMO RNG CERTIFICADO</span>
         </div>
      </footer>
    </div>
  );
};

export default StairsView;
