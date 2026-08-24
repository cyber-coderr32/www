
import React, { useState } from 'react';
import { soundService } from '../services/soundService';
import { Bomb, Diamond, Trophy, Zap, ArrowLeft, Plus, Minus, AlertTriangle } from 'lucide-react';

interface MinesViewProps {
  balance: number;
  isDemo?: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

// Presets with minimum of 4 mines as requested
const MINES_PRESETS = [4, 6, 8, 12, 16, 20, 24];

const MinesView: React.FC<MinesViewProps> = ({ balance, isDemo, onUpdateBalance, onBack }) => {
  const [bet, setBet] = useState(10);
  const [minesCount, setMinesCount] = useState(4); // Default to minimum 4 mines
  const [grid, setGrid] = useState<('MINE' | 'SAFE' | null)[]>(Array(25).fill(null));
  const [minesPositions, setMinesPositions] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'ENDED'>('IDLE');
  const [revealedCount, setRevealedCount] = useState(0);
  const [winStatus, setWinStatus] = useState<'WIN' | 'LOSS' | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);

  const calculateMultiplier = (revealed: number, mines: number = minesCount) => {
    if (revealed === 0) return 1;
    let mult = 1;
    for (let i = 0; i < revealed; i++) {
      mult *= (25 - i) / (25 - mines - i);
    }
    // Demo mode edge vs Real mode edge
    const edge = isDemo ? 0.999 : 0.96; 
    return mult * edge; 
  };

  const nextMultiplier = calculateMultiplier(revealedCount + 1);
  const currentMultiplier = calculateMultiplier(revealedCount);

  const startGame = () => {
    if (balance < bet || bet < 5) return;
    
    // Ensure minesCount is at least 4
    const validMinesCount = Math.max(4, Math.min(24, minesCount));
    if (minesCount !== validMinesCount) {
      setMinesCount(validMinesCount);
    }

    onUpdateBalance(-bet);
    
    // Initial random distribution of mines among the 25 tiles
    const allIndices = Array.from({ length: 25 }, (_, i) => i);
    const shuffled = [...allIndices].sort(() => Math.random() - 0.5);
    const initialMines = shuffled.slice(0, validMinesCount);

    setMinesPositions(initialMines);
    setGrid(Array(25).fill(null));
    setGameState('PLAYING');
    setRevealedCount(0);
    setWinStatus(null);
    setLastWinAmount(0);
    soundService.playChip();
  };

