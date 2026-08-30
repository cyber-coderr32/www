import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount, TransactionRequest, GlobalSettings, PaymentMethod, P2POffer, AppNotification, ViewState } from '../types';
import { soundService } from '../services/soundService';
import { notificationService } from '../services/notificationService';
import { caktoService } from '../services/caktoService';
import { plisioService, SUPPORTED_PLISIO_CRYPTOS } from '../services/plisioService';
import { userService } from '../services/userService';
import { db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, query, limit, deleteDoc } from 'firebase/firestore';
import AudioVoiceRecorder from '../components/AudioVoiceRecorder';
import AudioVoicePlayer from '../components/AudioVoicePlayer';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Wallet, 
  CreditCard, 
  Cpu, 
  Megaphone, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  BookOpen, 
  RefreshCw, 
  Sliders, 
  Eye, 
  DollarSign, 
  AlertTriangle, 
  Zap, 
  Sparkles,
  ChevronRight,
  LogOut,
  Radio,
  FileText,
  AlertCircle,
  Filter,
  Calendar,
  Clock,
  ArrowUpDown,
  Check,
  X,
  Copy,
  ExternalLink,
  Inbox,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  CheckCheck,
  Bell,
  Send,
  Mic,
  Gift,
  Volume2,
  Coins
} from 'lucide-react';

interface AdminViewProps {
  onBack: () => void;
}

type AdminTab = 'DASHBOARD' | 'USERS' | 'NOTIFICATIONS' | 'FINANCE' | 'PAYMENTS' | 'ENGINE' | 'P2P_MARKET';

type TransTypeFilter = 'ALL' | 'DEPOSIT' | 'WITHDRAW';
type TransStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type TransDateFilter = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';
type TransSortOption = 'RECENT_FIRST' | 'OLDEST_FIRST' | 'HIGHEST_AMOUNT' | 'LOWEST_AMOUNT';

