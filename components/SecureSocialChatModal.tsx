import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Mic,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Reply,
  CornerDownRight,
  Edit3,
  Trash2,
  Lock,
  Flag,
  Info,
  Phone,
  Video,
  Copy,
  Check,
  Sparkles,
  Zap,
  Wallet,
  Clock,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { AudioVoicePlayer } from './AudioVoicePlayer';
import { AudioVoiceRecorder } from './AudioVoiceRecorder';

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarColor?: string;
  text: string;
  time: string;
  audioUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
  isSystem?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions?: { [emoji: string]: string[] };
  isEdited?: boolean;
  isDeleted?: boolean;
  fraudWarning?: boolean;
}

export interface TradeContextInfo {
  tradeId: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'ESCROW' | 'PRODUCT_SALE';
  amountUSDT: number;
  fiatAmount?: number;
  fiatCurrency?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  status: string;
  isCashierMatch?: boolean;
  buyerName?: string;
  sellerName?: string;
}

interface SecureSocialChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: {
    id: string;
    name: string;
    email?: string;
    avatarColor?: string;
    roleBadge?: string;
    verified?: boolean;
    rating?: number;
    phone?: string;
    whatsapp?: string;
  };
  currentUser: {
    id: string;
    name: string;
    avatarColor?: string;
  };
  tradeContext?: TradeContextInfo;
  onSendP2PTransfer?: (amount: number) => void;
  onReportFraud?: (partnerId: string, reason: string) => void;
  storageKeyPrefix?: string;
  onStatusAction?: (actionType: 'MARK_PAID' | 'RELEASE_ESCROW' | 'DISPUTE') => void;
}

// Off-platform detection patterns (Strict In-App Enforcement)
const OFF_PLATFORM_KEYWORDS = [
  'whatsapp', 'whats', 'zap', 'zapzap', 'wpp', 'telegram', 'telegran', 't.me', 'wa.me',
  'signal', 'discord', 'viber', 'skype', 'instagram', 'facebook',
  'por fora', 'fora do app', 'fora da plataforma', 'sem escrow', 'sem intermediario', 
  'sem intermediário', 'manda no privado', 'chama no zap', 'chama no whats', 'chama no telegram',
  'chama lá', 'chama la', 'me liga', 'meu contato', 'meu contacto', 'meu numero', 'meu número',
  'teu contato', 'teu contacto', 'teu numero', 'teu número', 'passa o zap', 'passa o numero',
  'passa o número', 'pagar por fora', 'transferir por fora', 'pix direto sem ordem',
  'deposito por fora', 'depósito por fora', 'cancela a ordem e faz por fora',
  'codigo sms', 'código sms', 'senha', 'chave de seguranca', 'chave privada'
];

export const checkOffPlatformAttempt = (text: string): { isOffPlatform: boolean; reason?: string } => {
  const clean = text.toLowerCase();

  // 1. Check for URL patterns
  const urlPattern = /(https?:\/\/|www\.|wa\.me\/|t\.me\/|[a-z0-9-]+\.(com|org|net|io|ao|br|pt|me|app)\b)/i;
  if (urlPattern.test(clean)) {
    return {
      isOffPlatform: true,
      reason: 'O envio de links externos não é permitido.'
    };
  }

  // 2. Check for Email patterns
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  if (emailPattern.test(clean)) {
    return {
      isOffPlatform: true,
      reason: 'O compartilhamento de emails não é permitido.'
    };
  }

  // 3. Check for phone numbers (7 or more contiguous or space-separated digits)
  const phonePattern = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}[\s-]?\d{0,4}/;
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 8 && phonePattern.test(clean)) {
    return {
      isOffPlatform: true,
      reason: 'O compartilhamento de números de telefone/telemóvel não é permitido.'
    };
  }

  // 4. Check for off-platform keywords
  for (const keyword of OFF_PLATFORM_KEYWORDS) {
    if (clean.includes(keyword)) {
      return {
        isOffPlatform: true,
        reason: 'Mensagem contém menções ou termos não permitidos.'
      };
    }
  }

  return { isOffPlatform: false };
};

