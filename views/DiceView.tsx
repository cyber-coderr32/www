
import React, { useState } from 'react';
import { soundService } from '../services/soundService';

interface DiceViewProps {
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const DiceFace: React.FC<{ value: number; active?: boolean; size?: 'sm' | 'lg' }> = ({ value, active, size = 'sm' }) => {
  const dots = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }[value as 1|2|3|4|5|6] || [];

  const sizeClass = size === 'lg' ? 'w-24 h-24 p-4' : 'w-full aspect-square p-2 max-w-[60px] mx-auto';
  const dotSize = size === 'lg' ? 'w-4 h-4' : 'w-2 h-2';

  return (
    <div className={`
      ${sizeClass} rounded-2xl border-2 grid grid-cols-3 grid-rows-3 gap-1 transition-all duration-300
      ${active 
        ? 'bg-purple-600 border-white shadow-[0_0_20px_rgba(168,85,247,0.6)] scale-105' 
        : 'bg-[#1a2c38] border-white/10 opacity-70 hover:opacity-100'}
    `}>
      {[...Array(9)].map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {dots.includes(i) && (
            <div className={`${dotSize} rounded-full bg-white shadow-sm`} />
          )}
        </div>
      ))}
    </div>
  );
};

const DiceView: React.FC<DiceViewProps> = ({ balance, onUpdateBalance, onBack }) => {
  const [bet, setBet] = useState(10);
  const [selectedFace, setSelectedFace] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  
  const options = [1, 2, 3, 4, 5, 6];

  const handleSelectFace = (face: number) => {
    if (rolling) return;
    // Limpa o resultado anterior para evitar validação visual errada antes do novo roll
    setResult(null);
    setSelectedFace(face);
    soundService.playUISelect();
  };

  const roll = () => {
    if (balance < bet || bet < 5 || rolling || selectedFace === null) {
      if (selectedFace === null && !rolling) {
        soundService.playUISelect();
      }
      return;
    }

    setRolling(true);
    setResult(null); // Garante que o resultado visual é limpo ao iniciar
    onUpdateBalance(-bet);
    soundService.playDiceShake();
    soundService.playDiceRoll();

    let currentTemp = 1;
    const interval = setInterval(() => {
      currentTemp = Math.floor(Math.random() * 6) + 1;
      setResult(currentTemp);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const finalResult = Math.floor(Math.random() * 6) + 1;
      setResult(finalResult);
      setRolling(false);

      if (finalResult === selectedFace) {
        const win = bet * 6;
        onUpdateBalance(win);
        soundService.playDiceWin();
      } else {
        soundService.playDiceLoss();
      }
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] text-white">
      {/* Header do Jogo */}
      <div className="p-4 flex bg-[#131d27] border-b border-white/5 items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex flex-col">
          <h2 className="font-black uppercase text-xs tracking-[0.2em] text-slate-500 leading-none">Jogo de</h2>
          <h2 className="font-black uppercase text-base tracking-tighter">Match <span className="text-purple-500">Dice</span></h2>
        </div>
        <div className="ml-auto bg-black/40 px-4 py-1.5 rounded-2xl border border-white/5 flex flex-col items-end">
          <span className="text-[8px] font-bold text-slate-500 uppercase leading-none mb-0.5">Saldo</span>
          <span className="font-mono font-bold text-green-400">{balance.toFixed(2)} USDT</span>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-y-auto no-scrollbar min-h-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          
          {/* Painel Lateral de Apostas (Controles) */}
          <div className="lg:col-span-4 bg-[#131d27] p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl space-y-4 order-2 lg:order-1">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantia da Aposta (USDT)</span>
              <div className="flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-white/10">
                <button 
                  onClick={() => setBet(Math.max(5, bet - 5))} 
                  className="w-10 h-10 bg-white/10 rounded-lg font-black text-lg hover:bg-white/20 active:scale-90 transition-all cursor-pointer flex items-center justify-center text-white"
                >
                  -
                </button>
                <input
                  type="number"
                  min={5}
                  value={bet}
                  onChange={e => setBet(Math.max(5, Number(e.target.value)))}
                  disabled={rolling}
                  className="flex-1 bg-transparent text-center font-black text-lg font-mono text-white outline-none"
                />
                <button 
                  onClick={() => setBet(bet + 5)} 
                  className="w-10 h-10 bg-white/10 rounded-lg font-black text-lg hover:bg-white/20 active:scale-90 transition-all cursor-pointer flex items-center justify-center text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">Payout Fixo: 6.00x</span>
              <p className="text-[10px] text-slate-400">Acerta na face exata do dado para sextuplicar a tua aposta instantaneamente.</p>
            </div>

            <button 
              onClick={roll}
              disabled={rolling || selectedFace === null || balance < bet || bet < 5}
              className={`
                w-full py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 cursor-pointer text-sm min-h-[50px]
                ${rolling || selectedFace === null || balance < bet || bet < 5
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-b-0' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-b-4 border-purple-800 shadow-purple-600/30'}
              `}
            >
              {rolling ? 'A Lançar Dado...' : selectedFace === null ? 'Escolhe uma Face' : 'Confirmar Aposta'}
            </button>
          </div>

          {/* Arena Principal (Resultado do Sorteio & Seleção de Dados) */}
          <div className="lg:col-span-8 bg-[#131d27]/70 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center gap-6 min-h-[380px] sm:min-h-[460px] order-1 lg:order-2">
            
            {/* O Dado do Sorteio */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Resultado do Sorteio</span>
              <div className={`${rolling ? 'animate-bounce' : ''}`}>
                 <DiceFace value={(result || 1) as any} size="lg" active={!!result && result === selectedFace} />
              </div>
              <div className="h-6 flex items-center justify-center">
                {result !== null && !rolling && (
                  <span className={`text-xs sm:text-sm font-black uppercase tracking-widest px-3 py-1 rounded-full ${result === selectedFace ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {result === selectedFace ? '🎉 Acertaste em cheio! (6x)' : '❌ Não foi desta...'}
                  </span>
                )}
              </div>
            </div>

            {/* Escolha do Usuário (6 Dados em Grelha) */}
            <div className="w-full max-w-md space-y-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 text-center block italic">Seleciona a tua Previsão</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 w-full">
                {options.map((face) => (
                  <button 
                    key={face}
                    onClick={() => handleSelectFace(face)}
                    disabled={rolling}
                    className="focus:outline-none w-full"
                  >
                    <DiceFace value={face as any} active={selectedFace === face} />
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
      
      {/* Rodapé Informativo */}
      <div className="pb-8 text-center px-4">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] leading-relaxed">
          Previsão exata de 1/6 paga <span className="text-purple-500">6x</span> o valor apostado
        </p>
      </div>
    </div>
  );
};

export default DiceView;
