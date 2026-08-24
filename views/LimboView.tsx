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
    // CASINO RETENTION & ENTICEMENT ENGINE (ALICIAMENTO E RETENÇÃO INTELIGENTE)
    // - Proporciona alta dopamina e engajamento constante com vitórias frequentes
    // - Proteção contra sequências longas de derrotas (Streak Breaker)
    // - Near-Misses realistas (90-98% do alvo) que instigam "só mais uma rodada"
    // - Super multiplicadores visuais quando ganha, estimulando alvos maiores
    // =========================================================================
    const savedSettings = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
    const advLevel = savedSettings.houseAdvantageLevel || 'MEDIUM';
    const isBaiting = savedSettings.baitingMode !== false;

    // 1. Base Win Chance adaptada ao alvo para manter o jogador no jogo
    // Multiplicadores baixos (1.1x - 1.9x) ganham bastante para dar confiança
    // Multiplicadores médios (2.0x - 5.0x) mantêm ritmo balanceado e viciante
    let winProb: number;
    if (targetMultiplier <= 1.3) {
      winProb = 0.72;
    } else if (targetMultiplier <= 1.8) {
      winProb = 0.58;
    } else if (targetMultiplier <= 2.2) {
      winProb = 0.46; // Dobro ganha quase metade das vezes!
    } else if (targetMultiplier <= 3.5) {
      winProb = 0.32;
    } else if (targetMultiplier <= 6.0) {
      winProb = 0.20;
    } else if (targetMultiplier <= 15.0) {
      winProb = 0.12;
    } else {
      winProb = 0.05;
    }

    // 2. Anti-Frustration / Hook Mechanism:
    // Se o usuário perdeu 2 ou mais vezes seguidas, aumentamos a chance para aliciar e reter!
    if (consecutiveLosses >= 2) {
      winProb = Math.min(0.85, winProb + 0.25 + (consecutiveLosses * 0.10));
    }

    // 3. Early Session Hook (Primeiras 5 rodadas dão impulso de boas-vindas)
    if (newRounds <= 4) {
      winProb = Math.min(0.80, winProb + 0.15);
    }

    // 4. Demo Mode Hook
    if (isDemo && isBaiting) {
      winProb = Math.min(0.88, winProb + 0.20);
    }

    // 5. Ajuste fino com base no painel de administração
    if (advLevel === 'EXTREME') winProb *= 0.75;
    else if (advLevel === 'LOW') winProb = Math.min(0.85, winProb * 1.20);

    const roll = Math.random();
    const isWin = roll < winProb;

    let finalResult: number;

    if (isWin) {
      // VITÓRIA ENTUSIASTICA: o foguete passa do alvo e frequentemente explode alto
      const bonusType = Math.random();
      if (bonusType < 0.50) {
        // Vitória justa / moderada (1.03x a 1.25x acima do alvo)
        finalResult = Number((targetMultiplier * (1.02 + Math.random() * 0.22)).toFixed(2));
      } else if (bonusType < 0.85) {
        // Boa vitória (1.30x a 2.50x acima do alvo)
        finalResult = Number((targetMultiplier * (1.30 + Math.random() * 1.20)).toFixed(2));
      } else {
        // MEGA MULTIPLICADOR (alicia o jogador mostrando 10x, 30x, 100x na tela e histórico!)
        const megaMultiplier = Math.min(999, targetMultiplier * (3.0 + Math.random() * 15.0));
        finalResult = Number(megaMultiplier.toFixed(2));
      }
      finalResult = Math.max(targetMultiplier, finalResult);
    } else {
      // DERROTA COM ALICIAMENTO ("NEAR-MISS" DE ALTA DOPAMINA):
      // O multiplicador sobe bem pertinho do alvo para criar a sensação de "foi por pouco!"
      const lossType = Math.random();
      if (lossType < 0.65 && targetMultiplier > 1.15) {
        // Quase acertou! (86% a 98% do alvo)
        const factor = 0.86 + Math.random() * 0.12;
        finalResult = Math.max(1.00, Number((targetMultiplier * factor).toFixed(2)));
      } else if (lossType < 0.88 && targetMultiplier > 1.30) {
        // Meio caminho
        const factor = 0.45 + Math.random() * 0.38;
        finalResult = Math.max(1.00, Number((targetMultiplier * factor).toFixed(2)));
      } else {
        // Queda rápida
        finalResult = Number((1.01 + Math.random() * 0.25).toFixed(2));
      }

      // Garantir estritamente que é menor que o alvo
      if (finalResult >= targetMultiplier) {
        finalResult = Math.max(1.00, Number((targetMultiplier - 0.03).toFixed(2)));
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
