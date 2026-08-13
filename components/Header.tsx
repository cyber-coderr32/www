
import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';
import { Maximize2, Minimize2 } from 'lucide-react';

interface HeaderProps {
  balance: number;
}

const Header: React.FC<HeaderProps> = ({ balance }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    soundService.setMute(newState);
  };

  const toggleFullscreen = () => {
    soundService.playUISelect();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  return (
    <header className="flex justify-between items-center px-4 py-3 bg-[#049444] border-b border-[#037235] z-50">
      <div className="flex items-center gap-2">
        <div className="flex bg-white px-2 py-0.5 rounded shadow-sm">
          <span className="text-[#049444] font-black italic text-sm tracking-tighter">PREMIER</span>
          <span className="text-[#FFCC00] font-black italic text-sm tracking-tighter ml-1">BET</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button 
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20"
          aria-label={isFullscreen ? "Sair do modo tela cheia" : "Modo tela cheia"}
          title={isFullscreen ? "Sair de Ecrã Inteiro" : "Ecrã Inteiro"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5 text-amber-300" />
          ) : (
            <Maximize2 className="h-5 w-5 text-[#FFCC00]" />
          )}
        </button>

        <button 
          onClick={toggleMute}
          className="p-2 rounded-lg text-white/70 hover:text-white transition-colors bg-white/10"
          aria-label={isMuted ? "Ativar som" : "Desativar som"}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
        
        <div className="flex flex-col items-end leading-none bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[8px] text-white/60 font-bold mb-0.5 uppercase tracking-wider">SALDO</span>
          <span className="text-[#FFCC00] font-bold text-base md:text-lg font-mono">
            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </span>
          <span className="text-[8px] font-mono font-bold text-white/70 mt-0.5">
            {(balance * 950).toLocaleString('pt-AO', { maximumFractionDigits: 0 })} KZ • R$ {(balance * 5.70).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
