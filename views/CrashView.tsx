import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Wallet, TrendingUp, Sparkles, Zap, Trophy, Timer, Star, Users, Flame, Award, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { soundService } from '../services/soundService';

interface CrashViewProps {
  balance: number;
  isDemo?: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

interface EdibleItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  label: string;
  bonusText: string;
}

interface ChompParticle {
  id: string;
  text: string;
  x: number;
  y: number;
}

interface LivePlayer {
  id: string;
  name: string;
  bet: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  avatar: string;
}

const AVATARS = [
  { id: 'golbat', name: 'Golbat Chomp', emoji: '😮', desc: 'Boca Aberta Padrão (Come Tudo)', color: 'from-purple-600 to-indigo-600' },
  { id: 'dragon', name: 'Dragão Voraz', emoji: '🐲', desc: 'Lendário Dragão Guzzlord', color: 'from-emerald-600 to-teal-700' },
  { id: 'alien', name: 'Pac-Alien', emoji: '👾', desc: 'Devorador Cósmico Retro', color: 'from-pink-600 to-purple-700' },
  { id: 'whale', name: 'Wail-Bocão', emoji: '🐋', desc: 'Baleia Aérea Gigante', color: 'from-blue-600 to-cyan-700' },
];

const FOOD_POOL = [
  { emoji: '🍒', label: 'Cereja Turbo', bonus: '+0.15x 😋' },
  { emoji: '🍎', label: 'Maçã de Ouro', bonus: '+0.20x 🍏' },
  { emoji: '🍇', label: 'Uva Cósmica', bonus: '+0.25x 🍇' },
  { emoji: '🍕', label: 'Pizza VIP', bonus: '+0.40x 🍕' },
  { emoji: '🍔', label: 'Mega Burger', bonus: '+0.50x 🍔' },
  { emoji: '🍬', label: 'Doce Mágico', bonus: '+0.30x 🍬' },
  { emoji: '🪙', label: 'Moeda Cripto', bonus: 'CHOMP COIN! 🪙' },
  { emoji: '⭐', label: 'Estrela Multi', bonus: 'MEGA CHOMP! ⭐' },
  { emoji: '💎', label: 'Diamante Puro', bonus: 'DIAMOND CRUNCH! 💎' },
  { emoji: '⚡', label: 'Raio Turbo', bonus: 'SPEED UP! ⚡' },
];

const BOT_NAMES = [
  'Mateus_VIP', 'Beatriz_Luanda', 'Cristiano_Pro', 'Nelson_Crash', 'Sofia_Angola',
  'Zeca_Chomp', 'Paulo_Trader', 'Ana_Crypto', 'Lucas_Master', 'Tania_Vip', 'Kelson_Luanda'
];

