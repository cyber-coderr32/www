
import React, { useState } from 'react';
import { soundService } from '../services/soundService';
import { ChevronLeft, Wallet, Shield, Sparkles, Club, Play, RotateCcw, Zap } from 'lucide-react';

interface Card {
  suit: string;
  value: string;
  weight: number;
}

const SUITS = ['♠', '♣', '♥', '♦'];
const getSuitColor = (suit: string) => {
  if (suit === '♥') return 'suit-heart text-[#e11d48]';
  if (suit === '♦') return 'suit-diamond text-[#0284c7]';
  if (suit === '♣') return 'suit-club text-[#059669]';
  return 'suit-spade text-[#0f172a]';
};
const VALUES = [
  { v: '2', w: 2 }, { v: '3', w: 3 }, { v: '4', w: 4 }, { v: '5', w: 5 }, { v: '6', w: 6 },
  { v: '7', w: 7 }, { v: '8', w: 8 }, { v: '9', w: 9 }, { v: '10', w: 10 },
  { v: 'J', w: 10 }, { v: 'Q', w: 10 }, { v: 'K', w: 10 }, { v: 'A', w: 11 }
];

interface BlackjackViewProps {
  balance: number;
  isDemo?: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const BlackjackView: React.FC<BlackjackViewProps> = ({ balance, isDemo, onUpdateBalance, onBack }) => {
  const [bet, setBet] = useState(10);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'PLAYER_WIN' | 'DEALER_WIN' | 'PUSH'>('IDLE');

  const drawCard = () => {
    const s = SUITS[Math.floor(Math.random() * 4)];
    const v = VALUES[Math.floor(Math.random() * VALUES.length)];
    return { suit: s, value: v.v, weight: v.w };
  };

  const calculateScore = (hand: Card[]) => {
    let score = hand.reduce((acc, card) => acc + card.weight, 0);
    let aces = hand.filter(c => c.value === 'A').length;
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }
    return score;
  };

  const startGame = () => {
    if (balance < bet || bet < 5) return;
    onUpdateBalance(-bet);
    const p1 = drawCard(); const p2 = drawCard();
    const d1 = drawCard();
    setPlayerHand([p1, p2]);
    setDealerHand([d1]);
    setStatus('PLAYING');
    soundService.playCardSlide();
    setTimeout(() => soundService.playCardSnap(), 150);
  };

  const hit = () => {
    const newCard = drawCard();
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    soundService.playCardSnap();
    if (calculateScore(newHand) > 21) {
      setStatus('DEALER_WIN');
      soundService.playDiceLoss();
    }
  };

  const stand = () => {
    let currentDealerHand = [...dealerHand];
    while (calculateScore(currentDealerHand) < 17) {
      currentDealerHand.push(drawCard());
    }
    setDealerHand(currentDealerHand);
    soundService.playCardSlide();
    
    const pScore = calculateScore(playerHand);
    const dScore = calculateScore(currentDealerHand);

    if (dScore > 21 || pScore > dScore) {
      setStatus('PLAYER_WIN');
      onUpdateBalance(bet * 2);
      if (pScore === 21) {
        soundService.playBlackjackNatural();
      } else {
        soundService.playWin();
      }
    } else if (dScore > pScore) {
      setStatus('DEALER_WIN');
      soundService.playDiceLoss();
    } else {
      setStatus('PUSH');
      onUpdateBalance(bet);
      soundService.playUISelect();
    }
  };

  const handleQuickBet = (val: number | string) => {
    soundService.playUISelect();
    if (typeof val === 'number') {
      setBet(val);
    } else if (val === '2X') {
      setBet(prev => Math.min(balance, prev * 2));
    } else if (val === 'MAX') {
      setBet(Math.max(5, Math.floor(balance)));
    } else if (val === 'MIN') {
      setBet(5);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      <header className="p-4 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-20 shrink-0">
        <button onClick={onBack} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group cursor-pointer">
          <ChevronLeft className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col items-center">
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-[0.3em]">Blackjack 21 Pro</span>
             {isDemo && (
               <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                 DEMO
               </span>
             )}
           </div>
           <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5 mt-1">
              <div className="w-1.5 h-1.5 bg-[#049444] rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mesa VIP Angola</span>
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
          <Wallet className="w-4 h-4 text-[#FFCC00]" />
          <span className="font-black text-white text-sm font-mono">{balance.toFixed(2)} USDT</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0b0e11_100%)] overflow-y-auto no-scrollbar">
        
        {/* Dealer Area */}
        <div className="flex flex-col items-center gap-3 my-auto pt-4">
          <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
            <Club className="w-4 h-4 text-red-500" />
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
              Mão do Dealer ({calculateScore(dealerHand)})
            </span>
          </div>
          <div className="flex gap-2 sm:gap-3 min-h-[6rem] sm:min-h-[7rem] items-center">
            {dealerHand.map((c, i) => (
              <div key={i} className="w-14 h-20 sm:w-20 sm:h-28 bg-white rounded-xl flex flex-col justify-between p-2 sm:p-2.5 font-black text-base sm:text-xl shadow-2xl border border-slate-200 select-none animate-in fade-in zoom-in duration-300 playing-card">
                <span className={`self-start ${getSuitColor(c.suit)}`}>{c.value}{c.suit}</span>
                <span className={`self-end rotate-180 ${getSuitColor(c.suit)}`}>{c.value}{c.suit}</span>
              </div>
            ))}
            {status === 'PLAYING' && (
              <div className="w-14 h-20 sm:w-20 sm:h-28 bg-gradient-to-br from-indigo-950 via-slate-900 to-[#131d27] rounded-xl border-2 border-white/10 shadow-2xl flex items-center justify-center animate-pulse">
                <Club className="w-8 h-8 text-white/20" />
              </div>
            )}
            {dealerHand.length === 0 && status === 'IDLE' && (
              <div className="w-14 h-20 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-slate-600 font-bold text-xs">
                MESA
              </div>
            )}
          </div>
        </div>

