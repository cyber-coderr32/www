import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpDown,
  Wallet,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Star,
  UserCheck,
  Send,
  Upload,
  X,
  PlusCircle,
  RefreshCw,
  Phone,
  Building,
  CreditCard,
  Sliders,
  Check,
  HelpCircle,
  AlertTriangle,
  Award,
  Users
} from 'lucide-react';
import { P2PCashierProfile, P2PCashierRequest, UserAccount } from '../types';
import { p2pCashierService, CashierChatMessage } from '../services/p2pCashierService';
import { soundService } from '../services/soundService';
import { userService } from '../services/userService';
import { SecureSocialChatModal } from './SecureSocialChatModal';

interface AirtmCashierHubProps {
  user: UserAccount;
  balance: number;
  usdtBalance: number;
  onUpdateBalance: (amount: number) => void;
  onUpdateUsdtBalance?: (amount: number) => void;
  showAlert: (text: string, type?: 'success' | 'error') => void;
}

const SUPPORTED_METHODS = [
  { id: 'Multicaixa Express', name: 'Multicaixa Express', country: '🇦🇴 Angola', icon: '📱', type: 'MOBILE' },
  { id: 'BAI Directo', name: 'BAI Directo', country: '🇦🇴 Angola', icon: '🏦', type: 'BANK' },
  { id: 'Unitel Money', name: 'Unitel Money', country: '🇦🇴 Angola', icon: '📲', type: 'MOBILE' },
  { id: 'BFA Net', name: 'BFA Net', country: '🇦🇴 Angola', icon: '🏛️', type: 'BANK' },
  { id: 'Atlântico Directo', name: 'Atlântico Directo', country: '🇦🇴 Angola', icon: '🏦', type: 'BANK' },
  { id: 'Banco Sol', name: 'Banco Sol', country: '🇦🇴 Angola', icon: '🏛️', type: 'BANK' },
  { id: 'PIX Brasil', name: 'PIX Brasil', country: '🇧🇷 Brasil', icon: '⚡', type: 'PIX' },
  { id: 'M-Pesa Moçambique', name: 'M-Pesa', country: '🇲🇿 Moçambique', icon: '📲', type: 'MOBILE' },
  { id: 'Wise / Revolut', name: 'Wise / Revolut', country: '🌍 Global', icon: '🌐', type: 'GLOBAL' }
];