  const handleReveal = (index: number) => {
    if (gameState !== 'PLAYING' || grid[index] !== null) return;

    // Get all currently unrevealed indices (tiles where grid[i] === null)
    const unrevealedIndices = grid
      .map((cell, i) => (cell === null ? i : -1))
      .filter(i => i !== -1);

    const safeTilesRemaining = unrevealedIndices.length;
    const currentMinesCount = Math.min(minesCount, safeTilesRemaining);

    // Dynamic random mine movement in background on every click
    const shuffledRemaining = [...unrevealedIndices].sort(() => Math.random() - 0.5);
    let dynamicMines = shuffledRemaining.slice(0, currentMinesCount);

    const savedSettings = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
    const advLevel = savedSettings.houseAdvantageLevel || 'MEDIUM';
    const isBaiting = savedSettings.baitingMode !== false;

    let isHit = dynamicMines.includes(index);
    const currentMult = calculateMultiplier(revealedCount);

    // Dynamic house edge adjustments (Real Mode)
    if (!isDemo && !isHit && revealedCount >= 1 && (bet >= 500 || currentMult > 1.8)) {
      const houseAdvantageRoll = Math.random();
      let strikeThreshold = currentMult > 5 ? 0.45 : 0.20; 
      
      if (advLevel === 'EXTREME') strikeThreshold *= 1.5;
      if (advLevel === 'LOW') strikeThreshold *= 0.3;
      
      if (houseAdvantageRoll < strikeThreshold) {
        isHit = true;
        if (!dynamicMines.includes(index)) {
          dynamicMines = [index, ...dynamicMines.slice(1)];
        }
      }
    } else if (isDemo && isHit && revealedCount < 3 && isBaiting) {
      // Demo lucky charm
      if (Math.random() > 0.4) {
        isHit = false;
        const otherTiles = unrevealedIndices.filter(t => t !== index);
        if (otherTiles.length >= currentMinesCount) {
          const reShuffled = [...otherTiles].sort(() => Math.random() - 0.5);
          dynamicMines = reShuffled.slice(0, currentMinesCount);
        }
      }
    }

    if (isHit) {
      // Exploded
      const newGrid = [...grid];
      dynamicMines.forEach(p => {
        newGrid[p] = 'MINE';
      });
      newGrid[index] = 'MINE';

      setMinesPositions(dynamicMines);
      setGrid(newGrid);
      setGameState('ENDED');
      setWinStatus('LOSS');
      soundService.playMinesExplosion();
    } else {
      // Found a safe gem
      const newGrid = [...grid];
      newGrid[index] = 'SAFE';
      setGrid(newGrid);

      // Remaining unrevealed tiles after this pick
      const remainingAfterPick = unrevealedIndices.filter(i => i !== index);
      const updatedMines = dynamicMines.filter(m => m !== index);

      if (updatedMines.length < currentMinesCount && remainingAfterPick.length >= currentMinesCount) {
        const rePlaced = [...remainingAfterPick].sort(() => Math.random() - 0.5).slice(0, currentMinesCount);
        setMinesPositions(rePlaced);
      } else {
        setMinesPositions(updatedMines);
      }

      const newStep = revealedCount + 1;
      setRevealedCount(newStep);
      soundService.playMinesGem(newStep);

      // Check if user found ALL safe tiles (25 - minesCount)
      const totalSafeTiles = 25 - minesCount;
      if (newStep >= totalSafeTiles) {
        const maxWin = bet * calculateMultiplier(newStep);
        onUpdateBalance(maxWin);
        setLastWinAmount(maxWin);
        setGameState('ENDED');
        setWinStatus('WIN');
        soundService.playMinesCashout();
      }
    }
  };

  const cashOut = () => {
    if (gameState !== 'PLAYING' || revealedCount === 0) return;
    const win = bet * calculateMultiplier(revealedCount);
    onUpdateBalance(win);
    setLastWinAmount(win);
    setGameState('ENDED');
    setWinStatus('WIN');
    soundService.playMinesCashout();

    // Reveal remaining mine positions
    const newGrid = [...grid];
    minesPositions.forEach(p => {
      if (newGrid[p] === null) {
        newGrid[p] = 'MINE';
      }
    });
    setGrid(newGrid);
  };

