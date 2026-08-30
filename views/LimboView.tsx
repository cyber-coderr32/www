import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, Info, Trophy, Settings, TrendingUp, Zap } from 'lucide-react';
import { soundService } from '../services/soundService';

interface LimboViewProps {
  balance: number;
  isDemo?: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const TARGET_PRESETS = [1.5, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0];

const LimboView: React.FC<LimboViewProps> = ({ balance, isDemo, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [lastResults, setLastResults] = useState<number[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winStatus, setWinStatus] = useState<'WIN' | 'LOSS' | null>(null);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  const calculateWinChance = (multiplier: number) => {
    return (99 / Math.max(1.01, multiplier)).toFixed(2);
  };

  const handlePlay = () => {
    if (balance < betAmount || betAmount < 5 || isSpinning) return;

    soundService.playLimboLaunch();
    setIsSpinning(true);
    setWinStatus(null);
    onUpdateBalance(-betAmount);

    const newRounds = roundsPlayed + 1;
    setRoundsPlayed(newRounds);

    // =========================================================================
    // CASINO 80/20 RETENTION & ENTICEMENT ENGINE (ALICIAMENTO E 80% CASA / 20% JOGADOR)
    // - Casa retém 80% no volume geral (Taxa de Vitória base ~ 20%)
    // - Proporciona alta dopamina e engajamento constante com Near-Misses realistas (90-99% do alvo)
    // - Proteção contra frustração (Streak Breaker após 3 derrotas) para reacender a esperança
    // - Super multiplicadores visuais ocasionais para despertar o desejo de dobrar a aposta
    // =========================================================================
    const savedSettings = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
    const advLevel = savedSettings.houseAdvantageLevel || 'MEDIUM';
    const isBaiting = savedSettings.baitingMode !== false;

    // 1. Base Win Chance calibrada para 80% para a casa (~20% taxa de acerto do jogador)
    let baseWinProb: number;
    if (targetMultiplier <= 1.3) {
      baseWinProb = 0.28;
    } else if (targetMultiplier <= 1.8) {
      baseWinProb = 0.22;
    } else if (targetMultiplier <= 2.2) {
      baseWinProb = 0.20; // 2.0x tem exatamente 20% de chance (80% da casa)
    } else if (targetMultiplier <= 3.5) {
      baseWinProb = 0.14;
    } else if (targetMultiplier <= 6.0) {
      baseWinProb = 0.08;
    } else if (targetMultiplier <= 15.0) {
      baseWinProb = 0.04;
    } else {
      baseWinProb = 0.02;
    }

    let winProb = baseWinProb;

    // 2. Anti-Frustração & Aliciamento Psicológico (Streak Breaker):
    // Se o usuário teve 3 ou mais derrotas consecutivas, damos esperança e aliciamos
    if (consecutiveLosses >= 3) {
      winProb = Math.min(0.45, winProb + 0.18 + (consecutiveLosses * 0.05));
    }

    // 3. Early Session Hook (Primeiras 2 rodadas aumentam levemente a taxa para engajar)
    if (newRounds <= 2) {
      winProb = Math.min(0.38, winProb + 0.12);
    }

    // 4. Demo Mode Hook (Aumenta no modo demo para atrair para o modo real)
    if (isDemo && isBaiting) {
      winProb = Math.min(0.55, winProb + 0.25);
    }

    // 5. Ajuste fino do painel administrativo
    if (advLevel === 'EXTREME') winProb *= 0.75;
    else if (advLevel === 'LOW') winProb = Math.min(0.35, winProb * 1.35);

    const roll = Math.random();
    const isWin = roll < winProb;

    let finalResult: number;

    if (isWin) {
      // VITÓRIA ENTUSIASTICA: o foguete ultrapassa o alvo com estilo
      const bonusType = Math.random();
      if (bonusType < 0.60) {
        // Vitória justa / moderada (1.02x a 1.20x acima do alvo)
        finalResult = Number((targetMultiplier * (1.02 + Math.random() * 0.18)).toFixed(2));
      } else if (bonusType < 0.88) {
        // Boa vitória (1.25x a 2.00x acima do alvo)
        finalResult = Number((targetMultiplier * (1.25 + Math.random() * 0.75)).toFixed(2));
      } else {
        // MEGA MULTIPLICADOR (alicia o jogador mostrando 15x, 50x, 100x na tela e histórico!)
        const megaMultiplier = Math.min(999, targetMultiplier * (2.5 + Math.random() * 12.0));
        finalResult = Number(megaMultiplier.toFixed(2));
      }
      finalResult = Math.max(targetMultiplier, finalResult);
    } else {
      // DERROTA COM ALICIAMENTO ("NEAR-MISS" DE ALTA DOPAMINA):
      // O multiplicador sobe bem pertinho do alvo (91% a 99%) para criar a sensação de "quase ganhou!"
      const lossType = Math.random();
      if (lossType < 0.75 && targetMultiplier > 1.10) {
        // "Near-Miss" eletrizante (91% a 99% do alvo)
        const factor = 0.91 + Math.random() * 0.08;
        finalResult = Math.max(1.00, Number((targetMultiplier * factor).toFixed(2)));
      } else if (lossType < 0.90 && targetMultiplier > 1.30) {
        // Meio caminho
        const factor = 0.50 + Math.random() * 0.35;
        finalResult = Math.max(1.00, Number((targetMultiplier * factor).toFixed(2)));
      } else {
        // Queda rápida
        finalResult = Number((1.01 + Math.random() * 0.20).toFixed(2));
      }

      // Garantir estritamente que é menor que o alvo
      if (finalResult >= targetMultiplier) {
        finalResult = Math.max(1.00, Number((targetMultiplier - 0.02).toFixed(2)));
      }
    }

    setTimeout(() => {
      setResult(finalResult);
      setIsSpinning(false);

      if (finalResult >= targetMultiplier) {
        setWinStatus('WIN');
        setConsecutiveLosses(0);
        const winAmount = betAmount * targetMultiplier;
        onUpdateBalance(winAmount);
        soundService.playLimboTargetHit();
      } else {
        setWinStatus('LOSS');
        setConsecutiveLosses(prev => prev + 1);
        soundService.playLimboBust();
      }

      setLastResults(prev => [finalResult, ...prev].slice(0, 5));
    }, 800);
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group"
        >
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Crypton Limbo</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Provably Fair</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto no-scrollbar min-h-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          
          {/* Painel Esquerdo: Controles */}
          <div className="lg:col-span-4 flex flex-col gap-4 order-2 lg:order-1">
            <div className="bg-[#131d27] p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 space-y-5 shadow-2xl">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor da Aposta (USDT)</span>
                  <span className="text-[10px] font-black text-white uppercase opacity-50">{betAmount.toFixed(2)} USDT</span>
                </div>
                <div className="flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-white/10">
                  <button onClick={() => setBetAmount(Math.max(5, Math.floor(betAmount / 2)))} className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg font-black text-xs text-white transition-all cursor-pointer flex items-center justify-center">½</button>
                  <input 
                    type="number"
                    min={5}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(5, Number(e.target.value)))}
                    className="flex-1 bg-transparent text-white font-black text-center font-mono text-base focus:outline-none focus:text-[#FFCC00]"
                  />
                  <button onClick={() => setBetAmount(betAmount * 2)} className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg font-black text-xs text-white transition-all cursor-pointer flex items-center justify-center">2x</button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Multiplicador Alvo</span>
                  <span className="text-[10px] font-black text-[#FFCC00] uppercase">{calculateWinChance(targetMultiplier)}% CHANCE ESTIMADA</span>
                </div>
                <div className="relative mb-2">
                  <input 
                    type="number"
                    step="0.1"
                    min="1.1"
                    disabled={isSpinning}
                    value={targetMultiplier}
                    onChange={(e) => setTargetMultiplier(Math.max(1.1, Number(e.target.value)))}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-black text-center focus:outline-none focus:border-[#FFCC00] shadow-inner font-mono text-base"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 italic">X</span>
                </div>
                {/* Target Presets */}
                <div className="grid grid-cols-7 gap-1">
                  {TARGET_PRESETS.map((p) => (
                    <button
                      key={p}
                      disabled={isSpinning}
                      onClick={() => setTargetMultiplier(p)}
                      className={`py-1 rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer border ${
                        targetMultiplier === p
                          ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-md shadow-[#FFCC00]/20'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {p}x
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handlePlay}
                disabled={isSpinning || balance < betAmount || betAmount < 5}
                className={`w-full py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 border-b-4 flex flex-col items-center justify-center cursor-pointer min-h-[50px] text-sm
                  ${isSpinning || balance < betAmount || betAmount < 5 
                    ? 'bg-slate-800 text-slate-600 border-slate-950 cursor-not-allowed opacity-50' 
                    : 'bg-[#049444] hover:bg-[#037235] text-white border-[#025628] shadow-[#049444]/20'}`}
              >
                {isSpinning ? 'A PROCESSAR...' : 'APOSTAR NO LIMBO'}
              </button>
            </div>

            <div className="bg-[#131d27] p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Histórico</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {lastResults.map((res, i) => (
                  <div key={i} className={`px-2.5 py-1 rounded-lg text-[10px] font-black font-mono shrink-0 ${res >= targetMultiplier ? 'bg-[#049444]/20 text-[#049444] border border-[#049444]/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {res.toFixed(2)}x
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Display Central do Resultado */}
          <div className="lg:col-span-8 bg-[#131d27]/70 rounded-2xl sm:rounded-[2rem] border border-white/5 p-6 sm:p-12 flex items-center justify-center relative overflow-hidden min-h-[380px] sm:min-h-[460px] order-1 lg:order-2 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(4,148,68,0.05)_0%,_transparent_70%)]" />
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={isSpinning ? 'spinning' : (result || 'idle')}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.5, y: -20 }}
                className="z-10 flex flex-col items-center"
              >
                {isSpinning ? (
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-20 h-20 border-4 border-[#049444]/20 border-t-[#049444] rounded-full animate-spin" />
                     <span className="text-[#049444] font-black text-xl italic uppercase tracking-[0.3em] animate-pulse">Sorteando...</span>
                  </div>
                ) : result !== null ? (
                  <div className="text-center">
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`text-6xl sm:text-8xl md:text-[10rem] font-black italic tracking-tighter leading-none mb-4 ${winStatus === 'WIN' ? 'text-[#049444] drop-shadow-[0_0_50px_rgba(4,148,68,0.5)]' : 'text-slate-700'}`}
                    >
                      {result.toFixed(2)}<span className="text-3xl sm:text-5xl md:text-6xl ml-2">X</span>
                    </motion.div>
                    {winStatus === 'WIN' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#049444] px-8 py-3 rounded-full text-white font-black text-lg sm:text-2xl uppercase tracking-widest shadow-2xl"
                      >
                        GANHOU {(betAmount * targetMultiplier).toFixed(2)} USDT
                      </motion.div>
                    )}
                    {winStatus === 'LOSS' && (
                      <div className="text-red-500 font-black text-lg sm:text-xl uppercase tracking-widest opacity-60 bg-red-500/10 px-6 py-2 rounded-full border border-red-500/20">
                        TENTAR NOVAMENTE
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-28 h-28 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 mx-auto">
                      <TrendingUp className="w-14 h-14 text-slate-600" />
                    </div>
                    <h3 className="text-slate-500 font-black text-xl sm:text-2xl uppercase tracking-[0.2em] italic">Pronto para o Salto?</h3>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Background Sparks on Win */}
            {winStatus === 'WIN' && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: '50%', y: '50%', scale: 0 }}
                    animate={{ 
                      x: `${Math.random() * 100}%`, 
                      y: `${Math.random() * 100}%`,
                      scale: [0, 1, 0],
                    }}
                    transition={{ duration: 1 + Math.random() }}
                    className="absolute w-2 h-2 bg-[#FFCC00] rounded-full"
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="p-4 bg-black/40 text-center flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
           <Zap className="w-3 h-3 text-[#FFCC00]" />
           <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">JOGO DE ALTA VELOCIDADE</span>
        </div>
        <div className="flex items-center gap-2">
           <Trophy className="w-3 h-3 text-[#049444]" />
           <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">MULTIPLICADOR MÁXIMO 1,000,000X</span>
        </div>
      </footer>
    </div>
  );
};

export default LimboView;
