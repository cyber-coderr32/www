import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, Trophy, Sparkles, Zap, Shield, Repeat } from 'lucide-react';
import { soundService } from '../services/soundService';

interface PokerViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const CARDS = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'
];
const SUITS = ['♠', '♣', '♥', '♦'];
const getSuitColor = (suit: string) => {
  if (suit === '♥') return 'suit-heart text-[#e11d48]';
  if (suit === '♦') return 'suit-diamond text-[#0284c7]';
  if (suit === '♣') return 'suit-club text-[#059669]';
  return 'suit-spade text-[#0f172a]';
};

const PokerView: React.FC<PokerViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [hand, setHand] = useState<{ value: string, suit: string }[]>([]);
  const [held, setHeld] = useState<boolean[]>(new Array(5).fill(false));
  const [gameState, setGameState] = useState<'IDLE' | 'DEALT' | 'FINISHED'>('IDLE');
  const [winMessage, setWinMessage] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState<number>(0);

  const getRandomCard = () => ({
    value: CARDS[Math.floor(Math.random() * CARDS.length)],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)]
  });

  const deal = () => {
    if (balance < betAmount || betAmount < 5 || gameState === 'DEALT') return;
    
    if (gameState === 'IDLE' || gameState === 'FINISHED') {
      onUpdateBalance(-betAmount);
      const newHand = Array.from({ length: 5 }, getRandomCard);
      setHand(newHand);
      setHeld(new Array(5).fill(false));
      setGameState('DEALT');
      setWinMessage(null);
      soundService.playCardSlide();
    }
  };

  const draw = () => {
    if (gameState !== 'DEALT') return;

    const newHand = hand.map((card, i) => held[i] ? card : getRandomCard());
    setHand(newHand);
    setGameState('FINISHED');
    soundService.playCardSlide();

    // Basic Hand Recognition (Simplified)
    checkHand(newHand);
  };

  const checkHand = (finalHand: { value: string, suit: string }[]) => {
    const values = finalHand.map(c => c.value);
    const counts: Record<string, number> = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    
    const frequencies = Object.values(counts);
    let message = 'NADA';
    let multiplier = 0;

    if (frequencies.includes(4)) { message = 'QUADRA'; multiplier = 25; }
    else if (frequencies.includes(3) && frequencies.includes(2)) { message = 'FULL HOUSE'; multiplier = 9; }
    else if (frequencies.includes(3)) { message = 'TRINCA'; multiplier = 3; }
    else if (frequencies.filter(f => f === 2).length === 2) { message = 'DOIS PARES'; multiplier = 2; }
    else if (frequencies.includes(2)) { message = 'UM PAR'; multiplier = 1; }

    if (multiplier > 0) {
      setWinAmount(betAmount * multiplier);
      onUpdateBalance(betAmount * multiplier);
      setWinMessage(message);
      soundService.playSlotJackpot();
    } else {
      setWinAmount(0);
      setWinMessage('TENTE NOVAMENTE');
      soundService.playDiceLoss();
    }
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] flex flex-col font-sans overflow-hidden text-white">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1" />
        </button>
        <div className="flex flex-col items-center">
           <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em] mb-1">Video Poker Pro</span>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jacks or Better</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-6 items-center justify-center relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(4,148,68,0.05)_0%,_transparent_70%)]" />

         {/* Payout Table */}
         <div className="w-full max-w-lg bg-[#131d27] p-4 rounded-3xl border border-white/5 flex justify-between gap-2 overflow-x-auto no-scrollbar relative z-10">
            {['PAR(1x)', '2 PARES(2x)', 'TRINCA(3x)', 'FULL(9x)', 'QUADRA(25x)'].map(p => (
              <div key={p} className="px-3 py-1 bg-black/40 rounded-lg text-[9px] font-black text-slate-500 whitespace-nowrap">{p}</div>
            ))}
         </div>

         {/* Hand Area */}
         <div className="flex gap-2 relative z-10">
            {Array.from({ length: 5 }).map((_, i) => {
              const card = hand[i];
              return (
                <motion.div 
                  key={i}
                  onClick={() => gameState === 'DEALT' && setHeld(prev => {
                     const n = [...prev]; n[i] = !n[i]; return n;
                  })}
                  className={`w-16 h-24 md:w-28 md:h-44 rounded-xl md:rounded-2xl border-4 transition-all cursor-pointer flex flex-col items-center justify-center relative
                    ${card ? 'bg-white font-black border-black/10 playing-card' : 'bg-black/40 border-dashed border-white/5'}
                    ${held[i] ? 'ring-4 ring-[#FFCC00] ring-offset-4 ring-offset-[#0b0e11] scale-105' : ''}`}
                  initial={{ rotateY: 180 }}
                  animate={{ rotateY: card ? 0 : 180 }}
                >
                   {card ? (
                     <>
                       <span className={`absolute top-2 left-2 text-sm md:text-xl font-black ${getSuitColor(card.suit)}`}>{card.value}</span>
                       <span className={`text-3xl md:text-6xl ${getSuitColor(card.suit)}`}>{card.suit}</span>
                       <span className={`absolute bottom-2 right-2 text-sm md:text-xl font-black rotate-180 ${getSuitColor(card.suit)}`}>{card.value}</span>
                       {held[i] && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#FFCC00] text-black px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">HELD</div>
                       )}
                     </>
                   ) : (
                     <Sparkles className="w-10 h-10 opacity-10" />
                   )}
                </motion.div>
              );
            })}
         </div>

         {/* Win Feedback */}
         <AnimatePresence>
            {winMessage && (
               <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className={`z-20 text-center space-y-2`}
               >
                  <h3 className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase ${winAmount > 0 ? 'text-[#049444]' : 'text-slate-600'}`}>{winMessage}</h3>
                  {winAmount > 0 && <span className="text-xl font-black text-[#FFCC00] tracking-widest">{winAmount.toFixed(2)} USDT GANHADOS</span>}
               </motion.div>
            )}
         </AnimatePresence>

         {/* Betting & Actions */}
         <div className="w-full max-w-sm bg-[#131d27] p-6 rounded-[2.5rem] border border-white/5 space-y-6 relative z-10">
            <div className="flex items-center gap-4 bg-black/60 p-2 rounded-2xl border border-white/5">
              <button onClick={() => setBetAmount(Math.max(5, betAmount - 5))} className="w-12 h-12 bg-slate-800 rounded-xl font-black text-xl hover:bg-slate-700 transition cursor-pointer">-</button>
              <div className="flex-1 text-center">
                 <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Aposta</span>
                 <span className="font-black text-2xl text-white">{betAmount} USDT</span>
              </div>
              <button onClick={() => setBetAmount(betAmount + 5)} className="w-12 h-12 bg-slate-800 rounded-xl font-black text-xl hover:bg-slate-700 transition cursor-pointer">+</button>
            </div>

            {gameState === 'DEALT' ? (
              <button 
                onClick={draw}
                className="w-full py-5 bg-[#FFCC00] hover:bg-[#FFD700] text-black rounded-3xl font-black text-2xl uppercase tracking-widest border-b-8 border-[#ccaa00] shadow-2xl active:scale-95"
              >
                 TROCAR CARTAS
              </button>
            ) : (
              <button 
                onClick={deal}
                disabled={balance < betAmount}
                className="w-full py-5 bg-[#049444] hover:bg-[#037235] text-white rounded-3xl font-black text-2xl uppercase tracking-widest border-b-8 border-[#025628] shadow-2xl active:scale-95"
              >
                 DAR CARTAS
              </button>
            )}
         </div>
      </main>

      <footer className="p-4 bg-black/40 text-center">
         <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
            Baralho RNG Aleatório • Prémio Máximo 25x • Sorte em Luanda
         </p>
      </footer>
    </div>
  );
};

export default PokerView;