export const SecureSocialChatModal: React.FC<SecureSocialChatModalProps> = ({
  isOpen,
  onClose,
  partner,
  currentUser,
  tradeContext,
  onSendP2PTransfer,
  onReportFraud,
  storageKeyPrefix = 'cryptonbet_chat',
  onStatusAction
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessageItem | null>(null);
  const [reactingToMsgId, setReactingToMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isTradeDetailsOpen, setIsTradeDetailsOpen] = useState(true);
  const [feedbackBanner, setFeedbackBanner] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Chat storage identifier
  const chatId = tradeContext?.tradeId
    ? `trade_${tradeContext.tradeId}`
    : [currentUser.id || 'guest', partner.id].sort().join('_');

  const storageKey = `${storageKeyPrefix}_${chatId}`;

  // Initial messages state (Clean, discreet & natural social flow)
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const initialList: ChatMessageItem[] = [];

    if (tradeContext) {
      initialList.push({
        id: 'sys_trade_1',
        senderId: 'system_trade',
        senderName: 'Negociação P2P',
        text: `Ordem #${tradeContext.tradeId.slice(-6)}: ${tradeContext.amountUSDT.toFixed(2)} USDT ${
          tradeContext.fiatAmount ? `(${tradeContext.fiatAmount.toLocaleString()} ${tradeContext.fiatCurrency || 'AOA'})` : ''
        } via ${tradeContext.paymentMethod || 'Transferência Bancária'}.`,
        time: 'Agora',
        isSystem: true
      });
    } else {
      initialList.push({
        id: 'msg_welcome',
        senderId: partner.id,
        senderName: partner.name,
        text: `Olá! Estou disponível para conversar sobre produtos, estratégias e negociações.`,
        time: 'Hoje'
      });
    }

    return initialList;
  });

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages.length]);

  // Sync to local storage
  const saveMessages = (newMsgs: ChatMessageItem[]) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMsgs));
    } catch (e) {}
  };

  const showFeedback = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setFeedbackBanner({ text, type });
    setTimeout(() => {
      setFeedbackBanner(null);
    }, 4000);
  };

  // Send text message (Strict In-App Enforcement)
  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!content) return;

    // Check for off-platform attempt
    const offPlatformCheck = checkOffPlatformAttempt(content);
    if (offPlatformCheck.isOffPlatform) {
      soundService.playCrash();
      showFeedback(
        offPlatformCheck.reason || 'Todas as conversas e negociações devem ser feitas exclusivamente dentro do app CryptonBet.',
        'error'
      );
      return;
    }

    soundService.playUISelect();

    const newMsg: ChatMessageItem = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatarColor: currentUser.avatarColor,
      text: content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text
          }
        : undefined
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputText('');
    setReplyingTo(null);
  };

  // Voice note recorded
  const handleVoiceRecorded = (audioDataUrl: string, durationSeconds: number) => {
    soundService.playWin();
    setIsRecordingVoice(false);

    const newMsg: ChatMessageItem = {
      id: 'voice_' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatarColor: currentUser.avatarColor,
      text: '🎤 Mensagem de Voz Gravada',
      audioUrl: audioDataUrl,
      audioDuration: durationSeconds,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    saveMessages([...messages, newMsg]);
    showFeedback('Nota de voz enviada com sucesso!');
  };

  // Image proof upload simulation
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showFeedback('A imagem selecionada deve ter no máximo 5MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    soundService.playUISelect();

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newMsg: ChatMessageItem = {
        id: 'img_' + Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatarColor: currentUser.avatarColor,
        text: '📸 Comprovativo / Imagem Anexada',
        imageUrl: base64,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      saveMessages([...messages, newMsg]);
      setIsUploadingImage(false);
      showFeedback('Comprovativo de imagem enviado com sucesso!');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // React to message
  const handleReactToMessage = (msg: ChatMessageItem, emoji: string) => {
    if (msg.senderId === currentUser.id) {
      showFeedback('Não pode reagir à sua própria mensagem!', 'warning');
      return;
    }
    soundService.playTick();
    const updated = messages.map(m => {
      if (m.id !== msg.id) return m;
      const reactions = { ...(m.reactions || {}) };
      const currentList = reactions[emoji] || [];
      if (currentList.includes(currentUser.id)) {
        reactions[emoji] = currentList.filter(id => id !== currentUser.id);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...currentList, currentUser.id];
      }
      return { ...m, reactions };
    });
    saveMessages(updated);
    setReactingToMsgId(null);
  };

  // Delete message
  const handleDeleteMessage = (id: string) => {
    soundService.playUISelect();
    const updated = messages.map(m => {
      if (m.id === id) {
        return {
          ...m,
          text: 'Esta mensagem foi eliminada.',
          audioUrl: undefined,
          imageUrl: undefined,
          isDeleted: true
        };
      }
      return m;
    });
    saveMessages(updated);
    showFeedback('Mensagem eliminada.');
  };

  // Save edited message
  const handleSaveEdit = (id: string) => {
    const text = editingMsgText.trim();
    if (!text) return;

    const offPlatformCheck = checkOffPlatformAttempt(text);
    if (offPlatformCheck.isOffPlatform) {
      soundService.playCrash();
      showFeedback(
        offPlatformCheck.reason || 'Todas as conversas e negociações devem ser feitas exclusivamente dentro do app CryptonBet.',
        'error'
      );
      return;
    }

    soundService.playUISelect();
    const updated = messages.map(m => {
      if (m.id === id) {
        return {
          ...m,
          text,
          isEdited: true
        };
      }
      return m;
    });
    saveMessages(updated);
    setEditingMsgId(null);
    setEditingMsgText('');
  };

  // Submit Fraud Report
  const handleSubmitFraudReport = () => {
    if (!reportReason.trim()) {
      showFeedback('Por favor, descreva o motivo da denúncia.', 'error');
      return;
    }
    soundService.playCrash();
    if (onReportFraud) {
      onReportFraud(partner.id, reportReason);
    }
    setIsReportModalOpen(false);
    setReportReason('');
    showFeedback('Denúncia enviada com sucesso aos moderadores.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1724] border border-white/15 rounded-[2.2rem] w-full max-w-2xl h-[92vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden relative">

        {/* FEEDBACK BANNER */}
        <AnimatePresence>
          {feedbackBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-16 left-4 right-4 z-50 p-3 rounded-2xl border text-xs font-bold shadow-xl flex items-center justify-between ${
                feedbackBanner.type === 'error'
                  ? 'bg-red-950/95 border-red-500 text-red-200'
                  : feedbackBanner.type === 'warning'
                  ? 'bg-amber-950/95 border-amber-500 text-amber-200'
                  : 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackBanner.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : feedbackBanner.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{feedbackBanner.text}</span>
              </div>
              <button onClick={() => setFeedbackBanner(null)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* CHAT HEADER: Messenger / Social Style                                     */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#131d2c] border-b border-white/10 flex items-center justify-between shrink-0 shadow-md">
          {/* Partner Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm uppercase shadow-md border border-white/15 ${
                  partner.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]'
                }`}
              >
                {partner.name.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#131d2c] rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase truncate">{partner.name}</h3>
                {partner.verified !== false && (
                  <span className="w-4 h-4 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[9px] font-black shrink-0" title="Verificado Oficial">
                    ✓
                  </span>
                )}
                {partner.roleBadge && (
                  <span className="px-2 py-0.5 bg-[#FFCC00]/20 border border-[#FFCC00]/30 text-[#FFCC00] rounded-full text-[8px] font-black uppercase shrink-0">
                    {partner.roleBadge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo agora • Messenger
                </span>
                {partner.rating && (
                  <span className="text-amber-400 font-bold hidden sm:inline">★ {partner.rating.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Social Chat Actions: In-App Badge, Denunciar, Fechar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Safe In-App Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% no App</span>
            </div>

            {/* Denunciar */}
            <button
              onClick={() => {
                soundService.playUISelect();
                setIsReportModalOpen(true);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              title="Reportar Utilizador"
            >
              <Flag className="w-4 h-4" />
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NEGOTIATION / TRADE ESCROW CONTEXT CARD (If active trade)                */}
        {/* ========================================================================= */}
        {tradeContext && (
          <div className="bg-[#0b131f] border-b border-white/10 px-4 py-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                  tradeContext.type === 'DEPOSIT' || tradeContext.type === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {tradeContext.type === 'DEPOSIT' ? 'Depósito P2P' : tradeContext.type === 'WITHDRAW' ? 'Saque P2P' : `Ordem ${tradeContext.type}`}
                </span>
                <span className="font-mono font-black text-white text-xs">
                  {tradeContext.amountUSDT.toFixed(2)} USDT
                  {tradeContext.fiatAmount && (
                    <span className="text-[#FFCC00] ml-1.5">
                      ({tradeContext.fiatAmount.toLocaleString()} {tradeContext.fiatCurrency || 'AOA'})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {tradeContext.status}
                </span>
                <button
                  onClick={() => setIsTradeDetailsOpen(!isTradeDetailsOpen)}
                  className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  {isTradeDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {isTradeDetailsOpen && (
              <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase block">Método de Liquidação:</span>
                  <span className="text-white font-black">{tradeContext.paymentMethod || 'Multicaixa / BAI Directo / PIX'}</span>
                </div>
                <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase block">Dados Fornecidos:</span>
                  <span className="text-[#FFCC00] font-mono font-bold truncate block">
                    {tradeContext.paymentDetails || 'Aguardando envio de dados no chat seguro abaixo...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MESSAGES LOG: Messenger Bubbles, Audio Player, Image Viewer, Reactions    */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0b1017]/70 no-scrollbar">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isSystem = msg.isSystem;

            // System / Security Banner Bubble
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed border text-center shadow-md space-y-1 ${
                      msg.fraudWarning
                        ? 'bg-red-950/80 border-red-500/50 text-red-200'
                        : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider">
                      {msg.fraudWarning ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{msg.senderName}</span>
                    </div>
                    <p className="text-[11px] font-medium opacity-90">{msg.text}</p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group mb-1`}
              >
                {/* Sender Name and Time */}
                <div className={`flex items-center gap-1.5 mb-1 px-1 text-[9px] text-slate-500 font-bold uppercase ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span>{isMe ? 'Você' : msg.senderName}</span>
                  <span>•</span>
                  <span className="font-mono lowercase">{msg.time}</span>
                </div>

                {/* Bubble Container */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-md relative ${
                    isMe
                      ? 'bg-[#1877f2] text-white rounded-br-none'
                      : 'bg-[#192638] text-slate-100 rounded-bl-none border border-white/10'
                  }`}
                >
                  {/* Quoted Reply Block */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-xl text-[10px] border-l-2 flex items-center gap-1.5 ${
                        isMe ? 'bg-black/20 border-white text-blue-100' : 'bg-black/40 border-[#1877f2] text-slate-300'
                      }`}
                    >
                      <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                      <div className="truncate">
                        <span className="font-black mr-1">{msg.replyTo.senderName}:</span>
                        <span className="italic opacity-90">"{msg.replyTo.text}"</span>
                      </div>
                    </div>
                  )}

                  {/* Audio Voice Player */}
                  {msg.audioUrl && (
                    <div className="my-1">
                      <AudioVoicePlayer
                        audioUrl={msg.audioUrl}
                        duration={msg.audioDuration}
                        senderName={isMe ? 'Você' : msg.senderName}
                        className={isMe ? '!bg-black/20 !border-white/20' : '!bg-black/40 !border-white/10'}
                      />
                    </div>
                  )}

                  {/* Image Attachment */}
                  {msg.imageUrl && (
                    <div className="my-1.5 rounded-xl overflow-hidden border border-white/20 bg-black/40 max-w-xs cursor-pointer group" onClick={() => setLightboxImage(msg.imageUrl || null)}>
                      <img src={msg.imageUrl} alt="Comprovativo" className="w-full h-auto max-h-56 object-cover group-hover:scale-105 transition-transform" />
                      <div className="p-2 flex items-center justify-between text-[10px] text-white/80 font-bold bg-black/60">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-emerald-400" /> Clique para expandir
                        </span>
                        <Download className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                      </div>
                    </div>
                  )}

                  {/* Message Content / Inline Edit */}
                  {editingMsgId === msg.id ? (
                    <div className="space-y-2 py-1 min-w-[220px]">
                      <input
                        type="text"
                        value={editingMsgText}
                        onChange={(e) => setEditingMsgText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(msg.id); }}
                        className="w-full bg-black/40 border border-white/30 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-white"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMsgId(null)}
                          className="text-[10px] px-2.5 py-1 bg-white/20 rounded-lg hover:bg-white/30 font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg.id)}
                          className="text-[10px] px-2.5 py-1 bg-white text-[#1877f2] rounded-lg font-black hover:bg-blue-50 cursor-pointer"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className={`whitespace-pre-wrap break-words ${msg.isDeleted ? 'italic opacity-60 font-normal' : ''}`}>
                        {msg.text}
                      </p>
                      {msg.isEdited && !msg.isDeleted && (
                        <span className={`text-[8px] block text-right mt-0.5 font-mono opacity-80 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          (editado)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reactions Badges */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-2 -mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const userList = (users as string[]) || [];
                        return (
                          <span
                            key={emoji}
                            onClick={() => !msg.isDeleted && handleReactToMessage(msg, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] cursor-pointer shadow-xs transition-transform hover:scale-105 ${
                              userList.includes(currentUser.id)
                                ? 'bg-amber-400/20 border border-amber-400 text-[#FFCC00] font-black'
                                : 'bg-black/30 border border-white/20 text-slate-200 font-bold'
                            }`}
                            title={`Reagido por ${userList.length} trader(s)`}
                          >
                            <span>{emoji}</span>
                            <span>{userList.length}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action Bar (Reply, React, Edit, Delete) */}
                {!msg.isDeleted && (
                  <div
                    className={`flex items-center gap-2.5 mt-1 px-1 text-[10px] select-none ${
                      isMe ? 'flex-row-reverse text-slate-500' : 'flex-row text-slate-400'
                    }`}
                  >
                    {/* Reply */}
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playUISelect();
                        setReplyingTo(msg);
                      }}
                      className="hover:text-[#1877f2] flex items-center gap-0.5 cursor-pointer font-bold transition-colors"
                      title="Responder"
                    >
                      <Reply className="w-3 h-3" />
                      <span>Responder</span>
                    </button>

                    {/* React with emoji */}
                    {!isMe && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setReactingToMsgId(reactingToMsgId === msg.id ? null : msg.id)}
                          className="hover:text-[#FFCC00] flex items-center gap-0.5 cursor-pointer font-bold transition-colors"
                          title="Reagir"
                        >
                          <Smile className="w-3 h-3" />
                          <span>Reagir</span>
                        </button>
                        {reactingToMsgId === msg.id && (
                          <div className="absolute bottom-5 left-0 bg-[#131d27] border border-white/20 shadow-2xl rounded-full px-2.5 py-1.5 flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95">
                            {['👍', '❤️', '😂', '😮', '🔥', '👏', '🚀', '🔒'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReactToMessage(msg, emoji)}
                                className="hover:scale-125 transition-transform text-base p-1 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sender Actions: Edit & Delete */}
                    {isMe && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            soundService.playUISelect();
                            setEditingMsgId(msg.id);
                            setEditingMsgText(msg.text);
                          }}
                          className="hover:text-blue-400 flex items-center gap-0.5 cursor-pointer font-bold transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="hover:text-red-400 flex items-center gap-0.5 cursor-pointer font-bold transition-colors text-red-500/70"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* QUICK ACTION CHIPS (Safe P2P Responses & Escrow Actions)                 */}
        {/* ========================================================================= */}
        <div className="px-3 sm:px-4 py-2 bg-[#101722] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => handleSendMessage('📎 Seguem os meus dados para pagamento bancário seguro via Escrow.')}
            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
          >
            📋 Enviar Dados Bancários
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('📸 Comprovativo de transferência realizado! Favor verificar o extrato.')}
            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[10px] font-bold text-emerald-400 whitespace-nowrap transition-all cursor-pointer shrink-0"
          >
            📸 Confirmar Comprovativo
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('⏳ A aguardar a confirmação do crédito no extrato bancário oficial.')}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-400 whitespace-nowrap transition-all cursor-pointer shrink-0"
          >
            ⏳ Aguardar Extrato
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage('🤝 Tudo combinado para a realização da transação!')}
            className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-[10px] font-bold text-blue-400 whitespace-nowrap transition-all cursor-pointer shrink-0"
          >
            🤝 Combinar Detalhes
          </button>
        </div>

        {/* ========================================================================= */}
        {/* REPLYING PREVIEW BANNER                                                  */}
        {/* ========================================================================= */}
        {replyingTo && (
          <div className="bg-[#131d27] border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight className="w-4 h-4 text-[#1877f2] shrink-0" />
              <span className="font-black text-white shrink-0">A responder a {replyingTo.senderName}:</span>
              <span className="truncate text-slate-400 italic">"{replyingTo.text}"</span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VOICE RECORDER INLINE (When mic button clicked)                           */}
        {/* ========================================================================= */}
        {isRecordingVoice ? (
          <div className="p-3 bg-[#131d2c] border-t border-white/10 flex items-center justify-center shrink-0">
            <AudioVoiceRecorder
              onAudioRecorded={handleVoiceRecorded}
              onCancel={() => setIsRecordingVoice(false)}
            />
          </div>
        ) : (
          /* ========================================================================= */
          /* CHAT INPUT BAR                                                            */
          /* ========================================================================= */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 sm:p-4 bg-[#131d2c] border-t border-white/10 flex items-center gap-2 shrink-0"
          >
            {/* Hidden file input for image proof */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {/* Attach image / proof */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Anexar Comprovativo / Imagem"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice record toggle */}
            <button
              type="button"
              onClick={() => {
                soundService.playUISelect();
                setIsRecordingVoice(true);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shrink-0"
              title="Gravar Áudio / Mensagem de Voz"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Input box */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Escreva uma mensagem para ${partner.name}...`}
              className="flex-1 bg-black/50 border border-white/15 rounded-2xl px-4 py-3 text-white text-xs font-medium placeholder-slate-500 outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]/50 transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 bg-[#1877f2] hover:bg-[#166fe5] disabled:opacity-40 text-white rounded-2xl transition-all shadow-lg cursor-pointer shrink-0 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TRADE STATUS ACTIONS FOOTER (If in Escrow Mode)                          */}
        {/* ========================================================================= */}
        {tradeContext && onStatusAction && (
          <div className="px-4 py-2.5 bg-black/60 border-t border-white/10 flex items-center gap-3 shrink-0">
            {tradeContext.status === 'MATCHED' && (
              <button
                type="button"
                onClick={() => onStatusAction('MARK_PAID')}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Marcar como Pago</span>
              </button>
            )}

            {tradeContext.status === 'PAID' && (
              <button
                type="button"
                onClick={() => onStatusAction('RELEASE_ESCROW')}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#049444] to-emerald-600 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmar & Liberar USDT</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onStatusAction('DISPUTE')}
              className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Abrir Disputa</span>
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: REPORT USER / DENUNCIAR UTILIZADOR                                 */}
      {/* ========================================================================= */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#131d27] border border-white/15 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Denunciar Utilizador</h3>
                  <p className="text-[10px] text-slate-400">{partner.name}</p>
                </div>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Selecione o motivo:
              </label>

              <div className="grid grid-cols-1 gap-2">
                {[
                  'Tentativa de desvio ou fraude',
                  'Não confirmação de pagamento',
                  'Comprovativo inválido ou ilegível',
                  'Solicitação de dados confidenciais',
                  'Comportamento abusivo ou ofensivo'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReportReason(reason)}
                    className={`p-2.5 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                      reportReason === reason
                        ? 'bg-red-500/20 border-red-500 text-red-200'
                        : 'bg-black/40 border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Detalhes adicionais para a moderação..."
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2 text-white text-xs outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitFraudReport}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Enviar Denúncia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIGHTBOX MODAL: EXPANDED PROOF IMAGE                                     */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Comprovativo Expandido" className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/20 shadow-2xl" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