export const AirtmCashierHub: React.FC<AirtmCashierHubProps> = ({
  user,
  balance,
  usdtBalance,
  onUpdateBalance,
  onUpdateUsdtBalance,
  showAlert
}) => {
  const [hubSubTab, setHubSubTab] = useState<'requests-board' | 'cashier-panel' | 'online-cashiers'>('requests-board');
  const [requests, setRequests] = useState<P2PCashierRequest[]>([]);
  const [cashierProfiles, setCashierProfiles] = useState<P2PCashierProfile[]>([]);
  const [myCashierProfile, setMyCashierProfile] = useState<P2PCashierProfile | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  // Create Request Modal state (Deposit / Withdraw via Cashier)
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [reqType, setReqType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [reqAmountUSDT, setReqAmountUSDT] = useState<string>('25');
  const [reqMethod, setReqMethod] = useState<string>('Multicaixa Express');
  const [reqPaymentDetails, setReqPaymentDetails] = useState<string>('');
  const [reqPhone, setReqPhone] = useState<string>(user.phone || user.whatsapp || '');
  const [submittingReq, setSubmittingReq] = useState(false);

  // Active Trade / Chat Room state
  const [activeRequest, setActiveRequest] = useState<P2PCashierRequest | null>(null);
  const [chatMessages, setChatMessages] = useState<CashierChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [proofInputUrl, setProofInputUrl] = useState('');

  // Rating modal after completion
  const [ratingTargetRequest, setRatingTargetRequest] = useState<P2PCashierRequest | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');

  // Cashier Settings Edit Modal state
  const [isCashierConfigOpen, setIsCashierConfigOpen] = useState(false);
  const [configMethods, setConfigMethods] = useState<string[]>(['Multicaixa Express', 'BAI Directo', 'Unitel Money']);
  const [configCommission, setConfigCommission] = useState<number>(2.5);
  const [configMin, setConfigMin] = useState<number>(5);
  const [configMax, setConfigMax] = useState<number>(1000);
  const [configBankNote, setConfigBankNote] = useState<string>('');
  const [configWhatsapp, setConfigWhatsapp] = useState<string>(user.whatsapp || user.phone || '');

  const currentUserId = user?.id || 'guest_user';

  // Sincronizar Solicitações
  useEffect(() => {
    const unsub = p2pCashierService.subscribeToRequests((reqs) => {
      setRequests(reqs);
      // Se há um activeRequest aberto, atualiza ele
      if (activeRequest) {
        const updated = reqs.find(r => r.id === activeRequest.id);
        if (updated) setActiveRequest(updated);
      }
    });

    // Carregar Caixas
    const profiles = p2pCashierService.getLocalCashierProfiles();
    setCashierProfiles(profiles);

    // Carregar meu perfil de caixa
    p2pCashierService.getCashierProfile(currentUserId).then((prof) => {
      if (prof) {
        setMyCashierProfile(prof);
        setConfigMethods(prof.acceptedMethods || []);
        setConfigCommission(prof.commissionRate || 2.5);
        setConfigMin(prof.minAmount || 5);
        setConfigMax(prof.maxAmount || 1000);
        setConfigBankNote(prof.bankDetailsNote || '');
        setConfigWhatsapp(prof.whatsapp || user.whatsapp || '');
      }
    });

    return () => unsub();
  }, [currentUserId]);

  // Sincronizar Chat da Ordem Ativa
  useEffect(() => {
    if (!activeRequest) return;
    const unsubChat = p2pCashierService.subscribeToChat(activeRequest.id, (msgs) => {
      setChatMessages(msgs);
    });
    return () => unsubChat();
  }, [activeRequest?.id]);

  // Toggle Modo Caixa (Online / Pausa)
  const handleToggleCashierOnline = async () => {
    soundService.playUISelect();
    const newStatus = !myCashierProfile?.isOnline;

    if (!myCashierProfile) {
      // Criar perfil pela primeira vez
      const newProf = await p2pCashierService.saveCashierProfile({
        userId: currentUserId,
        userName: user.name || 'Caixa P2P',
        userAvatarColor: user.avatarColor || 'bg-emerald-600',
        whatsapp: user.whatsapp || user.phone || '+244 923 000 000',
        isOnline: true,
        acceptedMethods: configMethods,
        commissionRate: configCommission,
        minAmount: configMin,
        maxAmount: configMax,
        bankDetailsNote: configBankNote || 'Multicaixa Express / BAI Directo',
        totalTrades: 0,
        completedTrades: 0,
        totalVolumeUSDT: 0,
        totalEarnedCommissionsUSDT: 0,
        rating: 5.0,
        ratingCount: 1,
        avgResponseTimeMinutes: 2
      });
      setMyCashierProfile(newProf);
      showAlert('Modo Caixa Ativado! Já podes atender solicitações e lucrar com comissões.', 'success');
      return;
    }

    await p2pCashierService.toggleCashierOnline(currentUserId, newStatus);
    setMyCashierProfile(prev => prev ? { ...prev, isOnline: newStatus } : null);
    showAlert(newStatus ? 'Status: ONLINE (Pronto para receber pedidos)' : 'Status: EM PAUSA (Nenhum pedido novo será atribuído)', 'success');
  };

  // Salvar Configurações do Caixa
  const handleSaveCashierConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    soundService.playWin();

    const saved = await p2pCashierService.saveCashierProfile({
      userId: currentUserId,
      userName: user.name || 'Caixa P2P',
      userAvatarColor: user.avatarColor || 'bg-emerald-600',
      whatsapp: configWhatsapp,
      isOnline: myCashierProfile?.isOnline ?? true,
      acceptedMethods: configMethods,
      commissionRate: Number(configCommission),
      minAmount: Number(configMin),
      maxAmount: Number(configMax),
      bankDetailsNote: configBankNote
    });

    setMyCashierProfile(saved);
    setIsCashierConfigOpen(false);
    showAlert('Configurações de Caixa Salvas com Sucesso!', 'success');
  };

  // Submeter Pedido de Depósito ou Saque (Usuário Comum)
  const handleCreateCashierRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(reqAmountUSDT);
    if (!amountVal || amountVal <= 0) {
      showAlert('Informe um valor de USDT válido.', 'error');
      return;
    }

    // Se for Saque, verifica saldo
    if (reqType === 'WITHDRAW' && amountVal > usdtBalance) {
      showAlert(`Saldo insuficiente na Carteira P2P (${usdtBalance.toFixed(2)} USDT).`, 'error');
      return;
    }

    if (!reqPaymentDetails.trim()) {
      showAlert('Insira os dados da sua conta bancária/número para a transação.', 'error');
      return;
    }

    setSubmittingReq(true);
    soundService.playUISelect();

    // Taxa de câmbio AOA padrão: 1200 AOA / 1 USDT (ou conversão BRL caso PIX)
    let fiatAmount = amountVal * 1200;
    let fiatCurrency: 'AOA' | 'BRL' | 'EUR' | 'USD' = 'AOA';
    if (reqMethod.includes('PIX')) {
      fiatAmount = amountVal * 5.85;
      fiatCurrency = 'BRL';
    }

    const commissionEst = Number((amountVal * 0.025).toFixed(2));

    try {
      const created = await p2pCashierService.createRequest({
        requesterId: currentUserId,
        requesterName: user.name || 'Cliente CryptonBet',
        requesterPhone: reqPhone,
        requesterAvatarColor: user.avatarColor || 'bg-blue-600',
        type: reqType,
        amountUSDT: amountVal,
        fiatAmount: Number(fiatAmount.toFixed(2)),
        fiatCurrency,
        paymentMethod: reqMethod,
        userPaymentDetails: reqPaymentDetails,
        commissionAmountUSDT: commissionEst
      });

      // Se for Saque, deduz provisoriamente o USDT para Escrow
      if (reqType === 'WITHDRAW' && onUpdateUsdtBalance) {
        onUpdateUsdtBalance(usdtBalance - amountVal);
      }

      setIsCreateRequestModalOpen(false);
      setActiveRequest(created);
      showAlert(`Solicitação de ${reqType === 'DEPOSIT' ? 'Depósito' : 'Saque'} criada! Caixas online foram notificados.`, 'success');
    } catch (e) {
      console.error(e);
      showAlert('Erro ao criar solicitação.', 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

  // Caixa aceita o pedido de um cliente
  const handleCashierAccept = async (req: P2PCashierRequest) => {
    if (!myCashierProfile?.isOnline) {
      showAlert('Ativa o teu Modo Caixa para aceitar solicitações!', 'error');
      return;
    }

    // Se o pedido for de DEPOSITO, o Caixa precisa ter USDT para fornecer em Escrow ao cliente!
    if (req.type === 'DEPOSIT' && usdtBalance < req.amountUSDT) {
      showAlert(`Precisas de pelo menos ${req.amountUSDT.toFixed(2)} USDT na tua carteira P2P para fornecer liquidez.`, 'error');
      return;
    }

    soundService.playWin();

    const cashierDetails = myCashierProfile.bankDetailsNote || 'Multicaixa Express / BAI Directo';
    await p2pCashierService.acceptRequest(
      req.id,
      currentUserId,
      user.name || 'Caixa Autorizado',
      cashierDetails,
      myCashierProfile.whatsapp || user.phone || '',
      user.avatarColor || 'bg-emerald-600'
    );

    // Mensagem de boas-vindas do sistema no chat
    await p2pCashierService.sendMessage(
      req.id,
      'system',
      'Airtm Escrow Bot',
      `🤝 O Caixa ${user.name} aceitou a solicitação. Os fundos de ${req.amountUSDT} USDT estão bloqueados com segurança em Escrow. Por favor, utilizem o chat para confirmar dados e enviar comprovativos.`,
      true
    );

    showAlert(`Solicitação Aceita! Abrindo sala de negociação segura com ${req.requesterName}...`, 'success');
    setActiveRequest({ ...req, status: 'MATCHED', matchedCashierId: currentUserId });
  };

  // Enviar Mensagem no Chat da Negociação
  const handleSendChatMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRequest) return;
    soundService.playTick();
    const text = chatInput.trim();
    setChatInput('');

    await p2pCashierService.sendMessage(
      activeRequest.id,
      currentUserId,
      user.name || 'Trader',
      text
    );
  };

  // Marcar como Pago (anexar comprovativo)
  const handleMarkPaid = async () => {
    if (!activeRequest) return;
    soundService.playUISelect();

    const proof = proofInputUrl.trim() || 'Comprovante Bancário Validado (Multicaixa/BAI/PIX)';
    await p2pCashierService.markAsPaid(activeRequest.id, proof);

    await p2pCashierService.sendMessage(
      activeRequest.id,
      'system',
      'Sistema Escrow',
      `📸 Comprovativo de pagamento submetido por ${user.name}. A outra parte deve conferir o extrato bancário antes de confirmar a liberação.`,
      true
    );

    showAlert('Pagamento marcado como efetuado!', 'success');
    setActiveRequest(prev => prev ? { ...prev, status: 'PAID', paymentProofUrl: proof } : null);
  };

  // Confirmar e Liberar Fundos (Quem recebe o dinheiro externo confirma o recebimento na conta)
  const handleConfirmAndRelease = async () => {
    if (!activeRequest) return;
    soundService.playWin();

    await p2pCashierService.completeRequest(activeRequest.id, 5, 'Transação concluída com sucesso');

    // Se sou o cliente que depositou (recebe USDT na carteira)
    if (activeRequest.type === 'DEPOSIT' && activeRequest.requesterId === currentUserId && onUpdateUsdtBalance) {
      onUpdateUsdtBalance(usdtBalance + activeRequest.amountUSDT);
    }

    // Se sou o Caixa que intermediou (recebe comissão em USDT)
    if (activeRequest.matchedCashierId === currentUserId && onUpdateUsdtBalance) {
      onUpdateUsdtBalance(usdtBalance + (activeRequest.commissionAmountUSDT || 1.25));
    }

    await p2pCashierService.sendMessage(
      activeRequest.id,
      'system',
      'Sistema Escrow',
      `🎉 Transação concluída com sucesso! Os fundos foram liberados para as respectivas carteiras.`,
      true
    );

    showAlert('Fundos Liberados com Sucesso! A transação foi finalizada.', 'success');
    setRatingTargetRequest(activeRequest);
    setActiveRequest(null);
  };

  // Submeter Avaliação do Caixa / Cliente
  const handleSubmitRating = () => {
    if (!ratingTargetRequest) return;
    soundService.playWin();
    showAlert(`Avaliação de ${selectedRating} estrelas enviada! Obrigado pelo feedback.`, 'success');
    setRatingTargetRequest(null);
  };

  // Cancelar Solicitação
  const handleCancelRequest = async (reqId: string) => {
    soundService.playUISelect();
    await p2pCashierService.cancelRequest(reqId);
    showAlert('Solicitação cancelada com sucesso.', 'success');
    if (activeRequest?.id === reqId) setActiveRequest(null);
  };

  // Abrir Disputa
  const handleDispute = async (reqId: string) => {
    const reason = window.prompt('Descreva o motivo da contestação/disputa:');
    if (!reason) return;
    soundService.playUISelect();
    await p2pCashierService.disputeRequest(reqId, reason, currentUserId);
    showAlert('Disputa aberta! A moderação CryptonBet intervirá na mediação.', 'success');
  };

  // Filtragem de solicitações abertas
  const filteredRequests = requests.filter(r => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (filterMethod !== 'ALL' && !r.paymentMethod.toLowerCase().includes(filterMethod.toLowerCase())) return false;
    return true;
  });

  const myActiveOrders = requests.filter(r => 
    (r.requesterId === currentUserId || r.matchedCashierId === currentUserId) &&
    r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* BANNER PRINCIPAL AIRTM CASHIER NETWORK */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0c1924] via-[#10202f] to-[#0a1219] border border-[#FFCC00]/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-[#049444]/20 to-[#FFCC00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#049444]/20 border border-[#049444]/40 text-[#049444] text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5" />
              <span>Rede de Caixas P2P & Mediação Airtm</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Depósitos, Saques Rápidos & <span className="text-[#FFCC00]">Ganhe como Caixa</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Conecte-se instantaneamente a caixas locais em Angola, Moçambique e Brasil para adicionar ou retirar saldo via Multicaixa Express, BAI, Unitel Money ou PIX. Ou <strong>trabalhe como caixa</strong> e ganhe comissões a cada transação mediada!
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                soundService.playUISelect();
                setReqType('DEPOSIT');
                setIsCreateRequestModalOpen(true);
              }}
              className="flex-1 md:flex-initial px-5 py-3.5 bg-gradient-to-r from-[#049444] to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Pedir Depósito / Saque</span>
            </button>

            <button
              onClick={() => {
                soundService.playUISelect();
                setHubSubTab('cashier-panel');
              }}
              className="flex-1 md:flex-initial px-5 py-3.5 bg-gradient-to-r from-[#FFCC00] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Trabalhar como Caixa</span>
            </button>
          </div>
        </div>

        {/* MINHAS ORDENS EM ANDAMENTO BANNER (SE HOUVER) */}
        {myActiveOrders.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <span className="text-[10px] font-black text-[#FFCC00] uppercase tracking-wider block mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Tens {myActiveOrders.length} transação(ões) ativa(s) em andamento:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myActiveOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => {
                    soundService.playTick();
                    setActiveRequest(order);
                  }}
                  className="bg-black/60 hover:bg-black/80 border border-[#FFCC00]/40 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                      order.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {order.type === 'DEPOSIT' ? 'DEP' : 'SAQ'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase">{order.paymentMethod}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-mono bg-white/10 text-[#FFCC00]">
                          {order.amountUSDT} USDT ({order.fiatAmount.toLocaleString()} {order.fiatCurrency})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Status: <strong className="text-emerald-400">{order.status}</strong> • Clique para abrir Chat Escrow
                      </span>
                    </div>
                  </div>
                  <MessageSquare className="w-5 h-5 text-slate-400 group-hover:text-[#FFCC00] transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SUB-ABAS DO HUB AIRTM */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex bg-[#131d27] p-1.5 rounded-2xl border border-white/5">
          {[
            { id: 'requests-board', label: 'Mural de Solicitações', icon: <ArrowUpDown className="w-4 h-4" /> },
            { id: 'cashier-panel', label: 'Painel do Caixa Pro', icon: <Award className="w-4 h-4" /> },
            { id: 'online-cashiers', label: 'Caixas Online Verificados', icon: <Users className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                soundService.playTick();
                setHubSubTab(tab.id as any);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                hubSubTab === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* COTAÇÃO DE CÂMBIO OFICIAL */}
        <div className="flex items-center gap-3 text-xs bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Cotação P2P Oficial:</span>
          <span className="font-mono font-black text-[#FFCC00]">1 USDT = 1,200 AOA</span>
          <span className="text-slate-500 font-bold">|</span>
          <span className="font-mono font-black text-emerald-400">1 USDT = 5.85 BRL (PIX)</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: MURAL DE SOLICITAÇÕES (PEDIDOS DE DEPÓSITO E SAQUE DA COMUNIDADE)  */}
      {/* ========================================================================= */}
      {hubSubTab === 'requests-board' && (
        <div className="space-y-6">
          {/* FILTROS E BARRA DE AÇÃO */}
          <div className="bg-[#131d27] border border-white/5 p-4 rounded-3xl flex flex-wrap justify-between items-center gap-4 shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Filtrar por:</span>
              {(['ALL', 'DEPOSIT', 'WITHDRAW'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
                    filterType === t
                      ? 'bg-[#049444] text-white shadow-md'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {t === 'ALL' ? 'Todos os Pedidos' : t === 'DEPOSIT' ? '📥 Precisa de Depósito' : '📤 Precisa de Saque'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#049444]"
              >
                <option value="ALL">Todos os Métodos Bancários</option>
                {SUPPORTED_METHODS.map(m => (
                  <option key={m.id} value={m.name}>{m.icon} {m.name} ({m.country})</option>
                ))}
              </select>

              <button
                onClick={() => {
                  soundService.playUISelect();
                  setIsCreateRequestModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Criar Meu Pedido</span>
              </button>
            </div>
          </div>

          {/* LISTA DE SOLICITAÇÕES */}
          {filteredRequests.filter(r => r.status === 'OPEN').length === 0 ? (
            <div className="bg-[#131d27] border border-white/5 rounded-[2.5rem] p-12 text-center space-y-4">
              <div className="text-5xl">⚡</div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase text-white tracking-wide">
                  Nenhum pedido aberto no momento
                </h3>
                <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                  Todos os pedidos foram atendidos pelos caixas. Se você precisa de depósito ou saque, crie sua solicitação agora mesmo!
                </p>
              </div>
              <button
                onClick={() => {
                  soundService.playUISelect();
                  setIsCreateRequestModalOpen(true);
                }}
                className="px-6 py-3 bg-[#049444] hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Criar Solicitação P2P</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRequests
                .filter(r => r.status === 'OPEN')
                .map(req => {
                  const isMine = req.requesterId === currentUserId;
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#131d27] border border-white/10 hover:border-[#FFCC00]/40 rounded-[2rem] p-5 space-y-4 shadow-xl transition-all relative overflow-hidden group flex flex-col justify-between"
                    >
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs ${req.requesterAvatarColor || 'bg-blue-600'}`}>
                            {req.requesterName.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-black text-white uppercase block truncate max-w-[140px]">
                              {req.requesterName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" /> Aberto há instantes
                            </span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                          req.type === 'DEPOSIT'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {req.type === 'DEPOSIT' ? '📥 Depósito' : '📤 Saque'}
                        </span>
                      </div>

                      {/* Values info */}
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400 font-bold uppercase">Valor em USDT:</span>
                          <span className="font-mono font-black text-white text-base">{req.amountUSDT.toFixed(2)} USDT</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400 font-bold uppercase">Valor Moeda Local:</span>
                          <span className="font-mono font-black text-[#FFCC00] text-sm">
                            {req.fiatAmount.toLocaleString()} {req.fiatCurrency}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Método:</span>
                          <span className="text-xs font-black text-slate-200">{req.paymentMethod}</span>
                        </div>
                        {req.commissionAmountUSDT > 0 && (
                          <div className="flex justify-between items-center text-emerald-400 text-[10px] font-bold">
                            <span>Comissão para o Caixa:</span>
                            <span className="font-mono font-black">+{req.commissionAmountUSDT.toFixed(2)} USDT</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {isMine ? (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Cancelar Meu Pedido
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCashierAccept(req)}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#049444] to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
                          >
                            <Zap className="w-4 h-4" />
                            <span>Aceitar como Caixa & Lucrar</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: PAINEL DO CAIXA PRO (TRABALHAR COMO CAIXA / EARN COMMISSIONS)      */}
      {/* ========================================================================= */}
      {hubSubTab === 'cashier-panel' && (
        <div className="space-y-6">

          {/* STATUS DO CAIXA & DASHBOARD CONTROLS */}
          <div className="bg-[#131d27] border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg border border-white/20 ${myCashierProfile?.userAvatarColor || 'bg-emerald-600'}`}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white uppercase">{user.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Caixa Airtm Verificado
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Forneça liquidez para usuários da plataforma e receba comissões automáticas em USDT.
                  </p>
                </div>
              </div>

              {/* ONLINE / PAUSE TOGGLE BUTTON */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setIsCashierConfigOpen(true)}
                  className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Configurações</span>
                </button>

                <button
                  onClick={handleToggleCashierOnline}
                  className={`flex-1 md:flex-initial px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    myCashierProfile?.isOnline
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-emerald-950/40'
                      : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${myCashierProfile?.isOnline ? 'bg-black animate-pulse' : 'bg-red-500'}`} />
                  <span>{myCashierProfile?.isOnline ? 'Modo Caixa: ONLINE (Ativo)' : 'Modo Caixa: EM PAUSA'}</span>
                </button>
              </div>
            </div>

            {/* STATS COUNTERS DO CAIXA */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Comissões Ganhas</span>
                <span className="text-lg font-mono font-black text-[#049444] block mt-1">
                  ${(myCashierProfile?.totalEarnedCommissionsUSDT || 0).toFixed(2)} <span className="text-xs">USDT</span>
                </span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume Intermediado</span>
                <span className="text-lg font-mono font-black text-[#FFCC00] block mt-1">
                  ${(myCashierProfile?.totalVolumeUSDT || 0).toLocaleString()} <span className="text-xs">USDT</span>
                </span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ordens Concluídas</span>
                <span className="text-lg font-mono font-black text-white block mt-1">
                  {myCashierProfile?.completedTrades || 0}
                </span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Reputação / Rating</span>
                <span className="text-lg font-mono font-black text-amber-400 block mt-1 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" /> {(myCashierProfile?.rating || 5.0).toFixed(2)}
                </span>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center col-span-2 md:col-span-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Taxa de Comissão</span>
                <span className="text-lg font-mono font-black text-teal-400 block mt-1">
                  {myCashierProfile?.commissionRate || 2.5}%
                </span>
              </div>
            </div>

            {/* MÉTODOS ATIVOS DO CAIXA */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Métodos bancários onde você está operando com liquidez:
              </span>
              <div className="flex flex-wrap gap-2">
                {(myCashierProfile?.acceptedMethods || configMethods).map(m => (
                  <span key={m} className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5">
                    <span>✓</span> {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RADAR DE SOLICITAÇÕES AO VIVO PARA O CAIXA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FFCC00]" />
                Radar de Pedidos Disponíveis para Você Atender
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {requests.filter(r => r.status === 'OPEN').length} solicitação(ões) aberta(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.filter(r => r.status === 'OPEN').map(req => (
                <div
                  key={req.id}
                  className="bg-[#131d27] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                      req.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {req.type === 'DEPOSIT' ? 'Cliente Quer Depositar' : 'Cliente Quer Sacar'}
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      Lucro: +${(req.commissionAmountUSDT || 1.25).toFixed(2)} USDT
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cliente:</span>
                      <span className="font-bold text-white">{req.requesterName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor em USDT:</span>
                      <span className="font-mono font-black text-white">{req.amountUSDT} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Moeda Local:</span>
                      <span className="font-mono font-black text-[#FFCC00]">
                        {req.fiatAmount.toLocaleString()} {req.fiatCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Método:</span>
                      <span className="font-bold text-slate-200">{req.paymentMethod}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCashierAccept(req)}
                    className="w-full py-2.5 rounded-xl bg-[#049444] hover:bg-[#037235] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Pegar Pedido & Faturar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CAIXAS ONLINE VERIFICADOS (DIRETÓRIO DE MEDIADORES AIRTM)          */}
      {/* ========================================================================= */}
      {hubSubTab === 'online-cashiers' && (
        <div className="space-y-6">
          <div className="bg-[#131d27] border border-white/5 p-4 rounded-3xl flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-white uppercase">Caixas Verificados da Comunidade</h3>
              <p className="text-xs text-slate-400">Negocie com caixas profissionais com reputação e velocidade comprovadas.</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              {cashierProfiles.filter(p => p.isOnline).length} Caixas Online Agora
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cashierProfiles.map(cashier => (
              <div
                key={cashier.id}
                className="bg-[#131d27] border border-white/10 hover:border-[#FFCC00]/40 rounded-[2rem] p-6 space-y-4 shadow-xl transition-all relative overflow-hidden group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm ${cashier.userAvatarColor || 'bg-blue-600'}`}>
                        {cashier.userName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase truncate max-w-[150px]">{cashier.userName}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{cashier.rating.toFixed(2)} ({cashier.ratingCount} avaliações)</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 bg-black/40 p-3 rounded-2xl text-center border border-white/5">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Ordens</span>
                      <span className="text-xs font-mono font-bold text-white">{cashier.completedTrades}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Comissão</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{cashier.commissionRate}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Tempo Médio</span>
                      <span className="text-xs font-mono font-bold text-teal-400">{cashier.avgResponseTimeMinutes} min</span>
                    </div>
                  </div>

                  {/* Accepted methods */}
                  <div className="mt-4 space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Métodos Atendidos:</span>
                    <div className="flex flex-wrap gap-1">
                      {cashier.acceptedMethods.map(m => (
                        <span key={m} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/5 border border-white/10 text-slate-300">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundService.playUISelect();
                    setIsCreateRequestModalOpen(true);
                    if (cashier.acceptedMethods.length > 0) {
                      setReqMethod(cashier.acceptedMethods[0]);
                    }
                  }}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Solicitar Câmbio com este Caixa</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR NOVA SOLICITAÇÃO (DEPÓSITO OU SAQUE AIRTM)                   */}
      {/* ========================================================================= */}
      {isCreateRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0e14] border border-white/15 rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#049444] to-emerald-600 text-white flex items-center justify-center shadow-lg">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Criar Solicitação P2P Airtm
                  </h3>
                  <p className="text-xs text-slate-400">Um caixa online atenderá seu pedido em instantes.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateRequestModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCashierRequest} className="space-y-4">
              {/* TIPO DE OPERAÇÃO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  O que você deseja fazer?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReqType('DEPOSIT')}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      reqType === 'DEPOSIT'
                        ? 'bg-[#049444] text-white border-emerald-500 shadow-lg shadow-emerald-950/50'
                        : 'bg-black/50 text-slate-400 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span>Quero Depositar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReqType('WITHDRAW')}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      reqType === 'WITHDRAW'
                        ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/50'
                        : 'bg-black/50 text-slate-400 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Quero Sacar</span>
                  </button>
                </div>
              </div>

              {/* SELEÇÃO DO MÉTODO DE PAGAMENTO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Método de Pagamento Bancário / Mobile
                </label>
                <select
                  value={reqMethod}
                  onChange={e => setReqMethod(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-[#049444]"
                >
                  {SUPPORTED_METHODS.map(m => (
                    <option key={m.id} value={m.name}>
                      {m.icon} {m.name} ({m.country})
                    </option>
                  ))}
                </select>
              </div>

              {/* VALOR EM USDT */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Valor em USDT
                  </label>
                  {reqType === 'WITHDRAW' && (
                    <span className="text-[11px] text-slate-400">
                      Disponível: <strong className="text-emerald-400">{usdtBalance.toFixed(2)} USDT</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="5"
                    value={reqAmountUSDT}
                    onChange={e => setReqAmountUSDT(e.target.value)}
                    placeholder="Ex: 25"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono font-black text-base outline-none focus:border-[#049444]"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-black text-[#FFCC00]">USDT</span>
                </div>

                {/* Quick amount chips */}
                <div className="flex gap-2 pt-1">
                  {[10, 25, 50, 100, 250].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setReqAmountUSDT(String(val))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono font-bold text-slate-300 border border-white/5 cursor-pointer"
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* ESTIMATIVA EM MOEDA LOCAL */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total a Pagar / Receber em Kwanza (AOA):</span>
                  <span className="font-mono font-black text-[#FFCC00]">
                    {((parseFloat(reqAmountUSDT) || 0) * (reqMethod.includes('PIX') ? 5.85 : 1200)).toLocaleString()} {reqMethod.includes('PIX') ? 'BRL' : 'AOA'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Taxa de Câmbio Fixada:</span>
                  <span className="font-mono font-bold">{reqMethod.includes('PIX') ? '1 USDT = 5.85 BRL' : '1 USDT = 1,200 AOA'}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-400">
                  <span>Garantia de Custódia:</span>
                  <span className="font-bold">100% Protegido em Escrow</span>
                </div>
              </div>

              {/* DADOS BANCÁRIOS OU TELEFONE DO USUÁRIO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {reqType === 'DEPOSIT'
                    ? 'Seu Número de Telefone / Identificador para contato'
                    : 'Seus Dados Bancários para Receber o Dinheiro (IBAN / Número Express / Chave PIX)'}
                </label>
                <textarea
                  rows={2}
                  value={reqPaymentDetails}
                  onChange={e => setReqPaymentDetails(e.target.value)}
                  placeholder={reqType === 'DEPOSIT'
                    ? 'Ex: Multicaixa Express 923 000 000 (Meu Nome)'
                    : 'Ex: BAI IBAN AO06 0040 0000 ... ou Chave PIX'}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs outline-none focus:border-[#049444]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRequestModalOpen(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="flex-1 py-3 bg-gradient-to-r from-[#049444] to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingReq ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Publicar Pedido</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURAÇÃO DO CAIXA (TAXAS, MÉTODOS E LIMITES)                   */}
      {/* ========================================================================= */}
      {isCashierConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0e14] border border-white/15 rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-[#FFCC00] text-black flex items-center justify-center shadow-lg">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Configurar Perfil de Caixa
                  </h3>
                  <p className="text-xs text-slate-400">Defina seus métodos bancários e taxas de comissão.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCashierConfigOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCashierConfig} className="space-y-4">
              {/* MÉTODOS QUE O CAIXA ATENDE */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Selecione os métodos bancários onde você possui saldo/conta:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {SUPPORTED_METHODS.map(m => {
                    const isSelected = configMethods.includes(m.name);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setConfigMethods(configMethods.filter(item => item !== m.name));
                          } else {
                            setConfigMethods([...configMethods, m.name]);
                          }
                        }}
                        className={`p-2.5 rounded-xl text-left text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#049444]/20 text-white border-[#049444]'
                            : 'bg-black/40 text-slate-400 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{m.icon} {m.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#049444]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAXA DE COMISSÃO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sua Margem de Comissão de Caixa (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={configCommission}
                    onChange={e => setConfigCommission(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono font-bold text-base outline-none focus:border-[#049444]"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-black text-emerald-400">% Por Ordem</span>
                </div>
              </div>

              {/* LIMITES MIN / MAX */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Limite Mínimo (USDT)
                  </label>
                  <input
                    type="number"
                    value={configMin}
                    onChange={e => setConfigMin(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-mono font-bold text-sm outline-none focus:border-[#049444]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Limite Máximo (USDT)
                  </label>
                  <input
                    type="number"
                    value={configMax}
                    onChange={e => setConfigMax(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-mono font-bold text-sm outline-none focus:border-[#049444]"
                  />
                </div>
              </div>

              {/* DADOS BANCÁRIOS PADRÃO DO CAIXA */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Instruções e Contas Bancárias Padrão (Enviadas ao Cliente)
                </label>
                <textarea
                  rows={2}
                  value={configBankNote}
                  onChange={e => setConfigBankNote(e.target.value)}
                  placeholder="Ex: Multicaixa Express: 923 000 000 | BAI IBAN: AO06 0040 0000 0000 0000 0"
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs outline-none focus:border-[#049444]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashierConfigOpen(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#FFCC00] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  Salvar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SALA DE NEGOCIAÇÃO AIRTM ESCROW / CHAT DA ORDEM ATIVA                     */}
      {/* ========================================================================= */}
      {activeRequest && (
        <SecureSocialChatModal
          isOpen={true}
          onClose={() => setActiveRequest(null)}
          partner={{
            id: currentUserId === activeRequest.requesterId ? (activeRequest.matchedCashierId || 'cashier') : activeRequest.requesterId,
            name: currentUserId === activeRequest.requesterId ? (activeRequest.matchedCashierName || 'Caixa Airtm') : activeRequest.requesterName,
            roleBadge: currentUserId === activeRequest.requesterId ? 'Caixa Verificado Airtm' : 'Cliente Solicitante',
            verified: true,
            rating: 5.0
          }}
          currentUser={{
            id: currentUserId,
            name: user.name || 'Você'
          }}
          tradeContext={{
            tradeId: activeRequest.id,
            type: activeRequest.type === 'DEPOSIT' ? 'BUY' : 'SELL',
            amountUSDT: activeRequest.amountUSDT,
            fiatAmount: activeRequest.fiatAmount,
            fiatCurrency: activeRequest.fiatCurrency,
            paymentMethod: activeRequest.paymentMethod,
            paymentDetails: activeRequest.cashierPaymentDetails || activeRequest.userPaymentDetails,
            status: activeRequest.status,
            buyerName: activeRequest.type === 'DEPOSIT' ? activeRequest.requesterName : activeRequest.matchedCashierName,
            sellerName: activeRequest.type === 'DEPOSIT' ? activeRequest.matchedCashierName : activeRequest.requesterName,
            isCashierMatch: true
          }}
          onStatusAction={(actionType) => {
            if (actionType === 'MARK_PAID') {
              handleMarkPaid();
            } else if (actionType === 'RELEASE_ESCROW') {
              handleConfirmAndRelease();
            } else if (actionType === 'DISPUTE') {
              handleDispute(activeRequest.id);
            }
          }}
          onReportFraud={(partnerId, reason) => {
            handleDispute(activeRequest.id);
            showAlert(`Denúncia por "${reason}" registrada no suporte para mediação de segurança.`, 'error');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: AVALIAÇÃO DO CAIXA APÓS A OPERAÇÃO                                 */}
      {/* ========================================================================= */}
      {ratingTargetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0e14] border border-[#FFCC00]/30 rounded-[2.5rem] w-full max-w-md p-6 space-y-5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-[#FFCC00] text-black flex items-center justify-center mx-auto shadow-xl">
              <Star className="w-8 h-8 fill-black" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Como foi o atendimento?
              </h3>
              <p className="text-xs text-slate-400">
                Avalie a velocidade e suporte do seu Caixa nesta negociação.
              </p>
            </div>

            {/* Star selector */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="p-1 cursor-pointer transition-transform hover:scale-125"
                >
                  <Star className={`w-8 h-8 ${star <= selectedRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Deixe um comentário positivo (opcional)..."
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white outline-none focus:border-[#049444]"
            />

            <button
              onClick={handleSubmitRating}
              className="w-full py-3 bg-gradient-to-r from-[#049444] to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              Enviar Avaliação
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
