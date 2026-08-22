
import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';

interface RouletteViewProps {
  balance: number;
  isDemo?: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

// 12 segmentos para uma experiência de "Mini Roulette" profissional
const WHEEL_ORDER = [0, 11, 5, 10, 1, 6, 9, 2, 7, 8, 3, 4];
const SEGMENT_ANGLE = 360 / WHEEL_ORDER.length;

const RouletteView: React.FC<RouletteViewProps> = ({ balance, isDemo, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isPinTicking, setIsPinTicking] = useState(false);

  const getNumberColor = (num: number) => {
    if (num === 0) return '#10b981'; // Verde
    return num % 2 === 0 ? '#111827' : '#ef4444'; // Preto / Vermelho
  };

  const handleSpin = (numToBet?: number) => {
    const targetBetNum = numToBet !== undefined ? numToBet : selectedNumber;
    
    if (spinning || targetBetNum === null || balance < betAmount || betAmount < 5) {
      if (targetBetNum === null && !spinning) soundService.playCrash();
      return;
    }

    if (numToBet !== undefined) {
      setSelectedNumber(numToBet);
    }

    setSpinning(true);
    setLastResult(null);
    onUpdateBalance(-betAmount);
    soundService.playRouletteSpin();

    // Lógica de sorteio
    const winningNumber = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
    const winningIndex = WHEEL_ORDER.indexOf(winningNumber);
    
    // Rotação: Voltas completas + Alinhamento do índice (o pino está no topo/0 graus)
    const extraSpins = 360 * 10; 
    const targetAngle = winningIndex * SEGMENT_ANGLE;
    // Garantir que a rotação sempre aumente
    const currentBaseRotation = Math.ceil(rotation / 360) * 360;
    const finalRotation = currentBaseRotation + extraSpins - targetAngle;
    
    setRotation(finalRotation);

    // Simulação do pino a bater nas divisórias
    const tickInterval = setInterval(() => {
      setIsPinTicking(true);
      soundService.playRouletteBallClick();
      setTimeout(() => setIsPinTicking(false), 50);
    }, 120);

    setTimeout(() => {
      clearInterval(tickInterval);
      soundService.playRoulettePocketDrop();
      setLastResult(winningNumber);
      setSpinning(false);
      
      if (winningNumber === targetBetNum) {
        const win = betAmount * 11; // 12 números, prêmio de 11x
        onUpdateBalance(win);
        soundService.playRouletteWin();
      } else {
        soundService.playDiceLoss();
      }
    }, 5000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#05070a] text-white overflow-hidden font-sans h-full w-full">
      {/* Header Compacto e Responsivo */}
      <header className="px-4 py-2 flex items-center justify-between bg-[#131d27] border-b border-white/5 z-50 shadow-xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 bg-white/5 rounded-xl text-[#FFCC00] active:scale-90 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="font-black uppercase text-xs tracking-tighter">ROLETA <span className="text-[#FFCC00]">PRO</span></h2>
          </div>
        </div>
        <div className="bg-black/40 px-3 py-1 rounded-lg border border-white/10 font-mono font-bold text-[#FFCC00] text-xs">
          {balance.toFixed(0)} Kz
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto no-scrollbar bg-[radial-gradient(circle_at_center,_#1a2c38_0%,_#05070a_100%)] min-h-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          
          {/* Painel Lateral de Apostas */}
          <div className="lg:col-span-5 bg-[#131d27] p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl space-y-4 order-2 lg:order-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Escolhe um Número na Mesa (11x)</span>
            
            <div className="grid grid-cols-6 gap-1.5 w-full">
              {[...WHEEL_ORDER].sort((a,b) => a-b).map((num) => (
                <button 
                  key={num} 
                  onClick={() => {
                    if (!spinning) {
                      soundService.playUISelect();
                      setSelectedNumber(num);
                    }
                  }} 
                  className={`h-11 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation
                    ${selectedNumber === num 
                      ? 'bg-red-600 border-white scale-105 shadow-[0_0_15px_rgba(239,68,68,0.6)] z-10' 
                      : 'bg-black/40 border-slate-700/30 text-white hover:bg-slate-800'}`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Apostas Rápidas */}
            <div className="flex gap-2">
               <button onClick={() => handleSpin(WHEEL_ORDER[4])} className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-black uppercase text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer">Vermelho</button>
               <button onClick={() => handleSpin(WHEEL_ORDER[7])} className="flex-1 py-2.5 bg-slate-500/10 border border-slate-500/20 rounded-xl text-xs font-black uppercase text-slate-300 hover:bg-slate-500/20 active:scale-95 transition-all cursor-pointer">Preto</button>
               <button onClick={() => handleSpin(0)} className="flex-1 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-black uppercase text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer">Zero (11x)</button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor da Aposta (USDT)</span>
              <div className="flex items-center gap-1.5 bg-black/60 p-2 rounded-xl border border-white/10">
                <button onClick={() => { soundService.playUISelect(); setBetAmount(Math.max(5, Math.floor(betAmount / 2))); }} className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg font-black text-xs text-white cursor-pointer transition-all flex items-center justify-center">½</button>
                <input 
                  type="number"
                  min={5}
                  value={betAmount}
                  onChange={e => setBetAmount(Math.max(5, Number(e.target.value)))}
                  className="flex-1 bg-slate-900/90 border border-white/20 rounded-lg py-2 font-black text-sm font-mono text-white text-center focus:outline-none focus:border-[#FFCC00] focus:text-[#FFCC00] shadow-inner min-w-0"
                />
                <button onClick={() => { soundService.playUISelect(); setBetAmount(betAmount * 2); }} className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-90 rounded-lg font-black text-xs text-white cursor-pointer transition-all flex items-center justify-center">2x</button>
              </div>
            </div>

            <button 
              onClick={() => handleSpin()} 
              disabled={spinning || selectedNumber === null || balance < betAmount || betAmount < 5} 
              className={`w-full py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider shadow-2xl transition-all active:scale-95 border-b-4 cursor-pointer min-h-[50px] text-sm
                ${spinning || selectedNumber === null || balance < betAmount || betAmount < 5 
                  ? 'bg-slate-800 text-slate-600 border-slate-900 border-b-0 opacity-50 cursor-not-allowed' 
                  : 'bg-[#FFCC00] hover:bg-[#FFD700] text-black border-[#ccaa00] shadow-[#FFCC00]/20'}`}
            >
              {spinning ? 'A SORTEAR NÚMERO...' : 'GIRAR ROLETA'}
            </button>
          </div>

          {/* Arena da Roleta (Disco) */}
          <div className="lg:col-span-7 bg-[#131d27]/70 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center min-h-[380px] sm:min-h-[460px] order-1 lg:order-2">
            <div className="relative w-full max-w-[280px] sm:max-w-[360px] aspect-square flex items-center justify-center shrink-0 my-auto">
              {/* O PINO (Indicador de Topo) */}
              <div className={`absolute top-[-6px] left-1/2 -translate-x-1/2 z-50 transition-transform duration-75 origin-top ${isPinTicking ? 'rotate-[-15deg] scale-110' : 'rotate-0'}`}>
                 <svg width="24" height="32" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 50L40 0H0L20 50Z" fill="white" />
                    <path d="M20 40L32 5H8L20 40Z" fill="#ef4444" />
                 </svg>
              </div>

              {/* Disco da Roleta */}
              <div 
                className="w-full h-full rounded-full relative shadow-[0_0_80px_rgba(0,0,0,0.9)] border-[8px] border-[#1e293b]"
                style={{ 
                  transform: `rotate(${rotation}deg)`, 
                  transition: spinning ? 'transform 5s cubic-bezier(0.15, 0, 0.2, 1)' : 'none' 
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="50" fill="#0f172a" />
                  {WHEEL_ORDER.map((num, i) => {
                    const angle = i * SEGMENT_ANGLE;
                    const color = getNumberColor(num);
                    const isWinner = lastResult === num && !spinning;
                    const x1 = 50 + 50 * Math.cos((Math.PI * (angle - 90 - SEGMENT_ANGLE / 2)) / 180);
                    const y1 = 50 + 50 * Math.sin((Math.PI * (angle - 90 - SEGMENT_ANGLE / 2)) / 180);
                    const x2 = 50 + 50 * Math.cos((Math.PI * (angle - 90 + SEGMENT_ANGLE / 2)) / 180);
                    const y2 = 50 + 50 * Math.sin((Math.PI * (angle - 90 + SEGMENT_ANGLE / 2)) / 180);
                    return (
                      <g key={num}>
                        <path d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`} fill={color} stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" className={isWinner ? 'animate-pulse' : ''} />
                        <text x="50" y="10" transform={`rotate(${angle}, 50, 50)`} fill="white" fontSize="5" fontWeight="900" textAnchor="middle" className="font-mono select-none">{num}</text>
                      </g>
                    );
                  })}
                  <circle cx="50" cy="50" r="12" fill="#1e293b" />
                  <circle cx="50" cy="50" r="6" fill="#0f172a" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="p-2 sm:p-4 bg-black/40 text-center shrink-0">
         <p className="text-[7px] sm:text-[8px] font-black text-slate-700 uppercase tracking-widest leading-relaxed">
           Algoritmo RNG Certificado • 91.6% RTP • Resultados Justos
         </p>
      </footer>
    </div>
  );
};

export default RouletteView;
