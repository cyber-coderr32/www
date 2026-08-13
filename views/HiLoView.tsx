import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, TrendingUp, Sparkles, Zap, Trophy, Timer, ChevronUp, ChevronDown } from 'lucide-react';
import { soundService } from '../services/soundService';

interface HiLoViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const CARDS = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'
];

const SUITS = ['♠', '♥', '♦', '♣'];
const getSuitColor = (suit: string) => {
  if (suit === '♥') return 'suit-heart text-[#e11d48]';
  if (suit === '♦') return 'suit-diamond text-[#0284c7]';
  if (suit === '♣') return 'suit-club text-[#059669]';
  return 'suit-spade text-[#0f172a]';
};

const CARD_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const HiLoView: React.FC<HiLoViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [currentCard, setCurrentCard] = useState('8');
  const [currentSuit, setCurrentSuit] = useState('♥');
  const [nextCard, setNextCard] = useState<string | null>(null);
  const [nextSuit, setNextSuit] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [winStatus, setWinStatus] = useState<'WIN' | 'LOSS' | null>(null);
  const [history, setHistory] = useState<{val: string, suit: string}[]>([]);
  const [gameActive, setGameActive] = useState(false);

  const getRandomCard = () => CARDS[Math.floor(Math.random() * CARDS.length)];
  const getRandomSuit = () => SUITS[Math.floor(Math.random() * SUITS.length)];

  // Probabilities calculation
  const currentVal = CARD_VALUES[currentCard];
  const hiProb = ((14 - currentVal + 1) / 13) * 100;
  const loProb = ((currentVal - 2 + 1) / 13) * 100;

  const startNewGame = () => {
    if (balance < betAmount || betAmount < 5 || gameActive) return;
    onUpdateBalance(-betAmount);
    setGameActive(true);
    setMultiplier(1.0);
    setWinStatus(null);
    setCurrentCard(getRandomCard());
    setCurrentSuit(getRandomSuit());
    setHistory([]);
    soundService.playUISelect();
  };

  const handleGuess = (guess: 'HI' | 'LO') => {
    if (!gameActive || isSpinning) return;
    
    setIsSpinning(true);
    soundService.playTick();
    
    const next = getRandomCard();
    const nextS = getRandomSuit();
    setNextCard(next);
    setNextSuit(nextS);

    setTimeout(() => {
      const nextVal = CARD_VALUES[next];
      
      let won = false;
      if (guess === 'HI') {
        won = nextVal >= currentVal;
      } else {
        won = nextVal <= currentVal;
      }

      if (won) {
        setWinStatus('WIN');
        const diff = guess === 'HI' ? (15 - currentVal) : (currentVal - 1);
        const addedMult = 1.1 + (1.5 * (1 - (diff / 13)));
        setMultiplier(prev => prev * addedMult);
        soundService.playWin();
      } else {
        setWinStatus('LOSS');
        setGameActive(false);
        soundService.playLoss();
      }

      setHistory(prev => [{val: currentCard, suit: currentSuit}, ...prev].slice(0, 10));
      setCurrentCard(next);
      setCurrentSuit(nextS);
      setNextCard(null);
      setNextSuit(null);
      setIsSpinning(false);
    }, 1000);
  };

  const cashout = () => {
    if (!gameActive || multiplier <= 1.0) return;
    const win = betAmount * multiplier;
    onUpdateBalance(win);
    setGameActive(false);
    setWinStatus(null);
    soundService.playWin();
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Hi-Lo Premium</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Adivinha a Carta</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-3 sm:p-4 gap-3 sm:gap-4 overflow-y-auto no-scrollbar min-h-0">
        {/* Painel de Controle */}
        <div className="w-full md:w-80 flex flex-col gap-3 shrink-0">
           <div className="bg-[#131d27] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 space-y-3 sm:space-y-6">
              {!gameActive ? (
                <>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-3 block">Aposta</span>
                    <div className="flex items-center gap-2 bg-black/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5">
                       <button onClick={() => setBetAmount(Math.max(5, betAmount - 5))} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-white cursor-pointer flex items-center justify-center text-base sm:text-lg">-</button>
                       <input
                         type="number"
                         min={5}
                         value={betAmount}
                         onChange={e => setBetAmount(Math.max(5, Number(e.target.value)))}
                         className="flex-1 bg-transparent text-center font-black text-sm sm:text-lg text-white font-mono outline-none"
                       />
                       <button onClick={() => setBetAmount(betAmount + 5)} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-white cursor-pointer flex items-center justify-center text-base sm:text-lg">+</button>
                    </div>
                  </div>
                  <button 
                    onClick={startNewGame}
                    disabled={balance < betAmount || betAmount < 5}
                    className={`w-full py-3.5 sm:py-5 rounded-xl sm:rounded-3xl font-black text-sm sm:text-xl uppercase tracking-widest border-b-4 sm:border-b-8 shadow-2xl cursor-pointer min-h-[48px] ${balance < betAmount || betAmount < 5 ? 'bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed' : 'bg-[#049444] text-white border-[#025628] shadow-[#049444]/20'}`}
                  >
                    INICIAR JOGO
                  </button>
                </>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                   <div className="text-center p-3 sm:p-4 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/5">
                      <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Multiplicador Atual</span>
                      <span className="text-2xl sm:text-4xl font-black text-[#FFCC00] italic">{multiplier.toFixed(2)}x</span>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      <button 
                        onClick={() => handleGuess('HI')}
                        disabled={isSpinning}
                        className="group py-3.5 sm:py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl sm:rounded-2xl font-black flex items-center justify-between px-4 sm:px-8 border-b-4 border-blue-800 transition-all active:translate-y-1 cursor-pointer min-h-[52px]"
                      >
                         <div className="flex flex-col items-start">
                            <span className="uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[8px] sm:text-[10px] opacity-70">Maior ou Igual</span>
                            <span className="text-sm sm:text-xl font-mono">{(betAmount * multiplier * (11 / 13)).toFixed(2)} USDT</span>
                         </div>
                         <div className="flex flex-col items-center">
                            <ChevronUp className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-y-[-4px] transition-transform" />
                            <span className="text-[9px] sm:text-[10px] font-mono opacity-50">{hiProb.toFixed(0)}%</span>
                         </div>
                      </button>
                      <button 
                        onClick={() => handleGuess('LO')}
                        disabled={isSpinning}
                        className="group py-3.5 sm:py-6 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-2xl font-black flex items-center justify-between px-4 sm:px-8 border-b-4 border-red-800 transition-all active:translate-y-1 cursor-pointer min-h-[52px]"
                      >
                         <div className="flex flex-col items-start">
                            <span className="uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[8px] sm:text-[10px] opacity-70">Menor ou Igual</span>
                            <span className="text-sm sm:text-xl font-mono">{(betAmount * multiplier * (11 / 13)).toFixed(2)} USDT</span>
                         </div>
                         <div className="flex flex-col items-center">
                            <ChevronDown className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-y-[4px] transition-transform" />
                            <span className="text-[9px] sm:text-[10px] font-mono opacity-50">{loProb.toFixed(0)}%</span>
                         </div>
                      </button>
                   </div>

                   <button 
                    onClick={cashout}
                    className="w-full py-3.5 sm:py-5 bg-[#FFCC00] text-black rounded-xl sm:rounded-2xl font-black text-sm sm:text-xl uppercase tracking-widest border-b-4 border-[#ccaa00] cursor-pointer min-h-[48px]"
                   >
                     RECOLHER {(betAmount * multiplier).toFixed(2)} USDT
                   </button>
                </div>
              )}
           </div>

           <div className="bg-[#131d27] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 sm:mb-3">Histórico de Cartas</span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                 {history.map((card, i) => (
                    <div key={i} className={`min-w-[36px] sm:min-w-[44px] h-11 sm:h-14 bg-white rounded-lg flex flex-col items-center justify-center font-black border border-white/10 shadow-lg playing-card ${getSuitColor(card.suit)}`}>
                      <span className="text-[10px] sm:text-xs leading-none">{card.val}</span>
                      <span className="text-xs sm:text-sm leading-none">{card.suit}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Mesa de Jogo */}
        <div className="flex-1 bg-[#131d27]/40 rounded-2xl sm:rounded-[3rem] border border-white/5 relative flex items-center justify-center p-4 sm:p-8 min-h-[260px] sm:min-h-0 overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(4,148,68,0.05)_0%,_transparent_70%)]" />
            
            <div className="relative z-10 flex flex-row items-center gap-4 sm:gap-8 md:gap-12 my-auto">
                {/* Last Card */}
                <motion.div 
                  className={`w-28 h-40 sm:w-40 sm:h-56 md:w-56 md:h-80 bg-white rounded-2xl md:rounded-[2rem] shadow-2xl flex flex-col justify-between p-3 sm:p-4 md:p-6 border-4 md:border-[8px] border-black/5 relative overflow-hidden playing-card ${getSuitColor(currentSuit)}`}
                  animate={winStatus === 'LOSS' ? { rotate: [0, 10, -10, 0, 10, -10, 0], opacity: [1, 0.5, 1] } : {}}
                >
                   <div className="absolute top-2 right-4 text-4xl opacity-5 select-none">{currentSuit}</div>
                   <div className="flex justify-between items-start">
                      <span className="text-3xl md:text-5xl font-black">{currentCard}</span>
                      <span className="text-2xl md:text-4xl">{currentSuit}</span>
                   </div>
                   <div className="flex-1 flex items-center justify-center">
                      <div className="text-6xl md:text-9xl opacity-10 font-black">{currentCard}</div>
                   </div>
                   <div className="flex justify-between items-end rotate-180">
                      <span className="text-3xl md:text-5xl font-black">{currentCard}</span>
                      <span className="text-2xl md:text-4xl">{currentSuit}</span>
                   </div>
                </motion.div>

                {/* Indicator */}
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#FFCC00] rounded-full flex items-center justify-center shadow-lg animate-pulse z-20 shrink-0">
                   <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-black" />
                </div>

                {/* Next Card (Placeholder) */}
                <div className="w-32 h-44 sm:w-40 sm:h-56 md:w-56 md:h-80 bg-black/40 rounded-[1.5rem] md:rounded-[2rem] border-4 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
                   <AnimatePresence mode="wait">
                     {(isSpinning || nextCard) ? (
                        <motion.div 
                          initial={{ y: 300, scale: 0.5, rotateY: 180 }}
                          animate={{ y: 0, scale: 1, rotateY: 0 }}
                          exit={{ y: -300, scale: 0.8, opacity: 0 }}
                          className={`w-full h-full bg-white flex flex-col justify-between p-4 md:p-6 playing-card ${getSuitColor(nextSuit || '')}`}
                        >
                           <div className="flex justify-between items-start">
                              <span className="text-3xl md:text-5xl font-black">{nextCard}</span>
                              <span className="text-2xl md:text-4xl">{nextSuit}</span>
                           </div>
                           <div className="flex-1 flex items-center justify-center">
                              <div className="w-12 h-12 md:w-16 md:h-16 border-[6px] md:border-[8px] border-current rounded-full border-t-transparent animate-spin opacity-20" />
                           </div>
                           <div className="flex justify-between items-end rotate-180">
                              <span className="text-3xl md:text-5xl font-black">{nextCard}</span>
                              <span className="text-2xl md:text-4xl">{nextSuit}</span>
                           </div>
                        </motion.div>
                     ) : (
                        <div className="flex flex-col items-center gap-2 opacity-20">
                           <span className="text-slate-600 font-black text-4xl md:text-6xl italic select-none">?</span>
                           <span className="text-slate-600 font-black text-[8px] md:text-[10px] uppercase tracking-widest italic">Aguardando</span>
                        </div>
                     )}
                   </AnimatePresence>
                </div>
            </div>

            {/* Status Overlays */}
            {winStatus === 'WIN' && !isSpinning && (
               <motion.div 
                 initial={{ scale: 0 }} animate={{ scale: 1 }}
                 className="absolute top-10 flex items-center gap-4 bg-[#049444] px-8 py-3 rounded-full text-white font-black text-2xl shadow-2xl"
               >
                  <Sparkles /> BOM PALPITE!
               </motion.div>
            )}
        </div>
      </main>

      <footer className="p-4 bg-black/40 text-center">
         <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest flex items-center justify-center gap-4">
            <span>BARALHO INFINITO</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full" />
            <span>97.5% RTP</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full" />
            <span>JUSTIÇA PROVÁVEL</span>
         </p>
      </footer>
    </div>
  );
};

export default HiLoView;