// Helper to safely parse various date string representations
const parseTransactionDate = (tsStr?: string): Date | null => {
  if (!tsStr) return null;
  if (/^\d+$/.test(tsStr)) {
    return new Date(Number(tsStr));
  }
  const ptMatch = tsStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ptMatch) {
    const day = parseInt(ptMatch[1], 10);
    const month = parseInt(ptMatch[2], 10) - 1;
    const year = parseInt(ptMatch[3], 10);
    const hour = ptMatch[4] ? parseInt(ptMatch[4], 10) : 0;
    const min = ptMatch[5] ? parseInt(ptMatch[5], 10) : 0;
    const sec = ptMatch[6] ? parseInt(ptMatch[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }
  const parsed = Date.parse(tsStr);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  return null;
};

// Helper for relative time description in Portuguese
const getRelativeTime = (tsStr?: string): string => {
  const date = parseTransactionDate(tsStr);
  if (!date) return tsStr || 'Recente';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return '⚡ Agora mesmo';
  if (diffSec < 3600) return `Há ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Há ${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 172800) return 'Ontem';
  const days = Math.floor(diffSec / 86400);
  return `Há ${days} ${days === 1 ? 'dia' : 'dias'}`;
};

const LOCAL_USERS_KEY = 'skyhigh_users';
const LOCAL_TRANS_KEY = 'skyhigh_transactions';
const LOCAL_SETTINGS_KEY = 'skyhigh_settings';

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRequest[]>([]);
  const [p2pOffers, setP2POffers] = useState<P2POffer[]>([]);
  
  const [settings, setSettings] = useState<GlobalSettings>({
    siteName: 'CryptonBet Angola',
    maintenanceMode: false,
    globalRtp: 95,
    baitingMode: true,
    houseAdvantageLevel: 'MEDIUM',
    fakeWinnersEnabled: true,
    maxRoundPayback: 500000,
    forcedAviatorMultiplier: null,
    globalNotification: '⚡ Bónus Especial de Depósito: Receba 100% de Bónus no seu primeiro depósito via Multicaixa Express!',
    totalVolume: 4250000,
    totalPaid: 3120000,
    paymentMethods: [
      {
        id: 'usdt_trc20',
        name: 'USDT (TRC-20 Cripto)',
        type: 'CRYPTO',
        icon: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=100&q=80',
        account: 'TYd8S1kX9aPz2mQqR4vW7tL0uJ3bC5nE',
        details: 'Rede TRON (TRC20) • Depósito manual sem taxas',
        isActive: true,
        minDeposit: 10,
        maxWithdraw: 50000,
        cryptoType: 'USDT',
        cryptoNetwork: 'TRC20'
      },
      {
        id: 'pix_cakto',
        name: 'PIX Automático (Brasil)',
        type: 'PIX',
        icon: 'https://images.unsplash.com/photo-1613243555988-441166d4d6fd?auto=format&fit=crop&w=100&q=80',
        account: 'pix@cryptonbet.com',
        details: 'Depósito instantâneo via PIX com aprovação em tempo real',
        isActive: true,
        minDeposit: 5,
        maxWithdraw: 50000
      },
      {
        id: 'unitel_money',
        name: 'Unitel Money',
        type: 'UNITEL_MONEY',
        icon: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=100&q=80',
        account: '923000000',
        details: 'Pagamento via Unitel Money (Entidade e Referência)',
        isActive: true,
        minDeposit: 500,
        maxWithdraw: 500000,
        entityNumber: '00123',
        referenceNumber: '923000000'
      },
      {
        id: 'multicaixa_express',
        name: 'Multicaixa Express',
        type: 'BANK',
        icon: 'https://www.emisu.co.ao/static/logo-emisu-multicaixa-express.png',
        account: 'AO06 0000 0000 0000 0000 0',
        details: 'Transferência Bancária / Multicaixa Express',
        isActive: true,
        minDeposit: 500,
        maxWithdraw: 500000
      }
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
    }
  });

  const [editingMethod, setEditingMethod] = useState<Partial<PaymentMethod> | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [searchTrans, setSearchTrans] = useState('');
  const [transTypeFilter, setTransTypeFilter] = useState<TransTypeFilter>('ALL');
  const [transStatusFilter, setTransStatusFilter] = useState<TransStatusFilter>('ALL');
  const [transDateFilter, setTransDateFilter] = useState<TransDateFilter>('ALL');
  const [transMethodFilter, setTransMethodFilter] = useState<string>('ALL');
  const [transSort, setTransSort] = useState<TransSortOption>('RECENT_FIRST');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserAccount | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('Ajuste Administrativo');

  // User Deletion State & Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserTransactions, setDeleteUserTransactions] = useState(true);

  // Notification Management State (Collective & Individual)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifTarget, setNotifTarget] = useState<'ALL' | 'INDIVIDUAL'>('ALL');
  const [selectedTargetUser, setSelectedTargetUser] = useState<UserAccount | null>(null);
  const [notifSearchUserText, setNotifSearchUserText] = useState('');
  const [notifType, setNotifType] = useState<AppNotification['type']>('BONUS');
  const [notifPriority, setNotifPriority] = useState<AppNotification['priority']>('HIGH');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifActionView, setNotifActionView] = useState<ViewState | ''>('');
  const [notifActionText, setNotifActionText] = useState('');
  const [notifAudioUrl, setNotifAudioUrl] = useState<string | null>(null);
  const [notifAudioDuration, setNotifAudioDuration] = useState<number>(0);
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifFilterTab, setNotifFilterTab] = useState<'ALL' | 'BROADCAST' | 'INDIVIDUAL'>('ALL');

  useEffect(() => {
    const unsub = notificationService.subscribeToNotifications((list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, []);

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert("Por favor, preencha o título e a mensagem da notificação.");
      return;
    }

    if (notifTarget === 'INDIVIDUAL' && !selectedTargetUser) {
      alert("Por favor, selecione um usuário específico para enviar a notificação individual.");
      return;
    }

    setIsSendingNotif(true);
    soundService.playUISelect();

    try {
      await notificationService.sendNotification({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
        target: notifTarget === 'ALL' ? 'ALL' : selectedTargetUser!.id,
        targetUserId: notifTarget === 'INDIVIDUAL' ? selectedTargetUser!.id : undefined,
        targetUserName: notifTarget === 'INDIVIDUAL' ? selectedTargetUser!.name : undefined,
        targetUserEmail: notifTarget === 'INDIVIDUAL' ? selectedTargetUser!.email : undefined,
        senderName: 'Administração CryptonBet',
        priority: notifPriority,
        actionView: notifActionView ? (notifActionView as ViewState) : undefined,
        actionText: notifActionText.trim() || undefined,
        audioUrl: notifAudioUrl || undefined,
        audioDuration: notifAudioDuration || undefined
      });

      soundService.playWin();
      showNotification(
        notifTarget === 'ALL'
          ? `📢 Notificação coletiva enviada para TODOS os jogadores!`
          : `👤 Notificação individual enviada para ${selectedTargetUser!.name}!`
      );

      setNotifTitle('');
      setNotifMessage('');
      setNotifAudioUrl(null);
      setNotifAudioDuration(0);
      if (notifTarget === 'INDIVIDUAL') {
        setSelectedTargetUser(null);
      }
    } catch (e: any) {
      soundService.playCrash();
      showNotification(`Erro ao enviar notificação: ${e.message}`);
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    soundService.playCrash();
    setNotifications(prev => prev.filter(n => n.id !== id));
    await notificationService.deleteNotification(id);
    showNotification("✅ Notificação eliminada com sucesso!");
  };

  const handleDeleteAllFilteredNotifs = async () => {
    const currentFiltered = notifications.filter(n => {
      if (notifFilterTab === 'BROADCAST') return n.target === 'ALL';
      if (notifFilterTab === 'INDIVIDUAL') return n.target !== 'ALL';
      return true;
    });

    if (currentFiltered.length === 0) return;
    if (!window.confirm(`Deseja realmente eliminar todas as ${currentFiltered.length} notificações deste filtro?`)) return;

    const idsToDelete = currentFiltered.map(n => n.id);
    const idsSet = new Set(idsToDelete);

    soundService.playCrash();
    setNotifications(prev => prev.filter(n => !idsSet.has(n.id)));
    await notificationService.deleteAllNotifications(idsToDelete);
    showNotification(`✅ ${currentFiltered.length} notificações eliminadas com sucesso!`);
  };

  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchWebhookLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await caktoService.getWebhookLogs();
      if (res.status === 'success') {
        setWebhookLogs(res.logs || []);
      }
    } catch (e) {
      console.warn("Erro ao buscar logs do webhook:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    await caktoService.clearWebhookLogs();
    setWebhookLogs([]);
    showNotification("✅ Logs de Webhook limpos com sucesso!");
  };

  const handleSimulateWebhook = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await caktoService.simulateWebhook();
      if (res.status === 'success') {
        showNotification("⚡ Webhook simulado gerado e registrado!");
        await fetchWebhookLogs();
      }
    } catch (e) {
      showNotification("Erro ao simular webhook.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Load initial data from Firestore & LocalStorage
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
        if (!usersSnap.empty) {
          const firestoreUsers: UserAccount[] = usersSnap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.displayName || data.name || 'Jogador',
              email: data.email || '',
              phone: data.phone || '',
              balance: data.balance !== undefined ? Number(data.balance) : 0,
              role: data.role || 'USER',
              isBanned: data.isBanned || false,
              joinedAt: data.joinedAt || new Date().toISOString(),
              bio: data.bio || '',
              avatarColor: data.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]',
              whatsapp: data.whatsapp || ''
            };
          });
          
          // Merge local and firestore users
          const combined = [...firestoreUsers];
          localUsers.forEach((lu: UserAccount) => {
            if (!combined.some(c => c.id === lu.id)) {
              combined.push(lu);
            }
          });
          setUsers(combined);
        } else {
          setUsers(localUsers);
        }
      } catch (e) {
        console.warn("Firestore users query failed, using local storage", e);
        setUsers(localUsers);
      }

      // 2. Fetch Transactions
      const localTrans = JSON.parse(localStorage.getItem(LOCAL_TRANS_KEY) || '[]');
      try {
        const transSnap = await getDocs(query(collection(db, 'transactions'), limit(100)));
        if (!transSnap.empty) {
          const fsTrans = transSnap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRequest));
          setTransactions(fsTrans);
        } else {
          setTransactions(localTrans);
        }
      } catch (e) {
        setTransactions(localTrans);
      }

      // 3. Settings
      const savedSettings = JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || 'null');
      if (savedSettings) {
        if (!savedSettings.paymentMethods?.some((m: any) => m.type === 'PIX' || m.id === 'pix_cakto')) {
          savedSettings.paymentMethods = [
            ...(savedSettings.paymentMethods || []),
            { id: 'pix_cakto', name: 'PIX Automático (Brasil)', type: 'PIX', account: 'pix@cryptonbet.com', icon: 'https://images.unsplash.com/photo-1613243555988-441166d4d6fd?auto=format&fit=crop&w=100&q=80', isActive: true, minDeposit: 5, maxWithdraw: 50000, details: 'Depósito instantâneo via PIX com aprovação em tempo real' }
          ];
        } else if (savedSettings.paymentMethods) {
          savedSettings.paymentMethods = savedSettings.paymentMethods.map((m: any) => {
            if (m.type === 'PIX' || m.id === 'pix_cakto' || (m.name && m.name.toLowerCase().includes('cakto'))) {
              return {
                ...m,
                name: 'PIX Automático (Brasil)',
                details: 'Depósito instantâneo via PIX com aprovação em tempo real'
              };
            }
            return m;
          });
        }
        if (!savedSettings.cakto) {
          savedSettings.cakto = {
            enabled: true,
            apiToken: '',
            clientSecret: '',
            webhookSecret: '',
            pixKey: 'pix@cryptonbet.com',
            receiverName: 'CryptonBet Brasil',
            exchangeRate: 5.85,
            environment: 'sandbox'
          };
        }
        setSettings(prev => ({ ...prev, ...savedSettings }));
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchWebhookLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'PAYMENTS') {
      fetchWebhookLogs();
      const interval = setInterval(fetchWebhookLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const saveSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(newSettings));
    showNotification("Definições do Sistema Atualizadas com Sucesso!");
    soundService.playWin();
  };

  const updateUsersState = (newUsers: UserAccount[]) => {
    setUsers(newUsers);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(newUsers));
  };

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const [payoutLoadingId, setPayoutLoadingId] = useState<string | null>(null);

  // Execute Plisio Automated Crypto Payout
  const handleExecutePlisioPayout = async (trans: TransactionRequest) => {
    setPayoutLoadingId(trans.id);
    soundService.playUISelect();
    try {
      // Extract target wallet address from accountDetails or walletAddress
      let destinationWallet = trans.walletAddress || '';
      if (!destinationWallet && trans.accountDetails) {
        const match = trans.accountDetails.match(/(?:Destino|Carteira|Wallet|Address):\s*([a-zA-Z0-9_-]+)/i);
        destinationWallet = match ? match[1] : trans.accountDetails.trim();
      }

      const currency = trans.cryptoCurrency || (trans.method.includes('TON') ? 'USDT_TON' : trans.method.includes('BSC') ? 'USDT_BSC' : trans.method.includes('ETH') ? 'USDT_ETH' : 'USDT_TRX');

      const res = await plisioService.requestWithdrawal({
        amount: trans.amount,
        currency: currency,
        toAddress: destinationWallet || 'TRX_DEFAULT_USER_WALLET',
        userId: trans.userId
      });

      if (res.status === 'success' && res.data) {
        const txUrl = res.data.tx_url || (currency.includes('TRX') ? `https://tronscan.org/#/transaction/${res.data.txn_id || res.data.id}` : '');
        const updatedTrans = transactions.map(t => t.id === trans.id ? {
          ...t,
          status: 'APPROVED' as const,
          txUrl: txUrl,
          txHash: res.data?.txn_id || res.data?.id,
          payoutId: res.data?.id,
          isAutomaticPayout: true
        } : t);

        setTransactions(updatedTrans);
        localStorage.setItem(LOCAL_TRANS_KEY, JSON.stringify(updatedTrans));
        
        try {
          await updateDoc(doc(db, 'transactions', trans.id), {
            status: 'APPROVED',
            txUrl: txUrl,
            txHash: res.data?.txn_id || res.data?.id,
            isAutomaticPayout: true
          });
        } catch (e) {
          // ignore
        }

        soundService.playWin();
        showNotification(`⚡ Saque de ${trans.amount.toFixed(2)} USDT enviado com sucesso para a Blockchain via Plisio!`);
      } else {
        showNotification(`❌ Erro no saque automático Plisio: ${res.message || 'Falha na comunicação'}`);
        soundService.playCrash();
      }
    } catch (e: any) {
      showNotification(`Erro: ${e.message}`);
      soundService.playCrash();
    } finally {
      setPayoutLoadingId(null);
    }
  };

  // Resolve Deposit / Withdrawal Request
  const handleResolveTransaction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const trans = transactions.find(t => t.id === id);
    if (!trans) return;

    if (status === 'APPROVED') {
      const userToUpdate = users.find(u => u.id === trans.userId);
      if (userToUpdate) {
        // If deposit, credit user balance
        if (trans.type === 'DEPOSIT') {
          const newBalance = Math.max(0, userToUpdate.balance + trans.amount);
          const updatedUsers = users.map(u => u.id === trans.userId ? { ...u, balance: newBalance } : u);
          updateUsersState(updatedUsers);

          try {
            await updateDoc(doc(db, 'users', trans.userId), { balance: newBalance });
          } catch (e) {
            console.warn("Firestore update failed, saved locally.");
          }
        }
      }
    } else if (status === 'REJECTED' && trans.type === 'WITHDRAW') {
      // Refund balance to user if withdrawal was rejected
      let newBalance = trans.amount;
      const userToUpdate = users.find(u => u.id === trans.userId);
      if (userToUpdate) {
        newBalance = Math.max(0, userToUpdate.balance + trans.amount);
        const updatedUsers = users.map(u => u.id === trans.userId ? { ...u, balance: newBalance } : u);
        updateUsersState(updatedUsers);
      } else {
        // Fallback to local users storage
        try {
          const localUsers: UserAccount[] = JSON.parse(localStorage.getItem('skyhigh_users') || '[]');
          const target = localUsers.find(u => u.id === trans.userId);
          if (target) {
            newBalance = Math.max(0, target.balance + trans.amount);
            target.balance = newBalance;
            localStorage.setItem('skyhigh_users', JSON.stringify(localUsers));
          }
        } catch (e) {}
      }

      // Check if current user in local storage is this user
      try {
        const localCurrent = JSON.parse(localStorage.getItem('skyhigh_user') || 'null');
        if (localCurrent && localCurrent.id === trans.userId) {
          localCurrent.balance = Math.max(0, (localCurrent.balance || 0) + trans.amount);
          localStorage.setItem('skyhigh_user', JSON.stringify(localCurrent));
        }
      } catch (e) {}

      // Update Firestore user document
      try {
        await updateDoc(doc(db, 'users', trans.userId), { balance: newBalance });
      } catch (e) {
        console.warn("Firestore user balance update failed, saved locally.");
      }
    }

    const updatedTrans = transactions.map(t => t.id === id ? { 
      ...t, 
      status, 
      rejectionReason: status === 'REJECTED' ? 'Rejeitado e Estornado pelo Administrador' : t.rejectionReason 
    } : t);
    setTransactions(updatedTrans);
    localStorage.setItem(LOCAL_TRANS_KEY, JSON.stringify(updatedTrans));

    try {
      await updateDoc(doc(db, 'transactions', id), { 
        status,
        rejectionReason: status === 'REJECTED' ? 'Rejeitado e Estornado pelo Administrador' : ''
      });
    } catch (e) {
      // ignore
    }

    soundService.playTick();
    showNotification(`Transação #${id.substring(0, 6)} ${status === 'APPROVED' ? 'Aprovada' : 'Rejeitada e Estornada (+ ' + trans.amount.toFixed(2) + ' USDT devolvidos)'}!`);
  };

  // Direct Credit / Debit User Balance Kz
  const handleManualCredit = async () => {
    if (!selectedUserForCredit || !creditAmount || isNaN(Number(creditAmount))) {
      alert("Por favor, introduza um valor válido em Kwanza.");
      return;
    }

    const delta = Number(creditAmount);
    const newBalance = Math.max(0, selectedUserForCredit.balance + delta);
    const updatedUsers = users.map(u => u.id === selectedUserForCredit.id ? { ...u, balance: newBalance } : u);
    updateUsersState(updatedUsers);

    // Add manual record
    const newTrans: TransactionRequest = {
      id: 'tx_manual_' + Date.now(),
      userId: selectedUserForCredit.id,
      userName: selectedUserForCredit.name,
      type: delta >= 0 ? 'DEPOSIT' : 'WITHDRAW',
      amount: Math.abs(delta),
      method: `Ajuste Admin (${creditReason})`,
      status: 'APPROVED',
      timestamp: new Date().toLocaleString('pt-AO')
    };

    const updatedTrans = [newTrans, ...transactions];
    setTransactions(updatedTrans);
    localStorage.setItem(LOCAL_TRANS_KEY, JSON.stringify(updatedTrans));

    try {
      await updateDoc(doc(db, 'users', selectedUserForCredit.id), { balance: newBalance });
    } catch (e) {
      // fallback
    }

    soundService.playWin();
    showNotification(`Saldo de ${selectedUserForCredit.name} atualizado para ${newBalance.toLocaleString('pt-AO')} Kz!`);
    setSelectedUserForCredit(null);
    setCreditAmount('');
  };

  // Toggle Ban / Unban User
  const handleToggleBanUser = async (user: UserAccount) => {
    const updated = users.map(u => u.id === user.id ? { ...u, isBanned: !u.isBanned } : u);
    updateUsersState(updated);

    try {
      await updateDoc(doc(db, 'users', user.id), { isBanned: !user.isBanned });
    } catch (e) {
      // fallback
    }

    soundService.playCrash();
    showNotification(`Usuário ${user.name} ${!user.isBanned ? 'BANIDO' : 'DESBANIDO'} com sucesso!`);
  };

  // Toggle Role (USER <-> ADMIN)
  const handleToggleRole = async (user: UserAccount) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const updated = users.map(u => u.id === user.id ? { ...u, role: newRole as 'USER' | 'ADMIN' } : u);
    updateUsersState(updated);

    try {
      await updateDoc(doc(db, 'users', user.id), { role: newRole });
    } catch (e) {
      // fallback
    }

    soundService.playWin();
    showNotification(`Função de ${user.name} alterada para ${newRole}!`);
  };

  // Delete User - Open Modal
  const handleDeleteUser = (user: UserAccount) => {
    soundService.playUISelect();
    setUserToDelete(user);
  };

  // Confirm Delete User - Full Execution
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    soundService.playCrash();

    try {
      const targetId = userToDelete.id;
      const targetName = userToDelete.name;

      // 1. Delete user from userService (Firestore & LocalStorage)
      await userService.deleteUserProfile(targetId);

      // 2. Update local state for users list
      const updatedUsers = users.filter(u => u.id !== targetId);
      updateUsersState(updatedUsers);

      // 3. Delete related transactions if selected
      if (deleteUserTransactions) {
        const remainingTrans = transactions.filter(t => t.userId !== targetId);
        setTransactions(remainingTrans);
        localStorage.setItem(LOCAL_TRANS_KEY, JSON.stringify(remainingTrans));

        const transToDelete = transactions.filter(t => t.userId === targetId);
        for (const t of transToDelete) {
          try {
            await deleteDoc(doc(db, 'transactions', t.id));
          } catch (err) {}
        }
      }

      showNotification(`✅ Usuário "${targetName}" e seus dados foram eliminados permanentemente!`);
      setUserToDelete(null);
    } catch (err: any) {
      soundService.playCrash();
      showNotification(`❌ Erro ao eliminar usuário: ${err.message || 'Falha na operação'}`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Delete Payment Method
  const handleDeletePaymentMethod = (m: PaymentMethod) => {
    if (!window.confirm(`Tem certeza que deseja eliminar a forma de pagamento "${m.name}"?`)) {
      return;
    }
    const filtered = settings.paymentMethods.filter(item => item.id !== m.id);
    saveSettings({ ...settings, paymentMethods: filtered });
    if (editingMethod?.id === m.id) {
      setEditingMethod(null);
    }
    soundService.playCrash();
    showNotification(`Canal "${m.name}" removido com sucesso!`);
  };

  // Toggle Payment Method Active Status
  const handleTogglePaymentMethodStatus = (m: PaymentMethod) => {
    const updated = settings.paymentMethods.map(item =>
      item.id === m.id ? { ...item, isActive: !item.isActive } : item
    );
    saveSettings({ ...settings, paymentMethods: updated });
    soundService.playUISelect();
    showNotification(`Canal "${m.name}" ${!m.isActive ? 'ATIVADO' : 'DESATIVADO'}!`);
  };

  // Save / Add Payment Gateway
  const handleSavePaymentMethod = () => {
    if (!editingMethod?.name || !editingMethod?.account) {
      alert("Por favor, preencha o nome do método e os dados da conta.");
      return;
    }
    const newMethods = [...settings.paymentMethods];
    const index = newMethods.findIndex(m => m.id === editingMethod.id);
    
    if (index >= 0) {
      newMethods[index] = { ...newMethods[index], ...editingMethod } as PaymentMethod;
    } else {
      newMethods.push({
        ...editingMethod,
        id: 'pm_' + Math.random().toString(36).substr(2, 8),
        isActive: editingMethod.isActive !== undefined ? editingMethod.isActive : true,
        minDeposit: editingMethod.minDeposit || 500,
        maxWithdraw: editingMethod.maxWithdraw || 500000
      } as PaymentMethod);
    }
    saveSettings({ ...settings, paymentMethods: newMethods });
    setEditingMethod(null);
  };

  const [plisioBalances, setPlisioBalances] = useState<any | null>(null);
  const [isTestingPlisio, setIsTestingPlisio] = useState(false);

  const handleTestPlisio = async () => {
    setIsTestingPlisio(true);
    soundService.playUISelect();
    showNotification("Testando conexão com Plisio Crypto Gateway...");
    try {
      const res = await plisioService.checkStatus();
      const bal = await plisioService.getAccountBalance();
      setPlisioBalances(bal);
      if (res.configured) {
        soundService.playWin();
        showNotification(`✅ Plisio Conectado com Sucesso! Ambiente: ${res.environment || 'Produção'}`);
      } else {
        soundService.playTick();
        showNotification(`ℹ️ Plisio em Modo Sandbox / Simulação. Defina PLISIO_SECRET_KEY no .env para transações reais na Blockchain.`);
      }
    } catch (e: any) {
      showNotification(`Erro ao testar Plisio: ${e.message}`);
    } finally {
      setIsTestingPlisio(false);
    }
  };

  const handleSimulatePlisioWebhook = async () => {
    soundService.playUISelect();
    showNotification("Disparando webhook de teste Plisio...");
    try {
      const res = await plisioService.simulateWebhook({
        currency: 'USDT_TRX',
        amount: '50.00',
        userId: users[0]?.id || 'admin_test'
      });
      if (res.status === 'success') {
        soundService.playWin();
        showNotification("⚡ Webhook Plisio simulado com sucesso! Saldo creditado e evento registrado.");
        fetchWebhookLogs();
      } else {
        showNotification(`Falha na simulação: ${res.message}`);
      }
    } catch (e: any) {
      showNotification(`Erro: ${e.message}`);
    }
  };

  const handleTestCakto = async () => {
    soundService.playUISelect();
    showNotification("Testando conexão com servidor API Cakto...");
    const res = await caktoService.checkStatus();
    if (res.configured) {
      soundService.playWin();
      showNotification(`✅ Sucesso: ${res.message}`);
    } else {
      soundService.playTick();
      showNotification(`ℹ️ Aviso: ${res.message}`);
    }
  };

  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;
  const pendingDepositsCount = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'PENDING').length;
  const pendingWithdrawalsCount = transactions.filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING').length;

  const approvedDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED').reduce((acc, t) => acc + t.amount, 0);
  const approvedWithdrawals = transactions.filter(t => t.type === 'WITHDRAW' && t.status === 'APPROVED').reduce((acc, t) => acc + t.amount, 0);
  const totalUsersCount = users.length;
  const totalBannedCount = users.filter(u => u.isBanned).length;

  const menuItems = [
    { id: 'DASHBOARD' as AdminTab, label: 'Telemetria & Dashboard', icon: <TrendingUp className="w-5 h-5 text-cyan-400" /> },
    { id: 'USERS' as AdminTab, label: 'Gestão de Jogadores', icon: <Users className="w-5 h-5 text-emerald-400" /> },
    { id: 'NOTIFICATIONS' as AdminTab, label: 'Central de Notificações', icon: <Bell className="w-5 h-5 text-amber-400" />, badge: notifications.length },
    { id: 'FINANCE' as AdminTab, label: 'Aprovação Financeira', icon: <Wallet className="w-5 h-5 text-amber-400" />, badge: pendingCount },
    { id: 'PAYMENTS' as AdminTab, label: 'Métodos de Pagamento', icon: <CreditCard className="w-5 h-5 text-purple-400" /> },
    { id: 'ENGINE' as AdminTab, label: 'Motor & Algoritmos (RTP)', icon: <Cpu className="w-5 h-5 text-red-400" /> },
  ];

  const handleCopyToClipboard = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      soundService.playTick();
      showNotification(`📋 ${label} copiado!`);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (e) {
      showNotification(`Texto: ${text}`);
    }
  };

  const todayTransactionsCount = transactions.filter(t => {
    const d = parseTransactionDate(t.timestamp);
    if (!d) return false;
    return (Date.now() - d.getTime()) <= 24 * 60 * 60 * 1000;
  }).length;

  // Filtered & Sorted Transactions for Finance Tab and Telemetry
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Type
      if (transTypeFilter !== 'ALL' && t.type !== transTypeFilter) return false;

      // 2. Status
      if (transStatusFilter !== 'ALL' && t.status !== transStatusFilter) return false;

      // 3. Method
      if (transMethodFilter !== 'ALL') {
        const m = (t.method || '').toLowerCase();
        if (transMethodFilter === 'CRYPTO' && !m.includes('usdt') && !m.includes('cripto') && !m.includes('plisio') && !m.includes('trc') && !m.includes('ton') && !m.includes('btc')) return false;
        if (transMethodFilter === 'PIX' && !m.includes('pix') && !m.includes('cakto')) return false;
        if (transMethodFilter === 'BANK' && !m.includes('multicaixa') && !m.includes('express') && !m.includes('banc') && !m.includes('bai') && !m.includes('bfa')) return false;
        if (transMethodFilter === 'UNITEL' && !m.includes('unitel')) return false;
        if (transMethodFilter === 'ADMIN' && !m.includes('admin') && !m.includes('ajuste')) return false;
      }

      // 4. Date filter
      if (transDateFilter !== 'ALL') {
        const date = parseTransactionDate(t.timestamp);
        if (date) {
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (transDateFilter === 'TODAY' && diffDays > 1) return false;
          if (transDateFilter === 'LAST_7_DAYS' && diffDays > 7) return false;
          if (transDateFilter === 'LAST_30_DAYS' && diffDays > 30) return false;
        }
      }

      // 5. Text search query
      if (searchTrans.trim()) {
        const q = searchTrans.toLowerCase().trim();
        const matchName = (t.userName || '').toLowerCase().includes(q);
        const matchUserId = (t.userId || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        const matchMethod = (t.method || '').toLowerCase().includes(q);
        const matchDetails = (t.accountDetails || '').toLowerCase().includes(q);
        const matchTx = (t.txHash || '').toLowerCase().includes(q);
        const matchAmount = String(t.amount).includes(q);
        if (!matchName && !matchUserId && !matchId && !matchMethod && !matchDetails && !matchTx && !matchAmount) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (transSort === 'HIGHEST_AMOUNT') return b.amount - a.amount;
      if (transSort === 'LOWEST_AMOUNT') return a.amount - b.amount;
      const dateA = parseTransactionDate(a.timestamp)?.getTime() || 0;
      const dateB = parseTransactionDate(b.timestamp)?.getTime() || 0;
      if (transSort === 'OLDEST_FIRST') return dateA - dateB;
      return dateB - dateA; // RECENT_FIRST is default
    });
  }, [transactions, transTypeFilter, transStatusFilter, transDateFilter, transMethodFilter, transSort, searchTrans]);

  const filteredTotalVolume = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const filteredDepositsVolume = filteredTransactions.filter(t => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
  const filteredWithdrawalsVolume = filteredTransactions.filter(t => t.type === 'WITHDRAW').reduce((acc, t) => acc + t.amount, 0);
  const filteredPendingCount = filteredTransactions.filter(t => t.status === 'PENDING').length;

  const isFilterActive = transTypeFilter !== 'ALL' || transStatusFilter !== 'ALL' || transDateFilter !== 'ALL' || transMethodFilter !== 'ALL' || searchTrans.trim() !== '' || transSort !== 'RECENT_FIRST';

  const clearAllTransFilters = () => {
    setTransTypeFilter('ALL');
    setTransStatusFilter('ALL');
    setTransDateFilter('ALL');
    setTransMethodFilter('ALL');
    setTransSort('RECENT_FIRST');
    setSearchTrans('');
    soundService.playUISelect();
    showNotification('Filtros limpos com sucesso!');
  };

  return (
    <div className="h-full flex bg-[#03060a] text-slate-100 font-sans overflow-hidden relative selection:bg-[#049444] selection:text-white">
      
      {/* BACKGROUND FUTURISTIC GRID */}
      <div className="absolute inset-0 bg-[radial-gradient(#049444_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      
      {/* STATUS TOAST NOTIFICATION */}
      {statusMessage && (
        <div className={`fixed top-5 right-5 z-[250] text-white px-6 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          statusMessage.toLowerCase().includes('erro') || statusMessage.toLowerCase().includes('falha') || statusMessage.toLowerCase().includes('inválid') || statusMessage.toLowerCase().includes('rejeitad') || statusMessage.includes('❌') || statusMessage.includes('⚠️')
            ? 'bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-600/40 border-rose-400/40'
            : statusMessage.toLowerCase().includes('aviso') || statusMessage.includes('ℹ️')
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-600/40 border-amber-400/40'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/40 border-emerald-400/40'
        }`}>
          {statusMessage.toLowerCase().includes('erro') || statusMessage.toLowerCase().includes('falha') || statusMessage.toLowerCase().includes('inválid') || statusMessage.includes('❌') || statusMessage.includes('⚠️') ? (
            <AlertCircle className="w-5 h-5 text-white shrink-0 animate-pulse" />
          ) : (
            <Sparkles className="w-5 h-5 text-yellow-300 animate-spin shrink-0" />
          )}
          <span className="font-black text-xs uppercase tracking-wider max-w-md leading-tight">{statusMessage}</span>
        </div>
      )}

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[160] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed lg:relative top-0 left-0 h-full bg-[#090e17]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[170] transition-transform duration-300 w-72 shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* LOGO AREA */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0">
              <ShieldCheck className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="font-black italic tracking-tighter text-lg leading-none text-white">
                CRYPTON<span className="text-amber-400">ADMIN</span>
              </h1>
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Painel Futuro v3.5
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* MENU ITEMS */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                soundService.playUISelect();
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer font-black uppercase text-xs tracking-wider group relative ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-[#049444] to-emerald-600 text-white shadow-[0_0_25px_rgba(4,148,68,0.4)] border border-emerald-400/30' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </div>

              {item.id === 'NOTIFICATIONS' && notifications.length > 0 && (
                <span className="bg-amber-500 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                  {notifications.length}
                </span>
              )}

              {item.id === 'FINANCE' && pendingCount > 0 && (
                <span className="bg-amber-500 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* EXIT BUTTON */}
        <div className="p-4 border-t border-white/10 bg-black/40">
          <button 
            onClick={() => {
              soundService.playUISelect();
              onBack();
            }} 
            className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* HEADER BAR */}
        <header className="h-16 lg:h-20 bg-[#090e17]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-slate-300 hover:text-white bg-white/5 rounded-xl border border-white/10 cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Sliders className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm lg:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>{menuItems.find(i => i.id === activeTab)?.label}</span>
              </h2>
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest hidden sm:block">
                Controlo em Tempo Real • Acesso Exclusivo: alfaajmc@atend.com
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
              title="Atualizar Dados"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>SISTEMA ATIVO</span>
            </div>
          </div>
        </header>

        {/* WORKSPACE BODY SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 no-scrollbar pb-24 lg:pb-12">
          
          {/* TAB 1: TELEMETRY DASHBOARD */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* TOP SUMMARY METRICS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-[#0e1622] p-5 rounded-3xl border border-emerald-500/30 shadow-xl relative overflow-hidden group hover:border-emerald-400 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      Volume Bruto Depósitos
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-white">
                    {approvedDeposits.toLocaleString('pt-AO')} <span className="text-xs font-sans text-emerald-400">Kz</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold mt-2">
                    Depósitos liquidados na plataforma
                  </p>
                </div>

                <div className="bg-[#0e1622] p-5 rounded-3xl border border-red-500/30 shadow-xl relative overflow-hidden group hover:border-red-400 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                      Total Levantamentos Pagos
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                      <ArrowDownLeft className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-white">
                    {approvedWithdrawals.toLocaleString('pt-AO')} <span className="text-xs font-sans text-red-400">Kz</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold mt-2">
                    Pagamentos efetuados aos jogadores
                  </p>
                </div>

                <div className="bg-[#0e1622] p-5 rounded-3xl border border-yellow-500/30 shadow-xl relative overflow-hidden group hover:border-yellow-400 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                      Lucro Líquido Retido
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-[#FFCC00]">
                    {(approvedDeposits - approvedWithdrawals).toLocaleString('pt-AO')} <span className="text-xs font-sans text-yellow-400">Kz</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold mt-2">
                    Margem líquida da casa de aposta
                  </p>
                </div>

                <div className="bg-[#0e1622] p-5 rounded-3xl border border-purple-500/30 shadow-xl relative overflow-hidden group hover:border-purple-400 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                      Usuários Registrados
                    </span>
                    <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-white">
                    {totalUsersCount} <span className="text-xs font-sans text-purple-400">Pilotos</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold mt-2">
                    {totalBannedCount} usuários atualmente banidos
                  </p>
                </div>

              </div>

              {/* ACTION COMMAND CENTER */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* QUICK SYSTEM CONTROLS */}
                <div className="bg-[#090e17] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-2 border-b border-white/10 pb-3">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>Ações Rápidas de Emergência</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs text-white">Modo de Manutenção Geral</h4>
                        <p className="text-[10px] text-slate-400">Bloqueia acesso a usuários normais</p>
                      </div>
                      <button
                        onClick={() => saveSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                          settings.maintenanceMode 
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {settings.maintenanceMode ? 'ATIVADO' : 'DESATIVADO'}
                      </button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs text-white">Modo Isca (Baiting Mode)</h4>
                        <p className="text-[10px] text-slate-400">Aumenta taxa de ganho no modo demo</p>
                      </div>
                      <button
                        onClick={() => saveSettings({ ...settings, baitingMode: !settings.baitingMode })}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                          settings.baitingMode 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {settings.baitingMode ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs text-white">Ganhadores Fictícios na Home</h4>
                        <p className="text-[10px] text-slate-400">Exibe ticker de vitórias em tempo real</p>
                      </div>
                      <button
                        onClick={() => saveSettings({ ...settings, fakeWinnersEnabled: !settings.fakeWinnersEnabled })}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                          settings.fakeWinnersEnabled 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {settings.fakeWinnersEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ANNOUNCEMENT MESSAGE BANNER EDIT */}
                <div className="bg-[#090e17] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-2 border-b border-white/10 pb-3">
                    <Megaphone className="w-4 h-4 text-blue-400" />
                    <span>Mensagem de Anúncio Global</span>
                  </h3>

                  <div className="space-y-3">
                    <textarea
                      value={settings.globalNotification || ''}
                      onChange={(e) => setSettings({ ...settings, globalNotification: e.target.value })}
                      placeholder="Ex: Bónus de 100% no primeiro depósito deste fim de semana!"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-[#049444] h-28 no-scrollbar resize-none font-medium"
                    />

                    <button
                      onClick={() => saveSettings(settings)}
                      className="w-full py-3 bg-gradient-to-r from-[#049444] to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
                    >
                      Publicar Anúncio no Topo da Plataforma
                    </button>
                  </div>
                </div>

              </div>

              {/* RECENT DEPOSITS & WITHDRAWALS TELEMETRY MONITOR (DASHBOARD) */}
              <div className="bg-[#090e17] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Monitor de Pedidos Recentes (Depósitos & Saques)</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Visualização rápida dos últimos fluxos com acesso instantâneo aos filtros
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                      <button
                        onClick={() => {
                          setTransTypeFilter('ALL');
                          setTransStatusFilter('PENDING');
                          setActiveTab('FINANCE');
                          soundService.playUISelect();
                        }}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>{pendingCount} Pendentes</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setActiveTab('FINANCE');
                        soundService.playUISelect();
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span>Abrir Gestão Financeira</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick links & recent 4 transactions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => {
                      setTransTypeFilter('DEPOSIT');
                      setTransStatusFilter('PENDING');
                      setActiveTab('FINANCE');
                      soundService.playUISelect();
                    }}
                    className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Novos Depósitos</span>
                      <span className="text-xs">📥</span>
                    </div>
                    <div className="text-xl font-black font-mono text-white mt-1">
                      {pendingDepositsCount} <span className="text-[10px] text-emerald-400 font-sans">aguardando</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium mt-1 group-hover:text-emerald-300 flex items-center gap-1">
                      <span>Filtrar depósitos</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setTransTypeFilter('WITHDRAW');
                      setTransStatusFilter('PENDING');
                      setActiveTab('FINANCE');
                      soundService.playUISelect();
                    }}
                    className="p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">Novos Saques</span>
                      <span className="text-xs">📤</span>
                    </div>
                    <div className="text-xl font-black font-mono text-white mt-1">
                      {pendingWithdrawalsCount} <span className="text-[10px] text-red-400 font-sans">aguardando</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium mt-1 group-hover:text-red-300 flex items-center gap-1">
                      <span>Filtrar saques</span>
                      <ArrowDownLeft className="w-3 h-3" />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setTransDateFilter('TODAY');
                      setTransTypeFilter('ALL');
                      setTransStatusFilter('ALL');
                      setActiveTab('FINANCE');
                      soundService.playUISelect();
                    }}
                    className="p-3.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Pedidos de Hoje</span>
                      <span className="text-xs">🕒</span>
                    </div>
                    <div className="text-xl font-black font-mono text-white mt-1">
                      {todayTransactionsCount} <span className="text-[10px] text-blue-400 font-sans">registados</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium mt-1 group-hover:text-blue-300 flex items-center gap-1">
                      <span>Ver últimas 24h</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setTransTypeFilter('ALL');
                      setTransStatusFilter('ALL');
                      setTransDateFilter('ALL');
                      setActiveTab('FINANCE');
                      soundService.playUISelect();
                    }}
                    className="p-3.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider">Histórico Total</span>
                      <span className="text-xs">📚</span>
                    </div>
                    <div className="text-xl font-black font-mono text-white mt-1">
                      {transactions.length} <span className="text-[10px] text-purple-400 font-sans">pedidos</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium mt-1 group-hover:text-purple-300 flex items-center gap-1">
                      <span>Explorar todos</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                </div>

                {/* Latest 3 Transactions Mini Cards */}
                <div className="space-y-2 pt-2">
                  {transactions.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      className="p-3 bg-white/5 hover:bg-white/[0.07] rounded-2xl border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          t.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {t.type === 'DEPOSIT' ? '📥' : '📤'}
                        </div>
                        <div>
                          <div className="font-extrabold text-white flex items-center gap-2">
                            <span>{t.userName}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                              t.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              t.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {t.status === 'PENDING' ? 'Pendente' : t.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {t.method} • <span className="text-amber-400/80 font-mono">{getRelativeTime(t.timestamp)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-black ${t.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {t.amount.toFixed(2)} USDT
                        </div>
                        <button
                          onClick={() => {
                            setSearchTrans(t.id);
                            setActiveTab('FINANCE');
                            soundService.playUISelect();
                          }}
                          className="text-[9px] text-slate-400 hover:text-emerald-400 font-bold uppercase transition-colors cursor-pointer"
                        >
                          Ver Detalhes →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: USERS & PILOTS MANAGEMENT */}
          {activeTab === 'USERS' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* MODAL / FORM FOR CREDIT BALANCE */}
              {selectedUserForCredit && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                  <div className="bg-[#0f1724] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h3 className="font-black text-sm uppercase text-white flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span>Ajustar Saldo: {selectedUserForCredit.name}</span>
                      </h3>
                      <button onClick={() => setSelectedUserForCredit(null)} className="text-slate-400 hover:text-white">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                          Valor (Positivo para adicionar / Negativo para deduzir)
                        </label>
                        <input
                          type="number"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          placeholder="Ex: 5000 ou -2000"
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                          Motivo / Descrição
                        </label>
                        <input
                          type="text"
                          value={creditReason}
                          onChange={(e) => setCreditReason(e.target.value)}
                          placeholder="Ex: Reembolso de aposta / Bónus VIP"
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setSelectedUserForCredit(null)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleManualCredit}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-wider shadow-lg"
                        >
                          Confirmar Crédito
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: CONFIRM ELIMINATE USER */}
              {userToDelete && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="bg-[#0e131f] border border-red-500/40 rounded-3xl p-6 w-full max-w-lg shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-5 text-white">
                    
                    {/* MODAL HEADER */}
                    <div className="flex items-start justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-base uppercase text-white tracking-wide flex items-center gap-2">
                            <span>Eliminar Usuário</span>
                            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-md border border-red-500/30 uppercase font-black">
                              Irreversível
                            </span>
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            Confirme a exclusão definitiva da conta do jogador
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => !isDeletingUser && setUserToDelete(null)}
                        disabled={isDeletingUser}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* USER PREVIEW CARD */}
                    <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${userToDelete.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]'} flex items-center justify-center text-white font-black text-sm`}>
                            {userToDelete.name ? userToDelete.name.substring(0, 2).toUpperCase() : 'JG'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{userToDelete.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{userToDelete.email || 'Sem e-mail'}</div>
                            {userToDelete.phone && (
                              <div className="text-[10px] text-emerald-400 font-mono">{userToDelete.phone}</div>
                            )}
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          userToDelete.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-white/10'
                        }`}>
                          {userToDelete.role === 'ADMIN' ? '👑 ADMIN' : '👤 JOGADOR'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                        <div className="bg-white/5 p-2 rounded-xl">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Saldo Atual:</span>
                          <span className="font-mono font-black text-emerald-400 text-xs">
                            {userToDelete.balance.toLocaleString('pt-AO')} Kz
                          </span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">ID do Usuário:</span>
                          <span className="font-mono text-slate-300 text-[10px] truncate block">
                            #{userToDelete.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* WARNING BOX */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-200/90 leading-relaxed font-medium">
                        <strong className="text-red-300 font-bold block mb-0.5">Aviso de Segurança:</strong>
                        Esta ação removerá a conta do utilizador de forma definitiva do banco de dados, cancelando seu acesso e removendo seus registros do sistema.
                      </div>
                    </div>

                    {/* OPTIONS */}
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                      <input 
                        type="checkbox"
                        checked={deleteUserTransactions}
                        onChange={(e) => setDeleteUserTransactions(e.target.checked)}
                        className="accent-red-500 w-4 h-4 rounded cursor-pointer"
                      />
                      <span>Eliminar também todo o histórico de transações e depósitos deste usuário</span>
                    </label>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setUserToDelete(null)}
                        disabled={isDeletingUser}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmDeleteUser}
                        disabled={isDeletingUser}
                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isDeletingUser ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Eliminando...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar Definitivamente</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* SEARCH & FILTER BAR */}
              <div className="bg-[#090e17] p-4 lg:p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#049444]" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Pesquisar por Nome, E-mail ou ID..."
                    className="w-full bg-white border-2 border-[#049444] focus:border-[#FFCC00] focus:ring-2 focus:ring-[#FFCC00]/40 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-black text-black placeholder:text-slate-500 outline-none shadow-md transition-all"
                  />
                </div>

                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Total Registrados: <span className="text-emerald-400 font-black">{users.length}</span>
                </div>
              </div>

              {/* USERS TABLE */}
              <div className="bg-[#090e17] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-black/50 border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-4">Status & ID</th>
                        <th className="p-4">Nome & Contato</th>
                        <th className="p-4">Papel / Função</th>
                        <th className="p-4">Saldo em Kwanza (Kz)</th>
                        <th className="p-4 text-right">Ações de Controlo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {users
                        .filter(u => 
                          !searchUser || 
                          (u.name || '').toLowerCase().includes(searchUser.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
                          (u.id || '').toLowerCase().includes(searchUser.toLowerCase())
                        )
                        .map(u => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${u.isBanned ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                                <span className="font-mono text-[10px] text-slate-400">#{u.id.substring(0, 8)}</span>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="font-bold text-white text-xs">{u.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                              {u.phone && <div className="text-[9px] text-emerald-400 font-mono">{u.phone}</div>}
                            </td>

                            <td className="p-4">
                              <button
                                onClick={() => handleToggleRole(u)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer ${
                                  u.role === 'ADMIN'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'
                                }`}
                              >
                                {u.role === 'ADMIN' ? '👑 ADMIN' : '👤 JOGADOR'}
                              </button>
                            </td>

                            <td className="p-4 font-mono font-black text-emerald-400 text-sm">
                              {u.balance.toLocaleString('pt-AO')} Kz
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedTargetUser(u);
                                    setNotifTarget('INDIVIDUAL');
                                    setActiveTab('NOTIFICATIONS');
                                    soundService.playUISelect();
                                  }}
                                  className="px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white border border-blue-500/30 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                                  title="Enviar Notificação Direta para este Usuário"
                                >
                                  <Bell className="w-3 h-3" />
                                  <span>Notificar</span>
                                </button>

                                <button
                                  onClick={() => setSelectedUserForCredit(u)}
                                  className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                                >
                                  + Crédito
                                </button>

                                <button
                                  onClick={() => handleToggleBanUser(u)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer ${
                                    u.isBanned
                                      ? 'bg-emerald-600 text-white border-emerald-400'
                                      : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border-red-500/30'
                                  }`}
                                >
                                  {u.isBanned ? 'Desbanir' : 'Banir'}
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl transition-all cursor-pointer"
                                  title="Eliminar Usuário"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: NOTIFICATIONS CENTER (COLLECTIVE & INDIVIDUAL) */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* TOP HEADER */}
              <div className="bg-[#090e17] p-6 rounded-3xl border border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black shadow-lg">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base uppercase text-white tracking-wide">
                        Central de Notificações Coletivas & Individuais
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        Envie avisos em massa para todos os jogadores ou notificações exclusivas com áudio de voz para usuários específicos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-black uppercase flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>{notifications.length} Notificações Ativas</span>
                  </div>
                </div>
              </div>

              {/* MAIN 2-COLUMN GRID: COMPOSE + RECENT LIST */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* LEFT: COMPOSE FORM (7 Cols) */}
                <div className="xl:col-span-7 bg-[#090e17] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-5">
                  <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>Criar e Disparar Notificação</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Envio em Tempo Real
                    </span>
                  </div>

                  {/* 1. TARGET MODE SELECTOR */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-slate-300 block">
                      1. Modo de Envio (Destinatário)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundService.playUISelect();
                          setNotifTarget('ALL');
                          setSelectedTargetUser(null);
                        }}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center ${
                          notifTarget === 'ALL'
                            ? 'bg-gradient-to-b from-amber-500/25 to-yellow-600/15 border-amber-400 text-white shadow-lg shadow-amber-500/10'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Megaphone className={`w-5 h-5 ${notifTarget === 'ALL' ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-black uppercase tracking-wider">
                          📢 Coletiva (Todos)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Envia para todos os {users.length} usuários
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundService.playUISelect();
                          setNotifTarget('INDIVIDUAL');
                        }}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center ${
                          notifTarget === 'INDIVIDUAL'
                            ? 'bg-gradient-to-b from-blue-500/25 to-indigo-600/15 border-blue-400 text-white shadow-lg shadow-blue-500/10'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Users className={`w-5 h-5 ${notifTarget === 'INDIVIDUAL' ? 'text-blue-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-black uppercase tracking-wider">
                          👤 Individual (Jogador)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Mensagem privada para 1 jogador
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 1.1 USER SELECTOR (IF INDIVIDUAL) */}
                  {notifTarget === 'INDIVIDUAL' && (
                    <div className="p-4 bg-black/40 border border-blue-500/30 rounded-2xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase text-blue-300">
                          Selecione o Jogador Alvo
                        </label>
                        {selectedTargetUser && (
                          <button
                            type="button"
                            onClick={() => setSelectedTargetUser(null)}
                            className="text-[10px] text-red-400 hover:underline uppercase font-bold"
                          >
                            Trocar Usuário
                          </button>
                        )}
                      </div>

                      {selectedTargetUser ? (
                        <div className="flex items-center justify-between p-3 bg-blue-500/15 border border-blue-400/40 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                              {selectedTargetUser.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-black text-white">{selectedTargetUser.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{selectedTargetUser.email}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Saldo</span>
                            <span className="text-xs font-mono font-black text-emerald-400">
                              {selectedTargetUser.balance.toLocaleString('pt-AO')} Kz
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              value={notifSearchUserText}
                              onChange={(e) => setNotifSearchUserText(e.target.value)}
                              placeholder="Pesquisar jogador por nome ou email..."
                              className="w-full bg-[#0e1622] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-400"
                            />
                          </div>

                          <div className="max-h-36 overflow-y-auto no-scrollbar space-y-1.5 pt-1">
                            {users
                              .filter(u =>
                                !notifSearchUserText ||
                                u.name.toLowerCase().includes(notifSearchUserText.toLowerCase()) ||
                                u.email.toLowerCase().includes(notifSearchUserText.toLowerCase())
                              )
                              .slice(0, 8)
                              .map(u => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    soundService.playTick();
                                    setSelectedTargetUser(u);
                                  }}
                                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/40 text-left transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-700/60 flex items-center justify-center text-white text-[10px] font-black">
                                      {u.name.charAt(0)}
                                    </span>
                                    <div>
                                      <span className="text-xs font-bold text-white">{u.name}</span>
                                      <span className="text-[10px] font-mono text-slate-400 ml-2">({u.email})</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                    {u.balance.toLocaleString('pt-AO')} Kz
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. TYPE & PRIORITY */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase text-slate-300 block">
                        2. Categoria / Tipo
                      </label>
                      <select
                        value={notifType}
                        onChange={(e) => setNotifType(e.target.value as any)}
                        className="w-full bg-[#0e1622] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-amber-400"
                      >
                        <option value="BONUS">🎁 Bónus & Ofertas</option>
                        <option value="PROMO">🏆 Promoção & Torneio</option>
                        <option value="INFO">ℹ️ Informativo / Notícia</option>
                        <option value="ALERT">🚨 Alerta / Aviso Importante</option>
                        <option value="WARNING">⚠️ Manutenção / Segurança</option>
                        <option value="FINANCE">💰 Financeiro / Depósito & Saque</option>
                        <option value="SUCCESS">✅ Confirmação / Conquista</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase text-slate-300 block">
                        Prioridade de Exibição
                      </label>
                      <select
                        value={notifPriority}
                        onChange={(e) => setNotifPriority(e.target.value as any)}
                        className="w-full bg-[#0e1622] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-amber-400"
                      >
                        <option value="NORMAL">Normal (Padrão)</option>
                        <option value="HIGH">Alta (Destaque Dourado)</option>
                        <option value="URGENT">⚡ Urgente (Destaque com Pulso)</option>
                      </select>
                    </div>
                  </div>

                  {/* QUICK TEMPLATES */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Sugestões Rápidas de Modelos:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { title: '🎉 Bónus 100% de Depósito', msg: 'Deposite hoje via Multicaixa ou PIX e ganhe 100% de saldo extra!', view: 'HOME' as ViewState },
                        { title: '🚀 Torneio Aviator ao Vivo', msg: 'O jackpot da semana do Aviator atingiu 500.000 Kz! Aposte agora.', view: 'AVIATOR' as ViewState },
                        { title: '💎 Minas com Multiplicador 50x', msg: 'Abra as minas de diamantes e fature alto com segurança!', view: 'MINES' as ViewState },
                        { title: '⚠️ Manutenção Programada', msg: 'A plataforma passará por melhorias hoje às 03:00. Duração: 15 min.', view: 'HOME' as ViewState },
                        { title: '💰 Seu Saque foi Aprovado!', msg: 'O seu pedido de levantamento foi processado com sucesso!', view: 'TRANSACTION_STATUS' as ViewState }
                      ].map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            soundService.playTick();
                            setNotifTitle(tmpl.title);
                            setNotifMessage(tmpl.msg);
                            setNotifActionView(tmpl.view);
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {tmpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. TITLE & MESSAGE */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase text-slate-300 block">
                        3. Título da Notificação
                      </label>
                      <input
                        type="text"
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="Ex: 🎉 Bónus Especial de Recarga"
                        className="w-full bg-[#0e1622] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-[#049444]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase text-slate-300 block">
                        4. Mensagem Detalhada
                      </label>
                      <textarea
                        value={notifMessage}
                        onChange={(e) => setNotifMessage(e.target.value)}
                        rows={3}
                        placeholder="Escreva a mensagem clara para o(s) jogador(es)..."
                        className="w-full bg-[#0e1622] border border-white/10 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-[#049444] resize-none"
                      />
                    </div>
                  </div>

                  {/* 5. AUDIO VOICE RECORDING (WhatsApp Style) */}
                  <div className="p-4 bg-black/40 border border-emerald-500/30 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-emerald-400" />
                        <label className="text-[11px] font-black uppercase text-emerald-400">
                          5. Nota de Áudio de Voz Oficial (Estilo WhatsApp)
                        </label>
                      </div>
                      {notifAudioUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotifAudioUrl(null);
                            setNotifAudioDuration(0);
                            soundService.playTick();
                          }}
                          className="text-[10px] text-red-400 hover:underline uppercase font-bold"
                        >
                          Remover Áudio
                        </button>
                      )}
                    </div>

                    {notifAudioUrl ? (
                      <div className="space-y-2">
                        <AudioVoicePlayer
                          audioUrl={notifAudioUrl}
                          duration={notifAudioDuration}
                          senderName="Administrador"
                        />
                        <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Áudio gravado pronto para ser enviado com a notificação!</span>
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <AudioVoiceRecorder
                          onAudioRecorded={(url, dur) => {
                            setNotifAudioUrl(url);
                            setNotifAudioDuration(dur);
                          }}
                        />
                        <p className="text-[10px] text-slate-400 max-w-xs">
                          Grave uma mensagem falada de até 2 minutos para dar um toque humano e VIP ao jogador.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 6. CALL TO ACTION (CTA LINK) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">
                        Destino da Ação (Tela do Jogo)
                      </label>
                      <select
                        value={notifActionView}
                        onChange={(e) => setNotifActionView(e.target.value as any)}
                        className="w-full bg-[#0e1622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
                      >
                        <option value="">Sem Botão de Redirecionamento</option>
                        <option value="AVIATOR">🚀 Jogo Aviator</option>
                        <option value="MINES">💣 Jogo Minas</option>
                        <option value="PLINKO">⚡ Jogo Plinko</option>
                        <option value="SLOTS">🎰 Casino Slots</option>
                        <option value="ROULETTE">🎡 Roleta Europeia</option>
                        <option value="PROMOTIONS">🎁 Aba Promoções</option>
                        <option value="P2P">💱 Mercado P2P Kwanza</option>
                        <option value="PDF_MARKET">📚 E-Books & Estratégias</option>
                        <option value="PROFILE">👤 Meu Perfil</option>
                        <option value="TRANSACTION_STATUS">📜 Histórico de Transações</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">
                        Texto do Botão CTA
                      </label>
                      <input
                        type="text"
                        value={notifActionText}
                        onChange={(e) => setNotifActionText(e.target.value)}
                        placeholder="Ex: Jogar Agora / Aproveitar"
                        className="w-full bg-[#0e1622] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* DISPATCH BUTTON */}
                  <div className="pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleSendNotification}
                      disabled={isSendingNotif}
                      className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-2xl transition-all cursor-pointer ${
                        notifTarget === 'ALL'
                          ? 'bg-gradient-to-r from-[#049444] via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
                      }`}
                    >
                      <Send className={`w-4 h-4 ${isSendingNotif ? 'animate-spin' : ''}`} />
                      <span>
                        {isSendingNotif
                          ? 'A Disparar Notificação...'
                          : notifTarget === 'ALL'
                          ? `Disparar Notificação para TODOS (${users.length} Jogadores)`
                          : `Enviar Notificação Direta para ${selectedTargetUser ? selectedTargetUser.name : 'Jogador'}`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* RIGHT: SENT NOTIFICATIONS ARCHIVE (5 Cols) */}
                <div className="xl:col-span-5 bg-[#090e17] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col space-y-4">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-amber-400" />
                        <span>Notificações Enviadas ({notifications.length})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">Histórico de comunicados e leituras</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                          onClick={() => setNotifFilterTab('ALL')}
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            notifFilterTab === 'ALL' ? 'bg-[#049444] text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Todas
                        </button>
                        <button
                          onClick={() => setNotifFilterTab('BROADCAST')}
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            notifFilterTab === 'BROADCAST' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Coletivas
                        </button>
                        <button
                          onClick={() => setNotifFilterTab('INDIVIDUAL')}
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                            notifFilterTab === 'INDIVIDUAL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Individuais
                        </button>
                      </div>

                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDeleteAllFilteredNotifs}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 transition-colors cursor-pointer"
                          title="Eliminar todas as notificações desta lista"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Limpar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 max-h-[600px]">
                    {notifications
                      .filter(n => {
                        if (notifFilterTab === 'BROADCAST') return n.target === 'ALL';
                        if (notifFilterTab === 'INDIVIDUAL') return n.target !== 'ALL';
                        return true;
                      })
                      .length === 0 ? (
                      <div className="py-16 text-center text-slate-500">
                        <Bell className="w-8 h-8 mx-auto opacity-30 mb-2" />
                        <p className="text-xs font-bold">Nenhuma notificação encontrada neste filtro.</p>
                      </div>
                    ) : (
                      notifications
                        .filter(n => {
                          if (notifFilterTab === 'BROADCAST') return n.target === 'ALL';
                          if (notifFilterTab === 'INDIVIDUAL') return n.target !== 'ALL';
                          return true;
                        })
                        .map(n => {
                          const isIndividual = n.target !== 'ALL';
                          return (
                            <div
                              key={n.id}
                              className="p-4 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl space-y-2.5 transition-all relative group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    n.type === 'BONUS' ? 'bg-emerald-500/20 text-emerald-300' :
                                    n.type === 'PROMO' ? 'bg-amber-500/20 text-amber-300' :
                                    n.type === 'ALERT' ? 'bg-red-500/20 text-red-300' :
                                    n.type === 'FINANCE' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-blue-500/20 text-blue-300'
                                  }`}>
                                    {n.type}
                                  </span>

                                  {isIndividual ? (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 flex items-center gap-1">
                                      <Users className="w-2.5 h-2.5" />
                                      <span>Para: {n.targetUserName || n.targetUserId?.substring(0, 8)}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                                      <Megaphone className="w-2.5 h-2.5 text-amber-400" />
                                      <span>Todos os Jogadores</span>
                                    </span>
                                  )}

                                  {n.priority === 'URGENT' && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">
                                      ⚡ Urgente
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteNotification(n.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                  title="Eliminar Notificação"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div>
                                <h5 className="text-xs font-black text-white">{n.title}</h5>
                                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2 mt-0.5">
                                  {n.message}
                                </p>
                              </div>

                              {/* Audio preview if present */}
                              {n.audioUrl && (
                                <div className="pt-1">
                                  <AudioVoicePlayer
                                    audioUrl={n.audioUrl}
                                    duration={n.audioDuration}
                                    senderName="Admin"
                                  />
                                </div>
                              )}

                              <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                                <span>{getRelativeTime(n.createdAt)}</span>
                                <span className="text-emerald-400 font-bold">
                                  👁️ {(n.readBy || []).length} leituras
                                </span>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: FINANCIAL & TRANSACTIONS APPROVAL */}
          {activeTab === 'FINANCE' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* HEADER BANNER */}
              <div className="bg-[#090e17] p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-base uppercase text-white flex items-center gap-2.5">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    <span>Aprovação Financeira & Auditoria de Pedidos</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Filtre, audite e processe pedidos recentes de depósitos e saques em tempo real
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {pendingCount > 0 && (
                    <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black px-3.5 py-1.5 rounded-xl text-xs uppercase flex items-center gap-2 animate-pulse shadow-lg shadow-amber-500/10">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{pendingCount} Pendentes</span>
                    </div>
                  )}

                  <div className="bg-slate-800/80 text-slate-300 border border-white/10 font-mono font-bold px-3.5 py-1.5 rounded-xl text-xs">
                    Total: {transactions.length} pedidos
                  </div>
                </div>
              </div>

              {/* QUICK PRESET FILTER CHIPS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 shrink-0 mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filtros Rápidos:</span>
                </span>

                {/* 1. Todos */}
                <button
                  onClick={() => {
                    setTransTypeFilter('ALL');
                    setTransStatusFilter('ALL');
                    setTransDateFilter('ALL');
                    soundService.playUISelect();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[11px] transition-all shrink-0 cursor-pointer border ${
                    transTypeFilter === 'ALL' && transStatusFilter === 'ALL' && transDateFilter === 'ALL'
                      ? 'bg-[#049444] text-white border-[#049444] shadow-lg shadow-[#049444]/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  Todos ({transactions.length})
                </button>

                {/* 2. Novos Pendentes (Geral) */}
                <button
                  onClick={() => {
                    setTransTypeFilter('ALL');
                    setTransStatusFilter('PENDING');
                    setTransDateFilter('ALL');
                    soundService.playUISelect();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black uppercase text-[11px] transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                    transTypeFilter === 'ALL' && transStatusFilter === 'PENDING'
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <span>⚡ Novos Pendentes</span>
                  <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{pendingCount}</span>
                </button>

                {/* 3. Novos Depósitos Pendentes */}
                <button
                  onClick={() => {
                    setTransTypeFilter('DEPOSIT');
                    setTransStatusFilter('PENDING');
                    soundService.playUISelect();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black uppercase text-[11px] transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                    transTypeFilter === 'DEPOSIT' && transStatusFilter === 'PENDING'
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span>📥 Novos Depósitos</span>
                  <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{pendingDepositsCount}</span>
                </button>

                {/* 4. Novos Saques Pendentes */}
                <button
                  onClick={() => {
                    setTransTypeFilter('WITHDRAW');
                    setTransStatusFilter('PENDING');
                    soundService.playUISelect();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black uppercase text-[11px] transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                    transTypeFilter === 'WITHDRAW' && transStatusFilter === 'PENDING'
                      ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30'
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  <span>📤 Novos Saques</span>
                  <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{pendingWithdrawalsCount}</span>
                </button>

                {/* 5. Pedidos de Hoje */}
                <button
                  onClick={() => {
                    setTransDateFilter('TODAY');
                    soundService.playUISelect();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[11px] transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                    transDateFilter === 'TODAY'
                      ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30'
                      : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30'
                  }`}
                >
                  <span>🕒 Hoje (24h)</span>
                  <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">{todayTransactionsCount}</span>
                </button>

                {/* 6. Aprovados */}
                <button
                  onClick={() => {
                    setTransStatusFilter('APPROVED');
                    soundService.playUISelect();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[11px] transition-all shrink-0 cursor-pointer border ${
                    transStatusFilter === 'APPROVED'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                  }`}
                >
                  ✅ Aprovados ({transactions.filter(t => t.status === 'APPROVED').length})
                </button>

                {/* 7. Rejeitados */}
                <button
                  onClick={() => {
                    setTransStatusFilter('REJECTED');
                    soundService.playUISelect();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[11px] transition-all shrink-0 cursor-pointer border ${
                    transStatusFilter === 'REJECTED'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                  }`}
                >
                  ❌ Rejeitados ({transactions.filter(t => t.status === 'REJECTED').length})
                </button>
              </div>

              {/* ADVANCED FILTER TOOLBAR */}
              <div className="bg-[#090e17] p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
                
                {/* Search and Main Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
                  
                  {/* Search input */}
                  <div className="lg:col-span-4 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTrans}
                      onChange={(e) => setSearchTrans(e.target.value)}
                      placeholder="Pesquisar por jogador, ID, valor, carteira..."
                      className="w-full bg-black/50 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#049444] transition-colors"
                    />
                    {searchTrans && (
                      <button
                        onClick={() => setSearchTrans('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Tipo de Operação */}
                  <div className="lg:col-span-2">
                    <select
                      value={transTypeFilter}
                      onChange={(e) => {
                        setTransTypeFilter(e.target.value as TransTypeFilter);
                        soundService.playUISelect();
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#049444] font-medium cursor-pointer"
                    >
                      <option value="ALL">Fluxo: Todos os Tipos</option>
                      <option value="DEPOSIT">📥 Depósitos Apenas</option>
                      <option value="WITHDRAW">📤 Saques / Levantamentos</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="lg:col-span-2">
                    <select
                      value={transStatusFilter}
                      onChange={(e) => {
                        setTransStatusFilter(e.target.value as TransStatusFilter);
                        soundService.playUISelect();
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#049444] font-medium cursor-pointer"
                    >
                      <option value="ALL">Status: Todos</option>
                      <option value="PENDING">🟡 Pendentes / Novos</option>
                      <option value="APPROVED">🟢 Aprovados</option>
                      <option value="REJECTED">🔴 Rejeitados</option>
                    </select>
                  </div>

                  {/* Período / Recência */}
                  <div className="lg:col-span-2">
                    <select
                      value={transDateFilter}
                      onChange={(e) => {
                        setTransDateFilter(e.target.value as TransDateFilter);
                        soundService.playUISelect();
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#049444] font-medium cursor-pointer"
                    >
                      <option value="ALL">Data: Todo Histórico</option>
                      <option value="TODAY">🕒 Hoje (Últimas 24h)</option>
                      <option value="LAST_7_DAYS">🗓️ Últimos 7 Dias</option>
                      <option value="LAST_30_DAYS">📅 Últimos 30 Dias</option>
                    </select>
                  </div>

                  {/* Canal / Método */}
                  <div className="lg:col-span-2">
                    <select
                      value={transMethodFilter}
                      onChange={(e) => {
                        setTransMethodFilter(e.target.value);
                        soundService.playUISelect();
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#049444] font-medium cursor-pointer"
                    >
                      <option value="ALL">Canal: Todos os Meios</option>
                      <option value="CRYPTO">🪙 Cripto USDT / TRC20</option>
                      <option value="PIX">🇧🇷 PIX Automático</option>
                      <option value="BANK">🏦 Multicaixa / Bancos</option>
                      <option value="UNITEL">📱 Unitel Money</option>
                      <option value="ADMIN">⚙️ Ajuste Manual Admin</option>
                    </select>
                  </div>

                </div>

                {/* Sub-row: Sort & Reset button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
                  
                  {/* Sort selection */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ordenar por:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setTransSort('RECENT_FIRST')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          transSort === 'RECENT_FIRST' ? 'bg-[#049444]/20 text-[#049444] border border-[#049444]/40 font-black' : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        ⏱️ Mais Recentes
                      </button>
                      <button
                        onClick={() => setTransSort('OLDEST_FIRST')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          transSort === 'OLDEST_FIRST' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black' : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        ⏳ Mais Antigos
                      </button>
                      <button
                        onClick={() => setTransSort('HIGHEST_AMOUNT')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          transSort === 'HIGHEST_AMOUNT' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-black' : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        💎 Maior Valor
                      </button>
                      <button
                        onClick={() => setTransSort('LOWEST_AMOUNT')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          transSort === 'LOWEST_AMOUNT' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black' : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        🪙 Menor Valor
                      </button>
                    </div>
                  </div>

                  {/* Reset Filters */}
                  {isFilterActive && (
                    <button
                      onClick={clearAllTransFilters}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar Filtros Ativos</span>
                    </button>
                  )}
                </div>

              </div>

              {/* FILTERED SUMMARY KPI BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#090e17] p-3.5 rounded-2xl border border-white/10">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Registos Filtrados</span>
                  <div className="text-lg font-black font-mono text-white mt-0.5">
                    {filteredTransactions.length} <span className="text-[10px] text-slate-500 font-sans">pedidos</span>
                  </div>
                </div>

                <div className="bg-[#090e17] p-3.5 rounded-2xl border border-white/10">
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">Volume Depósitos</span>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                    {filteredDepositsVolume.toFixed(2)} <span className="text-[10px] font-sans">USDT</span>
                  </div>
                </div>

                <div className="bg-[#090e17] p-3.5 rounded-2xl border border-white/10">
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">Volume Saques</span>
                  <div className="text-lg font-black font-mono text-amber-300 mt-0.5">
                    {filteredWithdrawalsVolume.toFixed(2)} <span className="text-[10px] font-sans">USDT</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${filteredPendingCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#090e17] border-white/10'}`}>
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">Pendentes Filtrados</span>
                  <div className="text-lg font-black font-mono text-amber-300 mt-0.5 flex items-center gap-1.5">
                    <span>{filteredPendingCount}</span>
                    {filteredPendingCount > 0 && <span className="text-[10px] font-sans bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded uppercase font-black">Ação Requerida</span>}
                  </div>
                </div>
              </div>

              {/* TRANSACTIONS LIST */}
              <div className="space-y-3">
                {filteredTransactions.length === 0 ? (
                  <div className="py-16 text-center bg-[#090e17] rounded-3xl border border-white/10 p-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <div className="text-white font-extrabold text-sm">
                      Nenhuma transação encontrada com os filtros selecionados.
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Tente alterar as opções de tipo (Depósito/Saque), status ou limpar a barra de pesquisa para visualizar outros registos.
                    </p>
                    {isFilterActive && (
                      <button
                        onClick={clearAllTransFilters}
                        className="mt-2 px-4 py-2 bg-[#049444] hover:bg-emerald-600 text-white font-black text-xs uppercase rounded-xl shadow-lg transition-all cursor-pointer"
                      >
                        Limpar Todos os Filtros
                      </button>
                    )}
                  </div>
                ) : (
                  filteredTransactions.map(t => (
                    <div
                      key={t.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                        t.status === 'PENDING'
                          ? 'bg-[#0f1724] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                          : t.status === 'APPROVED'
                          ? 'bg-[#090e17] border-emerald-500/20 opacity-95'
                          : 'bg-[#090e17] border-red-500/20 opacity-75'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-4 w-full lg:w-auto">
                        
                        {/* Icon Type Box */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 font-bold ${
                          t.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {t.type === 'DEPOSIT' ? '📥' : '📤'}
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          
                          {/* Top Tag Row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-white">{t.userName}</span>
                            
                            {/* Type Pill */}
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${
                              t.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {t.type === 'DEPOSIT' ? 'Depósito' : 'Saque / Levantamento'}
                            </span>

                            {/* Status Tag */}
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border flex items-center gap-1 ${
                              t.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                : t.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {t.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                              <span>{t.status === 'PENDING' ? 'Pendente' : t.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}</span>
                            </span>

                            {/* Relative time pill */}
                            <span className="text-[9px] font-mono font-bold bg-white/5 text-amber-400/90 border border-white/10 px-2 py-0.5 rounded-lg">
                              {getRelativeTime(t.timestamp)}
                            </span>

                            {t.isAutomaticPayout && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase">
                                ⚡ Plisio Automático
                              </span>
                            )}
                          </div>

                          {/* Secondary Meta Row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">{t.method}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{t.timestamp}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-500 flex items-center gap-1">
                              <span>ID: {t.id}</span>
                              <button
                                onClick={() => handleCopyToClipboard(t.id, 'ID da Transação')}
                                className="hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
                                title="Copiar ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          </div>

                          {/* Account / Wallet Address Details */}
                          {t.accountDetails && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 font-bold">Destino:</span>
                              <p className="text-[10px] text-amber-300 font-mono break-all bg-black/40 px-2 py-0.5 rounded-lg border border-white/5 flex items-center gap-1.5">
                                <span>{t.accountDetails}</span>
                                <button
                                  onClick={() => handleCopyToClipboard(t.accountDetails || '', 'Carteira/Conta')}
                                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer shrink-0"
                                  title="Copiar endereço"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </p>
                            </div>
                          )}

                          {/* Blockchain Explorer Link */}
                          {t.txUrl && (
                            <div>
                              <a
                                href={t.txUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 mt-0.5"
                              >
                                <span>🔗 Explorador Blockchain ({t.txHash ? t.txHash.substring(0, 12) + '...' : 'Ver Tx'})</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Action Block */}
                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                        
                        {/* Amount */}
                        <div className="text-left lg:text-right">
                          <span className="text-[9px] text-slate-400 uppercase font-black block">Montante</span>
                          <span className={`text-xl font-mono font-black ${t.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {t.amount.toFixed(2)} USDT
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 block">
                            ≈ {(t.amount * 1000).toLocaleString('pt-AO')} Kz
                          </span>
                        </div>

                        {/* Action Buttons */}
                        {t.status === 'PENDING' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Option 1: Automatic Plisio Crypto Payout */}
                            {t.type === 'WITHDRAW' && (
                              <button
                                onClick={() => handleExecutePlisioPayout(t)}
                                disabled={payoutLoadingId === t.id}
                                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Executar pagamento instantâneo via API da Plisio"
                              >
                                <span>{payoutLoadingId === t.id ? 'A Enviar...' : '⚡ Pagar via Plisio'}</span>
                              </button>
                            )}

                            {/* Option 2: Manual Approval */}
                            <button
                              onClick={() => handleResolveTransaction(t.id, 'APPROVED')}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1"
                              title="Aprovar manualmente e creditar/liquidar saldo"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprovar Manual</span>
                            </button>

                            {/* Option 3: Reject & Refund */}
                            <button
                              onClick={() => handleResolveTransaction(t.id, 'REJECTED')}
                              className="px-3.5 py-2.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                              title="Rejeitar pedido e devolver saldo ao usuário"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Rejeitar & Estornar</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border flex items-center gap-1.5 ${
                              t.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {t.status === 'APPROVED' ? <CheckCheck className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              <span>{t.status === 'APPROVED' ? 'Processado / Aprovado' : 'Rejeitado / Estornado'}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 4: PAYMENT METHODS & BANKING CONFIG */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* EDIT / CREATE METHOD FORM */}
                <div className="lg:col-span-5 bg-[#090e17] p-6 rounded-3xl border border-white/10 space-y-4">
                <h3 className="font-black text-sm uppercase text-white flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    <span>{editingMethod?.id ? 'Editar Canal de Pagamento' : 'Novo Canal de Pagamento'}</span>
                  </div>
                  {editingMethod?.id && (
                    <button
                      onClick={() => {
                        setEditingMethod(null);
                        soundService.playUISelect();
                      }}
                      className="text-[10px] bg-white/10 hover:bg-white/20 text-slate-300 px-2 py-1 rounded-lg uppercase tracking-wider cursor-pointer font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Novo / Cancelar</span>
                    </button>
                  )}
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Nome do Canal / Banco
                    </label>
                    <input
                      type="text"
                      value={editingMethod?.name || ''}
                      onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                      placeholder="Ex: Multicaixa Express / Banco BAI"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Tipo de Canal
                    </label>
                    <select
                      value={editingMethod?.type || 'MOBILE_MONEY'}
                      onChange={(e) => setEditingMethod({ ...editingMethod, type: e.target.value as any })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="MOBILE_MONEY">Mobile Money (Express / Unitel Money)</option>
                      <option value="UNITEL_MONEY">Unitel Money (Entidade & Referência)</option>
                      <option value="BANK">Transferência Bancária (IBAN / BAI / BFA)</option>
                      <option value="CRYPTO">Criptomoeda (USDT TRC20 / BTC)</option>
                      <option value="PIX">PIX Brasil (Cakto Pay API)</option>
                    </select>
                  </div>

                  {editingMethod?.type === 'PIX' ? (
                    <div className="space-y-3 bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                      <div>
                        <label className="text-[10px] font-black text-emerald-300 uppercase block mb-1">
                          Chave PIX do Recebedor / E-mail / CPF / CNPJ
                        </label>
                        <input
                          type="text"
                          value={editingMethod?.account || ''}
                          onChange={(e) => setEditingMethod({ ...editingMethod, account: e.target.value })}
                          placeholder="Ex: pix@cryptonbet.com"
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-emerald-400 font-mono text-xs font-bold outline-none focus:border-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-emerald-400/90 font-bold">
                        🇧🇷 Exclusivo para o Brasil: Os depósitos por PIX geram o QR Code em tempo real através das configurações da API Cakto!
                      </p>
                    </div>
                  ) : editingMethod?.type === 'CRYPTO' ? (
                    <div className="space-y-3 bg-purple-500/10 p-3 rounded-2xl border border-purple-500/20">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-black text-purple-300 uppercase block mb-1">Moeda</label>
                          <select
                            value={editingMethod?.cryptoType || 'USDT'}
                            onChange={(e) => setEditingMethod({ ...editingMethod, cryptoType: e.target.value as any })}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                          >
                            <option value="USDT">USDT (Tether)</option>
                            <option value="BTC">BTC (Bitcoin)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-purple-300 uppercase block mb-1">Rede (Network)</label>
                          <input
                            type="text"
                            value={editingMethod?.cryptoNetwork || 'TRC20'}
                            onChange={(e) => setEditingMethod({ ...editingMethod, cryptoNetwork: e.target.value })}
                            placeholder="Ex: TRC20, BEP20, Bitcoin"
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-300 uppercase block mb-1">
                          Endereço de Carteira (Depósito)
                        </label>
                        <input
                          type="text"
                          value={editingMethod?.account || ''}
                          onChange={(e) => setEditingMethod({ ...editingMethod, account: e.target.value })}
                          placeholder="Ex: T... (TRC20) ou bc1q..."
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-amber-400 font-mono text-xs font-bold outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                        <p className="text-[9px] text-slate-400 font-black uppercase mb-2">⚡ QR Code Gerado Pelo Sistema</p>
                        {editingMethod?.account ? (
                          <div className="inline-block p-2 bg-white rounded-xl shadow-lg">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(editingMethod.account)}`} 
                              alt="QR Code Automático" 
                              className="w-28 h-28" 
                            />
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic py-4">Digite o endereço da carteira para gerar o QR Code</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {(editingMethod?.type === 'UNITEL_MONEY' || editingMethod?.type === 'MOBILE_MONEY' || editingMethod?.type === 'BANK') && (
                        <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Entidade (Opcional)</label>
                            <input
                              type="text"
                              value={editingMethod?.entityNumber || ''}
                              onChange={(e) => setEditingMethod({ ...editingMethod, entityNumber: e.target.value })}
                              placeholder="Ex: 00123"
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Referência / Telefone</label>
                            <input
                              type="text"
                              value={editingMethod?.referenceNumber || ''}
                              onChange={(e) => setEditingMethod({ ...editingMethod, referenceNumber: e.target.value })}
                              placeholder="Ex: 923... / Ref de Pagamento"
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                          Número de Telefone / IBAN / Conta Principal
                        </label>
                        <input
                          type="text"
                          value={editingMethod?.account || ''}
                          onChange={(e) => setEditingMethod({ ...editingMethod, account: e.target.value })}
                          placeholder="Ex: AO06 0040 0000 1234 5678 1015 4 / 923000000"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-xs outline-none focus:border-purple-500"
                        />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                        Depósito Mínimo (Kz)
                      </label>
                      <input
                        type="number"
                        value={editingMethod?.minDeposit !== undefined ? editingMethod.minDeposit : 500}
                        onChange={(e) => setEditingMethod({ ...editingMethod, minDeposit: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                        Levantamento Máx (Kz)
                      </label>
                      <input
                        type="number"
                        value={editingMethod?.maxWithdraw !== undefined ? editingMethod.maxWithdraw : 500000}
                        onChange={(e) => setEditingMethod({ ...editingMethod, maxWithdraw: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Instruções Adicionais
                    </label>
                    <input
                      type="text"
                      value={editingMethod?.details || ''}
                      onChange={(e) => setEditingMethod({ ...editingMethod, details: e.target.value })}
                      placeholder="Ex: Titular: CryptonBet Lda • Enviar talão"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    onClick={handleSavePaymentMethod}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer mt-2 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingMethod?.id ? 'Atualizar Canal de Pagamento' : 'Guardar Novo Canal'}</span>
                  </button>
                </div>
              </div>

              {/* ACTIVE METHODS LIST */}
              <div className="lg:col-span-7 bg-[#090e17] p-6 rounded-3xl border border-white/10 space-y-4">
                <h3 className="font-black text-sm uppercase text-white border-b border-white/10 pb-3 flex items-center justify-between">
                  <span>Canais de Pagamento Configurados</span>
                  <span className="text-[10px] text-purple-400 font-mono">Total: {settings.paymentMethods.length}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {settings.paymentMethods.map(m => (
                    <div key={m.id} className={`p-4 bg-black/40 border rounded-2xl flex flex-col justify-between space-y-3 transition-all ${m.isActive ? 'border-white/10' : 'border-red-500/30 opacity-70'}`}>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-white">{m.name}</span>
                            <span className="text-[8px] bg-purple-500/20 text-purple-300 font-black px-1.5 py-0.5 rounded uppercase">
                              {m.type}
                            </span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${m.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                              {m.isActive ? '● Ativo' : '○ Inativo'}
                            </span>
                            {m.cryptoNetwork && (
                              <span className="text-[8px] bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.5 rounded uppercase">
                                {m.cryptoType || 'USDT'} {m.cryptoNetwork}
                              </span>
                            )}
                          </div>
                          {m.type === 'CRYPTO' && m.account && (
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(m.account)}`} 
                              alt="QR" 
                              className="w-10 h-10 rounded bg-white p-0.5 shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-[10px] text-amber-300 font-mono mt-2 font-bold break-all">
                          {m.account}
                        </p>
                        {(m.entityNumber || m.referenceNumber) && (
                          <div className="flex gap-2 mt-1 text-[9px] font-mono text-emerald-300">
                            {m.entityNumber && <span>Entidade: <b>{m.entityNumber}</b></span>}
                            {m.referenceNumber && <span>Ref: <b>{m.referenceNumber}</b></span>}
                          </div>
                        )}
                        <div className="mt-1 text-[9px] text-slate-400 font-mono flex gap-2">
                          <span>Mín: <b>{m.minDeposit || 500} Kz</b></span>
                          <span>•</span>
                          <span>Máx: <b>{m.maxWithdraw || 500000} Kz</b></span>
                        </div>
                        {m.details && (
                          <p className="text-[9px] text-slate-400 mt-1">
                            {m.details}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1.5 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleTogglePaymentMethodStatus(m)}
                          className={`px-2 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer border ${
                            m.isActive ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-white border-amber-500/20' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border-emerald-500/30'
                          }`}
                          title={m.isActive ? 'Desativar canal' : 'Ativar canal'}
                        >
                          {m.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingMethod(m);
                            soundService.playUISelect();
                          }}
                          className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            editingMethod?.id === m.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{editingMethod?.id === m.id ? 'A Editar...' : 'Editar'}</span>
                        </button>
                        <button
                          onClick={() => handleDeletePaymentMethod(m)}
                          className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                          title="Eliminar Canal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CONFIGURAÇÃO DA API CAKTO (PIX BRASIL) */}
            <div className="bg-gradient-to-br from-[#090e17] via-[#0b131f] to-[#049444]/15 p-6 sm:p-8 rounded-3xl border border-[#049444]/40 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#049444]/20 border border-[#049444]/40 flex items-center justify-center text-2xl shadow-lg shadow-[#049444]/20">
                    🇧🇷
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
                      <span>Configurações API Cakto Pay</span>
                      <span className="text-[10px] bg-[#049444] text-white px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest">
                        PIX Brasil
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Integração oficial Cakto Pay para depósitos instantâneos via PIX (Gerador de QR Code & Copia e Cola)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestCakto}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border border-white/10 shadow-md"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    <span>Testar Conexão API</span>
                  </button>
                  
                  <label className="flex items-center gap-2 cursor-pointer bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      checked={settings.cakto?.enabled !== false}
                      onChange={(e) => saveSettings({
                        ...settings,
                        cakto: { ...(settings.cakto || { apiToken: '', clientSecret: '', webhookSecret: '', pixKey: 'pix@cryptonbet.com', receiverName: 'CryptonBet Brasil', exchangeRate: 5.85, environment: 'sandbox' }), enabled: e.target.checked }
                      })}
                      className="w-4 h-4 accent-[#049444] rounded cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase text-white">Ativar Cakto PIX</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">
                    Ambiente de Operação
                  </label>
                  <select
                    value={settings.cakto?.environment || 'sandbox'}
                    onChange={(e) => saveSettings({
                      ...settings,
                      cakto: { ...(settings.cakto || { clientId: '', apiToken: '', clientSecret: '', webhookSecret: '', pixKey: 'pix@cryptonbet.com', receiverName: 'CryptonBet Brasil', exchangeRate: 5.85, enabled: true }), environment: e.target.value as any }
                    })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-[#049444] cursor-pointer"
                  >
                    <option value="sandbox">🟡 Sandbox / Simulação (Sem Cobrança Real)</option>
                    <option value="production">🟢 Produção (API Cakto Pay Conectada)</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2 lg:col-span-2 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent p-5 rounded-2xl border border-emerald-500/40 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 text-xl shadow-inner">
                    🛡️
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Chaves de API 100% Protegidas no Servidor</span>
                      <span className="text-[9px] bg-emerald-500 text-black font-black px-2 py-0.5 rounded-full uppercase">Anti-Hacker</span>
                    </h5>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Para evitar que hackers ou invasores tenham acesso aos seus segredos, o formulário de chaves foi eliminado desta tela! As variáveis <b className="text-emerald-400">CAKTO_CLIENT_ID</b> e <b className="text-amber-400">CAKTO_CLIENT_SECRET</b> agora são inseridas exclusivamente pelo painel de variáveis de ambiente (<code className="bg-black/60 px-1.5 py-0.5 rounded text-emerald-300 font-mono">.env</code>), rodando ocultas no servidor de backend.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-400 uppercase block mb-1.5">
                    Chave PIX Oficial (E-mail, CPF/CNPJ, Celular)
                  </label>
                  <input
                    type="text"
                    value={settings.cakto?.pixKey || ''}
                    onChange={(e) => saveSettings({
                      ...settings,
                      cakto: { ...(settings.cakto || { receiverName: 'CryptonBet Brasil', exchangeRate: 5.85, enabled: true, environment: 'sandbox' }), pixKey: e.target.value }
                    })}
                    placeholder="Ex: pix@cryptonbet.com"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs font-bold outline-none focus:border-[#049444]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-amber-400 uppercase block mb-1.5">
                    Cotação Câmbio (1 USDT ⇄ Reais R$)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={settings.cakto?.exchangeRate || 5.85}
                      onChange={(e) => saveSettings({
                        ...settings,
                        cakto: { ...(settings.cakto || { pixKey: 'pix@cryptonbet.com', receiverName: 'CryptonBet Brasil', enabled: true, environment: 'sandbox' }), exchangeRate: Number(e.target.value) || 5.85 }
                      })}
                      className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs font-bold outline-none focus:border-[#049444]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400">R$ / USDT</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-emerald-400 uppercase block mb-1.5 flex items-center justify-between">
                    <span>🛒 Link de Checkout do Produto Cakto (Opcional)</span>
                    <span className="text-[9px] text-slate-400 normal-case font-normal">Ex: https://pay.cakto.com.br/...</span>
                  </label>
                  <input
                    type="text"
                    value={settings.cakto?.checkoutUrl || ''}
                    onChange={(e) => saveSettings({
                      ...settings,
                      cakto: { ...(settings.cakto || { pixKey: 'pix@cryptonbet.com', receiverName: 'CAKTO PAY LTDA', enabled: true, environment: 'sandbox', exchangeRate: 5.85 }), checkoutUrl: e.target.value }
                    })}
                    placeholder="https://pay.cakto.com.br/31527e29..."
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs outline-none focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Se preenchido, o jogador verá um botão em destaque para abrir a página oficial de pagamento do seu produto Cakto.</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-amber-400 uppercase block mb-1.5 flex items-center justify-between">
                    <span>⚡ PIX Copia-e-Cola Fixo (Opcional / Demonstração)</span>
                    <span className="text-[9px] text-slate-400 normal-case font-normal">Ex: 000201010212...</span>
                  </label>
                  <input
                    type="text"
                    value={settings.cakto?.pixCopyPaste || ''}
                    onChange={(e) => saveSettings({
                      ...settings,
                      cakto: { ...(settings.cakto || { pixKey: 'pix@cryptonbet.com', receiverName: 'CAKTO PAY LTDA', enabled: true, environment: 'sandbox', exchangeRate: 5.85 }), pixCopyPaste: e.target.value }
                    })}
                    placeholder="00020101021226810014br.gov.bcb.pix..."
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs outline-none focus:border-amber-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Se preenchido, este código PIX exato será exibido aos jogadores quando a geração via API não estiver ativa.</p>
                </div>
              </div>

              {/* GUIA DO WEBHOOK CAKTO E CHAVE SECRETA */}
              <div className="bg-gradient-to-r from-amber-500/10 via-black/40 to-emerald-500/10 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span>⚡ Guia Rápido: Como Integrar o Webhook da Cakto Pay</span>
                    <span className="text-[9px] bg-amber-500 text-black font-black px-2 py-0.5 rounded-full uppercase">Oficial</span>
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para que os depósitos via PIX sejam aprovados e creditados <b>instantaneamente</b> na conta do jogador sem intervenção manual, configure o Webhook oficial da Cakto:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-400 uppercase block">1. URL de Destino do Webhook</span>
                    <p className="text-[11px] text-slate-400">No painel da Cakto em <b className="text-white">Integrações &gt; Webhooks &gt; Criar Novo Webhook</b>, cole o endereço abaixo no campo <i>URL de destino</i>:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-[11px] bg-emerald-950/80 text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 font-mono flex-1 truncate select-all">
                        {window.location.origin}/api/cakto/webhook
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/cakto/webhook`);
                          showNotification("URL do Webhook copiada para a área de transferência!");
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0"
                      >
                        Copiar URL
                      </button>
                    </div>
                  </div>
                  <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-black text-amber-400 uppercase block">2. O que é o "Token do Webhook"?</span>
                    <p className="text-[11px] text-slate-400">O token de autenticação é a <b className="text-amber-300">Chave Secreta (Secret Key)</b> gerada pela Cakto na criação do Webhook. Ela funciona como uma senha de proteção contra acessos falsos.</p>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Para ativar a proteção no servidor, copie essa Chave Secreta da Cakto e adicione nas variáveis do seu servidor (<code className="bg-black/80 px-1.5 py-0.5 rounded text-amber-300 font-mono">.env</code>) com o nome:
                    </p>
                    <div className="mt-1">
                      <code className="text-[11px] bg-amber-950/80 text-amber-300 font-bold px-2.5 py-1 rounded border border-amber-500/30 font-mono block text-center select-all">
                        CAKTO_WEBHOOK_SECRET=sua_chave_secreta_aqui
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* HISTÓRICO DE LOGS DO WEBHOOK (MONITORAMENTO AO VIVO) */}
              <div className="bg-black/80 p-5 rounded-2xl border border-emerald-500/30 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>📡 Logs de Webhook (Monitoramento Ao Vivo)</span>
                        <span className="text-[9px] bg-emerald-500 text-black font-black px-2 py-0.5 rounded-full uppercase">Ativo</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">Acompanhe em tempo real os disparos e eventos recebidos pelo servidor do CryptonBet.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSimulateWebhook}
                      disabled={isLoadingLogs}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Disparar Simulação</span>
                    </button>
                    <button
                      type="button"
                      onClick={fetchWebhookLogs}
                      disabled={isLoadingLogs}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </button>
                    {webhookLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearLogs}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl transition-all"
                        title="Limpar Histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {webhookLogs.length === 0 ? (
                  <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-8 text-center space-y-2">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">Nenhum evento de Webhook registrado no momento.</p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Quando um jogador pagar um PIX na Cakto ou você clicar em <b className="text-amber-300">"Disparar Simulação"</b>, o evento aparecerá aqui instantaneamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {webhookLogs.map((log, idx) => (
                      <div key={log.id || idx} className="bg-black/60 p-3.5 rounded-xl border border-white/10 text-xs space-y-2 hover:border-emerald-500/40 transition-all">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${log.status === 'paid' || log.status === 'approved' || log.status === 'succeeded' || log.status === 'payment.approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                              {log.status || 'EVENTO'}
                            </span>
                            <span className="font-mono font-bold text-white text-[11px]">{log.txId || 'N/A'}</span>
                            {log.amount > 0 && (
                              <span className="font-bold text-emerald-400 text-[11px]">R$ {Number(log.amount).toFixed(2)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="bg-white/5 px-1.5 py-0.5 rounded font-mono">{log.method || 'POST'}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </div>
                        {log.payload && (
                          <div className="mt-1">
                            <details className="group">
                              <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-white flex items-center gap-1 select-none font-bold">
                                <span>Ver Dados / Payload JSON</span>
                                <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
                              </summary>
                              <pre className="mt-2 bg-black p-2.5 rounded-lg border border-white/5 font-mono text-[10px] text-emerald-300 overflow-x-auto max-h-36">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Ao ligar a API Cakto, os jogadores brasileiros escolhem <b>PIX</b> na área de depósitos e geram instantaneamente o código PIX Copia e Cola, com conversão automática de USDT para Reais (R$).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveSettings({ ...settings });
                    soundService.playWin();
                    showNotification("Configurações da API Cakto salvas e ativadas com sucesso!");
                  }}
                  className="px-6 py-3.5 bg-[#049444] hover:bg-[#037235] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shrink-0 shadow-lg shadow-[#049444]/30 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Cakto API</span>
                </button>
              </div>
            </div>

            {/* CONFIGURAÇÃO DO GATEWAY PLISIO (CRIPTOMOEDAS & MULTI-CHAIN BLOCKCHAIN) */}
            <div className="bg-gradient-to-br from-[#090e17] via-[#0e1626] to-[#049444]/20 p-6 sm:p-8 rounded-3xl border border-[#FFCC00]/40 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 border border-amber-400/40 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 text-black font-black">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
                      <span>Plisio Crypto Gateway</span>
                      <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest">
                        Blockchain Multi-Chain
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Gateway automatizado para depósitos e levantamentos em USDT (TRC20, BEP20, ERC20), BTC, ETH, SOL, TRX, LTC, DOGE, BNB e TON
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestPlisio}
                    disabled={isTestingPlisio}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border border-white/10 shadow-md"
                  >
                    <RefreshCw className={`w-4 h-4 text-amber-400 ${isTestingPlisio ? 'animate-spin' : ''}`} />
                    <span>Testar Conexão Plisio</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulatePlisioWebhook}
                    className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Simular IPN Depósito</span>
                  </button>
                  
                  <label className="flex items-center gap-2 cursor-pointer bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      checked={settings.plisio?.enabled !== false}
                      onChange={(e) => saveSettings({
                        ...settings,
                        plisio: { ...(settings.plisio || { secretKey: '', whiteLabel: true, environment: 'sandbox', defaultCurrency: 'USDT_TRX', acceptedCurrencies: ['USDT_TRX', 'USDT_BSC', 'BTC', 'ETH', 'SOL', 'TRX'], depositBonusPercent: 5 }), enabled: e.target.checked }
                      })}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase text-white">Ativar Plisio Crypto</span>
                  </label>
                </div>
              </div>

              {plisioBalances && (
                <div className="bg-black/60 p-4 rounded-2xl border border-amber-500/30 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(plisioBalances).slice(0, 6).map(([curr, bal]: [string, any]) => (
                    <div key={curr} className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase block">{curr}</span>
                      <span className="text-xs font-mono font-bold text-amber-400">{typeof bal === 'object' ? (bal.balance || 0) : bal}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">
                    Ambiente Plisio
                  </label>
                  <select
                    value={settings.plisio?.environment || 'sandbox'}
                    onChange={(e) => saveSettings({
                      ...settings,
                      plisio: { ...(settings.plisio || { secretKey: '', whiteLabel: true, defaultCurrency: 'USDT_TRX', acceptedCurrencies: ['USDT_TRX', 'USDT_BSC', 'BTC', 'ETH', 'SOL', 'TRX'], depositBonusPercent: 5, enabled: true }), environment: e.target.value as any }
                    })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="sandbox">🟡 Sandbox / Simulação (Testes sem gastar crypto)</option>
                    <option value="production">🟢 Produção (Blockchain Real Plisio.net)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-amber-400 uppercase block mb-1.5">
                    Moeda Padrão de Depósito Cripto
                  </label>
                  <select
                    value={settings.plisio?.defaultCurrency || 'USDT_TRX'}
                    onChange={(e) => saveSettings({
                      ...settings,
                      plisio: { ...(settings.plisio || { secretKey: '', whiteLabel: true, environment: 'sandbox', acceptedCurrencies: ['USDT_TRX', 'USDT_BSC', 'BTC', 'ETH', 'SOL', 'TRX'], depositBonusPercent: 5, enabled: true }), defaultCurrency: e.target.value }
                    })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {SUPPORTED_PLISIO_CRYPTOS.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.icon} {c.name} ({c.network})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-400 uppercase block mb-1.5">
                    Bónus de Depósito Cripto (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={settings.plisio?.depositBonusPercent ?? 5}
                      onChange={(e) => saveSettings({
                        ...settings,
                        plisio: { ...(settings.plisio || { secretKey: '', whiteLabel: true, environment: 'sandbox', defaultCurrency: 'USDT_TRX', acceptedCurrencies: ['USDT_TRX', 'USDT_BSC', 'BTC', 'ETH', 'SOL', 'TRX'], enabled: true }), depositBonusPercent: Number(e.target.value) || 0 }
                      })}
                      className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-xs font-bold outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-400">% BÓNUS</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-yellow-400 uppercase block mb-1.5">
                    Modo de Saque Cripto
                  </label>
                  <select
                    value={settings.plisio?.withdrawMode || 'automatic'}
                    onChange={(e) => saveSettings({
                      ...settings,
                      plisio: { ...(settings.plisio || { secretKey: '', whiteLabel: true, environment: 'sandbox', defaultCurrency: 'USDT_TRX', acceptedCurrencies: ['USDT_TRX', 'USDT_BSC', 'BTC', 'ETH', 'SOL', 'TRX'], depositBonusPercent: 5, enabled: true }), withdrawMode: e.target.value as any }
                    })}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-xs outline-none focus:border-yellow-400 cursor-pointer"
                  >
                    <option value="automatic">⚡ Automático Imediato (API Plisio Payouts)</option>
                    <option value="manual">🛡️ Fila de Aprovação Manual do Admin</option>
                  </select>
                </div>
              </div>

              {/* CRIPTOMOEDAS ATIVAS */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase block tracking-wider">
                  Criptomoedas Aceitas na Plataforma ({SUPPORTED_PLISIO_CRYPTOS.length} Disponíveis)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_PLISIO_CRYPTOS.map(c => {
                    const isAccepted = (settings.plisio?.acceptedCurrencies || ['USDT_TRX', 'USDT_BSC', 'BTC', 'ETH', 'SOL', 'TRX', 'LTC', 'DOGE', 'BNB', 'TON']).includes(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          const current = settings.plisio?.acceptedCurrencies || ['USDT_TRX', 'USDT_BSC', 'BTC', 'ETH', 'SOL', 'TRX', 'LTC', 'DOGE', 'BNB', 'TON'];
                          const next = isAccepted ? current.filter(x => x !== c.code) : [...current, c.code];
                          saveSettings({
                            ...settings,
                            plisio: {
                              ...(settings.plisio || { secretKey: '', whiteLabel: true, environment: 'sandbox', defaultCurrency: 'USDT_TRX', depositBonusPercent: 5, enabled: true }),
                              acceptedCurrencies: next
                            }
                          });
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${isAccepted ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'bg-black/40 text-slate-500 border-white/5 opacity-60'}`}
                      >
                        <span>{c.icon}</span>
                        <span>{c.name}</span>
                        <span className="text-[9px] opacity-70">({c.network})</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ml-1 ${isAccepted ? 'bg-amber-400 text-black' : 'bg-white/10 text-slate-400'}`}>
                          {isAccepted ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GUIA DE INTEGRAÇÃO PLISIO & WEBHOOK IPN */}
              <div className="bg-gradient-to-r from-amber-500/10 via-black/40 to-yellow-500/10 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span>⚡ Guia de Conexão: Plisio IPN (Instant Payment Notification)</span>
                    <span className="text-[9px] bg-amber-500 text-black font-black px-2 py-0.5 rounded-full uppercase">Automatizado</span>
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Os depósitos dos jogadores geram faturas instantâneas com QR Code. Quando a rede Blockchain atinge o número mínimo de confirmações, o Plisio envia um Webhook IPN e a plataforma credita a conta do jogador automaticamente.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-black text-amber-400 uppercase block">1. URL de Callback / Webhook IPN</span>
                    <p className="text-[11px] text-slate-400">No painel do Plisio.net em <b className="text-white">API &gt; Settings</b> ou no perfil da loja, defina a URL de retorno:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-[11px] bg-amber-950/80 text-amber-300 px-2.5 py-1.5 rounded-lg border border-amber-500/30 font-mono flex-1 truncate select-all">
                        {window.location.origin}/api/plisio/webhook
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/plisio/webhook`);
                          showNotification("URL do Webhook Plisio copiada!");
                        }}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0"
                      >
                        Copiar URL
                      </button>
                    </div>
                  </div>
                  <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-400 uppercase block">2. Chave Secreta (PLISIO_SECRET_KEY)</span>
                    <p className="text-[11px] text-slate-400">Obtenha sua Chave Secreta no Plisio.net e guarde de forma segura no arquivo <code className="bg-black/80 px-1 py-0.5 rounded text-emerald-300 font-mono">.env</code> do servidor:</p>
                    <div className="mt-2">
                      <code className="text-[11px] bg-emerald-950/80 text-emerald-300 font-bold px-2.5 py-1.5 rounded border border-emerald-500/30 font-mono block text-center select-all">
                        PLISIO_SECRET_KEY=sua_chave_secreta_aqui
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    Ao ativar o Plisio, o saldo dos jogadores é transacionado diretamente em criptomoedas com QR Code automático e conversão para o saldo USDT de apostas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveSettings({ ...settings });
                    soundService.playWin();
                    showNotification("Configurações do Gateway Plisio Crypto salvas e ativadas com sucesso!");
                  }}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-xl font-black text-xs uppercase tracking-wider transition-all shrink-0 shadow-lg shadow-amber-500/30 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Plisio Gateway</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ENGINE & KERNEL SETTINGS (RTP & HOUSE ADVANTAGE) */}
          {activeTab === 'ENGINE' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
              
              <div className="bg-[#090e17] p-6 rounded-3xl border border-white/10 space-y-6">
                <h3 className="font-black text-sm uppercase text-white flex items-center gap-2 border-b border-white/10 pb-3">
                  <Cpu className="w-5 h-5 text-red-400" />
                  <span>Configuração de RTP e Algoritmo de Cassino</span>
                </h3>

                <div className="space-y-6">
                  
                  {/* RTP SLIDER */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-white">RTP Global (Return to Player)</span>
                      <span className="font-mono font-black text-emerald-400 text-lg">{settings.globalRtp}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="99"
                      value={settings.globalRtp}
                      onChange={(e) => setSettings({ ...settings, globalRtp: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">
                      Determina a percentagem média de retorno em jogos como Aviator, Minas, Slots e Roleta.
                    </p>
                  </div>

                  {/* HOUSE ADVANTAGE LEVEL */}
                  <div className="space-y-2">
                    <span className="font-extrabold text-xs text-white block">Nível de Agressividade da Casa</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['LOW', 'MEDIUM', 'EXTREME'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setSettings({ ...settings, houseAdvantageLevel: level })}
                          className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            settings.houseAdvantageLevel === level
                              ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/30'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {level === 'LOW' ? 'Baixo (Fácil)' : level === 'MEDIUM' ? 'Médio (Normal)' : 'Extremo (Hard)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FORCED AVIATOR MULTIPLIER */}
                  <div className="space-y-2">
                    <label className="font-extrabold text-xs text-white block">
                      Multiplicador Forçado no Aviator (Opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.forcedAviatorMultiplier || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        forcedAviatorMultiplier: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="Ex: 100.0 (Deixe em branco para aleatório)"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    onClick={() => saveSettings(settings)}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl transition-all cursor-pointer"
                  >
                    Salvar Parâmetros do Kernel
                  </button>

                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* MODAL: ELIMINAR USUÁRIO */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0e14] border border-red-500/30 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl shadow-red-950/50">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Eliminar Usuário Definitivamente
                </h3>
                <p className="text-xs text-red-400 font-medium">
                  Esta ação é irreversível e excluirá a conta permanentemente.
                </p>
              </div>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Nome:</span>
                <span className="font-bold text-white">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-300">{userToDelete.email || 'Não informado'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">ID / UID:</span>
                <span className="font-mono text-[11px] text-amber-400">{userToDelete.id}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Saldo Atual:</span>
                <span className="font-bold text-emerald-400">{userToDelete.balance?.toFixed(2)} USDT</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-white/5 p-3 rounded-xl border border-white/5">
              <input
                type="checkbox"
                checked={deleteUserTransactions}
                onChange={e => setDeleteUserTransactions(e.target.checked)}
                className="w-4 h-4 rounded text-red-500 focus:ring-red-500 accent-red-500"
              />
              <span>Excluir também todo o histórico de transações deste usuário</span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Conta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR SALDO / CRÉDITO MANUAL */}
      {selectedUserForCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0e14] border border-emerald-500/30 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl shadow-emerald-950/50">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Ajuste de Saldo de Usuário
                </h3>
                <p className="text-xs text-slate-400">
                  Creditando ou debitando a conta de <span className="text-emerald-400 font-bold">{selectedUserForCredit.name}</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Valor da Operação (Use negativo para debitar)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={e => setCreditAmount(e.target.value)}
                    placeholder="Ex: 50 ou -20"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold text-base outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-4 top-3.5 text-xs text-slate-400 font-bold">USDT / Kz</span>
                </div>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[10, 50, 100, 500, -10, -50].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCreditAmount(String(val))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                      val > 0 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    }`}
                  >
                    {val > 0 ? `+${val}` : `${val}`}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  placeholder="Ex: Bónus de Depósito, Correção, etc."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedUserForCredit(null);
                  setCreditAmount('');
                }}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleManualCredit}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Ajuste</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
