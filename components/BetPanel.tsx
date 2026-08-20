import React, { useState } from 'react';
import { GameStatus, Bet } from '../types';

interface BetPanelProps {
  status: GameStatus;
  bet1: Bet;
  bet2: Bet;
  setBet1: React.Dispatch<React.SetStateAction<Bet>>;
  setBet2: React.Dispatch<React.SetStateAction<Bet>>;
  hasActiveBet1: boolean;
  hasActiveBet2: boolean;
  onPlaceBet1: () => void;
  onPlaceBet2: () => void;
  onCancelBet1?: () => void;
  onCancelBet2?: () => void;
  onCashOut1: () => void;
  onCashOut2: () => void;
  multiplier: number;
  balance: number;
}

export const SingleConsolePanel: React.FC<{
  title: string;
  panelNum: 1 | 2;
  status: GameStatus;
  bet: Bet;
  setBet: React.Dispatch<React.SetStateAction<Bet>>;
  hasActiveBet: boolean;
  onPlaceBet: () => void;
  onCancelBet?: () => void;
  onCashOut: () => void;
  multiplier: number;
  balance: number;
}> = ({
  title,
  panelNum,
  status,
  bet,
  setBet,
  hasActiveBet,
  onPlaceBet,
  onCancelBet,
  onCashOut,
  multiplier,
  balance
}) => {
  const [activeTab, setActiveTab] = useState<'Aposta' | 'Auto'>('Aposta');

  const adjustBet = (delta: number) => {
    if (status !== GameStatus.BETTING && status !== GameStatus.IDLE && !bet.isAutoBet) return;
    setBet(prev => ({ ...prev, amount: Math.max(1, Math.round(prev.amount + delta)) }));
  };

  const setPresetBet = (val: number) => {
    if (status !== GameStatus.BETTING && status !== GameStatus.IDLE && !bet.isAutoBet) return;
    setBet(prev => ({ ...prev, amount: val }));
  };

  const multiplyBet = (factor: number) => {
    if (status !== GameStatus.BETTING && status !== GameStatus.IDLE && !bet.isAutoBet) return;
    setBet(prev => ({ ...prev, amount: Math.max(1, Math.round(prev.amount * factor)) }));
  };

  const isWin = bet.cashedOut;
  const currentWin = hasActiveBet && !isWin ? (bet.amount * multiplier).toFixed(2) : "0.00";

  return (
    <div className="flex-1 bg-[#0f1823] p-2 sm:p-3 rounded-2xl border border-white/10 flex flex-col justify-between shadow-xl relative overflow-hidden">
      {/* Top Header Selector: Aposta | Auto */}
      <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-white/5">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
            {title}
          </span>
          {bet.isAutoBet && (
            <span className="px-1.5 py-0.2 bg-[#049444]/20 text-[#049444] border border-[#049444]/30 rounded text-[8px] font-bold uppercase animate-pulse">
              Auto Bet
            </span>
          )}
        </div>

        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveTab('Aposta')}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
              activeTab === 'Aposta' ? 'bg-[#1e2c3a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Aposta
          </button>
          <button
            onClick={() => setActiveTab('Auto')}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
              activeTab === 'Auto' ? 'bg-[#049444] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Console Controls */}
      <div className="flex gap-2 items-center">
        {/* Left Inputs Section */}
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Bet Amount Stepper */}
          <div className="bg-black/50 p-1.5 rounded-xl border border-white/5 flex items-center justify-between gap-1">
            <button
              onClick={() => adjustBet(-1)}
              disabled={hasActiveBet && status === GameStatus.FLYING}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
            >
              -
            </button>
            <div className="flex-1 text-center">
              <span className="text-[8px] text-slate-500 uppercase font-black block leading-none">Aposta (USDT)</span>
              <input
                type="number"
                min={1}
                value={bet.amount}
                disabled={hasActiveBet && status === GameStatus.FLYING}
                onChange={e => setBet(prev => ({ ...prev, amount: Math.max(1, Number(e.target.value)) }))}
                className="w-full bg-transparent text-center font-mono font-black text-white text-sm sm:text-base outline-none disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => adjustBet(1)}
              disabled={hasActiveBet && status === GameStatus.FLYING}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
            >
              +
            </button>
          </div>

          {/* Preset Buttons Grid or Auto Controls */}
          {activeTab === 'Aposta' ? (
            <div className="grid grid-cols-4 gap-1">
              {[5, 10, 25, 50].map(val => (
                <button
                  key={val}
                  onClick={() => setPresetBet(val)}
                  disabled={hasActiveBet && status === GameStatus.FLYING}
                  className="py-1 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-lg text-[9px] font-black font-mono border border-white/5 transition-all cursor-pointer disabled:opacity-40"
                >
                  {val}$
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded-xl border border-white/5 gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={!!bet.isAutoBet}
                  onChange={e => setBet(prev => ({ ...prev, isAutoBet: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-[#049444] rounded cursor-pointer"
                />
                <span className="text-[9px] font-black text-slate-300 uppercase">Auto Aposta</span>
              </label>

              <div className="flex items-center gap-1 bg-[#131d27] px-2 py-0.5 rounded-lg border border-white/10">
                <span className="text-[8px] font-bold text-slate-400">SAQUE AT:</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="OFF"
                  value={bet.autoCashout || ''}
                  onChange={e => setBet(prev => ({ ...prev, autoCashout: Number(e.target.value) || null }))}
                  className="w-12 bg-transparent text-center font-mono font-black text-xs text-[#FFCC00] outline-none placeholder:text-slate-700"
                />
                <span className="text-[#FFCC00] font-black text-[9px]">X</span>
              </div>
            </div>
          )}
        </div>

        {/* Big Action Button */}
        <div className="w-28 sm:w-36 h-20 shrink-0">
          {status === GameStatus.FLYING && hasActiveBet && !isWin ? (
            <button
              onClick={onCashOut}
              className="w-full h-full bg-[#FFCC00] hover:bg-[#e6b800] active:scale-95 text-slate-950 font-black rounded-xl sm:rounded-2xl border-b-4 border-amber-600 shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center p-1 cursor-pointer animate-pulse transition-all"
            >
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-900">SACAR</span>
              <span className="text-base sm:text-xl font-mono leading-none my-0.5">{currentWin}</span>
              <span className="text-[8px] font-bold text-slate-800">USDT ({multiplier.toFixed(2)}x)</span>
            </button>
          ) : isWin ? (
            <div className="w-full h-full bg-[#049444]/20 border-2 border-[#049444]/50 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-1 text-[#049444]">
              <span className="text-[8px] font-black uppercase">GANHOU! 🎉</span>
              <span className="text-base font-mono font-black">+{bet.winAmount.toFixed(2)}</span>
              <span className="text-[8px] font-bold opacity-80">USDT ({bet.multiplierAtCashout?.toFixed(2)}x)</span>
            </div>
          ) : hasActiveBet && status === GameStatus.BETTING ? (
            <button
              onClick={() => onCancelBet && onCancelBet()}
              className="w-full h-full bg-red-600/80 hover:bg-red-600 active:scale-95 text-white font-black rounded-xl sm:rounded-2xl border-b-4 border-red-800 shadow-lg flex flex-col items-center justify-center p-1 cursor-pointer transition-all"
            >
              <span className="text-xs uppercase tracking-wider font-extrabold">CANCELAR</span>
              <span className="text-[9px] font-mono opacity-90 mt-0.5">{bet.amount.toFixed(2)} USDT</span>
              <span className="text-[7px] text-red-200 uppercase font-bold">Aposta Confirmada</span>
            </button>
          ) : (
            <button
              onClick={onPlaceBet}
              disabled={status !== GameStatus.BETTING || balance < bet.amount}
              className={`w-full h-full rounded-xl sm:rounded-2xl font-black uppercase tracking-wider shadow-xl flex flex-col items-center justify-center p-1 transition-all border-b-4 cursor-pointer ${
                status === GameStatus.BETTING && balance >= bet.amount
                  ? 'bg-[#049444] hover:bg-[#037235] active:scale-95 text-white border-[#025628] shadow-[#049444]/20'
                  : 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed border-b-2 opacity-60'
              }`}
            >
              <span className="text-sm sm:text-lg leading-tight">APOSTAR</span>
              <span className="text-[9px] font-mono font-extrabold opacity-90">{bet.amount.toFixed(2)} USDT</span>
              <span className="text-[7px] opacity-70 uppercase font-bold mt-0.5">
                {status !== GameStatus.BETTING ? 'PRÓXIMO VOO' : 'CONCLUIR'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const BetPanel: React.FC<BetPanelProps> = ({
  status,
  bet1,
  bet2,
  setBet1,
  setBet2,
  hasActiveBet1,
  hasActiveBet2,
  onPlaceBet1,
  onPlaceBet2,
  onCancelBet1,
  onCancelBet2,
  onCashOut1,
  onCashOut2,
  multiplier,
  balance
}) => {
  return (
    <section className="bg-[#0b1219] p-2 sm:p-3 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-50">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        {/* Painel de Aposta 1 */}
        <SingleConsolePanel
          title="Aposta 1"
          panelNum={1}
          status={status}
          bet={bet1}
          setBet={setBet1}
          hasActiveBet={hasActiveBet1}
          onPlaceBet={onPlaceBet1}
          onCancelBet={onCancelBet1}
          onCashOut={onCashOut1}
          multiplier={multiplier}
          balance={balance}
        />

        {/* Painel de Aposta 2 */}
        <SingleConsolePanel
          title="Aposta 2"
          panelNum={2}
          status={status}
          bet={bet2}
          setBet={setBet2}
          hasActiveBet={hasActiveBet2}
          onPlaceBet={onPlaceBet2}
          onCancelBet={onCancelBet2}
          onCashOut={onCashOut2}
          multiplier={multiplier}
          balance={balance}
        />
      </div>
    </section>
  );
};

export default BetPanel;
