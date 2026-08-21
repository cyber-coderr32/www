
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { ViewState, UserAccount, GlobalSettings } from './types';
import { soundService } from './services/soundService';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { db } from './services/firebase';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import HomeView from './views/HomeView';
import GlobalHeader from './components/GlobalHeader';
import DesktopRestrictionOverlay from './components/DesktopRestrictionOverlay';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bomb, 
  PlaneTakeoff, 
  Gamepad2, 
  User, 
  Menu, 
  ShieldAlert, 
  Zap,
  Globe,
  Wallet,
  Gift,
  History,
  TrendingUp,
  Users,
  ArrowUpDown,
  BookOpen,
  LogOut,
  Store,
  Receipt,
  Clock
} from 'lucide-react';

// Lazy Loading
const P2PView = lazy(() => import('@/views/P2PView'));
const AviatorView = lazy(() => import('@/views/AviatorView'));
const RouletteView = lazy(() => import('@/views/RouletteView'));
const SlotsView = lazy(() => import('@/views/SlotsView'));
const DiceView = lazy(() => import('@/views/DiceView'));
const LotteryView = lazy(() => import('@/views/LotteryView'));
const MinesView = lazy(() => import('@/views/MinesView'));
const PlinkoView = lazy(() => import('@/views/PlinkoView'));
const BlackjackView = lazy(() => import('@/views/BlackjackView'));
const CoinFlipView = lazy(() => import('@/views/CoinFlipView'));
const ProfileView = lazy(() => import('@/views/ProfileView'));
const SocialView = lazy(() => import('@/views/SocialView'));
const PdfMarketView = lazy(() => import('./views/PdfMarketView'));

const AdminView = lazy(() => import('@/views/AdminView'));
const PromotionsView = lazy(() => import('@/views/PromotionsView'));
const HistoryView = lazy(() => import('@/views/HistoryView'));
const ComingSoonView = lazy(() => import('@/views/ComingSoonView'));
const LimboView = lazy(() => import('@/views/LimboView'));
const CrashView = lazy(() => import('@/views/CrashView'));
const WheelView = lazy(() => import('@/views/WheelView'));
const ScratchView = lazy(() => import('@/views/ScratchView'));
const HiLoView = lazy(() => import('@/views/HiLoView'));
const TowerView = lazy(() => import('@/views/TowerView'));
const KenoView = lazy(() => import('@/views/KenoView'));
const BaccaratView = lazy(() => import('@/views/BaccaratView'));
const StairsView = lazy(() => import('@/views/StairsView'));
const PokerView = lazy(() => import('@/views/PokerView'));
const TermsView = lazy(() => import('@/views/TermsView'));
const PrivacyView = lazy(() => import('@/views/PrivacyView'));
const RefundView = lazy(() => import('@/views/RefundView'));
const SuccessView = lazy(() => import('@/views/SuccessView'));
const FailureView = lazy(() => import('@/views/FailureView'));
const ApiPortalView = lazy(() => import('./views/ApiPortalView'));
const EmbedGameView = lazy(() => import('./views/EmbedGameView'));
const TransactionStatusView = lazy(() => import('./views/TransactionStatusView'));

const MaintenanceView: React.FC = () => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-[#0b0e11] p-10 text-center">
    <motion.div 
      animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }} 
      transition={{ duration: 2, repeat: Infinity }}
      className="text-8xl mb-6"
    >⚽</motion.div>
    <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4 text-white">Crypton<span className="text-[#049444]">Bet</span> Manutenção</h1>
    <p className="text-slate-500 max-w-md uppercase text-xs font-bold tracking-widest leading-loose">
      Estamos a atualizar o nosso estádio para uma melhor experiência. Voltaremos em breve com as melhores odds de Angola.
    </p>
  </div>
);