const CrashView: React.FC<CrashViewProps> = ({ balance, isDemo = false, onUpdateBalance, onBack }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState<number | string>('');
  const [multiplier, setMultiplier] = useState(1.00);
  const [status, setStatus] = useState<'WAITING' | 'RUNNING' | 'CRASHED'>('WAITING');
  const [countdown, setCountdown] = useState(5);
  const [isBetPlaced, setIsBetPlaced] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [cashoutValue, setCashoutValue] = useState<number | null>(null);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([1.45, 2.10, 15.40, 1.02, 5.80, 3.25, 1.15, 8.90, 2.05, 1.88]);
  
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [edibleItems, setEdibleItems] = useState<EdibleItem[]>([]);
  const [particles, setParticles] = useState<ChompParticle[]>([]);
  const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiveBetsModalOpen, setIsLiveBetsModalOpen] = useState(false);

  const multiplierRef = useRef(1.00);
  const gameLoopRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const mouthPosRef = useRef({ x: 25, y: 50 });

  // Gerar bots de apostadores para o round
  const generateBots = () => {
    const count = 5 + Math.floor(Math.random() * 6);
    const bots: LivePlayer[] = [];
    const shuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    for (let i = 0; i < count; i++) {
      bots.push({
        id: `bot_${i}_${Date.now()}`,
        name: shuffled[i],
        bet: Number((5 + Math.random() * 95).toFixed(2)),
        cashedOut: false,
        avatar: ['👨‍🚀', '👩‍🚀', '🦊', '🦁', '🐉', '🐯', '🐼'][i % 7]
      });
    }
    setLivePlayers(bots);
  };

  // Sistema de Jogo Automático
  useEffect(() => {
    let timer: any;
    if (status === 'WAITING') {
      if (countdown === 5) {
        generateBots();
        setEdibleItems([]);
        setParticles([]);
      }
      if (countdown > 0) {
        timer = setTimeout(() => {
          setCountdown(c => c - 1);
          if (!isMuted) soundService.playTick();
        }, 1000);
      } else {
        startRound();
      }
    }
    return () => clearTimeout(timer);
  }, [status, countdown, isMuted]);

  const startRound = () => {
    setStatus('RUNNING');
    setMultiplier(1.00);
    multiplierRef.current = 1.00;
    setHasCashedOut(false);
    setCashoutValue(null);
    setEdibleItems([]);
    setParticles([]);
    lastSpawnRef.current = Date.now();
    
    if (!isMuted) {
      soundService.playEmojiFlightStart();
    }
    
    // Provably Fair Crash Point (Algoritmo de Crash estilo Aviator)
    const random = Math.random();
    // 5% de chance de crash instantâneo 1.00x para proteção da casa, resto curva exponencial
    const point = random < 0.05 ? 1.00 : Math.max(1.01, Number((99 / (1 - random) / 100).toFixed(2)));
    setCrashPoint(point);

    const step = () => {
      // Crescimento exponencial suave como no Aviator
      const current = multiplierRef.current;
      const speed = 0.003 + (current * 0.004);
      multiplierRef.current = Number((current + speed).toFixed(2));
      setMultiplier(multiplierRef.current);

      // Simular bots realizando Cashout
      setLivePlayers(prev => prev.map(bot => {
        if (!bot.cashedOut) {
          // Chance de sacar dependendo do multiplicador
          const chanceToCash = (multiplierRef.current - 1.05) * 0.15;
          if (Math.random() < chanceToCash || multiplierRef.current >= 10) {
            return { ...bot, cashedOut: true, cashoutMultiplier: multiplierRef.current };
          }
        }
        return bot;
      }));

      // Posição atual do Emoji voando estritamente da esquerda para a direita (vôo horizontal no céu)
      const mouthX = Math.min(85, 12 + (multiplierRef.current - 1) * 18);
      const mouthY = 48 + Math.sin(Date.now() / 300) * 8; // Flutuação suave horizontal da esquerda para a direita

      // Spawnar itens de comida para o Emoji engolir
      const now = Date.now();
      if (now - lastSpawnRef.current > 650) {
        lastSpawnRef.current = now;
        const randomFood = FOOD_POOL[Math.floor(Math.random() * FOOD_POOL.length)];
        const newItem: EdibleItem = {
          id: `food_${now}_${Math.random()}`,
          emoji: randomFood.emoji,
          x: 95, // Nasce no extremo direito para o vôo da esquerda para a direita
          y: Math.max(25, Math.min(75, mouthY + (Math.random() * 30 - 15))), // Nasce na faixa horizontal do emoji
          label: randomFood.label,
          bonusText: randomFood.bonus
        };
        setEdibleItems(prev => [...prev.slice(-6), newItem]);
      }

      // Mover os itens para a esquerda (em direção à boca que voa da esquerda para a direita)
      setEdibleItems(prev => {
        return prev.map(item => {
          const newX = item.x - (1.8 + multiplierRef.current * 0.35);
          // Verificar colisão com a boca aberta
          if (newX <= mouthX + 6 && newX >= mouthX - 8 && Math.abs(item.y - mouthY) <= 28) {
            // HOUVE COLISÃO! O EMOJI COMEU O OUTRO EMOJI!
            triggerChompEffect(item, mouthX, mouthY);
            return null; // Removido por ter sido comido
          }
          return { ...item, x: newX };
        }).filter(Boolean) as EdibleItem[];
      });

      // Auto Cashout do Jogador
      const acValue = parseFloat(autoCashout.toString());
      if (acValue > 1 && multiplierRef.current >= acValue && isBetPlaced && !hasCashedOut) {
        handleCashout();
      }

      if (multiplierRef.current >= point) {
        crash();
      } else {
        gameLoopRef.current = requestAnimationFrame(step);
      }
    };

    gameLoopRef.current = requestAnimationFrame(step);
  };

  const triggerChompEffect = (item: EdibleItem, mouthX: number = 30, mouthY: number = 50) => {
    // Efeito sonoro de Chomp / Mastigada
    if (!isMuted) {
      soundService.playChomp();
    }

    // Criar partícula flutuante na tela logo acima de onde comeu
    const newParticle: ChompParticle = {
      id: `part_${Date.now()}_${Math.random()}`,
      text: item.bonusText,
      x: mouthX + (Math.random() * 8 - 4),
      y: mouthY - 14
    };
    setParticles(prev => [...prev.slice(-4), newParticle]);

    // Pequeno pulso no multiplicador para celebrar a comida
    multiplierRef.current = Number((multiplierRef.current + 0.03).toFixed(2));
    setMultiplier(multiplierRef.current);
  };

  const crash = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setStatus('CRASHED');
    if (!isMuted) {
      soundService.playEmojiCrash();
    }
    
    setHistory(prev => [multiplierRef.current, ...prev].slice(0, 15));
    setIsBetPlaced(false);
    
    setTimeout(() => {
      setStatus('WAITING');
      setCountdown(5);
      setMultiplier(1.00);
      multiplierRef.current = 1.00;
      setEdibleItems([]);
      setParticles([]);
    }, 4000);
  };

  const handlePlaceBet = () => {
    if (balance < betAmount || betAmount < 5 || isBetPlaced || status !== 'WAITING') return;
    setIsBetPlaced(true);
    onUpdateBalance(-betAmount);
    if (!isMuted) soundService.playUISelect();
  };

  const handleCashout = () => {
    if (!isBetPlaced || status !== 'RUNNING' || hasCashedOut) return;
    
    const winAmount = betAmount * multiplier;
    onUpdateBalance(winAmount);
    setHasCashedOut(true);
    setCashoutValue(multiplier);
    if (!isMuted) soundService.playWin();
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      soundService.setMute(next);
      return next;
    });
  };

  return (
    <div className="flex-1 min-h-full w-full bg-[#05070a] text-white flex flex-col font-sans overflow-y-auto custom-vertical-scrollbar select-none relative pb-6 sm:pb-0">
      {/* Header com estilo Dark VIP / CryptonBet */}
      <header className="px-3 py-2 md:px-4 md:py-3 flex items-center justify-between bg-[#131d27] border-b border-white/10 shadow-md z-20 shrink-0 h-12 md:h-14">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { if (!isMuted) soundService.playUISelect(); onBack(); }} 
            className="w-8 h-8 md:w-9 md:h-9 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs group border border-white/10"
            title="Voltar"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg md:text-xl">{selectedAvatar.emoji}</span>
              <h1 className="text-xs md:text-base font-black text-white tracking-tight uppercase">
                POKE <span className="text-[#049444]">CHOMP</span> VIP
              </h1>
              <span className="bg-[#049444]/20 text-[#049444] text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-[#049444]/40">
                NOVO
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 tracking-wide hidden sm:block">
              O Emoji de Boca Aberta voa engolindo outros emojis nas alturas!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Live Bets Drawer Trigger */}
          <button
            onClick={() => { if (!isMuted) soundService.playUISelect(); setIsLiveBetsModalOpen(true); }}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-[#049444]/20 hover:bg-[#049444]/30 text-[#049444] border border-[#049444]/30 rounded-xl text-xs font-black uppercase transition-all cursor-pointer active:scale-95 shrink-0"
            title="Ver Apostas Ao Vivo"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px]">({livePlayers.length + (isBetPlaced ? 1 : 0)})</span>
          </button>

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="w-8 h-8 md:w-9 md:h-9 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title={isMuted ? "Ativar Som" : "Silenciar Som"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#049444]" />}
          </button>

          {/* Estado de Voo / Rodada */}
          <div className="hidden md:flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            <div className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'bg-[#049444] animate-ping' : status === 'CRASHED' ? 'bg-red-500' : 'bg-[#FFCC00]'}`} />
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
              {status === 'WAITING' ? `Próximo Voo: ${countdown}s` : status === 'RUNNING' ? 'Em Voo - Comendo!' : 'Explodiu / Fugiu!'}
            </span>
          </div>

          {/* Saldo */}
          <div className="flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-xl border border-white/10 shadow-md">
            <Wallet className="w-3.5 h-3.5 text-[#FFCC00]" />
            <span className="font-mono font-bold text-xs sm:text-sm text-[#FFCC00] tracking-tight">{balance.toFixed(2)} USDT</span>
            {isDemo && <span className="bg-amber-500 text-slate-950 text-[8px] font-black px-1 py-0.2 rounded uppercase">DEMO</span>}
          </div>
        </div>
      </header>

      {/* Histórico Superior (Multiplicadores Recentes) */}
      <div className="bg-[#0b1219] border-b border-white/10 px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 h-10">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1 shrink-0 mr-1">
          <TrendingUp className="w-3 h-3 text-[#049444]" /> Histórico:
        </span>
        {history.map((h, i) => (
          <motion.div 
            key={i} 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-2.5 py-0.5 rounded-lg font-mono font-black text-[10px] sm:text-xs shrink-0 border transition-all shadow-xs ${
              h >= 10 ? 'bg-amber-500/20 text-[#FFCC00] border-amber-500/40 shadow-amber-500/10' :
              h >= 2 ? 'bg-[#049444]/20 text-emerald-400 border-[#049444]/40' : 
              'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            {h.toFixed(2)}x
          </motion.div>
        ))}
      </div>

      {/* Área Principal de Jogo */}
      <main className="flex-1 flex flex-col lg:flex-row p-2 sm:p-3 gap-2 sm:gap-3 overflow-hidden relative min-h-0">
        
        {/* Lado Esquerdo / Central: Arena de Voo com Emoji Boca Aberta */}
        <div className="flex-1 bg-[#131d27] rounded-2xl md:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[180px] sm:min-h-[300px] h-full">
          
          {/* Background Grid Limpo & Nuvens */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute top-6 left-10 text-3xl opacity-20 select-none animate-pulse">☁️</div>
          <div className="absolute top-16 right-20 text-4xl opacity-25 select-none animate-pulse" style={{ animationDelay: '1s' }}>☁️</div>
          <div className="absolute bottom-20 left-1/3 text-2xl opacity-20 select-none animate-pulse" style={{ animationDelay: '2s' }}>☁️</div>

          <AnimatePresence mode="wait">
            {status === 'WAITING' ? (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="z-10 flex flex-col items-center gap-3 sm:gap-4 text-center px-4 pb-12 pt-2 my-auto"
              >
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-black/40 rounded-2xl sm:rounded-[2rem] flex items-center justify-center border-2 border-[#FFCC00]/40 relative shadow-xl">
                  <motion.span 
                    animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-4xl sm:text-6xl select-none"
                  >
                    {selectedAvatar.emoji}
                  </motion.span>
                  <div className="absolute inset-0 border-4 border-[#FFCC00] rounded-2xl sm:rounded-[2rem] border-t-transparent animate-spin" />
                </div>
                <div>
                  <h2 className="text-white font-black text-xl sm:text-3xl tracking-tight uppercase mb-1">
                    Preparando para Devorar!
                  </h2>
                  <p className="text-slate-400 text-xs font-semibold mb-2">
                    Faça sua aposta antes que o {selectedAvatar.name} levante voo!
                  </p>
                  <div className="inline-flex items-center gap-2 text-slate-950 font-black text-xs sm:text-base px-4 py-1.5 sm:px-6 sm:py-2 bg-[#FFCC00] rounded-full shadow-md border border-amber-400 animate-pulse">
                    <Timer className="w-4 h-4 sm:w-5 sm:h-5" /> VOO EM {countdown} SEGUNDOS
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="z-10 flex flex-col items-center justify-center w-full h-full relative">
                
                {/* Multiplicador Gigante Central */}
                <motion.div 
                  animate={status === 'CRASHED' ? { scale: [1, 1.2, 0.9], opacity: [1, 0.7, 0.4] } : {}}
                  className={`text-5xl sm:text-7xl md:text-[8.5rem] font-mono font-black tracking-tighter leading-none mb-2 flex items-end drop-shadow-md select-none transition-colors ${
                    status === 'CRASHED' ? 'text-red-500' : 'text-[#049444]'
                  }`}
                >
                  {multiplier.toFixed(2)}<span className="text-2xl sm:text-5xl md:text-6xl ml-1 mb-1 sm:mb-4">X</span>
                </motion.div>

                {/* Banner de Status Abaixo do Multiplicador */}
                {status === 'RUNNING' && !hasCashedOut && (
                  <div className="bg-[#049444]/20 text-[#049444] px-4 py-1 rounded-full font-black text-xs md:text-sm uppercase tracking-wider border border-[#049444]/40 shadow-2xs flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-4 h-4" /> COME EMOJIS PARA MULTIPLICAR TURBO!
                  </div>
                )}

                {hasCashedOut && status === 'RUNNING' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#FFCC00] text-slate-950 px-5 py-2 sm:px-8 sm:py-2.5 rounded-2xl font-black text-xs sm:text-xl uppercase tracking-wider shadow-xl border-2 border-amber-300 flex items-center gap-2"
                  >
                    <Award className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
                    SACADO EM {cashoutValue?.toFixed(2)}x (+ {(betAmount * (cashoutValue || 1)).toFixed(2)} USDT)
                  </motion.div>
                )}

                {status === 'CRASHED' && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-red-600 text-white font-black text-sm sm:text-xl uppercase tracking-widest px-5 py-2 sm:px-8 sm:py-2.5 rounded-2xl shadow-2xl border-2 border-red-400 flex items-center gap-2 mt-2"
                  >
                    <ShieldAlert className="w-5 h-5 sm:w-7 sm:h-7 animate-bounce" />
                    BURP! 💨 EXPLODIU EM {multiplier.toFixed(2)}x!
                  </motion.div>
                )}

                {/* =========================================================
                    AVATAR DE BOCA ABERTA VOANDO & COMENDO OUTROS EMOJIS
                    ========================================================= */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  
                  {/* Nuvens e Vento passando da direita para a esquerda */}
                  {status === 'RUNNING' && (
                    <div className="absolute inset-0 opacity-40">
                      <motion.div
                        animate={{ x: ['1000px', '-200px'] }}
                        transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                        className="absolute top-1/4 left-0 text-3xl select-none"
                      >
                        ☁️
                      </motion.div>
                      <motion.div
                        animate={{ x: ['1000px', '-200px'] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'linear', delay: 1 }}
                        className="absolute top-1/2 left-0 text-2xl select-none"
                      >
                        💨
                      </motion.div>
                      <motion.div
                        animate={{ x: ['1000px', '-200px'] }}
                        transition={{ repeat: Infinity, duration: 4.5, ease: 'linear', delay: 0.7 }}
                        className="absolute top-1/3 left-0 text-4xl select-none"
                      >
                        ☁️
                      </motion.div>
                      <motion.div
                        animate={{ x: ['1000px', '-200px'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear', delay: 1.8 }}
                        className="absolute top-2/3 left-0 text-xl select-none"
                      >
                        ✨
                      </motion.div>
                    </div>
                  )}

                  {/* O Emoji de Boca Aberta (Voando da esquerda para a direita) */}
                  <motion.div
                    animate={
                      status === 'CRASHED'
                        ? { left: '45%', top: '48%', scale: [1.3, 1.8, 0], rotate: [0, 180, 360] }
                        : { 
                            left: `${Math.min(85, 12 + (multiplier - 1) * 18)}%`,
                            top: `${48 + Math.sin(Date.now() / 300) * 8}%`,
                            rotate: [0, -4, 4, 0]
                          }
                    }
                    transition={{ rotate: { repeat: Infinity, duration: 0.8 } }}
                    className="absolute z-30 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-linear"
                  >
                    <div className="relative flex items-center">
                      {status === 'RUNNING' && (
                        <div className="absolute right-full top-1/2 -translate-y-1/2 flex items-center pr-1 pointer-events-none">
                          <span className="text-xl animate-ping opacity-80">💨</span>
                          <span className="text-lg opacity-60 -ml-2">✨</span>
                        </div>
                      )}
                      <span className="text-4xl sm:text-6xl drop-shadow-xl select-none">
                        {status === 'CRASHED' ? '💥' : selectedAvatar.emoji}
                      </span>
                      {status === 'RUNNING' && (
                        <span className="absolute -bottom-2 -left-2 text-lg animate-bounce">
                          ✨
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {/* Os Outros Emojis Flutuantes (Alvos Sendo Comidos) */}
                  {status === 'RUNNING' && edibleItems.map((item) => (
                    <div
                      key={item.id}
                      style={{ left: `${item.x}%`, top: `${item.y}%` }}
                      className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-linear flex flex-col items-center"
                    >
                      <span className="text-2xl sm:text-4xl drop-shadow-md select-none animate-pulse">
                        {item.emoji}
                      </span>
                    </div>
                  ))}

                  {/* Partículas flutuantes de "CHOMP! +0.25x!" quando come */}
                  {particles.map((part) => (
                    <motion.div
                      key={part.id}
                      initial={{ opacity: 1, scale: 0.5, y: 0 }}
                      animate={{ opacity: 0, scale: 1.3, y: -40 }}
                      transition={{ duration: 1 }}
                      style={{ left: `${part.x}%`, top: `${part.y}%` }}
                      className="absolute z-40 bg-[#0b1219] text-[#FFCC00] font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-400 shadow-xl pointer-events-none whitespace-nowrap"
                    >
                      {part.text}
                    </motion.div>
                  ))}

                  {/* Linha Horizontal de Trajetória */}
                  {status === 'RUNNING' && (
                    <svg className="absolute bottom-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
                      <motion.path 
                        d={`M 50 ${600 * 0.48} L ${Math.min(850, (12 + (multiplier - 1) * 18) * 10)} ${600 * 0.48}`}
                        fill="none"
                        stroke="#FFCC00"
                        strokeWidth="4"
                        strokeDasharray="14 10"
                        strokeLinecap="round"
                        className="opacity-40 animate-pulse"
                      />
                    </svg>
                  )}
                </div>

              </div>
            )}
          </AnimatePresence>

          {/* Seletor Rápido de Avatar de Boca Aberta (Rodapé Interno do Canvas) */}
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-sm flex items-center justify-between gap-2 overflow-x-auto no-scrollbar z-20">
            <span className="text-[9px] font-black uppercase text-slate-400 shrink-0 ml-1">
              Bocão:
            </span>
            <div className="flex gap-1.5">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => {
                    if (!isMuted) soundService.playUISelect();
                    setSelectedAvatar(av);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold text-xs transition-all cursor-pointer shrink-0 border ${
                    selectedAvatar.id === av.id
                      ? 'bg-[#049444] text-white border-emerald-500 shadow-md scale-105'
                      : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{av.emoji}</span>
                  <span className="text-[9px] font-black uppercase">{av.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Lado Direito / Painel Lateral DESKTOP: Jogadores Ao Vivo & Estatísticas */}
        <div className="hidden lg:flex w-80 bg-[#131d27] rounded-[2rem] border border-white/10 shadow-2xl p-4 flex-col justify-between shrink-0 h-full overflow-hidden text-white">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#049444]" /> Apostas Ao Vivo ({livePlayers.length + (isBetPlaced ? 1 : 0)})
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Online 🟢
              </span>
            </div>

            {/* Lista de Apostadores Ao Vivo no Desktop */}
            <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1 no-scrollbar">
              {/* O Próprio Jogador */}
              {isBetPlaced && (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                  hasCashedOut 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{selectedAvatar.emoji}</span>
                    <span className="font-black">Você (VIP)</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono font-black">{betAmount.toFixed(2)}</span>
                    {hasCashedOut && (
                      <span className="text-[10px] font-black text-emerald-400">
                        {cashoutValue?.toFixed(2)}x (+ {(betAmount * (cashoutValue || 1)).toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bots de Apostadores */}
              {livePlayers.map((bot) => (
                <div 
                  key={bot.id}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    bot.cashedOut
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-200 font-bold'
                      : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{bot.avatar}</span>
                    <span className="font-medium text-white truncate max-w-[100px]">{bot.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-white">{bot.bet.toFixed(2)}</span>
                    {bot.cashedOut && (
                      <span className="block text-[9px] font-black text-emerald-400">
                        {bot.cashoutMultiplier?.toFixed(2)}x ✅
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dica de Jogo no Rodapé da Sidebar Desktop */}
          <div className="mt-3 p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-200 text-[11px] font-medium">
            <span className="font-black flex items-center gap-1 mb-0.5 text-[#FFCC00]">
              <Flame className="w-3.5 h-3.5 text-[#FFCC00]" /> Dica de Piloto VIP:
            </span>
            Quanto mais comida o {selectedAvatar.name} engole, mais rápido o multiplicador sobe! Saque antes que ele dê um arrepio e voe!
          </div>
        </div>

      </main>

      {/* Drawer / Modal de Apostas Ao Vivo para Dispositivos Móveis */}
      <AnimatePresence>
        {isLiveBetsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsLiveBetsModalOpen(false)} />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#131d27] w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh] p-4 sm:p-6"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#049444]" /> Apostas Ao Vivo ({livePlayers.length + (isBetPlaced ? 1 : 0)})
                </h3>
                <button 
                  onClick={() => setIsLiveBetsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-white/10 rounded-full cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Lista de Jogadores no Modal */}
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-vertical-scrollbar">
                {isBetPlaced && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    hasCashedOut 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{selectedAvatar.emoji}</span>
                      <span className="font-black">Você (VIP)</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono font-black">{betAmount.toFixed(2)} USDT</span>
                      {hasCashedOut && (
                        <span className="text-[10px] font-black text-emerald-400">
                          {cashoutValue?.toFixed(2)}x (+ {(betAmount * (cashoutValue || 1)).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {livePlayers.map((bot) => (
                  <div 
                    key={bot.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      bot.cashedOut
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-200 font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{bot.avatar}</span>
                      <span className="font-medium text-white truncate max-w-[120px]">{bot.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white">{bot.bet.toFixed(2)} USDT</span>
                      {bot.cashedOut && (
                        <span className="block text-[10px] font-black text-emerald-400">
                          {bot.cashoutMultiplier?.toFixed(2)}x ✅
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Dica VIP no Modal */}
              <div className="mt-3 p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-200 text-xs shrink-0">
                <span className="font-black flex items-center gap-1 mb-0.5 text-[#FFCC00]">
                  <Flame className="w-3.5 h-3.5 text-[#FFCC00]" /> Dica de Piloto VIP:
                </span>
                Quanto mais comida o {selectedAvatar.name} engole, mais rápido o multiplicador sobe! Saque antes que ele dê um arrepio e voe!
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rodapé de Ação / Painel de Apostas Fixo no Fundo */}
      <footer className="bg-[#0b1219] p-2.5 sm:p-3 pb-20 sm:pb-3 border-t border-white/10 shadow-2xl shrink-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center">
          
          <div className="flex-1 w-full grid grid-cols-2 gap-2">
            {/* Campo 1: Valor da Aposta */}
            <div className="bg-black/60 p-2 sm:p-2.5 rounded-xl border border-white/10">
              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Aposta (USDT)</span>
                <div className="flex gap-1">
                  <button onClick={() => setBetAmount(Math.max(5, Math.floor(betAmount / 2)))} className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[8px] font-black text-white border border-white/10 cursor-pointer">1/2</button>
                  <button onClick={() => setBetAmount(betAmount * 2)} className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[8px] font-black text-white border border-white/10 cursor-pointer">2x</button>
                  <button onClick={() => setBetAmount(100)} className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[8px] font-black text-white border border-white/10 cursor-pointer">MAX</button>
                </div>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 font-black text-slate-400 text-xs">$</span>
                <input 
                  type="number"
                  min={5}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(5, Number(e.target.value)))}
                  disabled={isBetPlaced}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-lg pl-6 pr-2 py-1 text-white font-black text-center focus:outline-none focus:border-[#FFCC00] text-sm shadow-inner disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            {/* Campo 2: Auto Cashout */}
            <div className="bg-black/60 p-2 sm:p-2.5 rounded-xl border border-white/10">
              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Auto Cashout</span>
                <span className="text-[8px] font-bold text-slate-500">OPCIONAL</span>
              </div>
              <div className="relative">
                <input 
                  type="number"
                  step="0.1"
                  placeholder="Sem limite"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  disabled={isBetPlaced}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-2 py-1 text-[#FFCC00] font-black text-center focus:outline-none focus:border-[#FFCC00] text-sm shadow-inner disabled:opacity-50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Botão Principal de Aposta / Saque */}
          <div className="w-full sm:w-64 h-14 sm:h-16 shrink-0">
            {status === 'RUNNING' && isBetPlaced && !hasCashedOut ? (
              <button
                onClick={handleCashout}
                className="w-full h-full bg-[#FFCC00] hover:bg-[#e6b800] active:scale-95 text-slate-950 font-black rounded-xl sm:rounded-2xl border-b-4 border-amber-600 shadow-lg shadow-amber-500/20 flex flex-col items-center justify-center p-1 cursor-pointer animate-pulse transition-all"
              >
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-900">SACAR AGORA</span>
                <span className="text-base sm:text-xl font-mono leading-none my-0.5">
                  {(betAmount * multiplier).toFixed(2)}
                </span>
                <span className="text-[8px] font-bold text-slate-800">USDT ({multiplier.toFixed(2)}x)</span>
              </button>
            ) : isBetPlaced && (status === 'WAITING' || hasCashedOut) ? (
              <div className="w-full h-full bg-[#049444]/20 border-2 border-[#049444]/50 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center p-1 text-[#049444]">
                <span className="text-[9px] font-black uppercase tracking-wider">APOSTA CONFIRMADA</span>
                <span className="text-sm font-mono font-black">{betAmount.toFixed(2)} USDT</span>
                <span className="text-[8px] font-bold opacity-80">Aguardando no Voo...</span>
              </div>
            ) : (
              <button
                onClick={handlePlaceBet}
                disabled={status !== 'WAITING' || balance < betAmount}
                className={`w-full h-full rounded-xl sm:rounded-2xl font-black uppercase tracking-wider shadow-xl flex flex-col items-center justify-center p-1 transition-all border-b-4 cursor-pointer ${
                  status === 'WAITING' && balance >= betAmount
                    ? 'bg-[#049444] hover:bg-[#037235] active:scale-95 text-white border-[#025628] shadow-[#049444]/20'
                    : 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed border-b-2 opacity-60'
                }`}
              >
                <span className="text-sm sm:text-base leading-tight">APOSTAR NO VOO</span>
                <span className="text-[9px] font-mono font-extrabold opacity-90">{betAmount.toFixed(2)} USDT • PRÓXIMO ROUND</span>
              </button>
            )}
          </div>

        </div>
      </footer>
    </div>
  );
};

export default CrashView;

