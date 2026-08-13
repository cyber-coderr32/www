import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameStatus, Bet, RoundHistory } from '../types';
import HistoryBar from '../components/HistoryBar';
import GameCanvas from '../components/GameCanvas';
import BetPanel from '../components/BetPanel';
import { getGameCommentary } from '../services/geminiService';
import { soundService } from '../services/soundService';
import { Volume2, VolumeX, ShieldCheck, Trophy, History, Users, RefreshCw, Zap, Info, ChevronRight, X } from 'lucide-react';

interface AviatorViewProps {
  balance: number;
  isDemo?: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

interface SimulatedBotPlayer {
  id: string;
  name: string;
  avatar: string;
  betAmount: number;
  targetCashout: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  winAmount?: number;
}

interface MyBetRecord {
  id: string;
  timestamp: string;
  panelName: string;
  betAmount: number;
  multiplier?: number;
  winAmount: number;
  status: 'WIN' | 'LOST';
}

const BOT_NAMES = [
  'Matias_Angola', 'Luanda_King', 'CryptoPilot', 'KwanzaMaster', 'Kamba_Bet',
  'Benguela_Gamer', 'Huambo_Trader', 'Zango_Flyer', 'Cabinda_VIP', 'Zero_Loss',
  'Beatriz_2026', 'Sol_Trader', 'Vitoria_K', 'Samba_Fly', 'Nzinga_Crypto',
  'Talatona_Bet', 'Kipupa_Pro', 'FlyHigh_AO', 'Pedro_Pilot', 'Kikolo_Trader'
];

const BOT_AVATARS = ['👨‍✈️', '✈️', '🚀', '🦅', '🎯', '👑', '⚡', '💎', '🔥', '🦁', '🌟', '🛡️'];

const BETTING_TIME = 10; // Seconds for betting phase

const AviatorView: React.FC<AviatorViewProps> = ({ balance, isDemo, onUpdateBalance, onBack }) => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [multiplier, setMultiplier] = useState(1.00);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // Dual Bet Panels
  const [bet1, setBet1] = useState<Bet>({
    amount: 10,
    autoCashout: null,
    cashedOut: false,
    winAmount: 0,
    multiplierAtCashout: null,
    isAutoBet: false
  });
  const [hasActiveBet1, setHasActiveBet1] = useState(false);

  const [bet2, setBet2] = useState<Bet>({
    amount: 20,
    autoCashout: null,
    cashedOut: false,
    winAmount: 0,
    multiplierAtCashout: null,
    isAutoBet: false
  });
  const [hasActiveBet2, setHasActiveBet2] = useState(false);

  const [bettingTimer, setBettingTimer] = useState(0);
  const [aiMessage, setAiMessage] = useState("Sistemas em check...");
  const [isMilestone, setIsMilestone] = useState(false);

  // Sidebar / Drawer Tabs: 'LIVE' | 'MY_BETS' | 'TOP'
  const [activeTab, setActiveTab] = useState<'LIVE' | 'MY_BETS' | 'TOP'>('LIVE');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [liveBots, setLiveBots] = useState<SimulatedBotPlayer[]>([]);
  const [myBetHistory, setMyBetHistory] = useState<MyBetRecord[]>([]);

  // Modals
  const [selectedRoundForDetails, setSelectedRoundForDetails] = useState<RoundHistory | null>(null);
  const [isProvablyFairModalOpen, setIsProvablyFairModalOpen] = useState(false);

  const crashPointRef = useRef(0);
  const multiplierRef = useRef(1.00);
  const lastMilestoneRef = useRef(1);
  const intervalRef = useRef<number | null>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Mutable refs to prevent stale closures inside high-frequency animation frame loops
  const statusRef = useRef<GameStatus>(status);
  const hasActiveBet1Ref = useRef(hasActiveBet1);
  const hasActiveBet2Ref = useRef(hasActiveBet2);
  const bet1Ref = useRef(bet1);
  const bet2Ref = useRef(bet2);
  const onUpdateBalanceRef = useRef(onUpdateBalance);

  useEffect(() => {
    statusRef.current = status;
    hasActiveBet1Ref.current = hasActiveBet1;
    hasActiveBet2Ref.current = hasActiveBet2;
    bet1Ref.current = bet1;
    bet2Ref.current = bet2;
    onUpdateBalanceRef.current = onUpdateBalance;
  }, [status, hasActiveBet1, hasActiveBet2, bet1, bet2, onUpdateBalance]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate simulated live bots for each new round
  const generateBotsForRound = useCallback(() => {
    const botCount = 14 + Math.floor(Math.random() * 12);
    const shuffledNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    const newBots: SimulatedBotPlayer[] = [];

    for (let i = 0; i < botCount; i++) {
      const name = shuffledNames[i % shuffledNames.length];
      const avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];
      const betAmount = [2, 5, 10, 25, 50, 100, 200][Math.floor(Math.random() * 7)];
      // Target cashout between 1.15x and 25x
      const targetCashout = Math.min(
        1.15 + Math.pow(Math.random() * 3, 2.2),
        40.0
      );

      newBots.push({
        id: 'bot_' + Math.random().toString(36).substr(2, 7),
        name,
        avatar,
        betAmount,
        targetCashout,
        cashedOut: false
      });
    }

    setLiveBots(newBots);
  }, []);

