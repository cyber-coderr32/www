
import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import { soundService } from '../services/soundService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Gamepad2, 
  Dices, 
  Bomb, 
  PlaneTakeoff, 
  Target, 
  ChevronRight,
  TrendingUp,
  Sparkles,
  Zap,
  Club,
  Hash,
  Coins,
  Eraser,
  LifeBuoy,
  Rocket,
  ArrowUpToLine,
  Layers,
  ChevronsUpDown,
  Signal,
  LayoutGrid,
  Users,
  MessageCircle,
  BookOpen,
  Globe,
  Key,
  Code
} from 'lucide-react';

interface HomeViewProps {
  balance: number;
  isDemo: boolean;
  userName: string;
  onSelectGame: (view: ViewState, category?: string) => void;
  onGoToProfile: () => void;
  onOpenDeposit?: () => void;
}

interface PromoSlide {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  image: string;
  action: string;
  gameId?: ViewState;
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 1,
    title: "Bónus de Boas-Vindas",
    subtitle: "Ganhe até 200% no seu primeiro depósito para usar em Sports.",
    badge: "OFERTA",
    color: "from-[#049444] to-[#037235]",
    image: "🏅",
    action: "VER OFERTA",
  },
  {
    id: 2,
    title: "Vegas Casino",
    subtitle: "As slots mais populares e os melhore jogos de mesa.",
    badge: "VIP",
    color: "from-slate-800 to-black",
    image: "🎰",
    action: "JOGAR AGORA",
    gameId: 'SLOTS'
  },
  {
    id: 3,
    title: "Jackpot Semanal",
    subtitle: "Aposte 5.00 USDT ou mais e habilita-te a ganhar o grande prémio.",
    badge: "JACKPOT",
    color: "from-[#FFCC00] to-orange-600",
    image: "💰",
    action: "PARTICIPAR",
    gameId: 'AVIATOR'
  },
  {
    id: 5,
    title: "Sexta-Feira Louca",
    subtitle: "Recarrega a tua conta às sextas e recebe 50% de bónus extra.",
    badge: "RELOAD",
    color: "from-blue-600 to-indigo-900",
    image: "⚡",
    action: "VER DETALHES",
  },
  {
    id: 6,
    title: "Mestre do Mines",
    subtitle: "Encontra todos os diamantes sem explodir a mina.",
    badge: "DESAFIO",
    color: "from-slate-700 to-slate-900",
    image: "💣",
    action: "JOGAR MINES",
    gameId: 'MINES'
  },
  {
    id: 7,
    title: "Escadaria VIP",
    subtitle: "Suba os degraus com cuidado e multiplique os seus ganhos no Stairs.",
    badge: "NOVO",
    color: "from-green-600 to-emerald-900",
    image: "🪜",
    action: "JOGAR AGORA",
    gameId: 'STAIRS'
  },
  {
    id: 8,
    title: "Cashback Mensal",
    subtitle: "Recupera até 10% das tuas perdas todos os meses.",
    badge: "FIDELIDADE",
    color: "from-purple-600 to-purple-900",
    image: "💎",
    action: "SABER MAIS",
  },
  {
    id: 9,
    title: "Corrida Aviator",
    subtitle: "Voe mais alto que todos e ganhe prémios em dinheiro real.",
    badge: "TORNEIO",
    color: "from-red-600 to-black",
    image: "🚀",
    action: "ENTRAR NA CORRIDA",
    gameId: 'AVIATOR'
  },
  {
    id: 10,
    title: "Dados da Sorte",
    subtitle: "Preveja o resultado dos dados e multiplique a sua aposta.",
    badge: "SOCIAL",
    color: "from-amber-500 to-amber-800",
    image: "🎲",
    action: "LANÇAR DADOS",
    gameId: 'DICE'
  },
  {
    id: 11,
    title: "Convidar Amigo",
    subtitle: "Partilha o teu código e ganha 5.00 USDT por cada amigo ativo.",
    badge: "AMIGO",
    color: "from-pink-500 to-rose-700",
    image: "🤝",
    action: "IR PARA COMUNIDADE",
    gameId: 'SOCIAL'
  },
  {
    id: 12,
    title: "Torre Infinita",
    subtitle: "Suba cada nível com cuidado e alcance o multiplicador 100x.",
    badge: "SKILL",
    color: "from-indigo-600 to-indigo-950",
    image: "🏰",
    action: "SUBIR TORRE",
    gameId: 'TOWER'
  },
  {
    id: 13,
    title: "Crypton Weekend",
    subtitle: "Bónus especiais e odds exclusivas durante todo o fim de semana.",
    badge: "FIM DE SEMANA",
    color: "from-green-500 to-emerald-800",
    image: "🌟",
    action: "VER OFERTAS",
  }
];

