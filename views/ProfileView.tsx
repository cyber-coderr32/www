import React, { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Settings, 
  BarChart3, 
  LogOut, 
  ChevronLeft, 
  Copy, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  ShieldCheck,
  Zap,
  Sparkles,
  DollarSign,
  Megaphone,
  FileText,
  BookOpen,
  TrendingUp,
  Coins,
  ArrowRight,
  RefreshCw,
  Key,
  ArrowLeftRight,
  X,
  ExternalLink,
  Store,
  Edit3,
  Trash2,
  Plus,
  Search,
  Eye,
  EyeOff,
  Package,
  ShoppingCart,
  ArrowUpDown,
  AlertCircle
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { caktoService } from '../services/caktoService';
import { TransactionRequest, GlobalSettings, PaymentMethod } from '../types';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface ProfileViewProps {
  balance: number;
  user: { 
    id: string; 
    name: string; 
    email: string;
    phone?: string;
    bio?: string;
    avatarColor?: string;
    whatsapp?: string;
    totalWins?: number;
    totalBets?: number;
  };
  isDemo: boolean;
  onToggleDemo: (val: boolean) => void;
  onUpdateBalance: (amount: number) => void;
  onUpdateUser: (updates: { name: string; phone?: string; bio?: string; avatarColor?: string; whatsapp?: string }) => void;
  onBack: () => void;
  onLogout: () => void;
  onSelectGame?: (view: any, param?: any) => void;
  initialTab?: 'WALLET' | 'SWAP' | 'MONETIZATION' | 'PRODUCTS' | 'STATS' | 'SETTINGS';
  viewingUser?: any;
  currentUser?: any;
}

const ProfileView: React.FC<ProfileViewProps> = ({ balance, user, currentUser, isDemo, onToggleDemo, onUpdateBalance, onUpdateUser, onBack, onLogout, onSelectGame, initialTab, viewingUser }) => {
  const [activeTab, setActiveTab] = useState<'WALLET' | 'SWAP' | 'MONETIZATION' | 'PRODUCTS' | 'STATS' | 'SETTINGS'>(initialTab || 'WALLET');
  const [walletMode, setWalletMode] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const isReadOnly = Boolean(viewingUser && (!currentUser || (viewingUser.id !== currentUser?.id && viewingUser.email !== currentUser?.email && viewingUser.name !== currentUser?.name)));

  useEffect(() => {
    if (isReadOnly) {
      if (initialTab === 'PRODUCTS') {
        setActiveTab('PRODUCTS');
      } else if (activeTab !== 'STATS' && activeTab !== 'PRODUCTS') {
        setActiveTab('STATS');
      }
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isReadOnly]);
  
  // Crypto Swap & Buy state
  const [swapToCrypto, setSwapToCrypto] = useState<'BTC' | 'ETH' | 'SOL' | 'BNB' | 'TRX' | 'DOGE'>('BTC');
  const [swapAmountUsdt, setSwapAmountUsdt] = useState<number>(50);
  const [cryptoRates, setCryptoRates] = useState<{ [key: string]: number }>({
    'BTC': 67450.00,
    'ETH': 3480.00,
    'SOL': 178.20,
    'BNB': 585.00,
    'TRX': 0.136,
    'DOGE': 0.128,
  });
  const [isExecutingSwap, setIsExecutingSwap] = useState<boolean>(false);
  const [swapFeedback, setSwapFeedback] = useState<string | null>(null);
  const [cryptoBalances, setCryptoBalances] = useState<{ [key: string]: number }>(() => {
    const saved = localStorage.getItem('user_crypto_balances');
    return saved ? JSON.parse(saved) : { BTC: 0, ETH: 0, SOL: 0, BNB: 0, TRX: 0, DOGE: 0 };
  });

  const handleExecuteCryptoSwap = () => {
    if (swapAmountUsdt > balance) {
      setSwapFeedback('Saldo USDT insuficiente para realizar esta troca!');
      return;
    }
    if (swapAmountUsdt < 1) {
      setSwapFeedback('O valor mínimo de troca é 1.00 USDT');
      return;
    }

    setIsExecutingSwap(true);
    soundService.playUISelect();

    setTimeout(() => {
      const rate = cryptoRates[swapToCrypto] || 1;
      const receivedAmount = swapAmountUsdt / rate;

      // Deduct USDT balance
      onUpdateBalance(-swapAmountUsdt);

      // Update user crypto balance
      const newCryptoBals = {
        ...cryptoBalances,
        [swapToCrypto]: (cryptoBalances[swapToCrypto] || 0) + receivedAmount
      };
      setCryptoBalances(newCryptoBals);
      localStorage.setItem('user_crypto_balances', JSON.stringify(newCryptoBals));

      soundService.playWin();
      setIsExecutingSwap(false);
      setSwapFeedback(`Troca concluída com sucesso  Recebeste ${receivedAmount.toFixed(6)} ${swapToCrypto}.`);
    }, 1200);
  };

  // Creator & Monetization stats calculated from local posts & transactions
  const [userPdfPosts, setUserPdfPosts] = useState<any[]>([]);
  const [pdfSalesTotal, setPdfSalesTotal] = useState<number>(0);
  const [superChatTotal, setSuperChatTotal] = useState<number>(0);
  const [p2pSalesTotal, setP2pSalesTotal] = useState<number>(0);
  const [adReadEarnings, setAdReadEarnings] = useState<number>(0);
  const [campaignCommission, setCampaignCommission] = useState<number>(0);
  const [claimedEarnings, setClaimedEarnings] = useState<number>(0);

  const [managedProducts, setManagedProducts] = useState<any[]>([]);
  const [managerFilterType, setManagerFilterType] = useState<'all' | 'pdf' | 'p2p'>('all');
  const [managerSearch, setManagerSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  const loadManagedProducts = () => {
    try {
      const posts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || localStorage.getItem('cryptonbet_posts') || '[]');
      const marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
      
      const myPdfPosts = [
        ...posts.filter((p: any) => p.postType === 'pdf' && (p.authorId === user.id || p.authorName === user.name || p.sellerId === user.id)),
        ...marketBooks.filter((b: any) => b.sellerId === user.id || b.sellerName === user.name || (marketBooks.indexOf(b) >= 2 && (user.id === 'default' || !user.id)))
      ];
      setUserPdfPosts(myPdfPosts);
      const totalPdf = myPdfPosts.reduce((acc: number, p: any) => acc + ((p.pdfDownloads || p.downloads || 0) * (p.pdfPrice || p.price || 0)), 0);
      setPdfSalesTotal(totalPdf);

      const myPosts = posts.filter((p: any) => (p.postType === 'pdf' || p.postType === 'p2p') && (p.authorId === user.id || p.authorName === user.name || p.sellerId === user.id));
      const myBooks = marketBooks.filter((b: any, idx: number) => b.sellerId === user.id || b.sellerName === user.name || (idx >= 2 && (user.id === 'default' || !user.id)));
      
      const allManaged = [
        ...myPosts.map((p: any) => ({
          id: p.id,
          type: p.postType === 'pdf' ? 'pdf' : 'p2p',
          title: p.pdfTitle || p.p2pCoin || 'Produto Sem Título',
          description: p.pdfDescription || p.content || `Anúncio P2P ${p.p2pCoin}`,
          price: p.pdfPrice || p.p2pPrice || 0,
          downloadsOrSales: p.pdfDownloads || p.downloads || 0,
          status: p.status || 'active',
          createdAt: p.createdAt || 'Recentemente',
          coverColor: p.pdfCoverColor || 'from-amber-600 to-amber-900',
          rawPost: p
        })),
        ...myBooks
          .filter((b: any) => !myPosts.some((p: any) => p.id === b.id || p.pdfTitle === b.title))
          .map((b: any) => ({
            id: b.id || Math.random().toString(),
            type: 'pdf',
            title: b.title || 'E-book Digital',
            description: b.description || 'Livro em PDF de Estratégia',
            price: b.price || 0,
            downloadsOrSales: b.downloads || 0,
            status: b.status || 'active',
            createdAt: b.date || 'Recentemente',
            coverColor: b.coverColor || 'from-blue-600 to-indigo-900',
            rawPost: {
              id: b.id || Math.random().toString(),
              postType: 'pdf',
              authorId: user.id,
              authorName: user.name,
              pdfTitle: b.title,
              pdfPrice: b.price,
              pdfDescription: b.description,
              pdfPagesCount: b.pagesCount,
              pdfDownloads: b.downloads,
              pdfCoverColor: b.coverColor,
              status: b.status || 'active'
            }
          }))
      ];
      setManagedProducts(allManaged);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePauseProduct = (rawPost: any) => {
    if (isReadOnly) return;
    soundService.playUISelect();
    try {
      let posts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || localStorage.getItem('cryptonbet_posts') || '[]');
      const targetId = rawPost.id;
      const targetTitle = rawPost.pdfTitle || rawPost.p2pCoin || rawPost.title;

      let foundInPosts = false;
      posts = posts.map((p: any) => {
        if (p.id === targetId || (targetTitle && (p.pdfTitle === targetTitle || p.title === targetTitle))) {
          foundInPosts = true;
          const newStatus = p.status === 'paused' ? 'active' : 'paused';
          showFeedback(`Produto ${newStatus === 'paused' ? 'pausado' : 'ativado'} com sucesso!`);
          return { ...p, status: newStatus };
        }
        return p;
      });

      if (foundInPosts) {
        localStorage.setItem('cryptonbet_local_posts', JSON.stringify(posts));
      } else {
        let marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
        marketBooks = marketBooks.map((b: any) => {
          if (b.id === targetId || b.title === targetTitle) {
            const newStatus = b.status === 'paused' ? 'active' : 'paused';
            showFeedback(`Produto ${newStatus === 'paused' ? 'pausado' : 'ativado'} com sucesso!`);
            return { ...b, status: newStatus };
          }
          return b;
        });
        localStorage.setItem('crypton_market_pdf_books', JSON.stringify(marketBooks));
      }
      loadManagedProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProduct = (rawPost: any) => {
    if (isReadOnly) return;
    soundService.playUISelect();
    try {
      const targetId = rawPost.id;
      const targetTitle = rawPost.pdfTitle || rawPost.p2pCoin || rawPost.title;

      let posts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || localStorage.getItem('cryptonbet_posts') || '[]');
      posts = posts.filter((p: any) => !(p.id === targetId || (targetTitle && (p.pdfTitle === targetTitle || p.title === targetTitle))));
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(posts));

      let marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
      marketBooks = marketBooks.filter((b: any) => !(b.id === targetId || b.title === targetTitle));
      localStorage.setItem('crypton_market_pdf_books', JSON.stringify(marketBooks));

      showFeedback('Produto removido com sucesso!');
      loadManagedProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProductPrice = () => {
    if (isReadOnly || !editingProduct || !editPriceVal || isNaN(Number(editPriceVal))) return;
    soundService.playUISelect();
    try {
      const targetId = editingProduct.rawPost.id;
      const targetTitle = editingProduct.rawPost.pdfTitle || editingProduct.rawPost.p2pCoin || editingProduct.rawPost.title;
      const newPriceNum = Number(editPriceVal);

      let posts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || localStorage.getItem('cryptonbet_posts') || '[]');
      let foundInPosts = false;
      posts = posts.map((p: any) => {
        if (p.id === targetId || (targetTitle && (p.pdfTitle === targetTitle || p.title === targetTitle))) {
          foundInPosts = true;
          return {
            ...p,
            pdfPrice: p.postType === 'pdf' ? newPriceNum : p.pdfPrice,
            p2pPrice: p.postType === 'p2p' ? newPriceNum : p.p2pPrice,
            price: newPriceNum
          };
        }
        return p;
      });

      if (foundInPosts) {
        localStorage.setItem('cryptonbet_local_posts', JSON.stringify(posts));
      } else {
        let marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
        marketBooks = marketBooks.map((b: any) => {
          if (b.id === targetId || b.title === targetTitle) {
            return { ...b, price: newPriceNum };
          }
          return b;
        });
        localStorage.setItem('crypton_market_pdf_books', JSON.stringify(marketBooks));
      }

      showFeedback('Preço atualizado com sucesso!');
      setEditingProduct(null);
      loadManagedProducts();
    } catch (e) {
      console.error(e);
    }
  };

  // Stateful form fields for full profile management
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editWhatsapp, setEditWhatsapp] = useState(user.whatsapp || '');
  const [selectedAvatarColor, setSelectedAvatarColor] = useState(user.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Creator configuration
  const [creatorIban, setCreatorIban] = useState<string>('AO06.0040.0000.4152.9912.8271.3 - Banco BAI');
  const [minSuperChat, setMinSuperChat] = useState<number>(500);

  useEffect(() => {
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditBio(user.bio || '');
    setEditWhatsapp(user.whatsapp || '');
    setSelectedAvatarColor(user.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]');

    // Load creator & monetization stats from local storage posts
    try {
      loadManagedProducts();
      const posts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || localStorage.getItem('cryptonbet_posts') || '[]');

      // Sum Super Chat tips received on user posts
      const myPosts = posts.filter((p: any) => p.authorId === user.id || p.authorName === user.name);
      const totalSuper = myPosts.reduce((acc: number, p: any) => acc + (p.superChatTips || 0), 0);
      setSuperChatTotal(totalSuper);

      // Sum P2P sales completed
      const myP2p = posts.filter((p: any) => p.postType === 'p2p' && (p.authorId === user.id || p.authorName === user.name) && p.p2pStatus === 'sold');
      const totalP2p = myP2p.reduce((acc: number, p: any) => acc + (p.p2pPrice || 0), 0);
      setP2pSalesTotal(totalP2p);

      // Load text ad read earnings
      const readEarned = Number(localStorage.getItem(`cryptonbet_ad_read_earnings_${user.id || 'default'}`) || '0');
      setAdReadEarnings(readEarned);

      // Load 30% global campaign revenue share pool
      const globalAdRevenuePool = Number(localStorage.getItem('cryptonbet_global_ad_revenue') || '15000');
      // 30% pool share is allocated to active creators
      setCampaignCommission(Math.floor(globalAdRevenuePool * 0.35));

      // Claimed earnings
      const claimed = Number(localStorage.getItem(`cryptonbet_claimed_earnings_${user.id}`) || '0');
      setClaimedEarnings(claimed);
    } catch (e) {
      console.error("Error loading creator stats", e);
    }
  }, [user]);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [transactionNumber, setTransactionNumber] = useState<string>('');
  const [paymentStep, setPaymentStep] = useState<'FORM' | 'GENERATING' | 'INVOICE' | 'UPLOADING' | 'SUCCESS'>('FORM');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<{ txId: string; qrCodeUrl: string; pixCopyPaste: string; checkoutUrl?: string; amountBrl: number; amountUsdt: number; expiresAt: number; receiverName: string } | null>(null);
  
  useEffect(() => {
    setPixData(null);
  }, [selectedMethod, depositAmount]);

  // 5. FRONT-END: ACOMPANHAR O PAGAMENTO EM TEMPO REAL VIA FIRESTORE (onSnapshot)
  useEffect(() => {
    if (!pixData || !pixData.txId) return;

    console.log(`[Cakto PIX Monitor] Escutando atualizações em tempo real no Firestore: orders/${pixData.txId}`);
    const unsub = onSnapshot(doc(db, "orders", pixData.txId), (snap) => {
      const data = snap.data();
      if (data && (data.status === "paid" || data.status === "approved" || data.status === "succeeded")) {
        console.log(`✅ [Cakto PIX Monitor] Pedido ${pixData.txId} aprovado via Webhook! Crédito instantâneo.`);
        soundService.playWin();
        onUpdateBalance(balance + (data.amountUsdt || pixData.amountUsdt || 0));
        showFeedback("✅ Pagamento PIX aprovado em tempo real via Webhook! Crédito liberado.");
        setPixData(null);
        unsub();
      }
    }, (err) => {
      console.warn(`[Cakto PIX Monitor] Aviso no listener de orders/${pixData.txId}:`, err.message);
    });

    return () => {
      unsub();
    };
  }, [pixData, balance, onUpdateBalance]);
  
  const [withdrawAmount, setWithdrawAmount] = useState<number>(20);
  const [withdrawAccount, setWithdrawAccount] = useState<string>('');
  const [withdrawStep, setWithdrawStep] = useState<'FORM' | 'PROCESSING' | 'SUCCESS'>('FORM');

  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 786);

  // Mocked XP Data
  const playerLevel = 12;
  const currentXP = 750;
  const nextLevelXP = 1200;
  const progressPercent = (currentXP / nextLevelXP) * 100;

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 786);
    window.addEventListener('resize', handleResize);
    const settings: GlobalSettings = JSON.parse(localStorage.getItem('skyhigh_settings') || '{}');
    setGlobalSettings(settings);
    if (settings.paymentMethods) {
      const activeMethods = settings.paymentMethods
        .filter(m => m.isActive)
        .map(m => {
          if (m.type === 'PIX' || m.id === 'pix_cakto' || (m.name && m.name.toLowerCase().includes('cakto'))) {
            return {
              ...m,
              name: 'PIX Automático (Brasil)',
              details: 'Depósito instantâneo via PIX com aprovação em tempo real'
            };
          }
          return m;
        });
      setPaymentMethods(activeMethods);
      if (activeMethods.length > 0) setSelectedMethod(activeMethods[0]);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    soundService.playUISelect();
    setIsSavingProfile(true);
    try {
      await onUpdateUser({
        name: editName,
        phone: editPhone,
        bio: editBio,
        avatarColor: selectedAvatarColor,
        whatsapp: editWhatsapp
      });
      showFeedback('Perfil guardado com sucesso!');
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao guardar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showFeedback(`${label} copiado!`);
    soundService.playTick();
  };

  const handleGenerateCaktoPix = async () => {
    if (!selectedMethod) return;
    if (depositAmount < (selectedMethod.minDeposit || 5)) {
      showFeedback(`O depósito mínimo para este canal é ${selectedMethod.minDeposit || 5} USDT.`);
      return;
    }
    setPixLoading(true);
    soundService.playUISelect();
    try {
      let antifraudRef: string | undefined = undefined;
      try {
        const win = window as any;
        if (win.Cakto && win.Cakto.CaktoSdk) {
          const sdkClientId = globalSettings?.cakto?.clientId || import.meta.env.VITE_CAKTO_SDK_CLIENT_ID || "public_sdk_id";
          const sdk = new win.Cakto.CaktoSdk({ clientId: sdkClientId });
          await sdk.initAntifraud();
          await sdk.completeAntifraudProfile();
          antifraudRef = sdk.getAntifraudReference();
          console.log("[Cakto SDK] Referência de antifraude gerada:", antifraudRef);
        }
      } catch (sdkErr) {
        console.warn("[Cakto SDK] Aviso ao gerar antifraud profiling:", sdkErr);
      }

      const res = await caktoService.createPixDeposit({
        userId: user.id,
        amountUsdt: depositAmount,
        amountBrl: depositAmount * (globalSettings?.cakto?.exchangeRate || 5.85),
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone || "5511999999999",
        customerCpf: "00000000000",
        docType: "cpf",
        docNumber: "00000000000",
        productId: globalSettings?.cakto?.productId || "cryptonbet_deposito",
        offerId: "oferta_padrao",
        antifraudProfilingAttemptReference: antifraudRef,
        clientId: globalSettings?.cakto?.clientId,
        pixKey: globalSettings?.cakto?.pixKey || 'pix@cryptonbet.com',
        receiverName: globalSettings?.cakto?.receiverName || 'CryptonBet Brasil'
      });
      if (res.status === 'success' && res.data) {
        setPixData(res.data);
        soundService.playWin();
        showFeedback("✅ QR Code PIX gerado com sucesso! Escaneie ou use o Copia e Cola.");
        
        const transactions: TransactionRequest[] = JSON.parse(localStorage.getItem('skyhigh_transactions') || '[]');
        const newRequest: TransactionRequest = {
          id: res.data.txId,
          userId: user.id,
          userName: user.name,
          type: 'DEPOSIT',
          amount: depositAmount,
          method: `PIX Automático (R$ ${res.data.amountBrl.toFixed(2)})`,
          status: 'PENDING',
          timestamp: new Date().toLocaleString('pt-PT'),
          accountDetails: `PIX Copia e Cola: ${res.data.pixCopyPaste.substring(0, 35)}...`
        };
        transactions.push(newRequest);
        localStorage.setItem('skyhigh_transactions', JSON.stringify(transactions));
      } else {
        showFeedback(`Erro ao gerar PIX: ${res.message || 'Falha ao conectar com o gateway de pagamentos'}`);
        soundService.playCrash();
      }
    } catch (e: any) {
      showFeedback(`Erro de conexão: ${e.message}`);
      soundService.playCrash();
    } finally {
      setPixLoading(false);
    }
  };

  const handleSubmitManualDeposit = () => {
    if (!selectedMethod) {
      showFeedback('Selecione uma forma de pagamento.');
      return;
    }
    if (depositAmount < 1) {
      showFeedback('Insira um montante válido.');
      return;
    }
    if (!transactionNumber.trim() && !proofFile) {
      showFeedback('Insira o número da transação ou anexe o comprovativo.');
      return;
    }

    setPaymentStep('UPLOADING');
    soundService.playDepositProcessing();

    const transactions: TransactionRequest[] = JSON.parse(localStorage.getItem('skyhigh_transactions') || '[]');
    const newRequest: TransactionRequest = {
      id: 'DEP_MAN_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      userId: user.id,
      userName: user.name,
      type: 'DEPOSIT',
      amount: depositAmount,
      method: selectedMethod.name + (selectedMethod.cryptoNetwork ? ` (${selectedMethod.cryptoNetwork})` : ''),
      status: 'PENDING',
      timestamp: new Date().toLocaleString('pt-PT')
    };
    transactions.push(newRequest);
    localStorage.setItem('skyhigh_transactions', JSON.stringify(transactions));

    setTimeout(() => {
      setPaymentStep('SUCCESS');
      soundService.playDepositSuccess();
      setProofFile(null);
      setTransactionNumber('');
    }, 1500);
  };

  const handleWithdrawRequest = async () => {
    if (withdrawAmount > balance) {
      showFeedback("Saldo insuficiente.");
      soundService.playCrash();
      return;
    }
    if (!withdrawAccount) {
      showFeedback("Insira os dados da conta destino (Telefone, IBAN ou Carteira).");
      return;
    }
    if (!selectedMethod) {
      showFeedback("Selecione o método para saque.");
      return;
    }

    setWithdrawStep('PROCESSING');
    soundService.playWithdrawProcessing();

    const transactions: TransactionRequest[] = JSON.parse(localStorage.getItem('skyhigh_transactions') || '[]');
    const newRequest: TransactionRequest = {
      id: 'OUT_MAN_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      userId: user.id,
      userName: user.name,
      type: 'WITHDRAW',
      amount: withdrawAmount,
      method: selectedMethod.name + (selectedMethod.cryptoNetwork ? ` (${selectedMethod.cryptoNetwork})` : ''),
      status: 'PENDING',
      timestamp: new Date().toLocaleString('pt-PT')
    };
    transactions.push(newRequest);
    localStorage.setItem('skyhigh_transactions', JSON.stringify(transactions));

    setTimeout(() => {
      setWithdrawStep('SUCCESS');
      soundService.playWithdrawSuccess();
    }, 1500);
  };

  // Mock Transaction History in USDT
  const recentTransactions = [
    { type: 'DEPOSIT', amount: 150.00, date: 'Hoje, 10:24', status: 'COMPLETED' },
    { type: 'WITHDRAW', amount: 50.00, date: 'Ontem, 21:05', status: 'PENDING' },
    { type: 'DEPOSIT', amount: 20.00, date: '04 Mai, 14:12', status: 'COMPLETED' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#060809] text-white overflow-hidden font-sans">
      {/* Header Refinado */}
      <div className="px-4 py-4 flex items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-30 sticky top-0">
        <button onClick={() => { soundService.playUISelect(); onBack(); }} className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer">
          <ChevronLeft className="w-5 h-5 text-white/50" />
        </button>
        <div className="flex bg-white/5 px-3 py-1 rounded-lg ml-2 border border-white/5">
          <span className="text-[#049444] font-black italic text-sm tracking-tighter">CRYPTON</span>
          <span className="text-[#FFCC00] font-black italic text-sm tracking-tighter ml-1">BET</span>
        </div>
        {!isReadOnly && (
          <button onClick={() => { soundService.playUISelect(); onLogout(); }} className="ml-auto flex items-center gap-2 text-[10px] font-black text-white/40 uppercase hover:text-red-500 transition-colors border border-white/5 px-4 py-2 rounded-xl bg-white/5">
             <LogOut className="w-3 h-3" />
             Sair
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
          
          {/* VIP PLAYER CARD WITH PILOTO GOOGLE CREATOR BADGE & SALDO DASHBOARD */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#049444] via-[#037235] to-[#FFCC00]/10 opacity-20" />
            <div className="bg-[#131d27]/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col lg:flex-row items-center gap-8 relative z-10 shadow-2xl">
                
                <div className="relative group shrink-0">
                   <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full ${user.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]'} p-1 shadow-2xl relative z-10`}>
                      <div className="w-full h-full rounded-full bg-[#131d27] flex items-center justify-center text-4xl font-black italic text-white border-2 border-white/10 uppercase">
                         {user.name.charAt(0)}
                      </div>
                   </div>
                   <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FFCC00] text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-20 shadow-xl border-2 border-[#131d27] whitespace-nowrap">
                      Nível {playerLevel}
                   </div>
                   {/* Decorative rings */}
                   <div className="absolute inset-0 rounded-full border border-[#049444]/20 scale-125 animate-pulse" />
                   <div className="absolute inset-0 rounded-full border border-[#FFCC00]/10 scale-150" />
                </div>

                <div className="flex-1 text-center lg:text-left space-y-3">
                   <div className="space-y-1">
                      {/* Piloto Google Creator Official Badge */}
                      <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FFCC00]/20 via-[#049444]/20 to-transparent border border-[#FFCC00]/40 px-3 py-1 rounded-full text-[9px] font-black text-[#FFCC00] uppercase tracking-widest mb-1 shadow-md">
                         <Sparkles className="w-3.5 h-3.5 text-[#FFCC00]" />
                         <span>PILOTO GOOGLE • CRIADOR VERIFICADO</span>
                         <span className="w-2 h-2 rounded-full bg-[#049444] animate-ping" />
                      </div>

                      <div className="flex items-center justify-center lg:justify-start gap-2">
                         <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">{user.name}</h2>
                         <div className="w-5 h-5 bg-[#FFCC00]/20 rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-[#FFCC00] fill-[#FFCC00]" />
                         </div>
                      </div>
                      <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">{user.email}</p>
                      {user.bio && (
                         <p className="text-white/60 text-[11px] font-medium mt-1 border-l-2 border-[#049444] pl-3 italic max-w-md leading-relaxed">{user.bio}</p>
                      )}
                      {user.whatsapp && (
                         <p className="text-[#049444] text-[9px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1 justify-center lg:justify-start">🟢 WhatsApp: {user.whatsapp}</p>
                      )}
                   </div>

                   <div className="space-y-1.5 max-w-sm mx-auto lg:mx-0">
                      <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Prestígio VIP</span>
                         <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-widest">{currentXP} / {nextLevelXP} XP</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${progressPercent}%` }}
                           className="h-full bg-gradient-to-r from-[#049444] via-[#049444] to-[#FFCC00] rounded-full shadow-[0_0_15px_rgba(4,148,68,0.5)]"
                         />
                      </div>
                   </div>
                </div>

                {/* Dashboard de Saldo & Monetização / Modo Visitante */}
                {isReadOnly ? (
                   <div className="bg-gradient-to-br from-purple-900/40 to-[#131d27] border border-purple-500/30 p-6 rounded-[2rem] text-center lg:text-left min-w-[240px] flex flex-col justify-center shadow-xl">
                      <div className="flex items-center justify-center lg:justify-start gap-2 text-purple-300 font-black text-xs uppercase tracking-widest mb-2">
                         <Eye className="w-4 h-4 text-purple-400 animate-pulse" />
                         <span>Modo Visitante</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                         Estás a visualizar o perfil público deste membro em modo de leitura. Nenhuma alteração ou dado sensível é exibido.
                      </p>
                   </div>
                ) : (
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
                   {/* Saldo Principal */}
                   <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center lg:text-left min-w-[180px] relative group overflow-hidden">
                      <div className="flex items-center justify-between gap-2 mb-1">
                         <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Dashboard de Saldo</span>
                         <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase ${isDemo ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isDemo ? 'Modo Demo' : 'Modo Real'}
                         </span>
                      </div>
                      <div className="text-xl font-black font-mono text-[#049444]">{balance.toFixed(2)} <span className="opacity-40 text-xs">USDT</span></div>
                   </div>

                   {/* Saldo em Kwanza (KZ) */}
                   <div className="bg-white/5 border border-amber-500/20 p-4 rounded-2xl text-center lg:text-left min-w-[180px] relative group overflow-hidden">
                      <div className="flex items-center justify-between gap-2 mb-1">
                         <span className="text-[8px] font-black text-amber-400/80 uppercase tracking-widest">Saldo em Kwanza</span>
                         <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase bg-amber-500/20 text-amber-300">
                            Angola (AO)
                         </span>
                      </div>
                      <div className="text-xl font-black font-mono text-[#FFCC00]">{(balance * 950).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="opacity-60 text-xs">KZ</span></div>
                   </div>

                   {/* Saldo em Real (R$) */}
                   <div className="bg-white/5 border border-blue-500/20 p-4 rounded-2xl text-center lg:text-left min-w-[180px] relative group overflow-hidden">
                      <div className="flex items-center justify-between gap-2 mb-1">
                         <span className="text-[8px] font-black text-blue-400/80 uppercase tracking-widest">Saldo em Real</span>
                         <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase bg-blue-500/20 text-blue-300">
                            Brasil (BR)
                         </span>
                      </div>
                      <div className="text-xl font-black font-mono text-emerald-400">R$ {(balance * 5.70).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="opacity-60 text-xs">BRL</span></div>
                   </div>

                   {/* Saldo de Monetização (E-Books & Super Chat) */}
                   <div className="bg-gradient-to-br from-[#FFCC00]/10 to-black/40 border border-[#FFCC00]/20 p-4 rounded-2xl text-center lg:text-left min-w-[180px] relative">
                      <div className="flex items-center justify-between gap-2 mb-1">
                         <span className="text-[8px] font-black text-[#FFCC00] uppercase tracking-widest flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Monetização Pendente
                         </span>
                         <span className="text-[8px] font-bold text-white/40 font-mono">{(pdfSalesTotal + superChatTotal + p2pSalesTotal).toFixed(2)} USDT</span>
                      </div>
                      <div className="text-xl font-black font-mono text-[#FFCC00]">
                         {Math.max(0, (pdfSalesTotal + superChatTotal + p2pSalesTotal) - claimedEarnings).toFixed(2)} <span className="opacity-60 text-xs">USDT</span>
                      </div>
                      {Math.max(0, (pdfSalesTotal + superChatTotal + p2pSalesTotal) - claimedEarnings) > 0 && (
                         <button 
                           onClick={() => {
                             soundService.playDepositSuccess();
                             const claimable = Math.max(0, (pdfSalesTotal + superChatTotal + p2pSalesTotal) - claimedEarnings);
                             const newClaimed = claimedEarnings + claimable;
                             localStorage.setItem(`cryptonbet_claimed_earnings_${user.id}`, newClaimed.toString());
                             setClaimedEarnings(newClaimed);
                             onUpdateBalance(claimable);
                             setFeedback(`Transferência de ${claimable.toFixed(2)} USDT para o teu saldo principal concluída!`);
                           }}
                           className="mt-2 w-full py-1.5 bg-[#FFCC00] hover:bg-[#e6b800] text-black font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-md flex items-center justify-center gap-1 cursor-pointer"
                         >
                            <Coins className="w-3 h-3" /> Resgatar para Saldo
                         </button>
                      )}
                   </div>
                </div>
                )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             
             {/* Navegação de TAb */}
             <div className="lg:col-span-3 space-y-2">
                {[
                  { id: 'WALLET', label: 'Financeiro', icon: Wallet },
                  { id: 'SWAP', label: 'Troca / Compra Cripto', icon: RefreshCw, badge: 'Instantâneo' },
                  { id: 'MONETIZATION', label: 'Painel de Monetização', icon: DollarSign, badge: 'Piloto Google' },
                  { id: 'PRODUCTS', label: isReadOnly ? 'Produtos Públicos' : 'Gerenciador de Produtos', icon: Store, badge: isReadOnly ? 'Mercado' : 'Vendas' },
                  { id: 'STATS', label: 'Estatísticas', icon: BarChart3 },
                  { id: 'SETTINGS', label: 'Segurança', icon: Settings }
                ].filter(t => !isReadOnly || t.id === 'STATS' || t.id === 'PRODUCTS').map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => { soundService.playUISelect(); setActiveTab(t.id as any); }} 
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${activeTab === t.id ? 'bg-[#049444] border-[#049444] text-white shadow-xl shadow-[#049444]/10' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:bg-white/[0.08]'}`}
                  >
                    <div className="flex items-center gap-3">
                       <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-white' : 'text-white/40 group-hover:text-white'}`} />
                       <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                    </div>
                    {t.badge && (
                       <span className="text-[7px] font-black bg-[#FFCC00] text-black px-1.5 py-0.5 rounded uppercase tracking-tighter">{t.badge}</span>
                    )}
                    {activeTab === t.id && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />}
                  </button>
                ))}

                {!isReadOnly && onSelectGame && (
                  <button 
                    onClick={() => { soundService.playUISelect(); onSelectGame('API_PORTAL'); }} 
                    className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border-blue-500/30 text-blue-300 hover:border-blue-400 mt-4 shadow-lg group"
                  >
                    <div className="flex items-center gap-3">
                       <Key className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-white">Chaves API & Docs B2B</span>
                    </div>
                    <span className="text-[7px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Portal API</span>
                  </button>
                )}
             </div>

             <div className="lg:col-span-9">
                <AnimatePresence mode="wait">
                   {activeTab === 'WALLET' && (
                     <motion.div 
                       key="wallet"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-6"
                     >
                        <div className="bg-[#131d27]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 space-y-6">
                            <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5">
                              <button onClick={() => setWalletMode('DEPOSIT')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletMode === 'DEPOSIT' ? 'bg-[#049444] text-white shadow-lg' : 'text-white/30 hover:text-white'}`}>Depósito USDT</button>
                              <button onClick={() => setWalletMode('WITHDRAW')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${walletMode === 'WITHDRAW' ? 'bg-[#FFCC00] text-black shadow-lg' : 'text-white/30 hover:text-white'}`}>Levantamento USDT</button>
                           </div>

                           {walletMode === 'DEPOSIT' ? (
                             paymentStep === 'FORM' ? (
                               <div className="space-y-6">
                                  {/* Seleção do Método de Pagamento */}
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Selecione a Forma de Depósito</label>
                                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {paymentMethods.map(method => (
                                          <button 
                                            key={method.id} 
                                            onClick={() => setSelectedMethod(method)} 
                                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center group cursor-pointer ${selectedMethod?.id === method.id ? 'bg-[#049444]/15 border-[#049444] shadow-lg' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                          >
                                            <span className="text-sm font-black text-white">{method.name}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${selectedMethod?.id === method.id ? 'bg-[#049444] text-white' : 'bg-white/10 text-slate-400'}`}>
                                              {method.cryptoNetwork ? `${method.cryptoType || 'USDT'} (${method.cryptoNetwork})` : method.type}
                                            </span>
                                          </button>
                                        ))}
                                     </div>
                                  </div>

                                  {/* Dados de Pagamento e QR Code do Método Selecionado */}
                                  {selectedMethod && (
                                    <div className="bg-black/40 border border-white/10 rounded-3xl p-6 space-y-4">
                                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                        <span className="text-xs font-black uppercase text-emerald-400">Instruções de Pagamento ({selectedMethod.name})</span>
                                        <span className="text-[10px] text-slate-400 font-mono">Mínimo: {selectedMethod.minDeposit} USDT</span>
                                      </div>

                                      {selectedMethod.type === 'PIX' || selectedMethod.id === 'pix_cakto' ? (
                                        <div className="space-y-4">
                                          <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent p-4 sm:p-5 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5">
                                              <span className="text-3xl sm:text-4xl">🇧🇷</span>
                                              <div>
                                                <h4 className="text-sm font-black uppercase text-white tracking-wide">Depósito Instantâneo PIX</h4>
                                                <p className="text-xs text-slate-300 font-medium mt-0.5">
                                                  Cotação do Sistema: 1 USDT = <b className="text-amber-400">R$ {(globalSettings?.cakto?.exchangeRate || 5.85).toFixed(2)}</b>
                                                </p>
                                              </div>
                                            </div>
                                            <span className="text-[10px] bg-emerald-500 text-black font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0 shadow-lg shadow-emerald-500/20">
                                              Crédito Automático
                                            </span>
                                          </div>
                                        </div>
                                      ) : selectedMethod.type === 'CRYPTO' ? (
                                        <div className="space-y-4 text-center">
                                          <p className="text-[11px] text-slate-300">
                                            Envie exatamente a quantidade desejada para o endereço abaixo na rede <b className="text-amber-400">{selectedMethod.cryptoNetwork || 'TRC20'}</b>.
                                          </p>
                                          <div className="p-3 bg-white inline-block rounded-2xl shadow-xl mx-auto">
                                            <img 
                                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedMethod.account)}`} 
                                              alt="QR Code" 
                                              className="w-40 h-40" 
                                            />
                                          </div>
                                          <div onClick={() => copyToClipboard(selectedMethod.account, "Endereço Crypto")} className="bg-black/60 p-4 rounded-xl font-mono text-xs font-bold flex justify-between items-center cursor-pointer border border-white/10 hover:border-white/30 transition-all text-white group">
                                            <span className="truncate pr-4 text-[#FFCC00]">{selectedMethod.account}</span>
                                            <Copy className="w-4 h-4 text-white/40 group-hover:text-white transition-colors shrink-0" />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          {selectedMethod.entityNumber && (
                                            <div onClick={() => copyToClipboard(selectedMethod.entityNumber!, "Entidade")} className="flex justify-between items-center p-3.5 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                                              <span className="text-xs text-slate-300 font-mono">Número de Entidade: <b className="text-white text-sm font-black ml-2">{selectedMethod.entityNumber}</b></span>
                                              <Copy className="w-4 h-4 text-emerald-400" />
                                            </div>
                                          )}
                                          {selectedMethod.referenceNumber && (
                                            <div onClick={() => copyToClipboard(selectedMethod.referenceNumber!, "Referência")} className="flex justify-between items-center p-3.5 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                                              <span className="text-xs text-slate-300 font-mono">Referência / Telefone: <b className="text-white text-sm font-black ml-2">{selectedMethod.referenceNumber}</b></span>
                                              <Copy className="w-4 h-4 text-emerald-400" />
                                            </div>
                                          )}
                                          <div onClick={() => copyToClipboard(selectedMethod.account, "Conta")} className="flex justify-between items-center p-3.5 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                                            <span className="text-xs text-slate-300 font-mono">Endereço / IBAN / Conta: <b className="text-white text-sm font-black ml-2">{selectedMethod.account}</b></span>
                                            <Copy className="w-4 h-4 text-emerald-400" />
                                          </div>
                                        </div>
                                      )}
                                      {selectedMethod.details && <p className="text-[10px] text-slate-400 italic text-center pt-1">{selectedMethod.details}</p>}
                                    </div>
                                  )}

                                  {/* Formulário de Depósito */}
                                  {selectedMethod?.type === 'PIX' || selectedMethod?.id === 'pix_cakto' ? (
                                    <div className="space-y-5 pt-2 animate-in fade-in duration-300">
                                      <div className="flex justify-between items-end px-2">
                                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Montante do Depósito (USDT)</label>
                                        <span className="text-xs font-black text-amber-400">
                                          Total em Reais: R$ {(depositAmount * (globalSettings?.cakto?.exchangeRate || 5.85)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div className="relative">
                                        <input 
                                          type="number" 
                                          value={depositAmount} 
                                          onChange={e => setDepositAmount(Number(e.target.value))} 
                                          disabled={!!pixData || pixLoading}
                                          className="w-full bg-black/40 border border-emerald-500/30 rounded-3xl px-8 py-5 text-white font-mono font-black text-3xl outline-none focus:border-emerald-500 transition-all disabled:opacity-50" 
                                        />
                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-400 uppercase italic font-mono">USDT</div>
                                      </div>

                                      {!pixData ? (
                                        <button 
                                          onClick={handleGenerateCaktoPix}
                                          disabled={pixLoading}
                                          className="w-full py-5 bg-gradient-to-r from-[#049444] to-emerald-500 hover:from-[#037235] hover:to-emerald-400 text-white rounded-2xl font-black uppercase text-xs tracking-[0.15em] shadow-xl shadow-[#049444]/30 transition-all active:scale-95 group flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                          {pixLoading ? (
                                            <>
                                              <RefreshCw className="w-4 h-4 animate-spin" />
                                              <span>Gerando QR Code PIX Instantâneo...</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>⚡ GERAR QR CODE PIX (R$ {(depositAmount * (globalSettings?.cakto?.exchangeRate || 5.85)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <div className="bg-black/60 border border-emerald-500/40 rounded-3xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl">
                                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                            <div className="flex items-center gap-2">
                                              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                                              <span className="text-xs font-black uppercase text-emerald-400 tracking-wide">Aguardando Pagamento PIX</span>
                                            </div>
                                            <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-3 py-1 rounded-lg font-bold">
                                              ID: {pixData.txId}
                                            </span>
                                          </div>

                                          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
                                            <div className="p-4 bg-white rounded-3xl shadow-2xl shrink-0 border-4 border-emerald-500/20">
                                              <img 
                                                src={pixData.qrCodeUrl} 
                                                alt="QR Code PIX" 
                                                className="w-44 h-44"
                                              />
                                            </div>
                                            <div className="space-y-3.5 text-center sm:text-left">
                                              <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Total a Pagar via PIX</span>
                                                <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                                                  R$ {pixData.amountBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xs text-amber-400 font-bold block mt-0.5">
                                                  (Crédito Instantâneo: {pixData.amountUsdt} USDT)
                                                </span>
                                              </div>
                                              <div className="text-xs text-slate-300 bg-white/5 p-3.5 rounded-2xl border border-white/10 font-medium leading-relaxed">
                                                🟢 Abra o app do seu banco no celular, selecione <b>PIX Copia e Cola</b> ou escaneie o QR Code ao lado. O crédito será ativado em segundos!
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase block px-1 tracking-wider">
                                              Código PIX Copia e Cola (Clique no botão para copiar)
                                            </label>
                                            <div 
                                              onClick={() => copyToClipboard(pixData.pixCopyPaste, "Código PIX Copia e Cola")} 
                                              className="bg-black/90 p-4 rounded-2xl font-mono text-xs font-bold flex justify-between items-center cursor-pointer border border-emerald-500/40 hover:border-emerald-400 transition-all text-white group shadow-inner"
                                            >
                                              <span className="truncate pr-4 text-emerald-300 select-all">{pixData.pixCopyPaste}</span>
                                              <div className="flex items-center gap-1.5 bg-emerald-500 text-black px-3.5 py-2 rounded-xl text-[10px] font-black shrink-0 group-hover:bg-emerald-400 transition-all shadow-md">
                                                <Copy className="w-3.5 h-3.5" />
                                                <span>COPIAR PIX</span>
                                              </div>
                                            </div>
                                          </div>

                                          {pixData.checkoutUrl && (
                                            <div className="pt-1">
                                              <a
                                                href={pixData.checkoutUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                                              >
                                                <span>🛒 ABRIR PÁGINA SEGURA DE PAGAMENTO NO NAVEGADOR</span>
                                                <ExternalLink className="w-4 h-4" />
                                              </a>
                                            </div>
                                          )}

                                          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                                            <span className="text-slate-400 font-medium">Recebedor: <b className="text-white">{pixData.receiverName}</b></span>
                                            <button 
                                              onClick={() => setPixData(null)}
                                              className="text-amber-400 hover:text-amber-300 font-black uppercase text-[10px] underline cursor-pointer tracking-wider"
                                            >
                                              Gerar Novo PIX / Mudar Valor
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-4 pt-2">
                                      <div className="flex justify-between items-end px-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Montante do Depósito (USDT / Equivalente)</label>
                                      </div>
                                      <div className="relative">
                                        <input 
                                          type="number" 
                                          value={depositAmount} 
                                          onChange={e => setDepositAmount(Number(e.target.value))} 
                                          className="w-full bg-black/40 border border-white/5 rounded-3xl px-8 py-5 text-white font-mono font-black text-3xl outline-none focus:border-[#049444] transition-all" 
                                        />
                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xl font-black text-[#049444] uppercase italic font-mono">USDT</div>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2 px-2">Número da Transação / Referência (Obrigatório ou Anexe o Ficheiro)</label>
                                        <input 
                                          type="text" 
                                          placeholder="Ex: ID da transação, Ref bancária, nº do talão ou telefone remetente..." 
                                          value={transactionNumber}
                                          onChange={e => setTransactionNumber(e.target.value)}
                                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-xs font-mono outline-none focus:border-[#049444] transition-all" 
                                        />
                                      </div>

                                      <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${proofFile ? 'border-[#049444] bg-[#049444]/10' : 'border-white/10 hover:border-[#049444] hover:bg-white/5'}`}>
                                        <input type="file" ref={fileInputRef} accept="image/*,application/pdf" onChange={(e) => e.target.files && setProofFile(e.target.files[0])} className="hidden" />
                                        <div className={`p-3 rounded-full ${proofFile ? 'bg-[#049444]/20 text-[#049444]' : 'bg-white/5 text-white/20'}`}>
                                          {proofFile ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 text-center">{proofFile ? `Comprovante Anexado: ${proofFile.name}` : 'Anexar Foto ou PDF do Comprovante (Opcional)'}</span>
                                      </div>

                                      <button onClick={handleSubmitManualDeposit} className="w-full py-5 bg-[#049444] hover:bg-[#037235] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-[#049444]/20 transition-all active:scale-95 group flex items-center justify-center gap-2 cursor-pointer">
                                        Confirmar Depósito Manual
                                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                      </button>
                                    </div>
                                  )}
                               </div>
                             ) : (
                               <div className="py-20 text-center space-y-6 flex flex-col items-center">
                                  <div className="w-20 h-20 bg-[#049444]/10 border border-[#049444]/20 text-[#049444] rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-[#049444]/10">
                                     <CheckCircle2 className="w-10 h-10 text-[#049444]" />
                                  </div>
                                  <div className="space-y-2">
                                     <h3 className="text-3xl font-black uppercase italic tracking-tighter">Depósito <span className="text-[#049444]">Registado</span></h3>
                                     <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] max-w-xs">O seu comprovante e referência foram enviados para verificação da equipa administrativa. O saldo será ativado em breve.</p>
                                  </div>
                                  <button onClick={() => setPaymentStep('FORM')} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all cursor-pointer">Voltar ao Painel</button>
                               </div>
                             )
                           ) : (
                             withdrawStep === 'FORM' ? (
                               <div className="space-y-6">
                                  {/* Seleção do Método de Saque */}
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Selecione o Canal para Receber o Saque</label>
                                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {paymentMethods.map(method => (
                                          <button 
                                            key={method.id} 
                                            onClick={() => setSelectedMethod(method)} 
                                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-1.5 text-center group cursor-pointer ${selectedMethod?.id === method.id ? 'bg-[#FFCC00]/15 border-[#FFCC00] shadow-lg' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                          >
                                            <span className="text-sm font-black text-white">{method.name}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${selectedMethod?.id === method.id ? 'bg-[#FFCC00] text-black' : 'bg-white/10 text-slate-400'}`}>
                                              {method.cryptoNetwork ? `${method.cryptoType || 'USDT'} (${method.cryptoNetwork})` : method.type}
                                            </span>
                                          </button>
                                        ))}
                                     </div>
                                  </div>

                                  <div className="space-y-4">
                                     <div className="flex justify-between items-end px-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Valor do Levantamento</label>
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Máx: {balance.toFixed(2)} USDT</span>
                                     </div>
                                     <div className="relative">
                                        <input 
                                          type="number" 
                                          value={withdrawAmount} 
                                          onChange={e => setWithdrawAmount(Number(e.target.value))} 
                                          className="w-full bg-black/40 border border-white/5 rounded-3xl px-8 py-5 text-white font-mono font-black text-3xl outline-none focus:border-[#FFCC00] transition-all" 
                                        />
                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xl font-black text-[#FFCC00] uppercase italic font-mono">USDT</div>
                                     </div>
                                  </div>

                                  <div className="space-y-2">
                                     <label className="text-[9px] font-black text-white/40 uppercase ml-2 block tracking-widest">Dados da Sua Conta Destino (Telefone Unitel Money, IBAN ou Carteira Crypto)</label>
                                     <div className="relative">
                                        <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                                        <input 
                                          type="text" 
                                          placeholder="Ex: 923... / AO06... / T... (TRC20)" 
                                          value={withdrawAccount} 
                                          onChange={e => setWithdrawAccount(e.target.value)} 
                                          className="w-full bg-black/40 border border-white/5 rounded-2xl px-14 py-4 text-white font-mono font-bold text-xs outline-none focus:border-[#FFCC00] transition-all placeholder:text-white/20" 
                                        />
                                     </div>
                                  </div>

                                  <button onClick={handleWithdrawRequest} disabled={withdrawAmount > balance || !withdrawAccount || withdrawAmount < 1} className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${withdrawAmount > balance || !withdrawAccount || withdrawAmount < 1 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-[#FFCC00] text-black shadow-xl shadow-[#FFCC00]/10 hover:bg-[#e6b800] group'}`}>
                                     Solicitar Levantamento Manual
                                     <ArrowDownLeft className="w-5 h-5 group-hover:-translate-x-1 group-hover:translate-y-1 transition-transform" />
                                  </button>
                               </div>
                             ) : (
                               <div className="py-20 text-center space-y-6 flex flex-col items-center">
                                  <div className="w-20 h-20 bg-[#FFCC00]/10 border border-[#FFCC00]/20 text-[#FFCC00] rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-[#FFCC00]/10">
                                     <Clock className="w-10 h-10 animate-spin-slow" />
                                  </div>
                                  <div className="space-y-2">
                                     <h3 className="text-3xl font-black uppercase italic tracking-tighter">Em <span className="text-[#FFCC00]">Análise</span></h3>
                                     <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] max-w-xs">O seu pedido está na fila de processamento manual da nossa equipa. Receberá os fundos na conta indicada em breve.</p>
                                  </div>
                                  <button onClick={() => setWithdrawStep('FORM')} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all cursor-pointer">Fechar</button>
                               </div>
                             )
                           )}
                        </div>

                        {/* Recent Activity List */}
                        <div className="space-y-4">
                           <h4 className="text-[11px] font-black uppercase text-white/30 tracking-[0.3em] ml-4">Atividade Recente</h4>
                           <div className="bg-[#131d27]/40 border border-white/5 rounded-[2rem] overflow-hidden">
                              {recentTransactions.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between p-5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${tx.type === 'DEPOSIT' ? 'bg-[#049444]/10 text-[#049444]' : 'bg-red-500/10 text-red-500'}`}>
                                         {tx.type === 'DEPOSIT' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                      </div>
                                      <div>
                                         <p className="text-[11px] font-black uppercase tracking-tight text-white group-hover:text-[#FFCC00] transition-colors">{tx.type === 'DEPOSIT' ? 'Depósito Realizado' : 'Levantamento Solicitado'}</p>
                                         <p className="text-[9px] font-bold text-white/20 uppercase">{tx.date}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className={`text-sm font-black font-mono ${tx.type === 'DEPOSIT' ? 'text-[#049444]' : 'text-white'}`}>{tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toFixed(2)} <span className="text-[10px]">USDT</span></p>
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${tx.status === 'COMPLETED' ? 'bg-[#049444]/20 text-[#049444]' : 'bg-[#FFCC00]/20 text-[#FFCC00]'}`}>{tx.status === 'COMPLETED' ? 'Sucesso' : 'Pendente'}</span>
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                     </motion.div>
                   )}

                   {activeTab === 'SWAP' && (
                     <motion.div 
                       key="swap"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-6"
                     >
                       <div className="bg-[#131d27]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 md:p-8 space-y-8">
                         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/5">
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                               <RefreshCw className="w-5 h-5 text-[#049444]" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-[#049444]">Crypto Exchange & Swap</span>
                             </div>
                             <h3 className="text-2xl font-black uppercase italic tracking-tight text-white">
                               Trocar / Comprar <span className="text-[#FFCC00]">Criptomoedas</span>
                             </h3>
                             <p className="text-[10px] text-slate-400 font-medium">Converte o teu saldo USDT em BTC, ETH, SOL, BNB, TRX ou DOGE usando cotações em tempo real </p>
                           </div>

                           <div className="bg-black/40 border border-white/10 px-5 py-3 rounded-2xl text-right shrink-0">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Saldo USDT Disponível</span>
                             <span className="text-lg font-black font-mono text-[#049444]">{balance.toFixed(2)} USDT</span>
                           </div>
                         </div>

                         {/* Selection of Target Crypto */}
                         <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Seleciona a Criptomoeda Destino</label>
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                             {[
                               { sym: 'BTC', name: 'Bitcoin', icon: '₿' },
                               { sym: 'ETH', name: 'Ethereum', icon: 'Ξ' },
                               { sym: 'SOL', name: 'Solana', icon: '☀️' },
                               { sym: 'BNB', name: 'Binance', icon: '🟡' },
                               { sym: 'TRX', name: 'Tron', icon: '🔴' },
                               { sym: 'DOGE', name: 'Dogecoin', icon: '🐶' }
                             ].map((coin) => {
                               const rate = cryptoRates[coin.sym] || 1;
                               const isSel = swapToCrypto === coin.sym;
                               return (
                                 <button
                                   key={coin.sym}
                                   type="button"
                                   onClick={() => { soundService.playUISelect(); setSwapToCrypto(coin.sym as any); }}
                                   className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center gap-1 cursor-pointer ${
                                     isSel ? 'bg-[#049444]/20 border-[#049444] shadow-lg shadow-[#049444]/10' : 'bg-black/30 border-white/5 hover:border-white/20'
                                   }`}
                                 >
                                   <span className="text-2xl mb-1">{coin.icon}</span>
                                   <span className={`text-xs font-black ${isSel ? 'text-[#049444]' : 'text-white'}`}>{coin.sym}</span>
                                   <span className="text-[9px] font-mono font-bold text-slate-400">${rate < 1 ? rate.toFixed(4) : rate.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                 </button>
                               );
                             })}
                           </div>
                         </div>

                         {/* Amount Input & Calculation */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-6 rounded-3xl border border-white/5">
                           <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Valor a Pagar em USDT</label>
                             <div className="relative">
                               <input 
                                 type="number" 
                                 value={swapAmountUsdt} 
                                 onChange={e => setSwapAmountUsdt(Number(e.target.value))}
                                 className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono font-black text-2xl outline-none focus:border-[#049444]"
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-black text-sm text-[#049444]">USDT</span>
                             </div>

                             <div className="flex gap-2">
                               {[10, 25, 50, 100, 250, 500].map(amt => (
                                 <button
                                   key={amt}
                                   type="button"
                                   onClick={() => setSwapAmountUsdt(amt)}
                                   className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-mono font-bold text-slate-300 border border-white/5 cursor-pointer"
                                 >
                                   ${amt}
                                 </button>
                               ))}
                             </div>
                           </div>

                           <div className="space-y-3 flex flex-col justify-between">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">3. Receberás Aproximadamente</label>
                             <div className="p-4 bg-gradient-to-tr from-[#049444]/10 to-transparent border border-[#049444]/30 rounded-2xl space-y-1">
                               <div className="text-2xl font-black font-mono text-[#FFCC00]">
                                 {(swapAmountUsdt / (cryptoRates[swapToCrypto] || 1)).toFixed(6)} {swapToCrypto}
                               </div>
                               <div className="text-[9px] font-mono text-slate-400">
                                 1 {swapToCrypto} = ${(cryptoRates[swapToCrypto] || 1).toLocaleString()} USDT
                               </div>
                             </div>
                           </div>
                         </div>

                         {swapFeedback && (
                           <div className={`p-4 rounded-2xl text-xs font-black uppercase text-center border ${swapFeedback.includes('sucesso') ? 'bg-[#049444]/20 border-[#049444] text-[#049444]' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                             {swapFeedback}
                           </div>
                         )}

                         <button
                           type="button"
                           onClick={handleExecuteCryptoSwap}
                           disabled={isExecutingSwap || swapAmountUsdt > balance || swapAmountUsdt <= 0}
                           className="w-full py-5 bg-[#049444] hover:bg-[#037235] disabled:opacity-50 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-[#049444]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                         >
                           {isExecutingSwap ? <Clock className="w-5 h-5 animate-spin" /> : <ArrowLeftRight className="w-5 h-5" />}
                           {isExecutingSwap ? 'A Processar Troca...' : `Confirmar Troca por ${swapToCrypto}`}
                         </button>

                         {/* User Crypto Wallet Balances */}
                         <div className="pt-6 border-t border-white/5 space-y-3">
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Teu Portfolio de Criptomoedas na Carteira</h4>
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                             {Object.entries(cryptoBalances).map(([sym, amt]) => (
                               <div key={sym} className="bg-black/30 border border-white/5 p-3 rounded-2xl text-center">
                                 <span className="text-[9px] font-black text-slate-500 uppercase block">{sym}</span>
                                 <span className="text-xs font-black font-mono text-white block mt-0.5">{(amt as number).toFixed(4)}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                     </motion.div>
                   )}

                   {activeTab === 'MONETIZATION' && (
                     <motion.div 
                       key="monetization"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-6"
                     >
                        {/* Header Banner do Criador Piloto Google */}
                        <div className="bg-gradient-to-r from-[#131d27] via-[#049444]/20 to-[#FFCC00]/10 border border-[#FFCC00]/30 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                              <div className="space-y-2">
                                 <div className="inline-flex items-center gap-2 bg-[#FFCC00] text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    <Sparkles className="w-3.5 h-3.5" /> ESTÚDIO DE MONETIZAÇÃO PILOTO GOOGLE
                                 </div>
                                 <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                                    Ganhos de <span className="text-[#FFCC00]">Criador & Conteúdo</span>
                                 </h3>
                                 <p className="text-white/60 text-xs font-medium max-w-xl">
                                    Vende E-Books em PDF, recebe gorjetas Super Chat na comunidade social e comissões P2P. Todos os teus rendimentos são creditados automaticamente.
                                 </p>
                              </div>

                              <div className="bg-black/60 border border-[#FFCC00]/30 p-5 rounded-2xl text-center md:text-right shrink-0">
                                 <span className="text-[9px] font-black text-[#FFCC00] uppercase tracking-widest block mb-1">Rendimento Bruto Total</span>
                                 <div className="text-2xl font-black font-mono text-[#049444]">
                                    {(pdfSalesTotal + superChatTotal + p2pSalesTotal + adReadEarnings + campaignCommission).toFixed(2)} <span className="text-xs opacity-50">USDT</span>
                                 </div>
                                 <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider block mt-1">Status: Ativo 🟢</span>
                              </div>
                           </div>
                        </div>

                        {/* 4 Cards de Estatísticas da Monetização */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                           <div className="bg-[#131d27]/60 border border-white/5 p-5 rounded-2xl">
                              <div className="flex items-center justify-between text-amber-400 mb-2">
                                 <BookOpen className="w-5 h-5" />
                                 <span className="text-[9px] font-black uppercase bg-amber-400/10 px-2 py-0.5 rounded">PDF E-Books</span>
                              </div>
                              <span className="text-[9px] font-black text-white/40 uppercase block">Vendas de PDFs</span>
                              <div className="text-xl font-black font-mono text-white mt-1">{pdfSalesTotal.toFixed(2)} USDT</div>
                              <p className="text-[8px] text-white/40 font-bold uppercase mt-1">{userPdfPosts.length} Materiais Publicados</p>
                           </div>

                           <div className="bg-[#131d27]/60 border border-white/5 p-5 rounded-2xl">
                              <div className="flex items-center justify-between text-[#FFCC00] mb-2">
                                 <Zap className="w-5 h-5" />
                                 <span className="text-[9px] font-black uppercase bg-[#FFCC00]/10 px-2 py-0.5 rounded">Super Chat</span>
                              </div>
                              <span className="text-[9px] font-black text-white/40 uppercase block">Gorjetas Recebidas</span>
                              <div className="text-xl font-black font-mono text-white mt-1">{superChatTotal.toFixed(2)} USDT</div>
                              <p className="text-[8px] text-white/40 font-bold uppercase mt-1">Apoio da Comunidade</p>
                           </div>

                           <div className="bg-[#131d27]/60 border border-white/5 p-5 rounded-2xl">
                              <div className="flex items-center justify-between text-emerald-400 mb-2">
                                 <TrendingUp className="w-5 h-5" />
                                 <span className="text-[9px] font-black uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Mercado P2P</span>
                              </div>
                              <span className="text-[9px] font-black text-white/40 uppercase block">Volume de Trades P2P</span>
                              <div className="text-xl font-black font-mono text-white mt-1">{p2pSalesTotal.toFixed(2)} USDT</div>
                              <p className="text-[8px] text-white/40 font-bold uppercase mt-1">Transações Concluídas</p>
                           </div>

                           <div className="bg-[#131d27]/60 border border-white/5 p-5 rounded-2xl">
                              <div className="flex items-center justify-between text-yellow-400 mb-2">
                                 <Star className="w-5 h-5 fill-yellow-400" />
                                 <span className="text-[9px] font-black uppercase bg-yellow-400/10 px-2 py-0.5 rounded">Reputação</span>
                              </div>
                              <span className="text-[9px] font-black text-white/40 uppercase block">Avaliação do Criador</span>
                              <div className="text-xl font-black font-mono text-white mt-1">4.9 / 5.0</div>
                              <p className="text-[8px] text-emerald-400 font-bold uppercase mt-1">⭐ Criador Recomendado</p>
                           </div>

                           <div className="bg-[#131d27]/60 border border-amber-500/20 p-5 rounded-2xl bg-amber-500/5">
                              <div className="flex items-center justify-between text-amber-400 mb-2">
                                 <DollarSign className="w-5 h-5" />
                                 <span className="text-[9px] font-black uppercase bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">Anúncios Texto</span>
                              </div>
                              <span className="text-[9px] font-black text-white/40 uppercase block">Ganhos por Leitura</span>
                              <div className="text-xl font-black font-mono text-amber-400 mt-1">{adReadEarnings.toFixed(2)} USDT</div>
                              <p className="text-[8px] text-amber-400/70 font-bold uppercase mt-1">Lê & Ganha</p>
                           </div>

                           <div className="bg-[#131d27]/60 border border-blue-500/20 p-5 rounded-2xl bg-blue-500/5">
                              <div className="flex items-center justify-between text-blue-400 mb-2">
                                 <Megaphone className="w-5 h-5" />
                                 <span className="text-[9px] font-black uppercase bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">30% Campanhas</span>
                              </div>
                              <span className="text-[9px] font-black text-white/40 uppercase block">Comissão Criador</span>
                              <div className="text-xl font-black font-mono text-blue-400 mt-1">{campaignCommission.toFixed(2)} USDT</div>
                              <p className="text-[8px] text-blue-400/70 font-bold uppercase mt-1">Revenue Share Pool</p>
                           </div>
                        </div>

                        {/* Meus Conteúdos Monetizados Publicados */}
                        <div className="bg-[#131d27]/60 border border-white/5 rounded-[2rem] p-6 md:p-8 space-y-6">
                           <div className="flex items-center justify-between flex-wrap gap-4">
                              <div>
                                 <h4 className="text-base font-black uppercase tracking-tight text-white italic">
                                    Os Meus <span className="text-[#FFCC00]">E-Books & Conteúdos</span>
                                 </h4>
                                 <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Publicações ativas no feed da CryptonBet</p>
                              </div>
                              <button
                                onClick={() => {
                                  soundService.playUISelect();
                                  setActiveTab('PRODUCTS');
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                              >
                                <BarChart3 className="w-4 h-4 text-amber-300" />
                                Abrir Gerenciador de Produtos
                              </button>
                           </div>

                           {userPdfPosts.length === 0 ? (
                              <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center space-y-3">
                                 <FileText className="w-8 h-8 text-white/20 mx-auto" />
                                 <p className="text-xs text-white/40 font-bold uppercase">Ainda não publicou nenhum E-Book em PDF.</p>
                                 <p className="text-[10px] text-white/20">Aceda à aba Social para publicar e-books de estratégia e começar a rentabilizar!</p>
                              </div>
                           ) : (
                              <div className="space-y-3">
                                 {userPdfPosts.map((pdf, idx) => (
                                    <div key={idx} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-10 h-12 bg-gradient-to-tr ${pdf.pdfCoverColor || pdf.coverColor || 'from-amber-600 to-amber-900'} rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0 shadow`}>
                                             PDF
                                          </div>
                                          <div>
                                             <h5 className="text-xs font-black text-white uppercase">{pdf.pdfTitle || pdf.title}</h5>
                                             <p className="text-[9px] text-white/40 font-mono">Preço: {pdf.pdfPrice || pdf.price || 0} USDT • Downloads: {pdf.pdfDownloads || pdf.downloads || 0}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                                          <div className="text-right shrink-0">
                                             <span className="text-xs font-black font-mono text-[#049444]">
                                                +{( (pdf.pdfDownloads || pdf.downloads || 0) * (pdf.pdfPrice || pdf.price || 0) ).toFixed(2)} USDT
                                             </span>
                                             <span className="block text-[8px] text-white/30 font-bold uppercase">Total Arrecadado</span>
                                          </div>
                                          <button
                                            onClick={() => {
                                              soundService.playUISelect();
                                              setActiveTab('PRODUCTS');
                                            }}
                                            className="p-2 bg-white/5 hover:bg-white/10 text-[#FFCC00] rounded-xl transition-all cursor-pointer"
                                            title="Gerenciar Produto (Editar / Eliminar)"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>

                        {/* Configurações da Conta de Monetização */}
                        <div className="bg-[#131d27]/60 border border-white/5 rounded-[2rem] p-6 md:p-8 space-y-6">
                           <h4 className="text-xs font-black uppercase text-white/40 tracking-[0.2em] flex items-center gap-2">
                              <Settings className="w-4 h-4 text-[#FFCC00]" /> Configurações de Vendas & Super Chat
                           </h4>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-white/30 uppercase ml-2 block">IBAN Oficial para Vendas Directas</label>
                                 <input 
                                   type="text" 
                                   value={creatorIban} 
                                   onChange={(e) => setCreatorIban(e.target.value)}
                                   className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white text-xs font-mono font-bold outline-none focus:border-[#FFCC00]"
                                 />
                              </div>

                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-white/30 uppercase ml-2 block">Valor Mínimo de Super Chat (USDT)</label>
                                 <input 
                                   type="number" 
                                   value={minSuperChat} 
                                   onChange={(e) => setMinSuperChat(Number(e.target.value))}
                                   className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white text-xs font-mono font-bold outline-none focus:border-[#FFCC00]"
                                 />
                              </div>
                           </div>

                           <button 
                             onClick={() => {
                               soundService.playUISelect();
                               showFeedback('Definições de Monetização guardadas!');
                             }}
                             className="py-3 px-8 bg-[#FFCC00] hover:bg-[#e6b800] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                           >
                              Guardar Configurações de Criador
                           </button>
                        </div>
                     </motion.div>
                   )}

                   {activeTab === 'PRODUCTS' && (() => {
                     const filteredManaged = managedProducts.filter(item => {
                       if (managerFilterType !== 'all' && item.type !== managerFilterType) return false;
                       if (managerSearch && !(item.title || '').toLowerCase().includes(managerSearch.toLowerCase()) && !(item.description || '').toLowerCase().includes(managerSearch.toLowerCase())) return false;
                       return true;
                     });
                     const totalRevenue = managedProducts.reduce((acc, item) => acc + (item.downloadsOrSales * item.price), 0);
                     const totalSalesCount = managedProducts.reduce((acc, item) => acc + item.downloadsOrSales, 0);

                     return (
                       <motion.div 
                         key="products"
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="space-y-6"
                       >
                         {/* 1. BANNER E STATS */}
                         <div className="bg-gradient-to-br from-[#131d27] via-[#0e1721] to-[#049444]/20 rounded-[2rem] p-6 md:p-8 text-white shadow-xl border border-white/10 space-y-6">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div>
                               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#049444]/20 border border-[#049444]/30 text-[#049444] text-[10px] font-black uppercase tracking-wider mb-2">
                                 <BarChart3 className="w-3 h-3" /> Painel do Criador & Vendedor
                               </div>
                               <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                                 Gerenciador de <span className="text-[#FFCC00]">Produtos & Vendas</span>
                               </h3>
                               <p className="text-xs text-white/60 font-medium mt-1">
                                 Acompanhe as suas vendas em tempo real, edite preços, pause anúncios ou elimine produtos do mercado.
                               </p>
                             </div>
                             {!isReadOnly && (
                               <button
                                 onClick={() => {
                                   soundService.playUISelect();
                                   if (onSelectGame) {
                                     onSelectGame('CREATE_PRODUCT' as any);
                                   } else {
                                     alert('Aceda à comunidade/social para publicar um novo produto.');
                                   }
                                 }}
                                 className="px-5 py-3 bg-gradient-to-r from-[#FFCC00] to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                               >
                                 <Plus className="w-4 h-4 text-black" />
                                 <span>Publicar Novo Produto</span>
                               </button>
                             )}
                           </div>

                           {/* STATS GRID */}
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                             <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-[#049444]/20 border border-[#049444]/30 flex items-center justify-center text-[#049444] shrink-0">
                                 <DollarSign className="w-6 h-6" />
                               </div>
                               <div>
                                 <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Faturamento Arrecadado</span>
                                 <div className="text-xl font-black font-mono text-[#049444]">{totalRevenue.toFixed(2)} <span className="text-xs text-white/40">USDT</span></div>
                               </div>
                             </div>

                             <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                                 <ShoppingCart className="w-6 h-6" />
                               </div>
                               <div>
                                 <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Vendas / Downloads</span>
                                 <div className="text-xl font-black font-mono text-white">{totalSalesCount} <span className="text-xs text-white/40">Efetuados</span></div>
                               </div>
                             </div>

                             <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                 <Package className="w-6 h-6" />
                               </div>
                               <div>
                                 <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Produtos no Mercado</span>
                                 <div className="text-xl font-black font-mono text-[#FFCC00]">{managedProducts.length} <span className="text-xs text-white/40">Ativos</span></div>
                               </div>
                             </div>
                           </div>
                         </div>

                         {/* 2. FILTER & SEARCH */}
                         <div className="bg-[#131d27]/60 border border-white/5 rounded-[2rem] p-4 shadow-sm space-y-4">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                             <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                               {[
                                 { id: 'all', label: `Todos (${managedProducts.length})` },
                                 { id: 'pdf', label: `E-Books PDF (${managedProducts.filter(i => i.type === 'pdf').length})` },
                                 { id: 'p2p', label: `Anúncios P2P (${managedProducts.filter(i => i.type === 'p2p').length})` },
                               ].map(t => (
                                 <button
                                   key={t.id}
                                   onClick={() => {
                                     soundService.playUISelect();
                                     setManagerFilterType(t.id as any);
                                   }}
                                   className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                     managerFilterType === t.id
                                       ? 'bg-[#049444] text-white shadow-sm'
                                       : 'bg-white/5 text-white/60 hover:bg-white/10'
                                   }`}
                                 >
                                   {t.label}
                                 </button>
                               ))}
                             </div>

                             <div className="relative flex-1 sm:max-w-xs">
                               <Search className="w-4 h-4 text-[#049444] absolute left-3 top-1/2 -translate-y-1/2" />
                               <input
                                 type="text"
                                 placeholder="Buscar nos meus produtos..."
                                 value={managerSearch}
                                 onChange={(e) => setManagerSearch(e.target.value)}
                                 className="w-full bg-white border-2 border-[#049444] focus:border-[#FFCC00] focus:ring-2 focus:ring-[#FFCC00]/40 rounded-xl pl-9 pr-8 py-2 text-xs font-black text-black placeholder:text-slate-500 focus:outline-none shadow-md transition-all"
                               />
                               {managerSearch && (
                                 <button onClick={() => setManagerSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black">
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>

                         {/* 3. PRODUCT LIST */}
                         {filteredManaged.length === 0 ? (
                           <div className="p-12 text-center bg-[#131d27]/60 rounded-[2rem] border border-white/5 shadow-sm space-y-3">
                             <Store className="w-12 h-12 text-white/20 mx-auto" />
                             <h4 className="text-sm font-black text-white uppercase tracking-wider">Nenhum produto encontrado</h4>
                             <p className="text-xs text-white/40 max-w-sm mx-auto">
                               {managerSearch ? 'Nenhum produto corresponde à sua pesquisa.' : 'Você ainda não possui produtos ou ofertas ativas nesta categoria.'}
                             </p>
                             {!isReadOnly && (
                               <button
                                 onClick={() => {
                                   soundService.playUISelect();
                                   if (onSelectGame) {
                                     onSelectGame('CREATE_PRODUCT' as any);
                                   }
                                 }}
                                 className="px-4 py-2 bg-[#049444] hover:bg-[#037235] text-white rounded-xl font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow transition-all cursor-pointer"
                               >
                                 <Plus className="w-3.5 h-3.5" /> Publicar Novo Produto
                               </button>
                             )}
                           </div>
                         ) : (
                           <div className="grid grid-cols-1 gap-4">
                             {filteredManaged.map((item) => (
                               <div
                                 key={item.id}
                                 className={`bg-[#131d27]/60 rounded-[2rem] border ${item.status === 'paused' ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5'} p-5 shadow-sm hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6`}
                               >
                                 <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                                   {item.type === 'pdf' ? (
                                     <div className={`w-14 h-18 rounded-xl bg-gradient-to-tr ${item.coverColor} flex flex-col items-center justify-center text-white p-1.5 shrink-0 shadow text-center`}>
                                       <Store className="w-5 h-5 mb-1 opacity-80" />
                                       <span className="text-[9px] font-black uppercase tracking-tighter leading-none">E-Book</span>
                                     </div>
                                   ) : (
                                     <div className="w-14 h-18 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-800 flex flex-col items-center justify-center text-white p-1.5 shrink-0 shadow text-center">
                                       <ArrowUpDown className="w-5 h-5 mb-1 text-amber-300" />
                                       <span className="text-[9px] font-black uppercase tracking-tighter leading-none">P2P</span>
                                     </div>
                                   )}

                                   <div className="space-y-1 flex-1 min-w-0">
                                     <div className="flex items-center gap-2 flex-wrap">
                                       <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider ${
                                         item.type === 'pdf' ? 'bg-amber-400/20 text-[#FFCC00]' : 'bg-[#049444]/20 text-[#049444]'
                                       }`}>
                                         {item.type === 'pdf' ? 'Livro PDF' : 'Oferta P2P'}
                                       </span>
                                       <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider flex items-center gap-1 ${
                                         item.status === 'paused' ? 'bg-amber-400/20 text-amber-300' : 'bg-[#049444]/20 text-[#049444]'
                                       }`}>
                                         {item.status === 'paused' ? <EyeOff className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                                         {item.status === 'paused' ? 'Pausado' : 'Ativo'}
                                       </span>
                                       <span className="text-[10px] text-white/40 font-medium">
                                         Criado {item.createdAt}
                                       </span>
                                     </div>
                                     
                                     <h4 className="text-base font-black text-white truncate uppercase">
                                       {item.title}
                                     </h4>
                                     <p className="text-xs text-white/60 line-clamp-1">
                                       {item.description}
                                     </p>
                                   </div>
                                 </div>

                                 {/* METRICS & CONTROLS */}
                                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-white/10 shrink-0">
                                   <div className="flex items-center gap-6 justify-around sm:justify-end bg-black/20 md:bg-transparent p-3 md:p-0 rounded-xl border border-white/5 md:border-0">
                                     <div className="text-center sm:text-right">
                                       <span className="text-[10px] text-white/40 font-bold uppercase block">Preço Unitário</span>
                                       <span className="text-sm font-black font-mono text-white">{item.price} <span className="text-[10px] font-normal">USDT</span></span>
                                     </div>

                                     <div className="text-center sm:text-right">
                                       <span className="text-[10px] text-white/40 font-bold uppercase block">Vendas / Downloads</span>
                                       <span className="text-sm font-black font-mono text-blue-400">{item.downloadsOrSales} <span className="text-[10px] font-normal">un</span></span>
                                     </div>

                                     <div className="text-center sm:text-right">
                                       <span className="text-[10px] text-white/40 font-bold uppercase block">Total Arrecadado</span>
                                       <span className="text-sm font-black font-mono text-[#049444]">+{(item.downloadsOrSales * item.price).toFixed(2)} <span className="text-[10px] font-normal">USDT</span></span>
                                     </div>
                                   </div>

                                   {/* ACTION BUTTONS */}
                                   {isReadOnly ? (
                                     <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                       <button
                                         onClick={() => {
                                           soundService.playUISelect();
                                           if (onSelectGame) onSelectGame(item.type === 'pdf' ? 'PDF_MARKET' : 'P2P', item.id);
                                         }}
                                         className="px-4 py-2 bg-[#FFCC00]/20 hover:bg-[#FFCC00]/30 text-[#FFCC00] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-[#FFCC00]/30 shadow-sm"
                                       >
                                         <Search className="w-3.5 h-3.5" />
                                         <span>Ver no Mercado</span>
                                       </button>
                                     </div>
                                   ) : (
                                   <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                     <button
                                       onClick={() => {
                                         soundService.playUISelect();
                                         setEditingProduct(item);
                                         setEditPriceVal(item.price.toString());
                                       }}
                                       className="px-3 py-2 bg-white/5 hover:bg-white/10 text-[#FFCC00] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-white/10 shadow-sm"
                                       title="Editar Preço do Produto"
                                     >
                                       <Edit3 className="w-3.5 h-3.5" />
                                       <span>Editar</span>
                                     </button>

                                     <button
                                       onClick={() => handleTogglePauseProduct(item.rawPost)}
                                       className={`p-2 rounded-xl transition-all cursor-pointer border shadow-sm ${
                                         item.status === 'paused'
                                           ? 'bg-[#049444]/20 hover:bg-[#049444]/30 text-[#049444] border-[#049444]/30'
                                           : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                                       }`}
                                       title={item.status === 'paused' ? 'Ativar e Publicar no Mercado' : 'Pausar Anúncio Temporariamente'}
                                     >
                                       <EyeOff className="w-4 h-4" />
                                     </button>

                                     <button
                                       onClick={() => handleDeleteProduct(item.rawPost)}
                                       className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all cursor-pointer border border-rose-500/20 shadow-sm"
                                       title="Eliminar Produto Definitivamente"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                   </div>
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                         )}
                       </motion.div>
                     );
                   })()}

                   {activeTab === 'STATS' && (
                     <motion.div 
                       key="stats"
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                     >
                        {[
                          { l: 'Total de Apostas', v: (user.totalBets || 1452).toString(), sub: '+12% este mês', icon: Star },
                          { l: 'Maior Multiplicador', v: '248.50x', sub: 'No Aviator', icon: ArrowUpRight },
                          { l: 'Vitórias Registradas', v: (user.totalWins || 425).toString(), sub: 'Recorde de palpites', icon: Wallet },
                          { l: 'Nível de Prestígio', v: `Nível ${Math.floor(((user.totalBets || 0) * 10 + (user.totalWins || 0) * 50) / 100) + 1}`, sub: 'Ativo na Plataforma', icon: ShieldCheck }
                        ].map((s, i) => (
                          <div key={i} className="bg-[#131d27]/60 border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-[#049444]/30 transition-all overflow-hidden">
                             <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-8xl rotate-12 group-hover:opacity-[0.05] transition-opacity">
                                <s.icon />
                             </div>
                             <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2">{s.l}</span>
                             <div className="text-3xl font-black font-mono text-white tracking-tighter mb-1 uppercase">{s.v}</div>
                             <p className="text-[9px] font-bold text-[#049444] uppercase tracking-widest">{s.sub}</p>
                          </div>
                        ))}
                     </motion.div>
                   )}

                                       {activeTab === 'SETTINGS' && (
                       <motion.div 
                         key="settings"
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="bg-[#131d27]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-10"
                       >
                          <form onSubmit={handleSaveProfile} className="space-y-6">
                             <h4 className="text-[11px] font-black uppercase text-white/30 tracking-[0.3em] flex items-center gap-2">
                                Perfil Completo & Segurança
                             </h4>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                   <label className="text-[9px] font-black text-white/20 uppercase ml-4">Nome de Jogador</label>
                                   <input 
                                     type="text" 
                                     value={editName} 
                                     onChange={(e) => setEditName(e.target.value)}
                                     required
                                     className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-xs uppercase focus:outline-none focus:border-[#049444]/50 transition-colors" 
                                   />
                                </div>

                                <div className="flex flex-col gap-2">
                                   <label className="text-[9px] font-black text-white/20 uppercase ml-4">Telefone / Contacto</label>
                                   <input 
                                     type="text" 
                                     value={editPhone} 
                                     onChange={(e) => setEditPhone(e.target.value)}
                                     placeholder="+244 9..."
                                     className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-xs focus:outline-none focus:border-[#049444]/50 transition-colors" 
                                   />
                                </div>

                                <div className="flex flex-col gap-2">
                                   <label className="text-[9px] font-black text-white/20 uppercase ml-4">WhatsApp Link / Direct</label>
                                   <input 
                                     type="text" 
                                     value={editWhatsapp} 
                                     onChange={(e) => setEditWhatsapp(e.target.value)}
                                     placeholder="+244 923 000 000"
                                     className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-xs focus:outline-none focus:border-[#049444]/50 transition-colors" 
                                   />
                                </div>

                                <div className="flex flex-col gap-2">
                                   <label className="text-[9px] font-black text-white/20 uppercase ml-4">Email da Conta</label>
                                   <input 
                                     type="email" 
                                     value={user.email} 
                                     disabled 
                                     className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white/40 font-bold text-xs cursor-not-allowed" 
                                   />
                                </div>
                             </div>

                             <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-white/20 uppercase ml-4">Biografia / Apresentação</label>
                                <textarea 
                                  value={editBio} 
                                  onChange={(e) => setEditBio(e.target.value)}
                                  placeholder="Escreve algo sobre o teu perfil de trader no CryptonBet Angola..."
                                  rows={3}
                                  className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold text-xs focus:outline-none focus:border-[#049444]/50 transition-colors resize-none" 
                                />
                             </div>

                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-white/20 uppercase ml-4 block">Cor do Emblema de Avatar</label>
                                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                   {[
                                     { label: 'Crypton', class: 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]' },
                                     { label: 'Sun', class: 'bg-gradient-to-tr from-[#ff416c] to-[#ff4b2b]' },
                                     { label: 'Cyber', class: 'bg-gradient-to-tr from-[#8a2387] to-[#e94057]' },
                                     { label: 'Ocean', class: 'bg-gradient-to-tr from-[#11998e] to-[#38ef7d]' },
                                     { label: 'Midnight', class: 'bg-gradient-to-tr from-[#0f2027] to-[#203a43]' }
                                   ].map((item, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => { setSelectedAvatarColor(item.class); }}
                                        className={`w-10 h-10 rounded-full ${item.class} border-2 transition-all relative ${selectedAvatarColor === item.class ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                        title={item.label}
                                      >
                                        {selectedAvatarColor === item.class && (
                                           <div className="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</div>
                                        )}
                                      </button>
                                   ))}
                                </div>
                             </div>

                             <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                   <h5 className="text-[11px] font-black text-white uppercase tracking-tight">Modo de Demonstração</h5>
                                   <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Alternar para apostas virtuais</p>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => onToggleDemo(!isDemo)} 
                                  className={`w-14 h-7 rounded-full relative transition-all ${isDemo ? 'bg-[#FFCC00]' : 'bg-white/10'}`}
                                >
                                   <motion.div 
                                     animate={{ x: isDemo ? 28 : 4 }}
                                     className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-xl"
                                   />
                                </button>
                             </div>

                             <button
                               type="submit"
                               disabled={isSavingProfile}
                               className="w-full bg-[#049444] hover:bg-[#037235] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg border border-white/10 flex items-center justify-center gap-2"
                             >
                               {isSavingProfile ? 'A guardar...' : 'Guardar Alterações do Perfil'}
                             </button>
                          </form>

                          <div className="pt-6 border-t border-white/5">
                             <p className="text-[8px] font-bold text-white/10 uppercase text-center tracking-[0.5em]">CryptonBet System • ID: {user.id.toUpperCase()}</p>
                          </div>
                       </motion.div>
                    )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      </div>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          className={`fixed top-6 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl z-[1000] border flex items-center gap-3 ${
            feedback.toLowerCase().includes('erro') || feedback.toLowerCase().includes('falha') || feedback.toLowerCase().includes('inválid') || feedback.toLowerCase().includes('rejeitad') || feedback.toLowerCase().includes('recusad') || feedback.toLowerCase().includes('insuficiente') || feedback.toLowerCase().includes('mínimo') || feedback.includes('❌') || feedback.includes('⚠️')
              ? 'bg-rose-600 text-white shadow-rose-600/30 border-rose-400/40'
              : 'bg-[#049444] text-white shadow-[#049444]/20 border-white/20'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.toLowerCase().includes('erro') || feedback.toLowerCase().includes('falha') || feedback.toLowerCase().includes('inválid') || feedback.toLowerCase().includes('rejeitad') || feedback.toLowerCase().includes('recusad') || feedback.toLowerCase().includes('insuficiente') || feedback.toLowerCase().includes('mínimo') || feedback.includes('❌') || feedback.includes('⚠️') ? (
              <AlertCircle className="w-5 h-5 shrink-0 text-white animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="max-w-md text-left leading-tight font-bold">{feedback}</span>
          </div>
        </motion.div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
          <div className="bg-[#131d27] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#FFCC00]" /> Editar Preço do Produto
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-white/60 mb-1 font-bold uppercase truncate">{editingProduct.title}</p>
              <p className="text-[10px] text-white/40">Defina o novo preço unitário para este produto no mercado (em USDT).</p>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase block">Novo Preço (USDT)</label>
              <input
                type="number"
                step="0.01"
                value={editPriceVal}
                onChange={(e) => setEditPriceVal(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm font-mono font-bold outline-none focus:border-[#049444]"
                placeholder="Ex: 10.00"
              />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProductPrice}
                className="px-6 py-2.5 rounded-xl bg-[#049444] hover:bg-[#037235] text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Guardar Preço
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileView;

