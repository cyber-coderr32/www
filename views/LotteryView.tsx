
import React, { useState, useCallback } from 'react';
import { soundService } from '../services/soundService';

interface LotteryViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const LotteryView: React.FC<LotteryViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawResult, setDrawResult] = useState<(number | null)[]>([null, null, null]);
  const [drawing, setDrawing] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'DRAWING' | 'FINISHED'>('IDLE');
  const [winMessage, setWinMessage] = useState<{ text: string, amount: number } | null>(null);

  // Selecionar números - Apenas modifica o estado da seleção, sem disparar sorteio
  const toggleNumber = (num: number) => {
    if (drawing || status === 'DRAWING') return;
    
    // Se clicarmos em números após um jogo terminado, limpamos o tabuleiro para nova jogada
    if (status === 'FINISHED') {
      setStatus('IDLE');
      setDrawResult([null, null, null]);
      setWinMessage(null);
    }

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else if (selectedNumbers.length < 3) {
      setSelectedNumbers(prev => [...prev, num]);
      soundService.playTick();
    }
  };

  const finishGame = (result: number[]) => {
    // Compara os números selecionados com os sorteados
    const matches = selectedNumbers.filter(n => result.includes(n)).length;

    let multiplier = 0;
    let msg = "";

    // Nova Lógica de Vitória solicitada
    if (matches === 3) {
      multiplier = 3; // Triplo
      msg = "VITÓRIA TRIPLA!";
    } else if (matches === 2) {
      multiplier = 2; // Dobro
      msg = "GANHO DOBRADO!";
    } else if (matches === 1) {
      multiplier = 0.5; // Alguns centavos (Metade da aposta)
      msg = "CONSOLAÇÃO";
    }

    if (multiplier > 0) {
      const prize = betAmount * multiplier;
      setWinMessage({ text: msg, amount: prize });
      onUpdateBalance(prize);
      soundService.playWin();
    } else {
      soundService.playCrash();
    }
    
    setDrawing(false);
    setStatus('FINISHED');
  };

  const startDraw = useCallback(() => {
    // Bloqueio rigoroso: impede início se já estiver a correr, se não houver 3 números ou saldo
    if (drawing || status === 'DRAWING' || selectedNumbers.length !== 3 || balance < betAmount || betAmount < 5) {
      return;
    }

    setDrawing(true);
    setStatus('DRAWING');
    setWinMessage(null);
    setDrawResult([null, null, null]);
    onUpdateBalance(-betAmount);
    soundService.playTakeoff();

    // Sorteio de 3 números únicos de 0 a 9
    const available = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const finalResult: number[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * available.length);
      finalResult.push(available.splice(idx, 1)[0]);
    }

    // Revelação animada
    [0, 1, 2].forEach((i) => {
      setTimeout(() => {
        setDrawResult(prev => {
          const next = [...prev];
          next[i] = finalResult[i];
          return next;
        });
        soundService.playTick();
        
        if (i === 2) {
          setTimeout(() => finishGame(finalResult), 600);
        }
      }, 800 + (i * 800));
    });
  }, [drawing, status, selectedNumbers, balance, betAmount, onUpdateBalance]);

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white select-none overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 flex bg-[#131d27] border-b border-white/5 items-center gap-4 z-20">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors text-orange-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex flex-col">
          <h2 className="font-black uppercase text-[10px] tracking-[0.3em] text-orange-500 leading-none">Global</h2>
          <h2 className="font-black uppercase text-xl tracking-tighter italic">MEGA <span className="text-orange-500">DRAW</span></h2>
        </div>
        <div className="ml-auto bg-black/40 px-4 py-2 rounded-xl border border-white/5 font-mono font-bold text-green-400">
          {balance.toFixed(2)} USDT
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between py-4 sm:py-8 px-3 sm:px-4 bg-[radial-gradient(circle_at_center,_#1c1917_0%,_#0b0e11_100%)] overflow-y-auto no-scrollbar min-h-0 gap-4 sm:gap-6">
        
        {/* ÁREA DE SORTEIO */}
        <div className="flex flex-col items-center gap-3 sm:gap-6 w-full max-w-lg shrink-0">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Números Sorteados</div>
          <div className="flex gap-3 sm:gap-6">
            {[0, 1, 2].map((i) => {
              const val = drawResult[i];
              const isMatch = val !== null && selectedNumbers.includes(val);
              return (
                <div key={i} className={`
                  w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl sm:text-5xl font-black
                  border-4 transition-all duration-500 relative
                  ${val !== null 
                    ? isMatch 
                      ? 'bg-green-600 border-green-400 text-white shadow-[0_0_30px_rgba(34,197,94,0.6)] scale-110' 
                      : 'bg-orange-500 border-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                    : 'bg-black/40 border-white/10 text-white/10'}
                `}>
                  {drawing && val === null ? <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-orange-500" /> : val ?? '?'}
                  {isMatch && <div className="absolute -top-1 -right-1 bg-white text-green-600 rounded-full p-1 shadow-lg animate-bounce"><svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
                </div>
              );
            })}
          </div>
          
          <div className="h-8 sm:h-10">
            {winMessage ? (
              <div className="flex flex-col items-center animate-bounce">
                <span className="text-orange-400 font-black text-[10px] uppercase tracking-widest">{winMessage.text}</span>
                <span className="text-2xl sm:text-3xl font-black text-white">+{winMessage.amount.toFixed(2)} USDT</span>
              </div>
            ) : status === 'FINISHED' && !winMessage ? (
              <span className="text-slate-500 font-black text-xs uppercase tracking-widest">Sem acertos</span>
            ) : null}
          </div>
        </div>

        {/* SELEÇÃO DO UTILIZADOR */}
        <div className="w-full max-w-md bg-[#131d27] p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl shrink-0 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">Escolha 3 Números Únicos</span>
            <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full ${selectedNumbers.length === 3 ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
              {selectedNumbers.length} / 3
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const isSelected = selectedNumbers.includes(num);
              return (
                <button
                  key={num}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleNumber(num); }}
                  disabled={drawing}
                  className={`
                    aspect-square rounded-xl sm:rounded-2xl text-base sm:text-xl font-black transition-all active:scale-90 cursor-pointer flex items-center justify-center
                    ${isSelected 
                      ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)] border-2 border-white/20' 
                      : 'bg-black/40 text-slate-500 border border-white/5 hover:border-orange-500/50'}
                    disabled:opacity-50
                  `}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 bg-black/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5">
              <button type="button" onClick={() => !drawing && setBetAmount(Math.max(5, betAmount - 5))} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-lg sm:text-xl text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center">-</button>
              <input
                type="number"
                min={5}
                value={betAmount}
                onChange={e => !drawing && setBetAmount(Math.max(5, Number(e.target.value)))}
                disabled={drawing}
                className="flex-1 bg-transparent text-center font-black text-base sm:text-2xl font-mono text-white outline-none"
              />
              <button type="button" onClick={() => !drawing && setBetAmount(betAmount + 5)} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl font-black text-lg sm:text-xl text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center">+</button>
            </div>

            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); startDraw(); }}
              disabled={drawing || selectedNumbers.length !== 3 || balance < betAmount || betAmount < 5}
              className={`
                w-full py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-widest shadow-xl transition-all active:scale-95 border-b-4 sm:border-b-8 cursor-pointer min-h-[48px]
                ${drawing || selectedNumbers.length !== 3 || balance < betAmount || betAmount < 5
                  ? 'bg-slate-800 text-slate-600 border-slate-900 border-b-0 cursor-not-allowed' 
                  : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-800'}
              `}
            >
              {drawing ? 'SORTEANDO...' : selectedNumbers.length !== 3 ? 'ESCOLHA 3 NÚMEROS' : 'JOGAR AGORA'}
            </button>
          </div>
        </div>

        {/* TABELA DE PAGAMENTOS ATUALIZADA */}
        <div className="flex gap-6 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] bg-black/20 px-6 py-2 rounded-full border border-white/5">
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> 3 Acertos: 3x</div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> 2 Acertos: 2x</div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-yellow-600 rounded-full" /> 1 Acerto: 0.5x</div>
        </div>
      </div>
    </div>
  );
};

export default LotteryView;