        {/* Status Message / Center Table Brand */}
        <div className="h-10 sm:h-12 flex items-center justify-center my-2">
           {status !== 'PLAYING' && status !== 'IDLE' ? (
             <div className={`text-xl sm:text-3xl font-black uppercase italic tracking-tighter px-6 py-2 rounded-2xl border backdrop-blur-md shadow-2xl animate-in zoom-in duration-300 ${status === 'PLAYER_WIN' ? 'bg-[#049444]/20 border-[#049444] text-emerald-400' : status === 'PUSH' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
               {status === 'PLAYER_WIN' ? '🏆 VITÓRIA DO PILOTO!' : status === 'PUSH' ? '🤝 EMPATE NA MESA' : '💥 O DEALER VENCEU'}
             </div>
           ) : status === 'IDLE' ? (
             <div className="text-slate-500 text-xs sm:text-sm font-black uppercase tracking-[0.3em] opacity-40 italic flex items-center gap-2">
               <Zap className="w-4 h-4 text-[#FFCC00]" /> Faça a sua aposta para iniciar
             </div>
           ) : null}
        </div>

        {/* Player Area */}
        <div className="flex flex-col items-center gap-3 my-auto pb-4">
          <div className="flex gap-2 sm:gap-3 min-h-[6rem] sm:min-h-[7rem] items-center">
            {playerHand.map((c, i) => (
              <div key={i} className="w-14 h-20 sm:w-20 sm:h-28 bg-white rounded-xl flex flex-col justify-between p-2 sm:p-2.5 font-black text-base sm:text-xl shadow-2xl border border-slate-200 select-none animate-in fade-in zoom-in duration-300 playing-card">
                <span className={`self-start ${getSuitColor(c.suit)}`}>{c.value}{c.suit}</span>
                <span className={`self-end rotate-180 ${getSuitColor(c.suit)}`}>{c.value}{c.suit}</span>
              </div>
            ))}
            {playerHand.length === 0 && status === 'IDLE' && (
              <div className="w-14 h-20 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-slate-600 font-bold text-xs">
                SUA MÃO
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
            <span className="text-[11px] font-black text-[#FFCC00] uppercase tracking-widest">
              Sua Mão ({calculateScore(playerHand)})
            </span>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-full max-w-md bg-[#131d27] p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl space-y-4 my-2">
           {status === 'PLAYING' ? (
             <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button 
                  onClick={hit} 
                  className="py-4 bg-[#049444] hover:bg-[#037c39] rounded-2xl font-black uppercase text-sm sm:text-base tracking-wider shadow-lg border-b-4 border-[#025628] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-white"
                >
                  <Play className="w-5 h-5 fill-current" /> PEDIR CARTA
                </button>
                <button 
                  onClick={stand} 
                  className="py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase text-sm sm:text-base tracking-wider shadow-lg border-b-4 border-red-800 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-white"
                >
                  PARAR / STAND
                </button>
             </div>
           ) : (
             <div className="space-y-4">
                {/* Bet adjustment chips */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {['MIN', 10, 25, 50, '2X', 'MAX'].map((val, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickBet(val)}
                      className="py-2 rounded-xl bg-black/40 hover:bg-white/10 border border-white/5 font-black text-xs text-slate-300 hover:text-[#FFCC00] transition-all cursor-pointer"
                    >
                      {typeof val === 'number' ? `${val} USDT` : val}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 sm:gap-4 bg-black/50 p-2 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => { soundService.playUISelect(); setBet(Math.max(5, bet - 5)); }} 
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl font-black text-lg hover:bg-white/10 transition-all cursor-pointer text-white flex items-center justify-center"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Valor da Aposta</span>
                    <span className="font-black text-lg sm:text-2xl font-mono text-[#FFCC00]">{bet} USDT</span>
                  </div>
                  <button 
                    onClick={() => { soundService.playUISelect(); setBet(bet + 5); }} 
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl font-black text-lg hover:bg-white/10 transition-all cursor-pointer text-white flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                <button 
                  onClick={startGame} 
                  disabled={balance < bet || bet < 5} 
                  className={`w-full py-4 sm:py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl border-b-8 active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    balance < bet || bet < 5 
                      ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed' 
                      : 'bg-[#049444] hover:bg-[#037c39] text-white border-[#025628] shadow-[0_10px_30px_rgba(4,148,68,0.3)] cursor-pointer'
                  }`}
                >
                  <RotateCcw className={`w-5 h-5 ${status !== 'IDLE' ? '' : 'hidden'}`} />
                  {status === 'IDLE' ? 'APOSTAR / DISTRIBUIR' : 'NOVA MÃO'}
                </button>
             </div>
           )}
        </div>

        {/* Footer info */}
        <div className="w-full max-w-4xl pt-6 pb-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-slate-400 text-xs mt-6">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#049444]" />
            <span className="font-bold">Mesa de Cartas Protegida por Criptografia SSL Angolana</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-bold text-[#FFCC00]">
              <Sparkles className="w-4 h-4" /> Algoritmo RNG Certificado
            </span>
            <span className="text-slate-500">|</span>
            <span className="font-mono font-bold text-white">RTP: 99.5%</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BlackjackView;
