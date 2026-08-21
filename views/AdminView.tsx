import React, { useState, useEffect } from 'react';
import { UserAccount, TransactionRequest, GlobalSettings, PaymentMethod, P2POffer } from '../types';
import { soundService } from '../services/soundService';
import { caktoService } from '../services/caktoService';
import { plisioService, SUPPORTED_PLISIO_CRYPTOS } from '../services/plisioService';
import { db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, query, limit, deleteDoc } from 'firebase/firestore';
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
  AlertCircle
} from 'lucide-react';

interface AdminViewProps {
  onBack: () => void;
}

type AdminTab = 'DASHBOARD' | 'USERS' | 'FINANCE' | 'PAYMENTS' | 'ENGINE' | 'P2P_MARKET';

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
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserAccount | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('Ajuste Administrativo');

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

  // Delete User
  const handleDeleteUser = async (user: UserAccount) => {
    if (!window.confirm(`Tem certeza que deseja eliminar o usuário "${user.name}" (${user.email})? Esta ação é irreversível.`)) {
      return;
    }

    const updated = users.filter(u => u.id !== user.id);
    updateUsersState(updated);

    try {
      await deleteDoc(doc(db, 'users', user.id));
    } catch (e) {
      // fallback
    }

    soundService.playCrash();
    showNotification(`Usuário ${user.name} eliminado com sucesso!`);
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

  const menuItems = [
    { id: 'DASHBOARD' as AdminTab, label: 'Telemetria & Dashboard', icon: <TrendingUp className="w-5 h-5 text-cyan-400" /> },
    { id: 'USERS' as AdminTab, label: 'Gestão de Jogadores', icon: <Users className="w-5 h-5 text-emerald-400" /> },
    { id: 'FINANCE' as AdminTab, label: 'Aprovação Financeira', icon: <Wallet className="w-5 h-5 text-amber-400" /> },
    { id: 'PAYMENTS' as AdminTab, label: 'Métodos de Pagamento', icon: <CreditCard className="w-5 h-5 text-purple-400" /> },
    { id: 'ENGINE' as AdminTab, label: 'Motor & Algoritmos (RTP)', icon: <Cpu className="w-5 h-5 text-red-400" /> },
  ];

  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;
  const approvedDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED').reduce((acc, t) => acc + t.amount, 0);
  const approvedWithdrawals = transactions.filter(t => t.type === 'WITHDRAW' && t.status === 'APPROVED').reduce((acc, t) => acc + t.amount, 0);
  const totalUsersCount = users.length;
  const totalBannedCount = users.filter(u => u.isBanned).length;

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

          {/* TAB 3: FINANCIAL & TRANSACTIONS APPROVAL */}
          {activeTab === 'FINANCE' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="bg-[#090e17] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm uppercase text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    <span>Fila de Pedidos de Depósito & Levantamento</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Aprovação imediata credita ou deduz o saldo no perfil do jogador
                  </p>
                </div>

                <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black px-3.5 py-1.5 rounded-xl text-xs uppercase">
                  {transactions.filter(t => t.status === 'PENDING').length} Pendentes
                </div>
              </div>

              {/* TRANSACTIONS LIST */}
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 font-bold text-xs uppercase tracking-widest bg-[#090e17] rounded-3xl border border-white/10">
                    Nenhuma transação registada até ao momento.
                  </div>
                ) : (
                  transactions.map(t => (
                    <div
                      key={t.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                        t.status === 'PENDING'
                          ? 'bg-[#0f1724] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                          : t.status === 'APPROVED'
                          ? 'bg-[#090e17] border-emerald-500/20 opacity-90'
                          : 'bg-[#090e17] border-red-500/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-4 w-full lg:w-auto">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 font-bold ${
                          t.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {t.type === 'DEPOSIT' ? '📥' : '📤'}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-white">{t.userName}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                              t.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {t.type === 'DEPOSIT' ? 'Depósito' : 'Saque / Levantamento'}
                            </span>
                            {t.isAutomaticPayout && (
                              <span className="text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase">
                                ⚡ Plisio Automático
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {t.method} • <span className="font-mono">{t.timestamp}</span> • <span className="font-mono text-slate-500">ID: {t.id}</span>
                          </p>
                          {t.accountDetails && (
                            <p className="text-[10px] text-amber-300 font-mono mt-0.5 break-all">
                              {t.accountDetails}
                            </p>
                          )}
                          {t.txUrl && (
                            <a
                              href={t.txUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>🔗 Explorador Blockchain ({t.txHash ? t.txHash.substring(0, 12) + '...' : 'Ver Tx'})</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                        <div className="text-left lg:text-right">
                          <span className="text-[9px] text-slate-400 uppercase font-black block">Montante</span>
                          <span className={`text-xl font-mono font-black ${t.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {t.amount.toFixed(2)} USDT
                          </span>
                        </div>

                        {t.status === 'PENDING' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Option 1: Automatic Plisio Crypto Payout */}
                            {t.type === 'WITHDRAW' && (
                              <button
                                onClick={() => handleExecutePlisioPayout(t)}
                                disabled={payoutLoadingId === t.id}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Executar pagamento instantâneo via API da Plisio"
                              >
                                <span>{payoutLoadingId === t.id ? 'A Enviar...' : '⚡ Pagar via Plisio'}</span>
                              </button>
                            )}

                            {/* Option 2: Manual Approval */}
                            <button
                              onClick={() => handleResolveTransaction(t.id, 'APPROVED')}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                              title="Aprovar manualmente sem chamar API externa"
                            >
                              ✓ Aprovar Manual
                            </button>

                            {/* Option 3: Reject & Refund */}
                            <button
                              onClick={() => handleResolveTransaction(t.id, 'REJECTED')}
                              className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
                              title="Rejeitar pedido e devolver saldo ao usuário"
                            >
                              ✕ Rejeitar & Estornar
                            </button>
                          </div>
                        ) : (
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                            t.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {t.status === 'APPROVED' ? '✓ APROVADO COM SUCESSO' : '✕ REJEITADO / ESTORNADO'}
                          </span>
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
    </div>
  );
};

export default AdminView;