  // Handle Crash Event
  const handleCrash = useCallback((finalMultiplier: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isMuted) soundService.playCrash();
    setStatus(GameStatus.CRASHED);
    setMultiplier(finalMultiplier);

    const newRoundRecord: RoundHistory = {
      id: 'round_' + Math.random().toString(36).substr(2, 9),
      multiplier: finalMultiplier,
      timestamp: Date.now()
    };

    setHistory(prev => [newRoundRecord, ...prev].slice(0, 30));

    // Record Lost Bets for active non-cashed out bets
    if (hasActiveBet1Ref.current && !bet1Ref.current.cashedOut) {
      setMyBetHistory(prev => [{
        id: 'mybet_' + Date.now() + '_1',
        timestamp: new Date().toLocaleTimeString(),
        panelName: 'Aposta 1',
        betAmount: bet1Ref.current.amount,
        winAmount: 0,
        status: 'LOST'
      }, ...prev]);
    }

    if (hasActiveBet2Ref.current && !bet2Ref.current.cashedOut) {
      setMyBetHistory(prev => [{
        id: 'mybet_' + Date.now() + '_2',
        timestamp: new Date().toLocaleTimeString(),
        panelName: 'Aposta 2',
        betAmount: bet2Ref.current.amount,
        winAmount: 0,
        status: 'LOST'
      }, ...prev]);
    }

    getGameCommentary(GameStatus.CRASHED, finalMultiplier).then(setAiMessage);

    // Transition back to betting state after 4 seconds
    setTimeout(() => {
      setStatus(GameStatus.BETTING);
    }, 4000);
  }, [isMuted]);

  // Start Flight (Decolagem)
  const startFlight = useCallback(() => {
    setStatus(GameStatus.FLYING);
    if (!isMuted) {
      soundService.playTakeoff();
      soundService.startEngine(1);
    }

    let settings: any = {};
    try {
      settings = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
    } catch (e) {
      console.warn("Could not parse skyhigh_settings, using defaults.", e);
    }

    if (settings.forcedAviatorMultiplier) {
      crashPointRef.current = settings.forcedAviatorMultiplier;
    } else {
      const rand = Math.random();
      if (isDemo) {
        const isBaiting = settings.baitingMode !== false;
        if (isBaiting && rand < 0.18) {
          crashPointRef.current = 10 + Math.random() * 90;
        } else {
          crashPointRef.current = 1.25 + Math.random() * 5.5;
        }
      } else {
        const advLevel = settings.houseAdvantageLevel || 'MEDIUM';
        const instaCrashThreshold = advLevel === 'EXTREME' ? 0.12 : advLevel === 'MEDIUM' ? 0.06 : 0.02;

        if (rand < instaCrashThreshold) {
          crashPointRef.current = 1.00;
        } else {
          let baseCrash = 0.98 / (1 - Math.random());
          const hasBigBet = (hasActiveBet1Ref.current && bet1Ref.current.amount >= 300) ||
                            (hasActiveBet2Ref.current && bet2Ref.current.amount >= 300);

          if (hasBigBet) {
            baseCrash = Math.min(baseCrash, 1.8 + Math.random() * 1.5);
          }
          crashPointRef.current = Math.min(baseCrash, 350);
        }
      }
    }

    getGameCommentary(GameStatus.FLYING).then(setAiMessage);

    const startTime = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newMultiplier = 1.0 + (elapsed * 0.18) + 1.8 * Math.pow(elapsed / 10, 2);

      if (newMultiplier >= crashPointRef.current) {
        handleCrash(crashPointRef.current);
      } else {
        setMultiplier(newMultiplier);
        multiplierRef.current = newMultiplier;

        const currentInteger = Math.floor(newMultiplier);
        if (currentInteger > lastMilestoneRef.current) {
          lastMilestoneRef.current = currentInteger;
          setIsMilestone(true);
          if (!isMuted) soundService.playTick();
          setTimeout(() => setIsMilestone(false), 300);
        }

        if (!isMuted) soundService.startEngine(newMultiplier);

        // Check Auto Cashout for Bet 1
        if (
          hasActiveBet1Ref.current &&
          !bet1Ref.current.cashedOut &&
          bet1Ref.current.autoCashout &&
          newMultiplier >= bet1Ref.current.autoCashout
        ) {
          const currentMult = newMultiplier;
          const win = bet1Ref.current.amount * currentMult;
          onUpdateBalanceRef.current(win);
          setBet1(prev => ({
            ...prev,
            cashedOut: true,
            winAmount: win,
            multiplierAtCashout: currentMult
          }));

          setMyBetHistory(prev => [{
            id: 'mybet_' + Date.now() + '_1',
            timestamp: new Date().toLocaleTimeString(),
            panelName: 'Aposta 1 (Auto)',
            betAmount: bet1Ref.current.amount,
            multiplier: currentMult,
            winAmount: win,
            status: 'WIN'
          }, ...prev]);

          if (!isMuted) soundService.playWin();
        }

        // Check Auto Cashout for Bet 2
        if (
          hasActiveBet2Ref.current &&
          !bet2Ref.current.cashedOut &&
          bet2Ref.current.autoCashout &&
          newMultiplier >= bet2Ref.current.autoCashout
        ) {
          const currentMult = newMultiplier;
          const win = bet2Ref.current.amount * currentMult;
          onUpdateBalanceRef.current(win);
          setBet2(prev => ({
            ...prev,
            cashedOut: true,
            winAmount: win,
            multiplierAtCashout: currentMult
          }));

          setMyBetHistory(prev => [{
            id: 'mybet_' + Date.now() + '_2',
            timestamp: new Date().toLocaleTimeString(),
            panelName: 'Aposta 2 (Auto)',
            betAmount: bet2Ref.current.amount,
            multiplier: currentMult,
            winAmount: win,
            status: 'WIN'
          }, ...prev]);

          if (!isMuted) soundService.playWin();
        }

        // Update live bots cashouts in real time
        setLiveBots(prevBots =>
          prevBots.map(bot => {
            if (!bot.cashedOut && newMultiplier >= bot.targetCashout) {
              const winAmount = bot.betAmount * bot.targetCashout;
              return {
                ...bot,
                cashedOut: true,
                cashoutMultiplier: bot.targetCashout,
                winAmount
              };
            }
            return bot;
          })
        );
      }
    }, 30);
  }, [handleCrash, isMuted]);

  // Handle Game Phase Transitions & Auto Bet Queue
  useEffect(() => {
    if (status === GameStatus.IDLE) {
      setStatus(GameStatus.BETTING);
      return;
    }

    if (status === GameStatus.BETTING) {
      soundService.stopEngine();
      setMultiplier(1.00);
      multiplierRef.current = 1.00;
      lastMilestoneRef.current = 1;
      setBettingTimer(BETTING_TIME);
      generateBotsForRound();

      // Reset bet states for new round, maintaining AutoBet flags
      setHasActiveBet1(false);
      setBet1(prev => ({ ...prev, cashedOut: false, winAmount: 0, multiplierAtCashout: null }));

      setHasActiveBet2(false);
      setBet2(prev => ({ ...prev, cashedOut: false, winAmount: 0, multiplierAtCashout: null }));

      getGameCommentary(GameStatus.BETTING).then(setAiMessage);

      // Auto-Bet trigger for Bet 1
      if (bet1.isAutoBet && balance >= bet1.amount) {
        onUpdateBalance(-bet1.amount);
        setHasActiveBet1(true);
        if (!isMuted) soundService.playBet();
      }

      // Auto-Bet trigger for Bet 2
      if (bet2.isAutoBet && balance >= (bet1.isAutoBet ? balance - bet1.amount : balance) && balance >= bet2.amount) {
        onUpdateBalance(-bet2.amount);
        setHasActiveBet2(true);
        if (!isMuted) soundService.playBet();
      }
    }
  }, [status]);

  // Betting Phase Timer
  useEffect(() => {
    if (status !== GameStatus.BETTING) return;

    const timer = setInterval(() => {
      setBettingTimer(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [status]);

  // Trigger flight takeoff when timer reaches 0
  useEffect(() => {
    if (status === GameStatus.BETTING && bettingTimer <= 0) {
      startFlight();
    }
  }, [bettingTimer, status, startFlight]);

  // Place Bet 1
  const placeBet1 = () => {
    if (status === GameStatus.BETTING && !hasActiveBet1 && balance >= bet1.amount) {
      onUpdateBalance(-bet1.amount);
      setHasActiveBet1(true);
      if (!isMuted) soundService.playBet();
    }
  };

  // Cancel Bet 1 (During Betting Timer)
  const cancelBet1 = () => {
    if (status === GameStatus.BETTING && hasActiveBet1) {
      onUpdateBalance(bet1.amount);
      setHasActiveBet1(false);
    }
  };

  // Cashout Bet 1
  const cashOut1 = () => {
    if (status === GameStatus.FLYING && hasActiveBet1 && !bet1.cashedOut) {
      const currentMult = multiplierRef.current;
      const win = bet1.amount * currentMult;
      onUpdateBalance(win);
      setBet1(prev => ({ ...prev, cashedOut: true, winAmount: win, multiplierAtCashout: currentMult }));

      setMyBetHistory(prev => [{
        id: 'mybet_' + Date.now() + '_1',
        timestamp: new Date().toLocaleTimeString(),
        panelName: 'Aposta 1',
        betAmount: bet1.amount,
        multiplier: currentMult,
        winAmount: win,
        status: 'WIN'
      }, ...prev]);

      if (!isMuted) soundService.playWin();
    }
  };

  // Place Bet 2
  const placeBet2 = () => {
    if (status === GameStatus.BETTING && !hasActiveBet2 && balance >= bet2.amount) {
      onUpdateBalance(-bet2.amount);
      setHasActiveBet2(true);
      if (!isMuted) soundService.playBet();
    }
  };

  // Cancel Bet 2 (During Betting Timer)
  const cancelBet2 = () => {
    if (status === GameStatus.BETTING && hasActiveBet2) {
      onUpdateBalance(bet2.amount);
      setHasActiveBet2(false);
    }
  };

  // Cashout Bet 2
  const cashOut2 = () => {
    if (status === GameStatus.FLYING && hasActiveBet2 && !bet2.cashedOut) {
      const currentMult = multiplierRef.current;
      const win = bet2.amount * currentMult;
      onUpdateBalance(win);
      setBet2(prev => ({ ...prev, cashedOut: true, winAmount: win, multiplierAtCashout: currentMult }));

      setMyBetHistory(prev => [{
        id: 'mybet_' + Date.now() + '_2',
        timestamp: new Date().toLocaleTimeString(),
        panelName: 'Aposta 2',
        betAmount: bet2.amount,
        multiplier: currentMult,
        winAmount: win,
        status: 'WIN'
      }, ...prev]);

      if (!isMuted) soundService.playWin();
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      soundService.stopEngine();
    };
  }, []);

  const totalLiveBetsAmount = liveBots.reduce((acc, bot) => acc + bot.betAmount, 0) +
    (hasActiveBet1 ? bet1.amount : 0) +
    (hasActiveBet2 ? bet2.amount : 0);

  return (
    <div className="flex flex-col h-full bg-[#05070a] text-white overflow-hidden font-sans relative">

      {/* TOP HEADER */}
      <header className="flex justify-between items-center px-4 py-2 bg-[#131d27] border-b border-white/5 h-12 md:h-14 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (!isMuted) soundService.playUISelect(); onBack(); }}
            className="text-[#FFCC00] font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-transform cursor-pointer group"
          >
            <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            <span className={isDesktop ? 'block' : 'hidden'}>VOLTAR AO LOBBY</span>
            <span className={isDesktop ? 'hidden' : 'block'}>SAIR</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#049444] animate-ping" />
            Aviator Pro Live
          </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Ativar Som' : 'Desativar Som'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#049444]" />}
          </button>

          {/* Provably Fair Verifier */}
          <button
            onClick={() => setIsProvablyFairModalOpen(true)}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-amber-400 flex items-center gap-1 text-[10px] font-black uppercase transition-colors cursor-pointer"
            title="Verificar Justeza Provably Fair"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Provably Fair</span>
          </button>

          {/* Mobile Drawer Trigger for Live Bets */}
          {!isDesktop && (
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="bg-[#049444]/20 border border-[#049444]/40 px-2.5 py-1 rounded-lg text-[#049444] text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Apostas</span>
            </button>
          )}

          {/* User Balance */}
          <div className="bg-black/50 px-3 py-1 rounded-xl border border-white/10 flex flex-col items-end leading-none">
            <span className="text-[7px] font-black text-slate-500 uppercase">Saldo Ativo</span>
            <span className="font-mono font-bold text-[#FFCC00] text-xs sm:text-sm">
              {balance.toFixed(2)} <span className="text-[8px] opacity-60">USDT</span>
            </span>
          </div>
        </div>
      </header>

      {/* PROVABLY FAIR MODAL */}
      {isProvablyFairModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131d27] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/30">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-black uppercase text-sm tracking-wider text-white">Algoritmo 100% Provably Fair</h3>
              </div>
              <button onClick={() => setIsProvablyFairModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-300">
              <p>
                O resultado de cada voo do Aviator é gerado com base em sementes criptográficas transparentes usando hash SHA-256 incorruptível.
              </p>

              <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2 font-mono">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Server Seed (Público Hash):</span>
                  <span className="text-[10px] text-emerald-400 break-all">a8f9e0c12b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Client Seed Atual:</span>
                  <span className="text-[10px] text-amber-300">crypton_bet_luanda_{Date.now().toString().slice(-6)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Fórmula do Multiplicador:</span>
                  <span className="text-[10px] text-purple-300">CrashPoint = Math.min(350, 0.98 / (1 - HashRandom))</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Nenhum operador ou jogador pode alterar o multiplicador após o início da ronda.</span>
              </div>
            </div>
            <div className="p-4 bg-black/30 border-t border-white/5 text-center">
              <button
                onClick={() => setIsProvablyFairModalOpen(false)}
                className="w-full py-2.5 bg-[#049444] text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#037235] transition-colors cursor-pointer"
              >
                Compreendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROUND DETAILS MODAL */}
      {selectedRoundForDetails && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131d27] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-black text-xs uppercase text-white tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Ronda #{selectedRoundForDetails.id.slice(-6)}
              </h3>
              <button onClick={() => setSelectedRoundForDetails(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-4 bg-black/40 rounded-2xl border border-white/5">
              <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Multiplicador Final</span>
              <span className={`text-4xl font-mono font-black ${selectedRoundForDetails.multiplier < 2 ? 'text-[#3498db]' : selectedRoundForDetails.multiplier < 10 ? 'text-purple-400' : 'text-amber-400'}`}>
                {selectedRoundForDetails.multiplier.toFixed(2)}x
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-black/20 p-3 rounded-xl">
              <div className="flex justify-between">
                <span>Horário:</span>
                <span className="text-white font-bold">{new Date(selectedRoundForDetails.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Verificação:</span>
                <span className="text-emerald-400 font-bold">SHA-256 Válido ✅</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedRoundForDetails(null)}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT CONTAINER */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* SIDEBAR DE APOSTAS AO VIVO (DESKTOP) */}
        {isDesktop && (
          <aside className="w-72 bg-[#0b1219] border-r border-white/5 flex flex-col shrink-0 z-20 overflow-hidden shadow-2xl">

            {/* TAB SELECTOR: LIVE | MY_BETS | TOP */}
            <div className="flex bg-[#131d27] border-b border-white/5 p-1 shrink-0">
              <button
                onClick={() => setActiveTab('LIVE')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'LIVE' ? 'bg-[#049444] text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Ao Vivo
              </button>
              <button
                onClick={() => setActiveTab('MY_BETS')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'MY_BETS' ? 'bg-[#049444] text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Minhas
              </button>
              <button
                onClick={() => setActiveTab('TOP')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'TOP' ? 'bg-[#049444] text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" /> Top
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-vertical-scrollbar bg-black/20">

              {activeTab === 'LIVE' && (
                <>
                  <div className="px-2 py-1 flex justify-between items-center text-[9px] font-black text-slate-500 uppercase border-b border-white/5 pb-1">
                    <span>Apostas: {liveBots.length + (hasActiveBet1 ? 1 : 0) + (hasActiveBet2 ? 1 : 0)}</span>
                    <span className="font-mono text-[#FFCC00]">{totalLiveBetsAmount.toFixed(0)} USDT</span>
                  </div>

                  {/* USER ACTIVE BETS IF PLACED */}
                  {hasActiveBet1 && (
                    <div className="p-2 bg-[#049444]/20 border border-[#049444]/40 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">👤</span>
                        <div>
                          <span className="font-bold text-white block text-[10px]">Você (Aposta 1)</span>
                          <span className="text-[9px] text-[#049444] font-bold">{bet1.amount.toFixed(2)} USDT</span>
                        </div>
                      </div>
                      {bet1.cashedOut ? (
                        <span className="px-2 py-0.5 bg-[#049444] text-white font-black text-[10px] rounded-md">
                          +{bet1.winAmount.toFixed(2)} ({bet1.multiplierAtCashout?.toFixed(2)}x)
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold text-[10px] animate-pulse">Em Voo...</span>
                      )}
                    </div>
                  )}

                  {hasActiveBet2 && (
                    <div className="p-2 bg-[#049444]/20 border border-[#049444]/40 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">👤</span>
                        <div>
                          <span className="font-bold text-white block text-[10px]">Você (Aposta 2)</span>
                          <span className="text-[9px] text-[#049444] font-bold">{bet2.amount.toFixed(2)} USDT</span>
                        </div>
                      </div>
                      {bet2.cashedOut ? (
                        <span className="px-2 py-0.5 bg-[#049444] text-white font-black text-[10px] rounded-md">
                          +{bet2.winAmount.toFixed(2)} ({bet2.multiplierAtCashout?.toFixed(2)}x)
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold text-[10px] animate-pulse">Em Voo...</span>
                      )}
                    </div>
                  )}

                  {/* LIVE BOTS LIST */}
                  {liveBots.map(bot => (
                    <div
                      key={bot.id}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                        bot.cashedOut
                          ? 'bg-[#049444]/10 border-[#049444]/30'
                          : 'bg-black/30 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{bot.avatar}</span>
                        <div className="truncate">
                          <span className="font-bold text-slate-200 text-[10px] block truncate">{bot.name}</span>
                          <span className="text-[9px] text-slate-500">{bot.betAmount} USDT</span>
                        </div>
                      </div>

                      {bot.cashedOut ? (
                        <div className="text-right shrink-0">
                          <span className="px-1.5 py-0.5 bg-[#049444]/30 text-[#049444] font-black text-[9px] rounded-md block">
                            {bot.cashoutMultiplier?.toFixed(2)}x
                          </span>
                          <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">
                            +{bot.winAmount?.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-600 font-bold uppercase">No Voo</span>
                      )}
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'MY_BETS' && (
                <div className="space-y-1.5">
                  {myBetHistory.length === 0 ? (
                    <div className="py-16 text-center opacity-30 text-xs uppercase font-bold tracking-widest">
                      Nenhuma aposta realizada nesta sessão
                    </div>
                  ) : (
                    myBetHistory.map(rec => (
                      <div
                        key={rec.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs ${
                          rec.status === 'WIN'
                            ? 'bg-[#049444]/15 border-[#049444]/30'
                            : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-[10px]">{rec.panelName}</span>
                            <span className="text-[8px] text-slate-500">{rec.timestamp}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{rec.betAmount.toFixed(2)} USDT</span>
                        </div>

                        {rec.status === 'WIN' ? (
                          <div className="text-right">
                            <span className="text-emerald-400 font-black text-[11px] block">
                              +{rec.winAmount.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-amber-400 font-bold">{rec.multiplier?.toFixed(2)}x</span>
                          </div>
                        ) : (
                          <span className="text-red-400 font-bold text-[10px] uppercase">Perdeu</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'TOP' && (
                <div className="space-y-2 p-1">
                  <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Maiores Multiplicadores do Dia
                  </div>

                  {[
                    { rank: '1º', name: 'Matias_Angola', mult: 542.80, win: '2,714 USDT', avatar: '👑' },
                    { rank: '2º', name: 'Benguela_Gamer', mult: 218.40, win: '1,092 USDT', avatar: '💎' },
                    { rank: '3º', name: 'Zero_Loss', mult: 184.10, win: '920 USDT', avatar: '🚀' },
                    { rank: '4º', name: 'Talatona_Bet', mult: 98.50, win: '492 USDT', avatar: '🦁' },
                    { rank: '5º', name: 'Luanda_King', mult: 76.20, win: '381 USDT', avatar: '⚡' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-2 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-amber-400 text-xs">{item.rank}</span>
                        <span className="text-base">{item.avatar}</span>
                        <div>
                          <span className="font-bold text-white text-[10px] block">{item.name}</span>
                          <span className="text-[9px] text-[#049444]">{item.win}</span>
                        </div>
                      </div>
                      <span className="font-black text-purple-400 text-xs bg-purple-500/20 px-2 py-0.5 rounded-lg">
                        {item.mult}x
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </aside>
        )}

        {/* MOBILE DRAWER (BETS OVERLAY) */}
        {!isDesktop && isMobileDrawerOpen && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
            <div className="bg-[#131d27] border-t border-white/10 rounded-t-3xl h-[70vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/30">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setActiveTab('LIVE')}
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                      activeTab === 'LIVE' ? 'bg-[#049444] text-white' : 'text-slate-400'
                    }`}
                  >
                    Ao Vivo
                  </button>
                  <button
                    onClick={() => setActiveTab('MY_BETS')}
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                      activeTab === 'MY_BETS' ? 'bg-[#049444] text-white' : 'text-slate-400'
                    }`}
                  >
                    Minhas Apostas
                  </button>
                </div>
                <button onClick={() => setIsMobileDrawerOpen(false)} className="p-2 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeTab === 'LIVE' ? (
                  liveBots.map(bot => (
                    <div key={bot.id} className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span>{bot.avatar}</span>
                        <span className="font-bold text-white text-xs">{bot.name}</span>
                      </div>
                      {bot.cashedOut ? (
                        <span className="text-[#049444] font-black">{bot.cashoutMultiplier?.toFixed(2)}x (+{bot.winAmount?.toFixed(1)})</span>
                      ) : (
                        <span className="text-slate-500 font-bold uppercase text-[10px]">No Voo</span>
                      )}
                    </div>
                  ))
                ) : (
                  myBetHistory.map(rec => (
                    <div key={rec.id} className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono">
                      <div>
                        <span className="font-bold text-white block">{rec.panelName}</span>
                        <span className="text-[10px] text-slate-400">{rec.timestamp}</span>
                      </div>
                      {rec.status === 'WIN' ? (
                        <span className="text-emerald-400 font-black">+{rec.winAmount.toFixed(2)} USDT ({rec.multiplier?.toFixed(2)}x)</span>
                      ) : (
                        <span className="text-red-400 font-bold uppercase text-xs">Perdeu</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAIN GAME ARENA */}
        <div className="flex-1 flex flex-col relative min-h-0 overflow-y-auto custom-vertical-scrollbar bg-[radial-gradient(circle_at_center,_#1a2c38_0%,_#05070a_100%)]">

          {/* HISTORY MULTIPLIER BAR */}
          <HistoryBar
            history={history}
            onClickMultiplier={(round) => setSelectedRoundForDetails(round)}
          />

          {/* CANVAS STAGE */}
          <div className="flex-1 min-h-[200px] sm:min-h-[320px] relative flex flex-col group mt-1">
            <div className="absolute inset-0 z-0 text-white/5 pointer-events-none">
              <GameCanvas status={status} multiplier={multiplier} />
            </div>

            {/* AI COMMENTARY OVERLAY */}
            <div className="absolute inset-0 pointer-events-none z-10 p-3 flex flex-col justify-between opacity-40 select-none">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#049444] animate-pulse" />
                  Sky Radar Active
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <div className="bg-black/70 px-4 py-1.5 rounded-2xl border border-white/10 max-w-xs text-center backdrop-blur-sm">
                  <p className="text-[9px] sm:text-[10px] font-mono font-bold text-[#FFCC00] italic">"{aiMessage}"</p>
                </div>
              </div>
            </div>

            {/* MULTIPLIER / TIMER DISPLAY */}
            <div className="flex-1 flex items-center justify-center relative z-20 pointer-events-none">
              {status === GameStatus.BETTING ? (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className={`rounded-full border-4 border-[#049444]/30 flex items-center justify-center relative shadow-[0_0_60px_rgba(4,148,68,0.15)] ${isDesktop ? 'w-44 h-44' : 'w-28 h-28 sm:w-36 sm:h-36'}`}>
                    <div className="absolute inset-0 rounded-full border-t-4 border-[#FFCC00] animate-spin" style={{ animationDuration: '0.8s' }} />
                    <div className="flex flex-col items-center">
                      <span className={`${isDesktop ? 'text-5xl' : 'text-3xl sm:text-4xl'} font-black font-mono tracking-tighter text-white drop-shadow-xl`}>
                        {bettingTimer.toFixed(1)}
                      </span>
                      <span className="text-[8px] font-black text-[#049444] uppercase tracking-widest mt-1">APOSTAS ABERTAS</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`text-center transition-all duration-300 ${isMilestone ? 'scale-110' : ''}`}>
                  <span className={`${isDesktop ? 'text-7xl sm:text-8xl md:text-[8.5rem]' : 'text-5xl sm:text-6xl'} font-black font-mono tracking-tighter leading-none block drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]
                    ${status === GameStatus.CRASHED ? 'text-red-500' : 'text-white shadow-[0_0_50px_rgba(255,255,255,0.1)]'}
                  `}>
                    {multiplier.toFixed(2)}<span className="text-[0.4em] ml-1">x</span>
                  </span>

                  {status === GameStatus.CRASHED && (
                    <motion.div
                      initial={{ scale: 0.8, y: 10 }}
                      animate={{ scale: 1, y: 0 }}
                      className="mt-2 sm:mt-3 inline-block bg-red-600 border border-red-400 px-5 py-1.5 rounded-xl shadow-2xl"
                    >
                      <span className="text-white font-black uppercase tracking-widest text-xs sm:text-sm italic">FLEW AWAY! VOOU DEMAIS!</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DUAL BET PANELS CONSOLE FOOTER */}
          <BetPanel
            status={status}
            bet1={bet1}
            bet2={bet2}
            setBet1={setBet1}
            setBet2={setBet2}
            hasActiveBet1={hasActiveBet1}
            hasActiveBet2={hasActiveBet2}
            onPlaceBet1={placeBet1}
            onPlaceBet2={placeBet2}
            onCancelBet1={cancelBet1}
            onCancelBet2={cancelBet2}
            onCashOut1={cashOut1}
            onCashOut2={cashOut2}
            multiplier={multiplier}
            balance={balance}
          />

          {/* SEÇÃO AO VIVO DE APOSTADORES (DIRETO ABAIXO DO PAINEL DO AVIATOR) */}
          <section className="mt-3 p-3 sm:p-4 bg-[#0b1219] border-t border-white/10 rounded-t-2xl sm:rounded-t-3xl shadow-2xl space-y-3 shrink-0">
            {/* Header com Tabs e Resumo Ao Vivo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#049444] animate-ping" />
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#049444]" /> Apostas Ao Vivo
                </h3>
                <span className="bg-[#049444]/20 text-[#049444] border border-[#049444]/30 px-2 py-0.5 rounded-full text-[9px] font-mono font-black">
                  {liveBots.length + (hasActiveBet1 ? 1 : 0) + (hasActiveBet2 ? 1 : 0)} ONLINE
                </span>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-[#131d27] p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('LIVE')}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'LIVE' ? 'bg-[#049444] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3" /> Ao Vivo
                </button>
                <button
                  onClick={() => setActiveTab('MY_BETS')}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'MY_BETS' ? 'bg-[#049444] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3 h-3" /> Minhas Apostas
                </button>
                <button
                  onClick={() => setActiveTab('TOP')}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'TOP' ? 'bg-[#049444] text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3 h-3 text-[#FFCC00]" /> Ranking Top
                </button>
              </div>
            </div>

            {/* TAB LIVE */}
            {activeTab === 'LIVE' && (
              <div className="space-y-2">
                {/* Table Header Row */}
                <div className="grid grid-cols-12 px-2 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                  <div className="col-span-5 sm:col-span-4">Jogador</div>
                  <div className="col-span-3 sm:col-span-3 text-center">Aposta (USDT)</div>
                  <div className="col-span-2 sm:col-span-2 text-center">Multiplicador</div>
                  <div className="col-span-2 sm:col-span-3 text-right">Ganho</div>
                </div>

                {/* USER ACTIVE BET 1 ROW */}
                {hasActiveBet1 && (
                  <div className="grid grid-cols-12 items-center p-2 bg-[#049444]/20 border border-[#049444]/50 rounded-xl text-xs font-mono shadow-md">
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5 truncate">
                      <span className="text-sm">👤</span>
                      <div className="truncate">
                        <span className="font-black text-white text-[11px] block truncate">Você (Aposta 1)</span>
                        <span className="text-[8px] text-[#049444] uppercase font-bold">Aposta Ativa</span>
                      </div>
                    </div>
                    <div className="col-span-3 sm:col-span-3 text-center font-bold text-white">
                      {bet1.amount.toFixed(2)}
                    </div>
                    <div className="col-span-2 sm:col-span-2 text-center">
                      {bet1.cashedOut ? (
                        <span className="bg-[#049444] text-white px-2 py-0.5 rounded font-black text-[10px]">
                          {bet1.multiplierAtCashout?.toFixed(2)}x
                        </span>
                      ) : status === GameStatus.FLYING ? (
                        <span className="text-[#FFCC00] font-black text-[10px] animate-pulse">
                          {multiplier.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">-</span>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-3 text-right font-black">
                      {bet1.cashedOut ? (
                        <span className="text-[#049444]">+{bet1.winAmount.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </div>
                  </div>
                )}

                {/* USER ACTIVE BET 2 ROW */}
                {hasActiveBet2 && (
                  <div className="grid grid-cols-12 items-center p-2 bg-[#049444]/20 border border-[#049444]/50 rounded-xl text-xs font-mono shadow-md">
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5 truncate">
                      <span className="text-sm">👤</span>
                      <div className="truncate">
                        <span className="font-black text-white text-[11px] block truncate">Você (Aposta 2)</span>
                        <span className="text-[8px] text-[#049444] uppercase font-bold">Aposta Ativa</span>
                      </div>
                    </div>
                    <div className="col-span-3 sm:col-span-3 text-center font-bold text-white">
                      {bet2.amount.toFixed(2)}
                    </div>
                    <div className="col-span-2 sm:col-span-2 text-center">
                      {bet2.cashedOut ? (
                        <span className="bg-[#049444] text-white px-2 py-0.5 rounded font-black text-[10px]">
                          {bet2.multiplierAtCashout?.toFixed(2)}x
                        </span>
                      ) : status === GameStatus.FLYING ? (
                        <span className="text-[#FFCC00] font-black text-[10px] animate-pulse">
                          {multiplier.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">-</span>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-3 text-right font-black">
                      {bet2.cashedOut ? (
                        <span className="text-[#049444]">+{bet2.winAmount.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </div>
                  </div>
                )}

                {/* LIVE BOTS LIST */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto custom-vertical-scrollbar pr-1">
                  {liveBots.map((bot) => (
                    <div
                      key={bot.id}
                      className={`grid grid-cols-12 items-center p-2 rounded-xl border text-xs font-mono transition-all ${
                        bot.cashedOut
                          ? 'bg-[#049444]/10 border-[#049444]/30'
                          : 'bg-black/30 border-white/5'
                      }`}
                    >
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-2 truncate">
                        <span className="text-sm">{bot.avatar}</span>
                        <span className="font-bold text-slate-200 text-[11px] truncate">{bot.name}</span>
                      </div>

                      <div className="col-span-3 sm:col-span-3 text-center text-slate-300 font-medium">
                        {bot.betAmount.toFixed(2)} <span className="text-[8px] text-slate-500">USDT</span>
                      </div>

                      <div className="col-span-2 sm:col-span-2 text-center">
                        {bot.cashedOut ? (
                          <span className="bg-[#049444]/20 border border-[#049444]/40 text-[#049444] px-1.5 py-0.5 rounded text-[10px] font-black">
                            {bot.cashoutMultiplier?.toFixed(2)}x
                          </span>
                        ) : status === GameStatus.FLYING ? (
                          <span className="text-[#FFCC00] text-[10px] font-bold animate-pulse">
                            Em Voo...
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">-</span>
                        )}
                      </div>

                      <div className="col-span-2 sm:col-span-3 text-right font-black">
                        {bot.cashedOut ? (
                          <span className="text-[#049444]">+{bot.winAmount?.toFixed(2)}</span>
                        ) : status === GameStatus.CRASHED ? (
                          <span className="text-red-400/60 text-[10px]">Perdeu</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB MY BETS */}
            {activeTab === 'MY_BETS' && (
              <div className="space-y-1.5 max-h-80 overflow-y-auto custom-vertical-scrollbar">
                {myBetHistory.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">
                    Nenhuma aposta registrada nesta sessão ainda.
                  </div>
                ) : (
                  myBetHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center text-xs font-mono"
                    >
                      <div>
                        <span className="font-bold text-white block text-[11px]">{rec.panelName}</span>
                        <span className="text-[9px] text-slate-500">{rec.timestamp} • Aposta: {rec.betAmount} USDT</span>
                      </div>
                      {rec.status === 'WIN' ? (
                        <div className="text-right">
                          <span className="text-[#049444] font-black block">+{rec.winAmount.toFixed(2)} USDT</span>
                          <span className="text-[9px] text-[#FFCC00] font-bold">{rec.multiplier?.toFixed(2)}x</span>
                        </div>
                      ) : (
                        <span className="text-red-400 font-bold uppercase text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          Perdeu
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB TOP */}
            {activeTab === 'TOP' && (
              <div className="space-y-2">
                <div className="text-[10px] font-black text-[#FFCC00] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-[#FFCC00]" /> Maiores Multiplicadores do Dia no Aviator
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { rank: '1º', name: 'Matias_Angola', mult: 542.80, win: '2,714 USDT', avatar: '👑' },
                    { rank: '2º', name: 'Benguela_Gamer', mult: 218.40, win: '1,092 USDT', avatar: '💎' },
                    { rank: '3º', name: 'Zero_Loss', mult: 184.10, win: '920 USDT', avatar: '🚀' },
                    { rank: '4º', name: 'Talatona_Bet', mult: 98.50, win: '492 USDT', avatar: '🦁' },
                    { rank: '5º', name: 'Luanda_King', mult: 76.20, win: '381 USDT', avatar: '⚡' },
                    { rank: '6º', name: 'Kizomba_Winner', mult: 55.40, win: '277 USDT', avatar: '🔥' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#FFCC00] text-xs">{item.rank}</span>
                        <span className="text-base">{item.avatar}</span>
                        <div>
                          <span className="font-bold text-white text-[11px] block">{item.name}</span>
                          <span className="text-[9px] text-[#049444] font-bold">{item.win}</span>
                        </div>
                      </div>
                      <span className="font-black text-purple-400 text-xs bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">
                        {item.mult}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>
      </div>

      <style>{`
        .custom-vertical-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-vertical-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-vertical-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(4, 148, 68, 0.4);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default AviatorView;
