import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gamepad2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

// Lazy imports ou carregamento condicional dos jogos
import MinesView from './MinesView';
import AviatorView from './AviatorView';
import CrashView from './CrashView';
import PlinkoView from './PlinkoView';
import RouletteView from './RouletteView';
import SlotsView from './SlotsView';
import DiceView from './DiceView';
import BlackjackView from './BlackjackView';
import LimboView from './LimboView';
import TowerView from './TowerView';
import HiLoView from './HiLoView';
import StairsView from './StairsView';

interface EmbedGameViewProps {
  gameId?: string;
  token?: string;
}

export const EmbedGameView: React.FC<EmbedGameViewProps> = ({ gameId: propGameId, token: propToken }) => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extrair parâmetros de URL se não forem passados via props
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = propGameId || urlParams.get('game') || 'mines';
  const token = propToken || urlParams.get('token') || '';

  useEffect(() => {
    verifySession();
  }, [token]);

  const verifySession = async () => {
    setIsLoading(true);
    setError(null);

    if (!token) {
      // Se não houver token, roda em modo sandbox/preview para testes
      setSession({
        gameId,
        operatorName: 'CryptonBet Demo Partner',
        playerId: 'demo_player',
        playerName: 'Jogador Visitante',
        balance: 1000.00,
        currency: 'USDT',
        mode: 'DEMO'
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/games/session-verify?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.session) {
          setSession(json.session);
        } else {
          setError(json.error || 'Sessão inválida.');
        }
      } else {
        setError('Não foi possível verificar a sessão do jogo.');
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao conectar ao servidor de jogos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBalance = (newBalance: number) => {
    setSession((prev: any) => ({ ...prev, balance: newBalance }));
    // Notificar janela pai via postMessage para integração Seamless Wallet
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'CRYPTONBET_BALANCE_UPDATE',
        balance: newBalance,
        playerId: session?.playerId,
        currency: session?.currency || 'USDT'
      }, '*');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0d14] text-white">
        <RefreshCw className="w-10 h-10 text-[#049444] animate-spin mb-4" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">A carregar jogo embutido...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0d14] text-white p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold uppercase text-white mb-2">Erro de Carregamento</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6">{error}</p>
        <button
          onClick={verifySession}
          className="px-6 py-2.5 bg-[#049444] text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Renderizar o componente de jogo correspondente sem o cabeçalho/menu da plataforma principal
  const activeGame = (session?.gameId || gameId).toLowerCase();

  return (
    <div className="min-h-screen w-full bg-[#0a0d14] text-white overflow-x-hidden flex flex-col">
      {/* Mini Topbar do Iframe Provider */}
      <div className="bg-[#0f141d] border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#049444] animate-pulse"></span>
          <span className="font-bold text-white uppercase text-[10px] tracking-wider">
            {session?.operatorName || 'Powered by CryptonBet Engine'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-xs">
            <span className="text-slate-400 text-[10px] uppercase mr-1">Saldo:</span>
            <strong className="text-[#049444] font-bold">
              ${Number(session?.balance || 0).toFixed(2)} {session?.currency || 'USDT'}
            </strong>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal do Jogo */}
      <div className="flex-1 p-2 md:p-4">
        {activeGame === 'mines' && <MinesView balance={session?.balance || 0} isDemo={session?.mode === 'DEMO'} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'aviator' && <AviatorView balance={session?.balance || 0} isDemo={session?.mode === 'DEMO'} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'crash' && <CrashView balance={session?.balance || 0} isDemo={session?.mode === 'DEMO'} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'plinko' && <PlinkoView balance={session?.balance || 0} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'roulette' && <RouletteView balance={session?.balance || 0} isDemo={session?.mode === 'DEMO'} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'slots' && <SlotsView balance={session?.balance || 0} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'dice' && <DiceView balance={session?.balance || 0} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'blackjack' && <BlackjackView balance={session?.balance || 0} isDemo={session?.mode === 'DEMO'} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'limbo' && <LimboView balance={session?.balance || 0} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'tower' && <TowerView balance={session?.balance || 0} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'hilo' && <HiLoView balance={session?.balance || 0} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {activeGame === 'stairs' && <StairsView balance={session?.balance || 0} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />}
        {!['mines','aviator','crash','plinko','roulette','slots','dice','blackjack','limbo','tower','hilo','stairs'].includes(activeGame) && (
          <MinesView balance={session?.balance || 0} isDemo={session?.mode === 'DEMO'} onUpdateBalance={handleUpdateBalance} onBack={() => {}} />
        )}
      </div>
    </div>
  );
};

export default EmbedGameView;
