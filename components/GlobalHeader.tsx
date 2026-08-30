import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ViewState, UserAccount } from '../types';
import { soundService } from '../services/soundService';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Search, 
  X, 
  Gamepad2, 
  Package, 
  User, 
  Sparkles, 
  ChevronRight, 
  TrendingUp, 
  PlaneTakeoff, 
  Bomb, 
  Coins, 
  BookOpen, 
  ArrowUpDown, 
  Wallet, 
  Globe, 
  SlidersHorizontal,
  Dices,
  Club,
  Rocket,
  Eraser,
  Trophy,
  ArrowRight,
  ExternalLink,
  Flame,
  Clock,
  ShieldCheck,
  Zap,
  Megaphone,
  Store,
  BarChart3,
  Maximize2,
  Minimize2,
  Bell
} from 'lucide-react';
import { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import NotificationCenterModal from './NotificationCenterModal';

export interface SearchResultItem {
  id: string;
  type: 'game' | 'product' | 'user';
  title: string;
  subtitle: string;
  icon?: string | React.ReactNode;
  category?: string;
  price?: string;
  badge?: string;
  viewTarget?: ViewState;
  socialFilterTarget?: 'all' | 'social' | 'p2p' | 'pdf';
  userData?: Partial<UserAccount>;
}

interface GlobalHeaderProps {
  currentView: ViewState;
  user: UserAccount | null;
  balance: number;
  isDemo: boolean;
  onSelectGame: (view: ViewState, param?: any) => void;
  onGoToProfile: () => void;
  onToggleDemo?: (isDemo: boolean) => void;
  onOpenDeposit?: () => void;
  onOpenCreateAd?: () => void;
}

// Full catalogue of platform games
const ALL_GAMES: Array<{
  id: ViewState;
  name: string;
  description: string;
  category: string;
  icon: string;
  popular?: boolean;
  hot?: boolean;
}> = [
  { id: 'AVIATOR', name: 'Aviator', description: 'Jogo de multiplicador nas alturas', category: 'Crash', icon: '✈️', popular: true, hot: true },
  { id: 'MINES', name: 'Mines / Minas', description: 'Encontre os diamantes e evite bombas', category: 'Estratégia', icon: '💣', popular: true },
  { id: 'CRASH', name: 'Poke Chomp VIP', description: 'Emoji de boca aberta voa comendo outros emojis nas alturas!', category: 'Crash', icon: '😮', hot: true, popular: true },
  { id: 'SLOTS', name: 'Vegas Slots', description: 'Caça-níqueis com jackpots cumulativos', category: 'Cassino', icon: '🎰', popular: true },
  { id: 'ROULETTE', name: 'Roleta Europeia', description: 'Roleta clássica de cassino', category: 'Mesa', icon: '🎡' },
  { id: 'PLINKO', name: 'Plinko Ball', description: 'Solte as esferas e ganhe multiplicadores', category: 'Arcade', icon: '⚪', popular: true },
  { id: 'BLACKJACK', name: 'Blackjack 21', description: 'Desafie o croupier no jogo de 21', category: 'Cartas', icon: '🃏', popular: true, hot: true },
  { id: 'DICE', name: 'Jogo de Dados', description: 'Defina a probabilidade e lance os dados', category: 'Probabilidade', icon: '🎲' },
  { id: 'COINFLIP', name: 'Cara ou Coroa', description: 'Escolha um lado e dobre o seu saldo', category: 'Rápido', icon: '🪙' },
  { id: 'LIMBO', name: 'Limbo Multiplier', description: 'Aposte no alvo do multiplicador', category: 'Crash', icon: '⚡' },
  { id: 'WHEEL', name: 'Roda da Fortuna', description: 'Gire a roda e multiplique os ganhos', category: 'Arcade', icon: '🎡' },
  { id: 'SCRATCH', name: 'Raspadinha Premiada', description: 'Raspe e encontre símbolos iguais', category: 'Instantâneo', icon: '🏷️' },
  { id: 'HILO', name: 'HiLo Cartas', description: 'Adivinhe se a próxima carta é maior ou menor', category: 'Cartas', icon: '🎴' },
  { id: 'TOWER', name: 'Torre do Tesouro', description: 'Suba os andares da torre sem errar', category: 'Estratégia', icon: '🏰' },
  { id: 'KENO', name: 'Keno Bingo', description: 'Escolha os seus números da sorte', category: 'Lotaria', icon: '🎱' },
  { id: 'LOTTERY', name: 'Mega Sorteios', description: 'Bilhetes de lotaria diários com grandes prémios', category: 'Lotaria', icon: '🎟️' },
  { id: 'BACCARAT', name: 'Baccarat VIP', description: 'Jogo de cartas clássico de alta classe', category: 'Cartas', icon: '👑' },
  { id: 'STAIRS', name: 'Subida de Escadas', description: 'Evite os obstáculos e suba até ao topo', category: 'Estratégia', icon: '🪜' },
  { id: 'POKER', name: 'Poker Texas Hold\'em', description: 'Partidas de poker desafiantes', category: 'Cartas', icon: '♠️' },
  { id: 'P2P', name: 'Câmbio P2P & Caixas Airtm', description: 'Depósitos, saques rápidos via Multicaixa/BAI/PIX e ganhe como Caixa', category: 'Mercado', icon: '🔄', popular: true, hot: true },
  { id: 'PDF_MARKET', name: 'Mercado de E-books', description: 'Compre e venda produtos digitais e estratégias', category: 'Digital', icon: '📚', popular: true },
  { id: 'PRODUCT_MANAGER', name: 'Gerenciador de Produtos & Vendas', description: 'Veja quanto foi vendido, edite, pause ou elimine seus E-books e Ofertas', category: 'Vendas', icon: '📊', popular: true },
  { id: 'TRANSACTION_STATUS', name: 'Status de Transações (Depósitos & Saques)', description: 'Acompanhe depósitos e saques em tempo real com status de confirmação e sucesso', category: 'Financeiro', icon: '⚡', popular: true },
  { id: 'SOCIAL', name: 'Comunidade & Feed', description: 'Acompanhe apostas, posts e anúncios de membros', category: 'Social', icon: '🌐' },
  { id: 'PROMOTIONS', name: 'Bónus & Promoções', description: 'Ver ofertas, rodadas grátis e bónus ativos', category: 'Ofertas', icon: '🎁' },
  { id: 'HISTORY', name: 'Histórico de Operações', description: 'Extrato detalhado de ganhos e depósitos', category: 'Conta', icon: '📜' },
];

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  currentView,
  user,
  balance,
  isDemo,
  onSelectGame,
  onGoToProfile,
  onToggleDemo,
  onOpenDeposit,
  onOpenCreateAd
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'games' | 'products' | 'users'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  // Real Database content states
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbBooks, setDbBooks] = useState<any[]>([]);
  const [dbOffers, setDbOffers] = useState<any[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  useEffect(() => {
    const unsubNotifs = notificationService.subscribeToNotifications((list) => {
      setNotifications(list);
    });
    return () => unsubNotifs();
  }, []);

  const unreadNotifsCount = useMemo(() => {
    const currentUid = user?.id || '';
    return notifications.filter(n => {
      const isTarget = n.target === 'ALL' || n.target === currentUid || n.targetUserId === currentUid;
      const isRead = (n.readBy || []).includes(currentUid);
      return isTarget && !isRead;
    }).length;
  }, [notifications, user?.id]);

  // Fetch real content from Firestore database (and local fallback)
  useEffect(() => {
    // 1. Users from real DB
    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          name: d.name || d.displayName || d.email || 'Usuário',
          subtitle: d.bio || d.email || 'Membro da plataforma',
          role: d.role || 'Membro',
          avatarColor: d.avatarColor || 'bg-gradient-to-tr from-purple-600 to-indigo-600',
        });
      });
      setDbUsers(list);
    }, (err) => {
      console.warn("Could not fetch real users from DB:", err);
    });

    // 2. E-Books from real DB
    const unsubBooks = onSnapshot(query(collection(db, 'pdf_books'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          title: d.title || 'Livro Digital PDF',
          subtitle: `Por ${d.author || d.sellerName || 'Autor'} • ${d.description || 'E-book de apostas e estratégias.'}`,
          price: `${Number(d.price || 0).toFixed(2)} USDT`,
          category: 'E-Book PDF',
          viewTarget: 'PDF_MARKET' as ViewState
        });
      });
      setDbBooks(list);
    }, (err) => {
      console.warn("Could not fetch real pdf books from DB:", err);
    });

    // 3. P2P Offers from real DB
    const unsubOffers = onSnapshot(query(collection(db, 'p2p_offers'), limit(100)), (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          title: `Oferta P2P: ${d.type === 'SELL' ? 'Venda' : 'Compra'} de ${d.amount || ''} USDT`,
          subtitle: `Anunciante: ${d.userName || 'Trader P2P'} • ${d.paymentDetails || 'Pagamento instantâneo'}`,
          price: `${d.price || 1200} Kz/USDT`,
          category: 'Oferta P2P',
          viewTarget: 'P2P' as ViewState
        });
      });
      setDbOffers(list);
    }, (err) => {
      console.warn("Could not fetch real P2P offers from DB:", err);
    });

    return () => {
      unsubUsers();
      unsubBooks();
      unsubOffers();
    };
  }, []);

  // Keyboard shortcut (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsFocused(true);
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          searchInputRef.current?.focus();
          setIsFocused(true);
        }
      } else if (e.key === 'Escape') {
        setIsFocused(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter games based on search query
  const searchTerm = searchQuery.trim().toLowerCase();

  const filteredGames = ALL_GAMES.filter(g => 
    !searchTerm || 
    (g.name || '').toLowerCase().includes(searchTerm) || 
    (g.description || '').toLowerCase().includes(searchTerm) || 
    (g.category || '').toLowerCase().includes(searchTerm)
  );

  const realProducts = [...dbBooks, ...dbOffers];

  // Filter products based on query (ONLY real DB content)
  const filteredProducts = realProducts.filter(p =>
    !searchTerm ||
    (p.title || '').toLowerCase().includes(searchTerm) ||
    (p.subtitle || '').toLowerCase().includes(searchTerm) ||
    (p.category || '').toLowerCase().includes(searchTerm)
  );

  // Filter users based on query (ONLY real DB content)
  const filteredUsers = dbUsers.filter(u =>
    !searchTerm ||
    (u.name || '').toLowerCase().includes(searchTerm) ||
    (u.subtitle || '').toLowerCase().includes(searchTerm) ||
    (u.role || '').toLowerCase().includes(searchTerm)
  );

  const totalResultsCount = 
    (activeTab === 'all' || activeTab === 'games' ? filteredGames.length : 0) +
    (activeTab === 'all' || activeTab === 'products' ? filteredProducts.length : 0) +
    (activeTab === 'all' || activeTab === 'users' ? filteredUsers.length : 0);

  const handleExecuteSearchItem = (item: SearchResultItem) => {
    soundService.playUISelect();
    setIsFocused(false);
    setSearchQuery('');

    if (item.type === 'game' && item.viewTarget) {
      onSelectGame(item.viewTarget, item.id);
    } else if (item.type === 'product') {
      if (item.viewTarget) {
        onSelectGame(item.viewTarget, item.id);
      } else {
        onSelectGame('PDF_MARKET', item.id);
      }
    } else if (item.type === 'user') {
      onSelectGame('VIEW_PROFILE' as any, item.userData || { id: item.id, name: item.title, subtitle: item.subtitle });
    }
  };

  return (
    <header className="sticky top-0 z-[250] bg-[#111923]/95 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 py-2.5 transition-all shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left branding title indicator on mobile / quick badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div 
            onClick={() => onSelectGame('HOME')}
            className="flex items-center gap-1.5 cursor-pointer group"
            title="Página Inicial"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#049444] to-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-all">
              ⚡
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-black italic tracking-tighter text-white leading-none">
                CRYPTON<span className="text-[#049444]">BET</span>
              </span>
              <span className="text-[8px] text-[#FFCC00] font-bold uppercase tracking-wider">
                Angola
              </span>
            </div>
          </div>
        </div>

        {/* CENTER GLOBAL SEARCH BAR CONTAINER */}
        <div ref={containerRef} className="relative flex-1 max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-1 sm:mx-3">
          <div className={`relative flex items-center bg-white border-2 transition-all rounded-xl sm:rounded-2xl px-4 py-2 sm:py-2.5 ${
            isFocused 
              ? 'border-[#FFCC00] ring-4 ring-[#FFCC00]/40 shadow-[0_0_25px_rgba(255,204,0,0.4)]' 
              : 'border-[#049444] hover:border-[#049444]/80 shadow-[0_4px_15px_rgba(4,148,68,0.15)]'
          }`}>
            <Search className={`w-5 h-5 mr-3 shrink-0 transition-colors ${isFocused ? 'text-[#FFCC00]' : 'text-[#049444]'}`} />
            
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Pesquisar jogos (Aviator, Minas), P2P, E-books, Pilotos..."
              className="w-full bg-transparent text-sm sm:text-base font-black text-black placeholder:text-slate-500 outline-none"
            />

            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-black transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="hidden md:flex items-center gap-1 text-[11px] font-black text-[#049444] bg-[#049444]/10 border border-[#049444]/30 px-2.5 py-1 rounded-lg select-none shadow-sm">
                <span>Ctrl</span>
                <span>+</span>
                <span>K</span>
              </div>
            )}
          </div>

          {/* SEARCH RESULTS OVERLAY DROPDOWN */}
          <AnimatePresence>
            {isFocused && (
              <>
                <div 
                  className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[190]" 
                  onClick={() => setIsFocused(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 w-[calc(100vw-24px)] sm:w-[92vw] md:w-[780px] lg:w-[960px] max-w-[calc(100vw-24px)] sm:max-w-[92vw] lg:max-w-5xl bg-white border-4 border-[#049444] rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden z-[200] max-h-[82vh] flex flex-col text-left"
                >
                {/* MODAL SEARCH INPUT BANNER (WHITE BG, BLACK TEXT, GREEN & YELLOW ACCENTS) */}
                <div className="p-4 bg-gradient-to-r from-[#049444] via-[#037235] to-[#FFCC00] border-b-2 border-[#049444] flex items-center gap-3 shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-[#049444] absolute left-3.5 top-1/2 -translate-y-1/2 font-black" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar jogos (Aviator, Minas), P2P, E-books, Pilotos..."
                      autoFocus
                      className="w-full bg-white border-2 border-[#049444] focus:border-[#FFCC00] focus:ring-4 focus:ring-[#FFCC00]/50 rounded-2xl pl-11 pr-10 py-3 text-sm sm:text-base font-black text-black placeholder:text-slate-500 outline-none shadow-lg transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-black transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setIsFocused(false)}
                    className="px-4 py-3 rounded-2xl bg-black text-[#FFCC00] hover:bg-black/80 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-lg border border-[#FFCC00]/30 flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>

                {/* CATEGORY FILTER TABS */}
                <div className="p-3.5 bg-slate-100 border-b-2 border-[#049444]/30 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar text-xs font-black uppercase">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-black ${
                        activeTab === 'all' 
                          ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/30 border-2 border-[#049444]' 
                          : 'bg-white text-black hover:bg-[#FFCC00]/30 hover:text-black border-2 border-slate-300'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-[#FFCC00]" />
                      <span>Todos ({totalResultsCount})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('games')}
                      className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-black ${
                        activeTab === 'games' 
                          ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/30 border-2 border-[#049444]' 
                          : 'bg-white text-black hover:bg-[#FFCC00]/30 hover:text-black border-2 border-slate-300'
                      }`}
                    >
                      <Gamepad2 className="w-4 h-4 text-[#049444]" />
                      <span>Jogos ({filteredGames.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('products')}
                      className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-black ${
                        activeTab === 'products' 
                          ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/30 border-2 border-[#049444]' 
                          : 'bg-white text-black hover:bg-[#FFCC00]/30 hover:text-black border-2 border-slate-300'
                      }`}
                    >
                      <Package className="w-4 h-4 text-[#049444]" />
                      <span>Produtos & P2P ({filteredProducts.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('users')}
                      className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-black ${
                        activeTab === 'users' 
                          ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/30 border-2 border-[#049444]' 
                          : 'bg-white text-black hover:bg-[#FFCC00]/30 hover:text-black border-2 border-slate-300'
                      }`}
                    >
                      <User className="w-4 h-4 text-[#049444]" />
                      <span>Usuários ({filteredUsers.length})</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsFocused(false)}
                    className="p-2 rounded-xl bg-black hover:bg-black/80 text-[#FFCC00] transition-all cursor-pointer shrink-0 font-black shadow"
                    title="Fechar Pesquisa"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* RESULTS SCROLL AREA */}
                <div className="p-4 sm:p-5 space-y-6 overflow-y-auto no-scrollbar max-h-[62vh] bg-white">
                  
                  {totalResultsCount === 0 ? (
                    <div className="py-14 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-[#049444] flex items-center justify-center text-3xl mx-auto shadow-md">
                        🔍
                      </div>
                      <p className="text-base sm:text-lg font-black text-black uppercase tracking-wider">
                        Nenhum resultado encontrado para "{searchQuery}"
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 font-bold max-w-md mx-auto leading-relaxed">
                        A busca pesquisa em tempo real apenas os registros no banco de dados e jogos da plataforma. Tente buscar por outros termos ou verifique a ortografia.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* SECTION 1: GAMES */}
                      {(activeTab === 'all' || activeTab === 'games') && filteredGames.length > 0 && (
                        <div className="space-y-3">
                          <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#049444]/15 via-[#FFCC00]/20 to-[#049444]/15 border-2 border-[#049444] rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest text-black flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#049444]" />
                              <span>Jogos da Plataforma ({filteredGames.length})</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredGames.slice(0, activeTab === 'games' ? 100 : 12).map((game) => (
                              <button
                                key={game.id}
                                onClick={() => handleExecuteSearchItem({
                                  id: game.id,
                                  type: 'game',
                                  title: game.name,
                                  subtitle: game.description,
                                  viewTarget: game.id
                                })}
                                className="w-full p-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#049444] rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 text-left group shadow-md hover:shadow-[0_4px_20px_rgba(4,148,68,0.15)]"
                              >
                                <div className="flex items-center gap-3.5 overflow-hidden">
                                  <div className="w-11 h-11 rounded-xl bg-slate-100 border-2 border-[#049444]/30 flex items-center justify-center text-2xl shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                    {game.icon}
                                  </div>
                                  <div className="overflow-hidden space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-base sm:text-lg text-black group-hover:text-[#049444] transition-colors truncate">
                                        {game.name}
                                      </span>
                                      {game.hot && (
                                        <span className="bg-[#FFCC00] text-black border border-black/20 text-[10px] font-black px-2 py-0.5 rounded uppercase shrink-0">
                                          HOT
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm sm:text-base text-slate-600 line-clamp-2 leading-relaxed font-bold">
                                      {game.description}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1 text-xs text-[#049444] bg-[#049444]/10 px-3 py-1.5 rounded-xl border border-[#049444]/30 font-black group-hover:bg-[#049444] group-hover:text-white transition-all">
                                  <span>Jogar</span>
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SECTION 2: PRODUCTS & P2P */}
                      {(activeTab === 'all' || activeTab === 'products') && filteredProducts.length > 0 && (
                        <div className="space-y-3 pt-4 border-t-2 border-slate-200">
                          <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#049444]/15 via-[#FFCC00]/20 to-[#049444]/15 border-2 border-[#049444] rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest text-black flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#049444]" />
                              <span>E-Books & Ofertas P2P ({filteredProducts.length})</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredProducts.slice(0, activeTab === 'products' ? 100 : 6).map((prod) => (
                              <button
                                key={prod.id}
                                onClick={() => handleExecuteSearchItem({
                                  id: prod.id,
                                  type: 'product',
                                  title: prod.title,
                                  subtitle: prod.subtitle,
                                  price: prod.price,
                                  viewTarget: prod.viewTarget
                                })}
                                className="w-full p-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#049444] rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 text-left group shadow-md hover:shadow-[0_4px_20px_rgba(4,148,68,0.15)]"
                              >
                                <div className="flex items-center gap-3.5 overflow-hidden">
                                  <div className="w-11 h-11 rounded-xl bg-[#049444]/10 border-2 border-[#049444]/40 flex items-center justify-center text-black shrink-0 text-base font-black shadow-sm">
                                    {prod.category.includes('P2P') ? '🔄' : '📚'}
                                  </div>
                                  <div className="overflow-hidden space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-base sm:text-lg text-black group-hover:text-[#049444] transition-colors truncate">
                                        {prod.title}
                                      </span>
                                      <span className="text-[10px] bg-[#FFCC00] text-black border border-black/20 font-black px-2 py-0.5 rounded uppercase shrink-0">
                                        {prod.category}
                                      </span>
                                    </div>
                                    <p className="text-sm sm:text-base text-slate-600 line-clamp-2 leading-relaxed font-bold">
                                      {prod.subtitle}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <span className="font-mono text-sm sm:text-base font-black text-black bg-[#FFCC00] px-3 py-1.5 rounded-xl border-2 border-black/20 block shadow-sm">
                                    {prod.price}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SECTION 3: USERS & TRADERS */}
                      {(activeTab === 'all' || activeTab === 'users') && filteredUsers.length > 0 && (
                        <div className="space-y-3 pt-4 border-t-2 border-slate-200">
                          <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#049444]/15 via-[#FFCC00]/20 to-[#049444]/15 border-2 border-[#049444] rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest text-black flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#049444]" />
                              <span>Pilotos & Comunidade ({filteredUsers.length})</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredUsers.slice(0, activeTab === 'users' ? 100 : 6).map((usr) => (
                              <button
                                key={usr.id}
                                onClick={() => handleExecuteSearchItem({
                                  id: usr.id,
                                  type: 'user',
                                  title: usr.name,
                                  subtitle: usr.subtitle,
                                  viewTarget: 'VIEW_PROFILE' as any,
                                  userData: usr
                                })}
                                className="w-full p-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#049444] rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 text-left group shadow-md hover:shadow-[0_4px_20px_rgba(4,148,68,0.15)]"
                              >
                                <div className="flex items-center gap-3.5 overflow-hidden">
                                  <div className={`w-11 h-11 rounded-full ${usr.avatarColor} border-2 border-black/20 flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md`}>
                                    {usr.name.charAt(0)}
                                  </div>
                                  <div className="overflow-hidden space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-base sm:text-lg text-black group-hover:text-[#049444] transition-colors truncate">
                                        {usr.name}
                                      </span>
                                      <span className="text-[10px] bg-[#FFCC00] text-black border border-black/20 font-black px-2 py-0.5 rounded uppercase shrink-0">
                                        {usr.role}
                                      </span>
                                    </div>
                                    <p className="text-sm sm:text-base text-slate-600 line-clamp-2 leading-relaxed font-bold">
                                      {usr.subtitle}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-1 text-xs text-black bg-[#FFCC00] px-3 py-1.5 rounded-xl border border-black/20 font-black group-hover:scale-105 transition-transform">
                                  <span>Ver</span>
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* FOOTER HINT */}
                <div className="p-3 bg-slate-100 border-t-2 border-[#049444]/30 flex items-center justify-between text-xs text-black font-black">
                  <div className="flex items-center gap-2">
                    <span className="text-[#049444] font-black">⚡ CryptonBet Busca</span>
                    <span className="text-slate-600 font-bold">• NAVEGAÇÃO RÁPIDA</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline text-slate-600 font-bold">Pressione ESC para fechar</span>
                    <button
                      onClick={() => setIsFocused(false)}
                      className="text-xs text-black hover:text-[#049444] font-black underline cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDE: NOTIFICATIONS, FULLSCREEN & ANUNCIAR BUTTONS */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* NOTIFICATION BELL BUTTON */}
          <button
            onClick={() => {
              soundService.playUISelect();
              setIsNotifModalOpen(true);
            }}
            className={`relative p-2 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer border shrink-0 active:scale-95 flex items-center gap-1.5 ${
              unreadNotifsCount > 0
                ? 'bg-[#049444]/25 text-[#049444] border-[#049444]/50 hover:bg-[#049444]/35 shadow-[0_0_15px_rgba(4,148,68,0.2)]'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title="Central de Notificações"
          >
            <div className="relative flex items-center justify-center">
              <Bell className={`w-4 h-4 ${unreadNotifsCount > 0 ? 'text-[#049444] animate-bounce' : 'text-slate-300'}`} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-lg border-2 border-[#131d27]">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline font-black text-xs">
              {unreadNotifsCount > 0 ? `${unreadNotifsCount} Novo${unreadNotifsCount > 1 ? 's' : ''}` : 'Avisos'}
            </span>
          </button>

          {/* FULLSCREEN BUTTON */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer border shrink-0 active:scale-95 ${
              isFullscreen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title={isFullscreen ? 'Sair de Ecrã Inteiro (Fullscreen)' : 'Ecrã Inteiro (Fullscreen)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline">Sair Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#FFCC00]" />
                <span className="hidden md:inline">Fullscreen</span>
              </>
            )}
          </button>

          {/* CREATE AD BUTTON */}
          <button
            onClick={() => {
              soundService.playUISelect();
              if (onOpenCreateAd) {
                onOpenCreateAd();
              } else {
                onSelectGame('SOCIAL');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer border border-blue-400/30 shrink-0 active:scale-95"
            title="Criar Campanha de Anúncio Patrocinado"
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">Anunciar</span>
          </button>
        </div>

      </div>

      {/* NOTIFICATION CENTER MODAL */}
      <NotificationCenterModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={notifications}
        currentUserId={user?.id || 'guest'}
        onSelectGame={onSelectGame}
      />
    </header>
  );
};

export default GlobalHeader;