  return (
    <div className="h-full flex flex-col bg-[#080d14] text-white overflow-hidden select-none">
      {/* HEADER */}
      <div className="p-3 sm:p-4 flex bg-[#0e1622] border-b border-white/10 items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-white/10 rounded-xl transition-all text-amber-400 active:scale-90 cursor-pointer flex items-center justify-center border border-white/5"
            title="Voltar ao Lobby"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Bomb className="w-5 h-5 text-black font-black" />
            </div>
            <div>
              <h2 className="font-black uppercase text-sm sm:text-base tracking-wider flex items-center gap-1.5">
                <span>MINAS</span>
                <span className="text-amber-400 font-extrabold text-xs bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">PRO</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="bg-black/60 px-3.5 py-1.5 rounded-xl border border-white/10 font-mono font-bold text-emerald-400 text-xs sm:text-sm flex items-center gap-2 shadow-inner">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">Saldo:</span>
          <span>{balance.toFixed(2)} USDT</span>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto no-scrollbar min-h-0 flex flex-col justify-center">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          
          {/* PAINEL LATERAL DE CONTROLES */}
          <div className="lg:col-span-4 bg-[#0e1622] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl space-y-4 order-2 lg:order-1">
            
            {/* MULTIPLIER & CASHOUT SUMMARY */}
            <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Multiplicador Atual</span>
                  <span className="font-black text-amber-400 font-mono text-2xl sm:text-3xl drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                    {currentMultiplier.toFixed(2)}x
                  </span>
                </div>
                {gameState === 'PLAYING' && revealedCount > 0 ? (
                  <button 
                    onClick={cashOut} 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black px-4 sm:px-5 py-2.5 rounded-xl font-black uppercase shadow-lg shadow-emerald-500/30 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer animate-pulse border-b-2 border-emerald-700"
                  >
                    SAIR {(bet * currentMultiplier).toFixed(2)}
                  </button>
                ) : (
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Lucro Estimado</span>
                    <span className="text-slate-200 font-black text-sm sm:text-base font-mono">
                      {(bet * currentMultiplier).toFixed(2)} USDT
                    </span>
                  </div>
                )}
              </div>

              {/* Progress and Next Gem info */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1">
                  <Diamond className="w-3.5 h-3.5 text-emerald-400" />
                  Gemas Encontradas: <strong className="text-white font-mono">{revealedCount} / {25 - minesCount}</strong>
                </span>
                {gameState === 'PLAYING' && (
                  <span className="text-amber-300 font-semibold font-mono">
                    Próxima: {nextMultiplier.toFixed(2)}x
                  </span>
                )}
              </div>
            </div>

            {/* CONTROLES DA APOSTA */}
            <div className="space-y-3">
              {/* QUANTIA DA APOSTA */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quantia da Aposta</span>
                  <span className="text-[10px] text-slate-500 font-bold">Mín: 5 USDT</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 p-1.5 rounded-xl">
                  <button 
                    onClick={() => setBet(Math.max(5, Math.floor(bet / 2)))} 
                    disabled={gameState === 'PLAYING'}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded-lg text-xs font-black text-white active:scale-90 cursor-pointer flex items-center justify-center transition-all"
                  >
                    ½
                  </button>
                  <input 
                    type="number" 
                    min={5}
                    value={bet} 
                    onChange={e => setBet(Math.max(5, Number(e.target.value) || 5))} 
                    disabled={gameState === 'PLAYING'} 
                    className="flex-1 bg-slate-950 text-white border border-white/10 rounded-lg py-2 outline-none font-black text-sm text-center focus:border-amber-400 focus:text-amber-300 shadow-inner min-w-0 font-mono" 
                  />
                  <button 
                    onClick={() => setBet(bet * 2)} 
                    disabled={gameState === 'PLAYING'}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded-lg text-xs font-black text-white active:scale-90 cursor-pointer flex items-center justify-center transition-all"
                  >
                    2x
                  </button>
                </div>
              </div>

              {/* NÚMERO DE MINAS (MÍNIMO 4 MINAS) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Número de Minas</span>
                    <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-black border border-rose-500/30">
                      MÍNIMO 4
                    </span>
                  </div>
                  <span className="font-mono font-black text-amber-400 text-xs">{minesCount} Minas</span>
                </div>

                {/* Quick Stepper + Value */}
                <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-1.5 rounded-xl">
                  <button 
                    type="button"
                    disabled={gameState === 'PLAYING' || minesCount <= 4}
                    onClick={() => setMinesCount(prev => Math.max(4, prev - 1))}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-white font-black flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center font-mono font-black text-white text-sm">
                    {minesCount} <span className="text-slate-400 text-xs font-normal">({25 - minesCount} Gemas)</span>
                  </div>
                  <button 
                    type="button"
                    disabled={gameState === 'PLAYING' || minesCount >= 24}
                    onClick={() => setMinesCount(prev => Math.min(24, prev + 1))}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-white font-black flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* PRESETS BUTTONS (All >= 4) */}
                <div className="grid grid-cols-7 gap-1">
                  {MINES_PRESETS.map(m => (
                    <button
                      key={m}
                      disabled={gameState === 'PLAYING'}
                      onClick={() => setMinesCount(m)}
                      className={`py-1.5 rounded-lg font-black text-[11px] font-mono transition-all border cursor-pointer active:scale-95 disabled:opacity-40
                        ${minesCount === m 
                          ? 'bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/20 font-extrabold' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ACTION BUTTON */}
            {gameState !== 'PLAYING' ? (
              <button 
                onClick={startGame} 
                disabled={balance < bet || bet < 5}
                className={`w-full py-3.5 sm:py-4 bg-gradient-to-r from-[#049444] to-emerald-600 hover:from-[#037c39] hover:to-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-950/50 border-b-4 border-[#025628] active:scale-95 transition-all text-xs sm:text-sm cursor-pointer min-h-[48px] flex items-center justify-center gap-2
                  ${balance < bet || bet < 5 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>APOSTAR & JOGAR</span>
              </button>
            ) : (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-slate-300 font-medium">
                Jogo em andamento... Selecione os quadros 💎
              </div>
            )}
          </div>

          {/* ARENA PRINCIPAL DO CAMPO MINADO */}
          <div className="lg:col-span-8 bg-[#0e1622]/80 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center justify-center min-h-[380px] sm:min-h-[480px] relative order-1 lg:order-2 backdrop-blur-sm">
            
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                  {gameState === 'PLAYING' ? `Em Jogo: ${revealedCount} Revelados` : 'Pronto para Iniciar'}
                </span>
              </div>
            </div>

            {/* 5x5 MINES GRID */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full max-w-[320px] sm:max-w-[420px] aspect-square relative z-10 my-auto">
              {grid.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => handleReveal(i)}
                  disabled={gameState !== 'PLAYING' || cell !== null}
                  className={`rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center text-2xl sm:text-3xl shadow-lg border-b-2 sm:border-b-4 relative overflow-hidden touch-manipulation min-h-[48px] cursor-pointer
                    ${cell === null ? 
                      'bg-[#162333] hover:bg-[#1f3247] hover:border-amber-500/50 active:scale-95 border-black/50 text-transparent' : 
                      cell === 'SAFE' ? 
                      'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-900 shadow-emerald-500/30 text-white animate-in zoom-in-50 duration-200' : 
                      'bg-gradient-to-br from-red-600 to-rose-700 border-red-950 shadow-red-500/30 text-white animate-in shake duration-300'}
                    ${gameState === 'ENDED' && cell === null && minesPositions.includes(i) ? 'bg-red-900/30 border-red-900/40 opacity-70' : ''}
                  `}
                >
                  {cell === 'SAFE' && (
                    <div className="flex flex-col items-center drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                      <span>💎</span>
                    </div>
                  )}
                  {cell === 'MINE' && (
                    <span className="drop-shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-bounce">💣</span>
                  )}
                  {gameState === 'ENDED' && cell === null && minesPositions.includes(i) && (
                    <span className="text-xs sm:text-sm opacity-50">💣</span>
                  )}
                </button>
              ))}
            </div>

            {/* GAME END RESULT BANNER */}
            {gameState === 'ENDED' && winStatus && (
              <div className="mt-4 w-full max-w-[420px] animate-in fade-in zoom-in duration-300">
                {winStatus === 'WIN' ? (
                  <div className="p-3 bg-gradient-to-r from-emerald-900/80 to-teal-900/80 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-emerald-950/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase text-emerald-300">VITÓRIA!</div>
                        <div className="text-[10px] text-slate-300">Multiplicador {currentMultiplier.toFixed(2)}x</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Prémio</span>
                      <span className="font-mono font-black text-emerald-400 text-sm sm:text-base">
                        +{lastWinAmount.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gradient-to-r from-red-950/80 to-rose-950/80 border border-red-500/40 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-red-950/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-300">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase text-red-300">DETONOU UMA MINA!</div>
                        <div className="text-[10px] text-slate-300">Atingiu uma bomba oculta</div>
                      </div>
                    </div>
                    <button
                      onClick={startGame}
                      disabled={balance < bet || bet < 5}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default MinesView;

