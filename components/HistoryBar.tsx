
import React from 'react';
import { RoundHistory } from '../types';

interface HistoryBarProps {
  history: RoundHistory[];
  onClickMultiplier?: (round: RoundHistory) => void;
}

const HistoryBar: React.FC<HistoryBarProps> = ({ history, onClickMultiplier }) => {
  return (
    <div className="h-10 w-full bg-[#0d141c] flex items-center border-y border-white/5 relative overflow-hidden flex-shrink-0">
      {/* Container de Scroll Horizontal Isolado */}
      <div className="flex-1 h-full overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar px-3 flex items-center">
        <div className="flex items-center gap-1.5 h-full py-1 flex-nowrap">
          {history.length === 0 ? (
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] whitespace-nowrap">
              ⚡ A RADARAR HISTÓRICO DE VOS...
            </span>
          ) : (
            history.map((round) => (
              <button 
                key={round.id}
                onClick={() => onClickMultiplier && onClickMultiplier(round)}
                className={`
                  flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black font-mono border transition-all hover:scale-110 active:scale-95 whitespace-nowrap cursor-pointer shadow-sm
                  ${round.multiplier < 1.5 ? 'bg-[#3498db]/15 text-[#3498db] border-[#3498db]/30 hover:bg-[#3498db]/25' : 
                    round.multiplier < 10 ? 'bg-[#913dff]/20 text-[#c084fc] border-[#913dff]/40 hover:bg-[#913dff]/30' : 
                    'bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-[#FFCC00] border-amber-500/40 hover:border-amber-400 shadow-amber-500/10'}
                `}
                title="Clique para ver Detalhes Provably Fair da Ronda"
              >
                {round.multiplier.toFixed(2)}x
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Sombra de indicação de scroll à direita */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#131d27] to-transparent pointer-events-none z-10" />

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default HistoryBar;
