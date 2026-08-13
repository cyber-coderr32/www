
import React, { useState, useEffect, useRef } from 'react';
import { soundService } from '../services/soundService';

interface PlinkoViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
type RiskType = typeof RISK_LEVELS[number];

const MULTIPLIER_MAP: Record<RiskType, Record<number, number[]>> = {
  LOW: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    12: [10, 5, 2, 1.6, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.6, 2, 5, 10],
    14: [15, 7, 3, 2, 1.5, 1.1, 1, 1, 0.5, 1, 1, 1.1, 1.5, 2, 3, 7, 15],
    16: [16, 9, 4, 3, 2, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 2, 3, 4, 9, 16],
  },
  MEDIUM: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    14: [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  HIGH: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    12: [170, 24, 8, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8, 24, 170],
    14: [420, 56, 18, 5, 2, 0.5, 0.2, 0.2, 0.2, 0.5, 2, 5, 18, 56, 420],
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  }
};

const PlinkoView: React.FC<PlinkoViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [bet, setBet] = useState(10);
  const [risk, setRisk] = useState<RiskType>('MEDIUM');
  const [rows, setRows] = useState(8);
  const [balls, setBalls] = useState<{id: number, x: number, y: number, row: number}[]>([]);
  const ballIdCounter = useRef(0);

  const multipliers = MULTIPLIER_MAP[risk][rows] || MULTIPLIER_MAP[risk][8];

  const dropBall = () => {
    if (balance < bet || bet < 5) return;
    onUpdateBalance(-bet);
    const newBall = { id: ballIdCounter.current++, x: 50, y: 0, row: 0 };
    setBalls(prev => [...prev, newBall]);
    soundService.playTick();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setBalls(prev => prev.map(ball => {
        if (ball.row < rows) {
          const direction = Math.random() > 0.5 ? 1 : -1;
          const stepSize = 100 / (rows * 2); 
          soundService.playTick();
          return { 
            ...ball, 
            x: ball.x + (direction * stepSize), 
            y: ball.y + (100 / (rows + 1)), 
            row: ball.row + 1 
          };
        }
        return ball;
      }).filter(ball => {
        if (ball.row === rows) {
           const segmentWidth = 100 / multipliers.length;
           const index = Math.floor(ball.x / segmentWidth);
           const safeIndex = Math.max(0, Math.min(index, multipliers.length - 1));
           const win = bet * multipliers[safeIndex];
           onUpdateBalance(win);
           if (win > bet) soundService.playWin();
           else if (win < bet) soundService.playLoss();
           return false;
        }
        return true;
      }));
    }, 150);
    return () => clearInterval(interval);
  }, [bet, rows, multipliers]);

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white overflow-hidden">
      <div className="p-4 flex bg-[#131d27] border-b border-white/5 items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-pink-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="font-black uppercase text-sm italic tracking-tighter">PLINKO <span className="text-pink-500">PRO</span></h2>
        </div>
        <div className="bg-black/40 px-4 py-2 rounded-xl border border-white/5 font-mono font-bold text-green-400 text-xs sm:text-base">
          {balance.toFixed(2)} USDT
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto no-scrollbar bg-[radial-gradient(circle_at_top,_#1a1219_0%,_#0b0e11_100%)] min-h-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          
          {/* Painel Lateral de Apostas (Controles) */}
          <div className="lg:col-span-4 bg-[#131d27] p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl space-y-4 order-2 lg:order-1">
            <div className="space-y-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nível de Risco</span>
               <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
                  {RISK_LEVELS.map(r => (
                    <button 
                      key={r} 
                      onClick={() => setRisk(r)} 
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${risk === r ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                      {r}
                    </button>
                  ))}
               </div>
            </div>

            <div className="space-y-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número de Linhas</span>
               <select 
                 value={rows} 
                 onChange={e => setRows(Number(e.target.value))} 
                 className="w-full bg-black/60 border border-white/10 px-4 py-3 rounded-xl text-xs font-black outline-none focus:border-pink-500 text-center text-white cursor-pointer"
               >
                  {[8, 10, 12, 14, 16].map(r => <option key={r} value={r} className="bg-[#131d27]">{r} LINHAS DE PINOS</option>)}
               </select>
            </div>

            <div className="space-y-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor da Aposta (USDT)</span>
               <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
                  <button onClick={() => setBet(Math.max(5, Math.floor(bet / 2)))} className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg font-black text-xs text-white cursor-pointer transition-all flex items-center justify-center">½</button>
                  <input type="number" min={5} value={bet} onChange={e => setBet(Math.max(5, Number(e.target.value)))} className="flex-1 bg-slate-900/90 text-white border border-white/20 rounded-lg py-2 text-center font-black text-sm font-mono focus:outline-none focus:border-[#FFCC00] focus:text-[#FFCC00] shadow-inner min-w-0" />
                  <button onClick={() => setBet(bet * 2)} className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg font-black text-xs text-white cursor-pointer transition-all flex items-center justify-center">2x</button>
               </div>
            </div>

            <button 
              onClick={dropBall} 
              disabled={balance < bet || bet < 5} 
              className={`w-full py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-2xl border-b-4 active:scale-95 transition-all cursor-pointer min-h-[50px] text-sm ${balance < bet || bet < 5 ? 'bg-slate-800 text-slate-600 border-slate-900 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-500 text-white border-pink-800 shadow-pink-600/30'}`}
            >
              LANÇAR BOLA
            </button>
          </div>

          {/* Arena do Plinko (Pirâmide e Multiplicadores) */}
          <div className="lg:col-span-8 bg-[#131d27]/70 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl flex flex-col items-center justify-between min-h-[400px] sm:min-h-[480px] order-1 lg:order-2">
            
            {/* Pyramid of Pegs */}
            <div className="relative w-full max-w-md aspect-[4/3] my-auto shrink-0 flex flex-col justify-center">
               {[...Array(rows + 1)].map((_, row) => (
                 <div key={row} className="flex justify-center gap-2 sm:gap-4" style={{ marginTop: `${Math.min(18, 260/rows)}px` }}>
                    {[...Array(row + 3)].map((_, i) => (
                       <div key={i} className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-slate-300 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                    ))}
                 </div>
               ))}

               {/* Animated Balls */}
               {balls.map(ball => (
                 <div 
                    key={ball.id} 
                    className="absolute w-3.5 h-3.5 bg-pink-500 rounded-full shadow-[0_0_18px_#ec4899] z-20" 
                    style={{ left: `${ball.x}%`, top: `${ball.y}%`, transform: 'translate(-50%, -50%)', transition: 'all 0.15s linear' }} 
                 />
               ))}
            </div>

            {/* Multipliers Bar */}
            <div className="w-full max-w-xl flex gap-1 h-9 mt-4 shrink-0">
              {multipliers.map((m, i) => (
                <div key={i} className={`flex-1 flex items-center justify-center rounded-lg text-[9px] sm:text-xs font-black border-b-2 transition-all shadow-md
                  ${m >= 5 ? 'bg-red-600 border-red-900 text-white' : m >= 1.5 ? 'bg-orange-500 border-orange-800 text-white' : 'bg-slate-700 border-slate-900 text-slate-300'}`}>
                  {m}x
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default PlinkoView;