import { FeaturedGames } from '../components/FeaturedGames';

const HomeView: React.FC<HomeViewProps> = ({ balance, isDemo, userName, onSelectGame, onGoToProfile, onOpenDeposit }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 786);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 786);
    window.addEventListener('resize', handleResize);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);



  const games = [
    { id: 'PDF_MARKET' as ViewState, title: 'MARKET PDF', icon: <BookOpen className="w-full h-full text-white" />, color: 'from-amber-600 to-amber-900 border border-amber-500/20', desc: 'Compre Livros PDF', badge: 'LIVROS' },
    { id: 'AVIATOR' as ViewState, title: 'AVIATOR', icon: <PlaneTakeoff className="w-full h-full text-white" />, color: 'from-orange-600 to-red-600', desc: 'O Original', badge: 'POPULAR' },
    { id: 'MINES' as ViewState, title: 'MINES', icon: <Bomb className="w-full h-full text-white" />, color: 'from-slate-700 to-slate-900', desc: 'Desafio', badge: 'PRO' },
    { id: 'CRASH' as ViewState, title: 'POKE CHOMP', icon: <span className="text-2xl flex items-center justify-center">😮</span>, color: 'from-purple-600 to-indigo-600', desc: 'Come Emojis', badge: 'NOVO' },
    { id: 'SLOTS' as ViewState, title: 'SLOTS', icon: <Gamepad2 className="w-full h-full text-white" />, color: 'from-[#FFCC00] to-orange-700', desc: 'Casino Vegas' },
    { id: 'ROULETTE' as ViewState, title: 'ROLETA', icon: <Dices className="w-full h-full text-white" />, color: 'from-indigo-600 to-indigo-900', desc: 'Clássico Win' },
    { id: 'BLACKJACK' as ViewState, title: 'BLACKJACK', icon: <Club className="w-full h-full text-white" />, color: 'from-blue-600 to-blue-900', desc: 'Vença o Dealer', badge: 'NEW' },
    { id: 'PLINKO' as ViewState, title: 'PLINKO', icon: <LayoutGrid className="w-full h-full text-white" />, color: 'from-pink-600 to-pink-900', desc: 'Multiplicador' },
    { id: 'DICE' as ViewState, title: 'DADOS', icon: <Dices className="w-full h-full text-white" />, color: 'from-purple-600 to-purple-900', desc: 'Sorte nos Dados' },
    { id: 'COINFLIP' as ViewState, title: 'COIN FLIP', icon: <Coins className="w-full h-full text-white" />, color: 'from-yellow-500 to-yellow-800', desc: '50/50 Chance' },
    { id: 'LOTTERY' as ViewState, title: 'LOTERIA', icon: <Sparkles className="w-full h-full text-white" />, color: 'from-teal-600 to-teal-900', desc: 'Mega Bilhetes' },
    { id: 'POKER' as ViewState, title: 'POKER', icon: <Club className="w-full h-full text-white" />, color: 'from-rose-700 to-rose-950', desc: 'Ultimate Texas', badge: 'VIP' },
    { id: 'KENO' as ViewState, title: 'KENO', icon: <Hash className="w-full h-full text-white" />, color: 'from-emerald-600 to-emerald-900', desc: 'Sorteio Rápido' },
    { id: 'BACCARAT' as ViewState, title: 'BACCARAT', icon: <Coins className="w-full h-full text-white" />, color: 'from-slate-600 to-slate-800', desc: 'Elegância' },
    { id: 'SCRATCH' as ViewState, title: 'RASPADINHA', icon: <Eraser className="w-full h-full text-white" />, color: 'from-amber-600 to-amber-900', desc: 'Sorte Instantânea' },
    { id: 'WHEEL' as ViewState, title: 'WHEEL', icon: <LifeBuoy className="w-full h-full text-white" />, color: 'from-rose-500 to-rose-800', desc: 'Roda da Sorte' },
    { id: 'LIMBO' as ViewState, title: 'LIMBO', icon: <ArrowUpToLine className="w-full h-full text-white" />, color: 'from-cyan-600 to-cyan-900', desc: 'Bata o Alvo' },
    { id: 'TOWER' as ViewState, title: 'TOWER', icon: <Layers className="w-full h-full text-white" />, color: 'from-indigo-700 to-indigo-950', desc: 'Suba e Ganhe' },
    { id: 'HILO' as ViewState, title: 'HI-LO', icon: <ChevronsUpDown className="w-full h-full text-white" />, color: 'from-sky-600 to-sky-900', desc: 'Alta ou Baixa?' },
    { id: 'STAIRS' as ViewState, title: 'STAIRS', icon: <Signal className="w-full h-full text-white" />, color: 'from-green-600 to-green-900', desc: 'Escadaria VIP' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0b0e11] overflow-hidden text-white font-sans">
      <header className={`px-4 md:px-8 ${isDesktop ? 'py-4' : 'py-2.5'} flex justify-between items-center bg-[#049444] sticky top-0 z-[100] shadow-2xl`}>
        <button 
          onClick={() => { soundService.playUISelect(); onSelectGame('HOME'); }}
          className="flex items-center gap-3 cursor-pointer"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex bg-white px-2 py-0.5 rounded shadow-sm rotate-[-2deg]"
          >
            <span 
              onClick={(e) => {
                e.stopPropagation();
                soundService.playUISelect();
                onSelectGame('HOME');
              }}
              className={`text-[#FFCC00] hover:text-[#049444] font-black italic ${isDesktop ? 'text-lg' : 'text-sm'} tracking-tighter cursor-pointer transition-colors pr-[1px]`}
              title="Voltar para Home"
            >
              C
            </span>
            <span className={`text-[#049444] font-black italic ${isDesktop ? 'text-lg' : 'text-sm'} tracking-tighter`}>RYPTON</span>
            <span className={`text-[#FFCC00] font-black italic ${isDesktop ? 'text-lg' : 'text-sm'} tracking-tighter ml-1`}>BET</span>
          </motion.div>
        </button>

        <div className="flex items-center gap-2">
          {/* Botão de Comunidade / Social no Header */}
          <button
            onClick={() => {
              soundService.playUISelect();
              onSelectGame('SOCIAL');
            }}
            className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 border border-white/15 px-3 py-1.5 md:py-2 rounded-xl transition-all text-white font-extrabold uppercase text-[10px] md:text-xs cursor-pointer select-none active:scale-95 shadow-md group"
          >
            <Users className="w-3.5 h-3.5 text-[#FFCC00] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline text-white">Comunidade</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          <button 
            onClick={() => { soundService.playUISelect(); onGoToProfile(); }}
            className={`flex items-center gap-2 md:gap-3 bg-black/20 border border-white/10 ${isDesktop ? 'px-4 py-2' : 'px-2 py-1.5'} rounded-xl hover:bg-black/30 transition-all group overflow-hidden relative cursor-pointer`}
          >
          <div className="flex flex-col items-end z-10">
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-white/70">
              {userName.split(' ')[0]} {isDemo && <span className="text-[#FFCC00]">(DEMO)</span>}
            </span>
            <span className={`font-mono font-bold ${isDesktop ? 'text-sm' : 'text-[10px]'} ${isDemo ? 'text-[#FFCC00]' : 'text-white'}`}>
              {balance.toFixed(2)} USDT
            </span>
            <span className="text-[8px] font-mono text-white/60 hidden sm:inline">
              {(balance * 950).toLocaleString('pt-AO', { maximumFractionDigits: 0 })} KZ • R$ {(balance * 5.70).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            </span>
          </div>
          <div className={`${isDesktop ? 'w-9 h-9' : 'w-7 h-7'} rounded-lg bg-white/20 flex items-center justify-center text-xs border border-white/10 group-hover:scale-105 transition-transform text-white z-10`}>👤</div>
          <motion.div 
            animate={{ x: ['100%', '-100%'] }} 
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-white/5 skew-x-[-20deg] pointer-events-none"
          />
        </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-12 scroll-smooth no-scrollbar">


        {/* Promo Slider */}
        <section className={`px-3 md:px-8 ${isDesktop ? 'py-6' : 'py-3'}`}>
          <div className={`relative ${isDesktop ? 'h-64 lg:h-72' : 'h-44 shadow-lg'} w-full rounded-[1.8rem] md:rounded-[3rem] overflow-hidden group border border-white/10`}>
            <AnimatePresence mode="wait">
              {PROMO_SLIDES.map((slide, index) => index === currentSlide && (
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`absolute inset-0 flex items-center ${isDesktop ? 'p-12' : 'p-5'} bg-gradient-to-br ${slide.color}`}
                >
                  <div className={`flex-1 ${isDesktop ? 'space-y-4' : 'space-y-1.5'} z-10`}>
                    <motion.span 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full ${isDesktop ? 'text-[10px]' : 'text-[8px]'} font-black uppercase tracking-widest text-white`}
                    >
                      {slide.badge}
                    </motion.span>
                    <motion.h3 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`${isDesktop ? 'text-4xl xl:text-6xl' : 'text-xl md:text-2xl'} font-black uppercase tracking-tighter leading-tight text-white drop-shadow-2xl max-w-lg`}
                    >
                      {slide.title}
                    </motion.h3>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      transition={{ delay: 0.2 }}
                      className={`${isDesktop ? 'text-base mt-2' : 'text-[10px] max-w-[200px]'} text-white/90 font-bold leading-tight md:leading-relaxed`}
                    >
                      {slide.subtitle}
                    </motion.p>
                    <motion.button 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        soundService.playUISelect();
                        slide.gameId ? onSelectGame(slide.gameId) : onGoToProfile();
                      }}
                      className={`mt-2 md:mt-4 ${isDesktop ? 'px-8 py-3.5 text-xs' : 'px-4 py-2 text-[8px] uppercase'} bg-white text-black font-black tracking-widest rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-2`}
                    >
                      {slide.action}
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    </motion.button>
                  </div>
                  <div className="absolute right-0 bottom-0 top-0 w-1/3 flex items-center justify-center pointer-events-none overflow-hidden select-none">
                     <motion.span 
                      animate={{ y: [0, -10, 0], rotate: [12, 10, 12] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className={`${isDesktop ? 'text-[18rem]' : 'text-9xl'} opacity-20 filter blur-[1px]`}
                     >
                       {slide.image}
                     </motion.span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Featured Section */}
        <div className="px-4 md:px-8 mb-6">
           <FeaturedGames onSelect={onSelectGame} />
        </div>

        {/* B2B iGaming API Portal Banner */}
        <div className="px-4 md:px-8 mb-8">
          <motion.div
            whileHover={{ scale: 1.01 }}
            onClick={() => {
              soundService.playUISelect();
              onSelectGame('API_PORTAL');
            }}
            className="bg-gradient-to-r from-blue-950/80 via-[#131d27] to-indigo-950/80 border border-blue-500/30 hover:border-blue-400 p-5 md:p-6 rounded-[2rem] shadow-2xl cursor-pointer flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 z-10">
              <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 shrink-0">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Solução B2B / Para Operadores
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> API REST & IFrame
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-white group-hover:text-blue-300 transition-colors">
                  API Pública iGaming CryptonBet
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Obtenha chaves de API, simule webhooks de Seamless Wallet e integre nosso catálogo de jogos em sua plataforma com relatórios GGR em tempo real.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 z-10 w-full md:w-auto justify-end border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
              <div className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-xl text-xs font-mono text-blue-200">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Chaves API & Docs</span>
              </div>
              <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition flex items-center gap-1">
                Acessar Painel <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Fake Winners Ticker (Baiting) - Only if enabled in settings */}
        {JSON.parse(localStorage.getItem('skyhigh_settings') || '{}').fakeWinnersEnabled !== false && (
          <div className="px-4 md:px-8 mb-6">
             <div className="bg-[#131d27] border border-white/5 rounded-2xl p-3 overflow-hidden relative group">
                <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#131d27] to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#131d27] to-transparent z-10" />
                
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 shrink-0 border-r border-white/10 pr-4">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Wins</span>
                   </div>
                   
                   <div className="flex-1 overflow-hidden">
                      <motion.div 
                        animate={{ x: [0, -2000] }}
                        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                        className="flex items-center gap-8 whitespace-nowrap"
                      >
                         {[
                           { user: "Carlos_*", win: "125.40 USDT", game: "Aviator" },
                           { user: "BetMaster", win: "45.00 USDT", game: "Mines" },
                           { user: "Angola_King", win: "210.00 USDT", game: "Stairs" },
                           { user: "Maria_99", win: "12.00 USDT", game: "Mines" },
                           { user: "Luanda_Rich", win: "340.50 USDT", game: "Aviator" },
                           { user: "PilotoAzevedo", win: "88.20 USDT", game: "Crash" },
                           { user: "SorteLuanda", win: "15.00 USDT", game: "Plinko" },
                           { user: "CryptoBet", win: "500.00 USDT", game: "Jackpot" },
                         ].map((w, i) => (
                           <div key={i} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#049444]/20 flex items-center justify-center text-[10px] font-black text-[#049444]">
                                 {w.user.charAt(0)}
                              </div>
                              <span className="text-[10px] font-bold text-slate-300">{w.user}</span>
                              <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-tighter">+{w.win}</span>
                              <span className="text-[8px] font-black text-slate-600 uppercase italic">{w.game}</span>
                           </div>
                         ))}
                      </motion.div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Section Title */}
        <div className="px-4 md:px-8 flex items-end justify-between mb-4 md:mb-8">
          <div className="space-y-0.5 md:space-y-1">
            <h2 className="text-xl md:text-4xl font-black tracking-tighter flex items-center gap-2">
              TODOS OS JOGOS <Zap className="w-5 h-5 md:w-8 md:h-8 text-[#FFCC00] fill-[#FFCC00]" />
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#049444]" />
              <p className="text-slate-500 text-[8px] md:text-[11px] font-black uppercase tracking-[0.2em] italic">TOP GAMES DA SEMANA</p>
            </div>
          </div>
        </div>


        {/* Game Grid with "Covers" */}
        <div className="px-4 md:px-8 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
            {games.map((game, idx) => (
              <motion.button 
                key={game.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => {
                  soundService.playUISelect();
                  onSelectGame(game.id);
                }}
                className="relative group aspect-[1.4/1] md:aspect-[1.8/1] rounded-[1.5rem] md:rounded-[2.2rem] overflow-hidden shadow-2xl transition-all border border-black group cursor-pointer"
              >
                {/* Background "Cover" */}
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} transition-all duration-500 group-hover:scale-110`} />
                
                {/* Decorative Layers */}
                <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <div className="text-4xl md:text-7xl font-black italic rotate-12 select-none group-hover:rotate-0 transition-transform duration-700">
                     {game.title}
                   </div>
                </div>

                {/* Content Container */}
                <div className="absolute inset-0 p-4 md:p-6 flex items-center gap-4 z-10">
                  <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-black/30 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center p-2.5 md:p-4 shadow-2xl border border-white/10 group-hover:rotate-[-5deg] transition-all duration-300">
                    <div className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                      {game.icon}
                    </div>
                  </div>
                  
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5 mb-0.5">
                       <h3 className="font-black text-sm md:text-2xl uppercase tracking-tighter leading-none drop-shadow-md">{game.title}</h3>
                       {game.badge && (
                         <span className={`px-1.5 py-0.5 rounded-md text-[6px] md:text-[8px] font-black ${game.badge === 'HOT' ? 'bg-red-500 animate-pulse' : 'bg-[#FFCC00] text-black'}`}>
                           {game.badge}
                         </span>
                       )}
                    </div>
                    <div className="flex items-center gap-1 opacity-60">
                       <TrendingUp className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                       <p className="text-[7px] md:text-[11px] font-black uppercase tracking-widest leading-none">{game.desc}</p>
                    </div>
                  </div>
                </div>

                {/* Hover Interaction Layer */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 bg-white/5 pointer-events-none"
                >
                  <div className="absolute bottom-2 right-4 flex items-center gap-1 text-[8px] font-black text-white/50 uppercase tracking-widest">
                     JOGAR <ChevronRight className="w-2 h-2" />
                  </div>
                </motion.div>

                {/* Extra Shine/Glow Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_50%)]" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Categories Section */}
        <div className="px-4 md:px-8 mb-8">
           <div className="grid grid-cols-3 gap-2 md:gap-4">
              {[
                { label: 'CASINO AO VIVO', icon: <Sparkles className="w-4 h-4 text-[#FFCC00]" />, color: 'bg-indigo-950/50', id: 'ROULETTE' },
                { label: 'MINAS', icon: <Bomb className="w-4 h-4 text-emerald-400" />, color: 'bg-emerald-950/50', id: 'MINES' },
                { label: 'VIRTUAIS', icon: <TrendingUp className="w-4 h-4 text-orange-400" />, color: 'bg-orange-950/50', id: 'AVIATOR' },
              ].map((c, i) => (
                <button 
                  key={i} 
                  onClick={() => { soundService.playUISelect(); onSelectGame(c.id as ViewState); }}
                  className={`flex items-center justify-center gap-2 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 ${c.color} hover:bg-white/5 transition-all text-center cursor-pointer`}
                >
                  <div className="hidden md:block p-2 bg-white/5 rounded-xl">{c.icon}</div>
                  <span className="text-[8px] md:text-sm font-black uppercase tracking-widest">{c.label}</span>
                </button>
              ))}
           </div>
        </div>
      </main>
    </div>
  );
};

export default HomeView;