const LoadingView: React.FC = () => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-[#0b0e11]">
    <div className="relative mb-8 text-[#049444]">
      <motion.div 
        animate={{ scale: [1, 1.05, 1], rotate: [-1, 1, -1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-24 h-12 bg-[#049444] rounded-lg flex items-center justify-center shadow-2xl shadow-[#049444]/40"
      >
        <span className="text-white font-black italic text-xl">CRYPTON</span>
      </motion.div>
      <div className="text-right -mt-2">
        <span className="text-[#049444] font-black italic text-xl">BET</span>
      </div>
    </div>
    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mb-4">
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="w-full h-full bg-[#049444]"
      />
    </div>
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ligando Servidores...</span>
  </div>
);

const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialEmbed = urlParams.get('embed') === 'true';
  const initialApiPortal = urlParams.get('api_portal') === 'true';

  const [view, setView] = useState<ViewState>(
    initialEmbed ? 'EMBED_GAME' : (initialApiPortal ? 'API_PORTAL' : 'LOGIN')
  );
  const [socialInitialFilter, setSocialInitialFilter] = useState<'all' | 'social' | 'p2p' | 'pdf' | 'manager'>('all');
  const [autoOpenCreateAdToken, setAutoOpenCreateAdToken] = useState(false);
  const [globalAlert, setGlobalAlert] = useState<{ message: string; isOpen: boolean; isDomainError?: boolean; domain?: string } | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [targetScrollId, setTargetScrollId] = useState<string | null>(null);

  useEffect(() => {
    window.alert = (message: string) => {
      soundService.playTick();
      setGlobalAlert({ message: String(message), isOpen: true });
    };
  }, []);

  const [realBalance, setRealBalance] = useState(0);
  const [demoBalance, setDemoBalance] = useState(5000.00);
  const [isDemo, setIsDemo] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 786);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Detect when virtual keyboard is active or an input/textarea is focused to prevent menu jumping up
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (
          !active ||
          (active.tagName !== 'INPUT' &&
            active.tagName !== 'TEXTAREA' &&
            active.tagName !== 'SELECT' &&
            !active.isContentEditable)
        ) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        // When keyboard opens, visualViewport shrinks significantly
        const isKeyboard = window.visualViewport.height < window.innerHeight * 0.82;
        if (isKeyboard) {
          setIsKeyboardOpen(true);
        } else {
          const active = document.activeElement as HTMLElement;
          if (
            !active ||
            (active.tagName !== 'INPUT' &&
              active.tagName !== 'TEXTAREA' &&
              active.tagName !== 'SELECT' &&
              !active.isContentEditable)
          ) {
            setIsKeyboardOpen(false);
          }
        }
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);
  const [settings, setSettings] = useState<GlobalSettings>({
    siteName: 'CryptonBet Angola',
    maintenanceMode: false,
    globalRtp: 95,
    forcedAviatorMultiplier: null,
    globalNotification: null,
    totalVolume: 0,
    totalPaid: 0,
    paymentMethods: [
      { id: 'plisio_crypto', name: '⚡ Cripto Automático (Plisio)', type: 'CRYPTO', account: 'Plisio Crypto Gateway', icon: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=100&q=80', isActive: true, minDeposit: 5, maxWithdraw: 50000, cryptoType: 'USDT', cryptoNetwork: 'Multi-Chain (TRC20, BEP20, BTC, ETH, SOL)', details: 'Fatura instantânea com QR Code e crédito automático em Blockchain' },
      { id: 'usdt_trc20', name: 'USDT (TRC-20 Manual)', type: 'CRYPTO', account: 'TYd8S1kX9aPz2mQqR4vW7tL0uJ3bC5nE', icon: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=100&q=80', isActive: true, minDeposit: 10, maxWithdraw: 50000, cryptoType: 'USDT', cryptoNetwork: 'TRC20', details: 'Rede TRON (TRC20) • Depósito manual com comprovativo' },
      { id: 'pix_cakto', name: 'PIX Automático (Brasil)', type: 'PIX', account: 'pix@cryptonbet.com', icon: 'https://images.unsplash.com/photo-1613243555988-441166d4d6fd?auto=format&fit=crop&w=100&q=80', isActive: true, minDeposit: 5, maxWithdraw: 50000, details: 'Depósito instantâneo via PIX com aprovação em tempo real' },
      { id: 'unitel_money', name: 'Unitel Money', type: 'UNITEL_MONEY', account: '923000000', icon: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=100&q=80', isActive: true, minDeposit: 500, maxWithdraw: 500000, entityNumber: '00123', referenceNumber: '923000000', details: 'Pagamento via Unitel Money (Entidade e Referência)' },
      { id: 'multicaixa', name: 'Multicaixa Express', type: 'BANK', account: 'AO06 0000 0000 0000 0000 0', icon: 'https://www.emisu.co.ao/static/logo-emisu-multicaixa-express.png', isActive: true, minDeposit: 500, maxWithdraw: 500000, details: 'Transferência Bancária / Multicaixa Express' }
    ],
    cakto: {
      enabled: true,
      apiToken: '',
      clientSecret: '',
      webhookSecret: '',
      pixKey: 'pix@cryptonbet.com',
      receiverName: 'CryptonBet Brasil',
      exchangeRate: 5.85,
      environment: 'sandbox'
    },
    plisio: {
      enabled: true,
      secretKey: '',
      whiteLabel: true,
      environment: 'sandbox',
      defaultCurrency: 'USDT_TRX',
      acceptedCurrencies: ['USDT_TRX', 'USDT_BSC', 'USDT_ETH', 'BTC', 'ETH', 'SOL', 'TRX', 'LTC', 'DOGE', 'BNB', 'TON'],
      depositBonusPercent: 5
    }
  });

  const activeBalance = isDemo ? demoBalance : realBalance;

  // Firebase connection test and Auth Listener
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        // Silently capture since we have robust localStorage fallbacks
        console.warn("Firestore offline or inaccessible. Running in hybrid offline/fallback mode.");
      }
    };
    testConnection();

    const unsubscribe = authService.onAuthChange(async (fbUser) => {
      setIsLoadingAuth(true);
      if (fbUser) {
        let profile = null;
        try {
          // Try to fetch the user profile from Firestore or local fallback
          profile = await userService.getUserProfile(fbUser.uid) as any;
          
          // If profile doesn't exist yet (e.g., registration / Google creation in progress), wait and retry
          if (!profile) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            profile = await userService.getUserProfile(fbUser.uid) as any;
          }
        } catch (e) {
          console.error("Failed to retrieve user profile from database, using fallback:", e);
        }

        // If still null, create a default profile so the user isn't locked out of the app
        if (!profile) {
          const defaultProfile = {
            displayName: fbUser.displayName || 'Piloto',
            email: fbUser.email || '',
            role: 'USER',
            joinedAt: new Date().toISOString()
          };
          try {
            await userService.createUserProfile(fbUser.uid, defaultProfile);
            profile = await userService.getUserProfile(fbUser.uid) as any;
          } catch (err) {
            console.error("Error creating default profile in auth change listener:", err);
          }
        }
        
        if (profile) {
          const isAdminUser = profile.role === 'ADMIN' || fbUser.email === 'alfaajmc@atend.com' || fbUser.email === 'alfaajmc@gmail.com' || fbUser.email === 'admin@cryptonbet.ao';
          const userAccount: UserAccount = {
            id: fbUser.uid,
            name: profile.displayName || 'Jogador',
            email: fbUser.email || '',
            phone: profile.phone || '',
            balance: profile.balance !== undefined ? Number(profile.balance) : (isAdminUser ? 500000.00 : 0.00),
            role: isAdminUser ? 'ADMIN' : 'USER',
            isBanned: profile.isBanned || false,
            joinedAt: profile.joinedAt || new Date().toISOString(),
            bio: profile.bio || '',
            avatarColor: profile.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]',
            whatsapp: profile.whatsapp || ''
          };
          setUser(userAccount);
          setRealBalance(userAccount.balance);
          
          if (view === 'LOGIN' || view === 'REGISTER') {
             const s = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
             setView(s.maintenanceMode && !isAdminUser ? 'MAINTENANCE' : 'HOME');
          }
        } else {
          // Robust fallback with zero balance until real deposit is made
          const isAdminUser = fbUser.email === 'alfaajmc@atend.com' || fbUser.email === 'alfaajmc@gmail.com' || fbUser.email === 'admin@cryptonbet.ao';
          const fallbackAccount: UserAccount = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Jogador Conectado',
            email: fbUser.email || '',
            phone: '',
            balance: isAdminUser ? 500000.00 : 0.00,
            role: isAdminUser ? 'ADMIN' : 'USER',
            isBanned: false,
            joinedAt: new Date().toISOString(),
            bio: '',
            avatarColor: 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]',
            whatsapp: ''
          };
          setUser(fallbackAccount);
          setRealBalance(fallbackAccount.balance);
          if (view === 'LOGIN' || view === 'REGISTER') {
             setView('HOME');
          }
        }
      } else {
        // If not authenticated, clear user but don't force login view if we are on the register page
        setUser(null);
        if (view !== 'REGISTER') setView('LOGIN');
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization of user balance from Firestore (for Plisio, PIX, and manual deposit approvals)
  useEffect(() => {
    const userId = user?.id;
    if (!userId || userId.startsWith('local_') || userId === 'guest_user') return;

    const unsubUser = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.balance !== undefined) {
          const liveBalance = Number(data.balance);
          setRealBalance(prev => (prev !== liveBalance ? liveBalance : prev));
          setUser(prev => {
            if (!prev || prev.balance === liveBalance) return prev;
            return { ...prev, balance: liveBalance };
          });
        }
      }
    }, (err) => {
      console.warn("User live listener error:", err.message);
    });

    return () => unsubUser();
  }, [user?.id]);

  useEffect(() => {
    const syncSettings = () => {
      const saved = localStorage.getItem('skyhigh_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          let mutated = false;

          // Ensure Plisio Crypto is always registered and available
          if (!parsed.paymentMethods?.some((m: any) => m.id === 'plisio_crypto')) {
            parsed.paymentMethods = [
              { 
                id: 'plisio_crypto', 
                name: '⚡ Cripto Automático (Plisio)', 
                type: 'CRYPTO', 
                account: 'Plisio Crypto Gateway', 
                icon: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=100&q=80', 
                isActive: true, 
                minDeposit: 5, 
                maxWithdraw: 50000, 
                cryptoType: 'USDT', 
                cryptoNetwork: 'Multi-Chain (TRC20, BEP20, BTC, ETH, SOL, TRX, LTC, DOGE)', 
                details: 'Fatura instantânea com QR Code e crédito automático na Blockchain' 
              },
              ...(parsed.paymentMethods || [])
            ];
            mutated = true;
          }

          if (!parsed.paymentMethods?.some((m: any) => m.type === 'PIX' || m.id === 'pix_cakto')) {
            parsed.paymentMethods = [
              ...(parsed.paymentMethods || []),
              { id: 'pix_cakto', name: 'PIX Automático (Brasil)', type: 'PIX', account: 'pix@cryptonbet.com', icon: 'https://images.unsplash.com/photo-1613243555988-441166d4d6fd?auto=format&fit=crop&w=100&q=80', isActive: true, minDeposit: 5, maxWithdraw: 50000, details: 'Depósito instantâneo via PIX com aprovação em tempo real' }
            ];
            mutated = true;
          } else if (parsed.paymentMethods) {
            parsed.paymentMethods = parsed.paymentMethods.map((m: any) => {
              if (m.type === 'PIX' || m.id === 'pix_cakto' || (m.name && m.name.toLowerCase().includes('cakto'))) {
                if (m.name !== 'PIX Automático (Brasil)') mutated = true;
                return {
                  ...m,
                  name: 'PIX Automático (Brasil)',
                  details: 'Depósito instantâneo via PIX com aprovação em tempo real'
                };
              }
              return m;
            });
          }
          if (!parsed.cakto) {
            parsed.cakto = {
              enabled: true,
              apiToken: '',
              clientSecret: '',
              webhookSecret: '',
              pixKey: 'pix@cryptonbet.com',
              receiverName: 'CryptonBet Brasil',
              exchangeRate: 5.85,
              environment: 'sandbox'
            };
            mutated = true;
          }
          if (!parsed.plisio) {
            parsed.plisio = {
              enabled: true,
              secretKey: '',
              whiteLabel: true,
              environment: 'sandbox',
              defaultCurrency: 'USDT_TRX',
              acceptedCurrencies: ['USDT_TRX', 'USDT_BSC', 'USDT_ETH', 'BTC', 'ETH', 'SOL', 'TRX', 'LTC', 'DOGE', 'BNB', 'TON'],
              depositBonusPercent: 5
            };
            mutated = true;
          }
          if (mutated) {
            localStorage.setItem('skyhigh_settings', JSON.stringify(parsed));
          }
          setSettings(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
          if (parsed.maintenanceMode && userRole !== 'ADMIN' && !['LOGIN', 'REGISTER', 'MAINTENANCE'].includes(view)) {
            setView('MAINTENANCE');
          }
        } catch (e) {
          console.error("Error in syncSettings:", e);
        }
      }
    };

    const userRole = user?.role;
    syncSettings();
    const handleResize = () => setIsDesktop(window.innerWidth >= 786);
    window.addEventListener('resize', handleResize);
    const interval = setInterval(syncSettings, 5000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [user?.role, view]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable || 
        target.tagName === 'SELECT'
      ) {
        return;
      }
      
      if (e.key === 'c' || e.key === 'C') {
        soundService.playUISelect();
        setView('HOME');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const handleEmailLogin = async (email: string, pass: string) => {
    try {
      setIsLoadingAuth(true);
      const trimmedEmail = (email || '').trim().toLowerCase();
      if (!trimmedEmail) {
        alert("Por favor, introduza um e-mail válido.");
        return;
      }
      await authService.signInWithEmail(trimmedEmail, pass);
    } catch (e: any) {
      console.error("Login failed", e);
      if (e.message && (e.message.includes('auth/invalid-credential') || e.message.includes('auth/wrong-password') || e.message.includes('auth/user-not-found'))) {
        alert("E-mail ou palavra-passe incorretos.");
      } else if (e.message && e.message.includes('auth/invalid-email')) {
        alert("Formato de e-mail inválido. Por favor verifique.");
      } else {
        alert("Erro ao entrar: " + (e.message || "Tente novamente."));
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleEmailRegister = async (name: string, email: string, phone: string, pass: string) => {
    try {
      setIsLoadingAuth(true);
      const trimmedEmail = (email || '').trim().toLowerCase();
      if (!trimmedEmail) {
        alert("Por favor, introduza um e-mail válido.");
        return;
      }
      const fbUser = await authService.signUpWithEmail(trimmedEmail, pass);
      if (fbUser) {
        await userService.createUserProfile(fbUser.uid, {
          displayName: name,
          email: trimmedEmail,
          phone: phone,
          role: 'USER'
        });
      }
    } catch (e: any) {
      console.error("Registration failed", e);
      if (e.message && e.message.includes('auth/email-already-in-use')) {
        alert("Este e-mail já está em uso.");
      } else if (e.message && e.message.includes('auth/invalid-email')) {
        alert("Formato de e-mail inválido. Por favor verifique.");
      } else if (e.message && e.message.includes('auth/weak-password')) {
        alert("A palavra-passe deve ter pelo menos 6 caracteres.");
      } else {
        alert("Erro ao registar: " + (e.message || "Tente novamente."));
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoadingAuth(true);
      const fbUser = await authService.signInWithGoogle();
      if (fbUser) {
        let profile = await userService.getUserProfile(fbUser.uid);
        if (!profile) {
          await userService.createUserProfile(fbUser.uid, {
            displayName: fbUser.displayName || 'Jogador Google',
            email: fbUser.email || '',
            role: 'USER'
          });
        }
      }
    } catch (e: any) {
      console.error("Google Login failed", e);
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/popup-blocked') {
        setGlobalAlert({
          message: "⚠️ Janela do Google fechada ou bloqueada pelo navegador.\n\nComo você está acedendo dentro da janela de pré-visualização (iframe do AI Studio no celular), alguns navegadores mobile cortam a conexão da aba pop-up ao alternar de tela.\n\n💡 COMO RESOLVER EM 5 SEGUNDOS:\n1️⃣ Clique no ícone de 'Abrir em Nova Aba' (↗️) no topo direito da tela do AI Studio, ou abra o link direto do app no seu navegador.\n2️⃣ Ao abrir direto no navegador, o login com Google funcionará normalmente em 1 clique!\n3️⃣ Ou, se preferir continuar aqui dentro, faça login normal usando E-mail e Senha.",
          isOpen: true
        });
        return;
      } else if (e?.code === 'auth/unauthorized-domain' || (e?.message && e.message.includes('auth/unauthorized-domain'))) {
        setGlobalAlert({
          message: "O Google Login foi bloqueado pelo Firebase porque o endereço URL atual (desta pré-visualização) ainda não foi autorizado no console do seu projeto Firebase.",
          isOpen: true,
          isDomainError: true,
          domain: window.location.hostname
        });
        return;
      }
      
      let errMsg = "Erro ao entrar com a conta do Google.";
      if (e?.message) {
        errMsg = e.message;
      }
      alert(errMsg);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    soundService.playUISelect();
    try {
      setIsLoadingAuth(true);
      await authService.signInWithEmail('alfaajmc@gmail.com', 'admin123');
    } catch (err: any) {
      console.error("Quick admin login fallback error:", err);
      if (err?.message) alert(err.message);
    } finally {
      setIsLoadingAuth(false);
      if (globalAlert) setGlobalAlert(null);
    }
  };

  const handleGuestLogin = () => {
    soundService.playUISelect();
    const guestUser: UserAccount = {
      id: 'guest_user',
      name: 'Piloto Convidado',
      email: 'convidado@cryptonbet.ao',
      balance: 150000.00, // Rich demo balance
      role: 'USER',
      isBanned: false,
      joinedAt: new Date().toISOString(),
      bio: 'Operador profissional de Opções Binárias no CryptonBet Angola. 🚀🇦🇴',
      avatarColor: 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]',
      whatsapp: '+244 923 000 000'
    };
    setUser(guestUser);
    setRealBalance(150000.00);
    setIsDemo(true);
    setView('HOME');
  };

  const handleUpdateProfile = async (updates: { name: string; phone?: string; bio?: string; avatarColor?: string; whatsapp?: string }) => {
    if (!user) return;
    try {
      const dbUpdates = {
        displayName: updates.name,
        phone: updates.phone || '',
        bio: updates.bio || '',
        avatarColor: updates.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]',
        whatsapp: updates.whatsapp || ''
      };
      await userService.updateUserProfile(user.id, dbUpdates);
      setUser(prev => prev ? {
        ...prev,
        name: updates.name,
        phone: updates.phone,
        bio: updates.bio,
        avatarColor: updates.avatarColor,
        whatsapp: updates.whatsapp
      } : null);
    } catch (e) {
      console.error("Error updating profile", e);
      alert("Erro ao atualizar o perfil.");
    }
  };

  const updateBalance = (amount: number) => {
    const currentSettings = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
    if (amount < 0) {
      currentSettings.totalVolume += Math.abs(amount);
    } else {
      currentSettings.totalPaid += amount;
    }
    localStorage.setItem('skyhigh_settings', JSON.stringify(currentSettings));

    if (isDemo) {
      setDemoBalance(prev => Math.max(0, prev + amount));
    } else {
      const nextBal = Math.max(0, realBalance + amount);
      setRealBalance(nextBal);
      if (user?.id && !user.id.startsWith('local_') && user.id !== 'guest_user') {
        userService.updateBalance(user.id, nextBal).catch(() => {});
      }
    }
  };

  const handleSelectGame = (v: ViewState, param?: any) => {
    if (v !== view) {
      soundService.playGameTransition();
    }
    if (v === 'VIEW_PROFILE') {
      if (param) {
        let targetObj = typeof param === 'object' ? param : { id: String(param), name: String(param) };
        const targetId = targetObj.id || targetObj.uid || targetObj.name;
        if (user && (targetId === user.id || targetObj.email === user.email || targetObj.name === user.name)) {
          setViewingUser(null);
          setView('PROFILE');
          return;
        }
        setViewingUser({
          id: targetId || 'guest_' + Date.now(),
          name: targetObj.name || targetObj.displayName || targetId || 'Trader Membro',
          email: targetObj.email || '',
          role: targetObj.role || 'USER',
          bio: targetObj.bio || targetObj.subtitle || 'Trader e membro ativo da comunidade CryptonBet.',
          avatarColor: targetObj.avatarColor || 'bg-gradient-to-tr from-purple-600 to-indigo-600',
          totalWins: targetObj.totalWins || Math.floor(Math.random() * 60) + 10,
          totalBets: targetObj.totalBets || Math.floor(Math.random() * 140) + 30,
          balance: 0
        });
        setView('PROFILE');
      } else {
        setViewingUser(null);
        setView('PROFILE');
      }
      return;
    } else if (v === 'CREATE_PRODUCT') {
      setView('SOCIAL');
      setSocialInitialFilter('pdf');
      setAutoOpenCreateAdToken(true);
      setTimeout(() => setAutoOpenCreateAdToken(false), 500);
      return;
    }
    if (v === 'P2P') {
      setView('SOCIAL');
      setSocialInitialFilter('p2p');
      if (param) setTargetScrollId(String(param));
    } else if (v === 'PDF_MARKET') {
      setView('SOCIAL');
      setSocialInitialFilter('pdf');
      if (param) setTargetScrollId(String(param));
    } else if (v === 'PRODUCT_MANAGER') {
      setViewingUser(null);
      setView('PRODUCT_MANAGER');
    } else if (v === 'SOCIAL') {
      setView('SOCIAL');
      setSocialInitialFilter('all');
      if (param) setTargetScrollId(String(param));
    } else if (v === 'PROFILE') {
      setViewingUser(null);
      setView('PROFILE');
    } else {
      setView(v);
    }
  };

  const handleOpenCreateAd = () => {
    soundService.playUISelect();
    setView('SOCIAL');
    setSocialInitialFilter('all');
    setAutoOpenCreateAdToken(true);
    setTimeout(() => setAutoOpenCreateAdToken(false), 500);
  };

  const handleOpenDeposit = () => {
    soundService.playUISelect();
    setViewingUser(null);
    setView('PROFILE');
  };

  const renderView = () => {
    if (settings.maintenanceMode && user?.role !== 'ADMIN' && !['LOGIN', 'REGISTER'].includes(view)) {
      return <MaintenanceView />;
    }

    switch (view) {
      case 'MAINTENANCE': return <MaintenanceView />;
      case 'LOGIN': return <LoginView onLogin={handleEmailLogin} onLoginGoogle={handleGoogleLogin} onGoToRegister={() => setView('REGISTER')} onOpenLegalView={(v) => setView(v)} onQuickAdmin={handleQuickAdminLogin} />;
      case 'REGISTER': return <RegisterView onRegister={handleEmailRegister} onLoginGoogle={handleGoogleLogin} onGoToLogin={() => setView('LOGIN')} onOpenLegalView={(v) => setView(v)} onQuickAdmin={handleQuickAdminLogin} />;
      case 'TERMS': return <TermsView onBack={() => setView('LOGIN')} />;
      case 'PRIVACY': return <PrivacyView onBack={() => setView('LOGIN')} />;
      case 'REFUND': return <RefundView onBack={() => setView('LOGIN')} />;
      case 'SUCCESS': return <SuccessView onGoHome={() => setView('HOME')} onGoWallet={() => setView('PROFILE')} />;
      case 'FAILURE': return <FailureView onRetry={() => setView('P2P')} onGoHome={() => setView('HOME')} onSupport={() => setView('P2P')} />;
      case 'HOME': return <HomeView balance={activeBalance} isDemo={isDemo} onSelectGame={handleSelectGame} userName={user?.name || 'Piloto'} onGoToProfile={() => { setViewingUser(null); setView('PROFILE'); }} onOpenDeposit={handleOpenDeposit} />;
      case 'PROFILE': return <ProfileView balance={activeBalance} user={viewingUser || user!} currentUser={user} isDemo={isDemo} onToggleDemo={setIsDemo} onUpdateBalance={updateBalance} onBack={() => { setViewingUser(null); setView('HOME'); }} onLogout={() => authService.logout()} onUpdateUser={handleUpdateProfile} onSelectGame={handleSelectGame} viewingUser={viewingUser} />;
      case 'AVIATOR': return <AviatorView balance={activeBalance} isDemo={isDemo} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'ROULETTE': return <RouletteView balance={activeBalance} isDemo={isDemo} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'SLOTS': return <SlotsView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'DICE': return <DiceView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'LOTTERY': return <LotteryView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'MINES': return <MinesView balance={activeBalance} isDemo={isDemo} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'PLINKO': return <PlinkoView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'BLACKJACK': return <BlackjackView balance={activeBalance} isDemo={isDemo} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'COINFLIP': return <CoinFlipView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'P2P': return <SocialView balance={realBalance} isDemo={false} onBack={() => setView('HOME')} onSelectGame={handleSelectGame} onUpdateBalance={updateBalance} initialFilter="p2p" autoOpenCreateAd={autoOpenCreateAdToken} targetScrollId={targetScrollId} onClearTargetScrollId={() => setTargetScrollId(null)} />;
      case 'SOCIAL': return <SocialView balance={realBalance} isDemo={false} onBack={() => setView('HOME')} onSelectGame={handleSelectGame} onUpdateBalance={updateBalance} initialFilter={socialInitialFilter} autoOpenCreateAd={autoOpenCreateAdToken} targetScrollId={targetScrollId} onClearTargetScrollId={() => setTargetScrollId(null)} />;
      case 'PDF_MARKET': return <SocialView balance={realBalance} isDemo={false} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} onSelectGame={handleSelectGame} initialFilter="pdf" autoOpenCreateAd={autoOpenCreateAdToken} targetScrollId={targetScrollId} onClearTargetScrollId={() => setTargetScrollId(null)} />;
      case 'PRODUCT_MANAGER': return <ProfileView balance={activeBalance} user={viewingUser || user!} currentUser={user} isDemo={isDemo} onToggleDemo={setIsDemo} onUpdateBalance={updateBalance} onBack={() => { setViewingUser(null); setView('HOME'); }} onLogout={() => authService.logout()} onUpdateUser={handleUpdateProfile} onSelectGame={handleSelectGame} initialTab="PRODUCTS" viewingUser={viewingUser} />;
      
      // Real Games
      case 'LIMBO': return <LimboView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'POKE_CHOMP':
      case 'CRASH': return <CrashView balance={activeBalance} isDemo={isDemo} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'WHEEL': return <WheelView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'SCRATCH': return <ScratchView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'HILO': return <HiLoView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'TOWER': return <TowerView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'KENO': return <KenoView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'BACCARAT': return <BaccaratView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'STAIRS': return <StairsView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;
      case 'POKER': return <PokerView balance={activeBalance} onUpdateBalance={updateBalance} onBack={() => setView('HOME')} />;

      case 'ADMIN': return <AdminView onBack={() => setView('HOME')} />;
      case 'TRANSACTION_STATUS': return <TransactionStatusView user={user!} onBack={() => setView('PROFILE')} onGoToDeposit={handleOpenDeposit} onGoToWithdraw={() => { setViewingUser(null); setView('PROFILE'); }} onUpdateBalance={updateBalance} />;
      case 'PROMOTIONS': return <PromotionsView onBack={() => setView('HOME')} onAction={(g) => handleSelectGame(g)} />;
      case 'HISTORY': return <HistoryView onBack={() => setView('HOME')} />;
      case 'API_PORTAL': return <ApiPortalView onBack={() => setView('HOME')} />;
      case 'EMBED_GAME': return <EmbedGameView />;
      default: return <LoginView onLogin={handleEmailLogin} onLoginGoogle={handleGoogleLogin} onGoToRegister={() => setView('REGISTER')} onQuickAdmin={handleQuickAdminLogin} />;
    }
  };

  if (isLoadingAuth) {
    return <LoadingView />;
  }

  const isAuthView = ['LOGIN', 'REGISTER', 'MAINTENANCE', 'TERMS', 'PRIVACY', 'REFUND', 'SUCCESS', 'FAILURE', 'EMBED_GAME'].includes(view);
  const isGameView = ['AVIATOR', 'ROULETTE', 'SLOTS', 'DICE', 'LOTTERY', 'MINES', 'PLINKO', 'BLACKJACK', 'COINFLIP', 'LIMBO', 'POKE_CHOMP', 'CRASH', 'WHEEL', 'SCRATCH', 'HILO', 'TOWER', 'KENO', 'BACCARAT', 'STAIRS', 'POKER'].includes(view);

  return (
    <div className="h-[100dvh] w-full bg-[#0b0e11] text-white flex overflow-hidden">
      {/* RESTRIÇÃO DE TELA APENAS PARA DISPOSITIVOS MÓVEIS E TABLETS EM TELAS GRANDES */}
      <DesktopRestrictionOverlay />

      {!isAuthView && (
        <>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] md:hidden" 
                onClick={() => setIsMenuOpen(false)} 
              />
            )}
          </AnimatePresence>
          
          <aside className={`fixed top-0 left-0 h-full bg-[#131d27] border-r border-white/5 z-[200] transition-all duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0 w-64 pointer-events-auto' : (isDesktop ? 'translate-x-0 w-20 xl:w-64 pointer-events-auto' : '-translate-x-full pointer-events-none')} flex flex-col shadow-2xl`}>
            <div className="p-6 flex items-center gap-2">
               <div className="bg-[#049444] px-3 py-1 rounded shadow-lg transform -rotate-1 flex items-center">
                 <span 
                   onClick={() => {
                     soundService.playUISelect();
                     setView('HOME');
                   }}
                   className="text-white font-black italic text-lg tracking-tighter cursor-pointer hover:text-[#FFCC00] transition-colors pr-[1px]"
                   title="Voltar para Home"
                 >
                   C
                 </span>
                 <span className="text-white font-black italic text-lg tracking-tighter">
                   RYPTON
                 </span>
               </div>
               <div className={`transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : (isDesktop ? 'opacity-0 xl:opacity-100' : 'opacity-0')}`}>
                  <span className="font-black text-xl tracking-tighter uppercase italic block leading-none text-[#FFCC00]">BET</span>
               </div>
            </div>
            
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto no-scrollbar">
              {user?.role === 'ADMIN' && (
                <motion.button 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  onClick={() => { 
                    soundService.playUISelect();
                    setIsMenuOpen(false);
                    setView('ADMIN');
                  }} 
                  className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all relative overflow-hidden group cursor-pointer z-[10] bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 shadow-md mb-2"
                >
                  <span className="shrink-0 transition-transform group-hover:scale-110 text-amber-400">
                    <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
                  </span>
                  <span className={`font-black uppercase text-[11px] tracking-widest transition-opacity duration-300 whitespace-nowrap ${isMenuOpen ? 'opacity-100' : (isDesktop ? 'opacity-0 xl:opacity-100' : 'opacity-0')}`}>
                    Painel Admin
                  </span>
                </motion.button>
              )}

              <motion.button 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={() => { 
                  soundService.playUISelect();
                  setIsMenuOpen(false);
                  handleSelectGame('PRODUCT_MANAGER');
                }} 
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all relative overflow-hidden group cursor-pointer z-[10] bg-gradient-to-r from-emerald-500/20 to-teal-600/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 shadow-md mb-2"
              >
                <span className="shrink-0 transition-transform group-hover:scale-110 text-emerald-400">
                  <Store className="w-5 h-5 md:w-6 md:h-6" />
                </span>
                <span className={`font-black uppercase text-[11px] tracking-widest transition-opacity duration-300 whitespace-nowrap ${isMenuOpen ? 'opacity-100' : (isDesktop ? 'opacity-0 xl:opacity-100' : 'opacity-0')}`}>
                  Meus Produtos (Vendas)
                </span>
              </motion.button>

              <motion.button 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={() => { 
                  soundService.playUISelect();
                  setIsMenuOpen(false);
                  setView('TRANSACTION_STATUS');
                }} 
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all relative overflow-hidden group cursor-pointer z-[10] bg-gradient-to-r from-amber-500/20 to-yellow-600/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 shadow-md mb-2"
              >
                <span className="shrink-0 transition-transform group-hover:scale-110 text-amber-400">
                  <Receipt className="w-5 h-5 md:w-6 md:h-6" />
                </span>
                <span className={`font-black uppercase text-[11px] tracking-widest transition-opacity duration-300 whitespace-nowrap ${isMenuOpen ? 'opacity-100' : (isDesktop ? 'opacity-0 xl:opacity-100' : 'opacity-0')}`}>
                  Status de Transações
                </span>
              </motion.button>

              <motion.button 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={() => { 
                  soundService.playUISelect();
                  setIsMenuOpen(false);
                  setView('API_PORTAL');
                }} 
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all relative overflow-hidden group cursor-pointer z-[10] bg-gradient-to-r from-blue-500/20 to-indigo-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 shadow-md mb-2"
              >
                <span className="shrink-0 transition-transform group-hover:scale-110 text-blue-400">
                  <Globe className="w-5 h-5 md:w-6 md:h-6" />
                </span>
                <span className={`font-black uppercase text-[11px] tracking-widest transition-opacity duration-300 whitespace-nowrap ${isMenuOpen ? 'opacity-100' : (isDesktop ? 'opacity-0 xl:opacity-100' : 'opacity-0')}`}>
                  API Pública iGaming (B2B)
                </span>
              </motion.button>

              <motion.button 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onClick={async () => { 
                  soundService.playUISelect();
                  setIsMenuOpen(false);
                  await authService.logout();
                }} 
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all relative overflow-hidden group cursor-pointer z-[10] text-red-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <span className="shrink-0 transition-transform group-hover:scale-110">
                  <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                </span>
                <span className={`font-black uppercase text-[11px] tracking-widest transition-opacity duration-300 whitespace-nowrap ${isMenuOpen ? 'opacity-100' : (isDesktop ? 'opacity-0 xl:opacity-100' : 'opacity-0')}`}>
                  Sair da Conta
                </span>
              </motion.button>
            </nav>
            
            <div className="p-4 border-t border-white/5 bg-black/20">
               <div className={`flex items-center gap-3 transition-opacity ${isMenuOpen ? 'opacity-100' : (isDesktop ? 'opacity-0 xl:opacity-100' : 'opacity-0')}`}>
                  <div className="w-10 h-10 rounded-full bg-[#049444] border-2 border-white/20 flex items-center justify-center font-black uppercase text-xs shadow-lg">
                    {user?.name?.charAt(0) || 'P'}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                     <span className="text-[10px] font-black uppercase truncate">{user?.name}</span>
                     <span className="text-[8px] text-slate-500 font-bold uppercase truncate tracking-tighter">Pilot ID: #{user?.id?.substring(0,6)}</span>
                  </div>
               </div>
            </div>
          </aside>
        </>
      )}
      
      <main className={`flex-1 flex flex-col transition-all duration-500 overflow-hidden ${!isAuthView ? (isDesktop ? 'pl-20 xl:pl-64' : 'pb-16') : ''}`}>
        {!isAuthView && (
          <GlobalHeader
            currentView={view}
            user={user}
            balance={activeBalance}
            isDemo={isDemo}
            onSelectGame={handleSelectGame}
            onGoToProfile={() => { setViewingUser(null); setView('PROFILE'); }}
            onToggleDemo={setIsDemo}
            onOpenDeposit={handleOpenDeposit}
            onOpenCreateAd={handleOpenCreateAd}
          />
        )}

        <AnimatePresence>
          {settings.globalNotification && !isAuthView && (
            <motion.div 
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: -50 }}
              className="bg-[#049444] py-1.5 px-4 text-center text-[10px] font-black uppercase tracking-widest border-b border-white/10 z-[150] shadow-xl"
            >
              <span className="animate-pulse">Crypton Alert: {settings.globalNotification}</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex-1 relative z-[10] overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={`min-h-full w-full flex flex-col ${isGameView ? 'game-view-arena' : ''}`}
            >
              <Suspense fallback={<LoadingView />}>
                <ErrorBoundary>
                  {renderView()}
                </ErrorBoundary>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {!isAuthView && !isDesktop && !isKeyboardOpen && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#131d27]/95 backdrop-blur-xl border-t border-white/5 z-[200] flex items-center justify-around px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
          {[
            { id: 'HOME', icon: <Globe className="w-5 h-5" />, label: 'Home' },
            { id: 'PLINKO', icon: <Zap className="w-5 h-5" />, label: 'Plinko' },
            { id: 'MINES', icon: <Bomb className="w-5 h-5" />, label: 'Minas' },
            { id: 'AVIATOR', icon: <PlaneTakeoff className="w-5 h-5" />, label: 'Aviator' },
            { id: 'PROMOTIONS', icon: <Gift className="w-5 h-5" />, label: 'Ofertas' },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => {
                soundService.playUISelect();
                handleSelectGame(item.id as ViewState);
              }} 
              className={`flex flex-col items-center gap-1 transition-all relative z-[10] cursor-pointer ${view === item.id ? 'text-[#FFCC00]' : 'text-slate-500 opacity-60'}`}
            >
              {view === item.id && (
                <motion.div 
                  layoutId="bottom-nav-bubble"
                  className="absolute -top-3 w-12 h-12 bg-[#049444]/10 rounded-full blur-xl"
                />
              )}
              <motion.div 
                animate={view === item.id ? { scale: 1.2, y: -4 } : { scale: 1, y: 0 }}
              >
                {item.icon}
              </motion.div>
              <span className="text-[7px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
          <button 
            onClick={() => {
              soundService.playUISelect();
              setIsMenuOpen(true);
            }} 
            className="flex flex-col items-center gap-1 text-slate-500 opacity-60 cursor-pointer z-[10]"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase tracking-tighter">Menu</span>
          </button>
        </nav>
      )}

      {/* GLOBAL BEAUTIFUL ALERT MODAL */}
      <AnimatePresence>
        {globalAlert?.isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setGlobalAlert(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#142031] to-[#0a111a] border border-white/10 p-6 rounded-[2rem] shadow-2xl text-center space-y-4 overflow-hidden"
            >
              {/* Decorative top pulse glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-[#FFCC00]/50 to-transparent animate-pulse" />
              
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-[#FFCC00]/10 border border-[#FFCC00]/20 flex items-center justify-center text-[#FFCC00]">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FFCC00] text-center">
                  {globalAlert.isDomainError ? '🔐 Configuração no Firebase Console' : 'Aviso da Plataforma'}
                </h3>
                <p className="text-xs font-semibold text-slate-200 leading-relaxed font-sans text-center">
                  {globalAlert.message}
                </p>
                
                {globalAlert.isDomainError && globalAlert.domain && (
                  <div className="bg-black/60 p-3 rounded-2xl border border-white/10 space-y-2.5 my-3 text-left">
                    <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">
                      Copie este Domínio para Autorizar:
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-[#0b1017] px-3 py-2 rounded-xl border border-white/10">
                      <code className="text-xs font-mono text-emerald-400 font-bold break-all">{globalAlert.domain}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(globalAlert.domain || '');
                          soundService.playUISelect();
                          alert("Domínio copiado para a área de transferência!");
                        }}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 uppercase tracking-wider cursor-pointer transition-all"
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-300 space-y-1.5 leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <p className="font-bold text-white uppercase text-[9px] tracking-wider text-amber-300">Como Autorizar (1 minuto):</p>
                      <p>1️⃣ Aceda ao <strong className="text-white">Firebase Console</strong> (console.firebase.google.com).</p>
                      <p>2️⃣ Selecione o seu projeto &gt; <strong className="text-white">Authentication</strong> &gt; aba <strong className="text-white">Settings</strong> &gt; <strong className="text-white">Authorized domains</strong>.</p>
                      <p>3️⃣ Clique no botão <strong className="text-white">Add domain</strong>, cole o domínio copiado acima e guarde.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    soundService.playUISelect();
                    setGlobalAlert(null);
                  }}
                  className={`w-full ${globalAlert.isDomainError ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#FFCC00] text-[#05070a] hover:bg-[#ffe066] shadow-[0_4px_12px_rgba(255,204,0,0.2)]'} active:scale-95 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer`}
                >
                  {globalAlert.isDomainError ? 'Fechar Aviso' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PWA INSTALLATION BANNER */}
      <PWAInstallPrompt />
    </div>
  );
};

export default App;

