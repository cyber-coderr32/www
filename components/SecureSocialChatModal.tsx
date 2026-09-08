import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Download,
  MessageSquare,
  Building2,
  Gamepad2,
  CheckCheck,
  FileText
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { AudioVoicePlayer } from './AudioVoicePlayer';
import { AudioVoiceRecorder } from './AudioVoiceRecorder';
import { securityHackerGuard } from '../services/securityHackerGuardService';
import { presenceService, computePresence, UserPresence } from '../services/presenceService';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

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
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
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
  tradeData?: {
    type?: string;
    amount?: number;
    currency?: string;
    bankName?: string;
    iban?: string;
    status?: string;
  };
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
  initialMode?: 'COMMUNICATION' | 'NEGOTIATION';
  tradeContext?: TradeContextInfo;
  onSendP2PTransfer?: (amount: number) => void;
  onReportFraud?: (partnerId: string, reason: string) => void;
  storageKeyPrefix?: string;
  onStatusAction?: (actionType: 'MARK_PAID' | 'RELEASE_ESCROW' | 'DISPUTE') => void;
  onSelectGame?: (game: string) => void;
}

// Off-platform & fraud detection patterns (Strict In-App Enforcement)
const OFF_PLATFORM_KEYWORDS = [
  'whatsapp', 'whats', 'zap', 'zapzap', 'wpp', 'telegram', 'telegran', 't.me', 'wa.me',
  'signal', 'discord', 'viber', 'skype', 'instagram', 'facebook',
  'por fora', 'fora do app', 'fora da plataforma', 'sem escrow', 'sem intermediario', 
  'sem intermediário', 'manda no privado', 'chama no zap', 'chama no whats', 'chama no telegram',
  'chama lá', 'chama la', 'me liga', 'meu contato', 'meu contacto', 'meu numero', 'meu número',
  'teu contato', 'teu contacto', 'teu numero', 'teu número', 'passa o zap', 'passa o numero',
  'passa o número', 'pagar por fora', 'transferir por fora', 'pix direto sem ordem',
  'deposito por fora', 'depósito por fora', 'cancela a ordem e faz por fora', 'cancela e faz direto',
  'codigo sms', 'código sms', 'senha', 'chave de seguranca', 'chave privada', 'codigo de confirmacao'
];

export const checkOffPlatformAttempt = (text: string): { isOffPlatform: boolean; reason?: string } => {
  const clean = text.toLowerCase();

  // 1. Check for URL patterns
  const urlPattern = /(https?:\/\/|www\.|wa\.me\/|t\.me\/|[a-z0-9-]+\.(com|org|net|io|ao|br|pt|me|app)\b)/i;
  if (urlPattern.test(clean)) {
    return {
      isOffPlatform: true,
      reason: 'Tentativa de link externo bloqueada! Para sua segurança contra burlas, links não são permitidos.'
    };
  }

  // 2. Check for Email patterns
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  if (emailPattern.test(clean)) {
    return {
      isOffPlatform: true,
      reason: 'O compartilhamento de emails externos não é permitido. Toda comunicação ocorre dentro da CryptonBet.'
    };
  }

  // 3. Check for phone numbers (7 or more contiguous or space-separated digits)
  const phonePattern = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}[\s-]?\d{0,4}/;
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 8 && phonePattern.test(clean)) {
    return {
      isOffPlatform: true,
      reason: 'Compartilhamento de números de telefone bloqueado! Burladores tentam levar usuários ao WhatsApp para forjar comprovativos.'
    };
  }

  // 4. Check for off-platform keywords
  for (const keyword of OFF_PLATFORM_KEYWORDS) {
    if (clean.includes(keyword)) {
      return {
        isOffPlatform: true,
        reason: 'Termo bloqueado pelo Sistema Anti-Burla: Negociações devem ocorrer exclusivamente dentro da plataforma para garantir total segurança contra fraudes.'
      };
    }
  }

  return { isOffPlatform: false };
};

// Negotiation Intent Keywords
const NEGOTIATION_KEYWORDS = [
  'usdt', 'kwanzas', 'kwanza', 'aoa', 'kz', 'iban', 'banco', 'bai', 'bfa', 'bci', 'atlantico', 'sol', 'bic',
  'multicaixa', 'transferir', 'transferencia', 'transferência', 'pagar', 'pagamento',
  'vender', 'comprar', 'câmbio', 'cambio', 'cotação', 'cotacao', 'taxa',
  'comprovativo', 'comprovante', 'saldo', 'ordem', 'depósito', 'deposito',
  'troca', 'p2p', 'escrow', 'custódia', 'custodia'
];

export const checkNegotiationIntent = (text: string): boolean => {
  const lower = text.toLowerCase();
  return NEGOTIATION_KEYWORDS.some(k => lower.includes(k));
};

export const SecureSocialChatModal: React.FC<SecureSocialChatModalProps> = ({
  isOpen,
  onClose,
  partner,
  currentUser,
  tradeContext,
  initialMode,
  onSendP2PTransfer,
  onReportFraud,
  storageKeyPrefix = 'cryptonbet_chat',
  onStatusAction,
  onSelectGame
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
  const [selectedMsgActionId, setSelectedMsgActionId] = useState<string | null>(null);

  // Automatic mode: Escrow is mandatory whenever a negotiation starts
  const [chatMode, setChatMode] = useState<'COMMUNICATION' | 'NEGOTIATION'>(() => {
    if (tradeContext) return 'NEGOTIATION';
    if (initialMode === 'NEGOTIATION') return 'NEGOTIATION';
    return 'COMMUNICATION';
  });

  // Modal for sending verified IBAN
  const [isIbanModalOpen, setIsIbanModalOpen] = useState(false);
  const [ibanBankName, setIbanBankName] = useState('BAI (Banco Angolano de Investimentos)');
  const [ibanNumber, setIbanNumber] = useState('');
  const [ibanAccountHolder, setIbanAccountHolder] = useState(currentUser.name || '');

  // P2P Quick Transfer Modal inside chat
  const [isQuickTransferOpen, setIsQuickTransferOpen] = useState(false);
  const [quickTransferAmount, setQuickTransferAmount] = useState('10');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic visual viewport tracking for mobile virtual keyboard
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return window.visualViewport.height;
    }
    return typeof window !== 'undefined' ? window.innerHeight : 0;
  });
  const [viewportTop, setViewportTop] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleResize = () => {
      if (window.visualViewport) {
        const currentH = window.visualViewport.height;
        const currentTop = window.visualViewport.offsetTop;
        setViewportHeight(currentH);
        setViewportTop(currentTop);

        const keyboardActive = currentH < (window.innerHeight * 0.82);
        setIsKeyboardVisible(keyboardActive);

        // Keep latest message visible when keyboard toggles
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        setViewportHeight(window.innerHeight);
        setViewportTop(0);
        setIsKeyboardVisible(false);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Real-time partner presence tracking (true online/offline and last seen)
  const [partnerPresence, setPartnerPresence] = useState<UserPresence>(() => {
    return computePresence(partner);
  });

  useEffect(() => {
    if (!isOpen || !partner?.id) return;
    const unsub = presenceService.subscribeUserPresence(partner.id, (pres) => {
      setPartnerPresence(pres);
    });
    return () => {
      unsub();
    };
  }, [isOpen, partner?.id]);

  // Reset states and focus input whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRecordingVoice(false);
      setReplyingTo(null);
      const timer = setTimeout(() => {
        messageInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Consistent chat identifier between both users
  const getUnifiedChatId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  const chatId = getUnifiedChatId(currentUser.id || 'guest', partner.id || 'partner');
  const storageKey = `${storageKeyPrefix}_${chatId}`;

  // Helper to filter out completely deleted messages or placeholder texts
  const filterActiveMessages = (list: ChatMessageItem[]): ChatMessageItem[] => {
    return list.filter(m => {
      if (m.isDeleted) return false;
      const text = (m.text || '').trim().toLowerCase();
      if (
        text === 'esta mensagem foi eliminada.' ||
        text === 'esta mensagem foi eliminada' ||
        text.includes('foi eliminada') ||
        text.includes('mensagem foi exclu') ||
        text.includes('foi apagada')
      ) {
        return false;
      }
      return true;
    });
  };

  // Initial messages state from localStorage (excluding any deleted messages)
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = filterActiveMessages(parsed);
          if (cleaned.length !== parsed.length) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(cleaned));
            } catch (e) {}
          }
          return cleaned;
        }
      }
    } catch (e) {}

    const initialList: ChatMessageItem[] = [];

    if (tradeContext) {
      initialList.push({
        id: 'sys_trade_1',
        senderId: 'system_trade',
        senderName: 'Negociação P2P CryptonBet',
        text: `Ordem #${tradeContext.tradeId.slice(-6)} ativa: ${tradeContext.amountUSDT.toFixed(2)} USDT ${
          tradeContext.fiatAmount ? `(${tradeContext.fiatAmount.toLocaleString()} ${tradeContext.fiatCurrency || 'AOA'})` : ''
        }. Os fundos estão protegidos com segurança garantida pela plataforma.`,
        time: 'Agora',
        isSystem: true
      });
    } else {
      initialList.push({
        id: 'msg_welcome',
        senderId: partner.id,
        senderName: partner.name,
        text: `Olá! Estou disponível para conversar sobre apostas, estratégias e negociações de saldo.`,
        time: 'Hoje'
      });
    }

    return initialList;
  });

  // Automatically purge any previously deleted messages from all local chat storage keys
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('cryptonbet_chat') || key.startsWith('cryptonbet_dm'))) {
          const raw = localStorage.getItem(key);
          if (raw && (raw.includes('foi eliminada') || raw.includes('isDeleted'))) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                const cleaned = filterActiveMessages(parsed);
                localStorage.setItem(key, JSON.stringify(cleaned));
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }, []);

  // Real-time Firestore sync with local fallback
  useEffect(() => {
    if (!isOpen || !partner?.id || !currentUser?.id) return;

    // First load from local storage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = filterActiveMessages(parsed);
          setMessages(cleaned);
          localStorage.setItem(storageKey, JSON.stringify(cleaned));
        }
      }
    } catch (e) {}

    if (currentUser.id === 'guest_user' || !currentUser.id) return;

    try {
      const msgRef = collection(db, 'private_messages');
      const q = query(
        msgRef,
        where('chatId', '==', chatId),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const firestoreMsgs: ChatMessageItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Filter out deleted messages completely - do not leave any bubble!
          const rawContent = (data.content || '').trim().toLowerCase();
          if (data.isDeleted || rawContent === 'esta mensagem foi eliminada.' || rawContent.includes('foi eliminada')) {
            return;
          }

          let msgTime = 'Agora';
          if (data.createdAt) {
            const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            msgTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          firestoreMsgs.push({
            id: docSnap.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatarColor: data.senderAvatarColor,
            text: data.content,
            time: msgTime,
            audioUrl: data.audioUrl,
            audioDuration: data.audioDuration,
            imageUrl: data.imageUrl,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            isSystem: data.isSystem || false,
            fraudWarning: data.fraudWarning || false,
            isEdited: data.isEdited || false,
            isDeleted: false,
            reactions: data.reactions || {},
            replyTo: data.replyTo || undefined,
            tradeData: data.tradeData || undefined
          });
        });

        const activeList = filterActiveMessages(firestoreMsgs);
        setMessages(activeList);
        try {
          localStorage.setItem(storageKey, JSON.stringify(activeList));
        } catch (e) {}
      }, (err) => {
        console.warn("Firestore listener fallback in SecureSocialChatModal:", err);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn("Could not attach Firestore listener:", err);
    }
  }, [isOpen, partner?.id, currentUser?.id, chatId, storageKey]);

  // Automatically activate mandatory escrow protection as soon as negotiation starts
  useEffect(() => {
    if (tradeContext) {
      if (chatMode !== 'NEGOTIATION') setChatMode('NEGOTIATION');
      return;
    }

    if (chatMode === 'NEGOTIATION') return;

    const isInputNegotiation = inputText.length > 2 && checkNegotiationIntent(inputText);
    const recent = messages.slice(-4);
    const hasIntentInMsgs = recent.some(m => !m.isSystem && checkNegotiationIntent(m.text));

    if (isInputNegotiation || hasIntentInMsgs) {
      setChatMode('NEGOTIATION');
    }
  }, [inputText, messages, chatMode, tradeContext]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages.length]);

  // Sync to local storage helper
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
    }, 5000);
  };

  // Send text message (Strict In-App Enforcement & Anti-Hacker / Fraud Vigilance)
  const handleSendMessage = async (textToSend?: string, isSys = false, fraudWarn = false, tradePayload?: any) => {
    const rawContent = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!rawContent) return;

    // 0. Anti-Hacker Rate Limit & Phishing Defense
    if (!isSys) {
      if (!securityHackerGuard.checkRateLimit(`chat_${currentUser.id}`, 10, 4000)) {
        showFeedback('A enviar mensagens muito rápido. Aguarde 3 segundos.', 'warning');
        return;
      }

      const phishingCheck = securityHackerGuard.checkPhishingRisk(rawContent);
      if (!phishingCheck.isSafe) {
        soundService.playCrash();
        showFeedback(phishingCheck.warning || 'Conteúdo suspeito interceptado pelo Escudo Anti-Burla.', 'error');
        return;
      }
    }

    // 1. Sanitize text against XSS & script injection
    const content = isSys ? rawContent : securityHackerGuard.sanitizeText(rawContent);

    // Check for off-platform attempt
    if (!isSys) {
      const offPlatformCheck = checkOffPlatformAttempt(content);
      if (offPlatformCheck.isOffPlatform) {
        soundService.playCrash();
        showFeedback(
          offPlatformCheck.reason || 'Todas as conversas e negociações devem ser feitas exclusivamente dentro da CryptonBet.',
          'error'
        );

        // Inject in-chat anti-fraud warning to educate both traders
        const warningMsg: ChatMessageItem = {
          id: 'warn_' + Date.now(),
          senderId: 'system_security',
          senderName: 'Sentinela Anti-Burla CryptonBet',
          text: `🚨 Tentativa de desvio para canal externo detectada e bloqueada! Golpistas utilizam redes sociais externas para forjar comprovativos falsos. Todas as negociações devem ocorrer exclusivamente dentro deste chat oficial com segurança garantida.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: true,
          fraudWarning: true
        };
        saveMessages([...messages, warningMsg]);
        return;
      }
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
        : undefined,
      isSystem: isSys,
      fraudWarning: fraudWarn,
      tradeData: tradePayload
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputText('');
    setReplyingTo(null);

    // Sync to Firestore
    if (currentUser.id && currentUser.id !== 'guest_user') {
      try {
        await addDoc(collection(db, 'private_messages'), {
          chatId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatarColor: currentUser.avatarColor || '',
          receiverId: partner.id,
          receiverName: partner.name,
          content,
          replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.text } : null,
          isSystem: isSys,
          fraudWarning: fraudWarn,
          isDeleted: false,
          isEdited: false,
          reactions: {},
          tradeData: tradePayload || null,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Firestore save failed, using local storage:", err);
      }
    }
  };

  // Voice note recorded
  const handleVoiceRecorded = async (audioDataUrl: string, durationSeconds: number) => {
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

    if (currentUser.id && currentUser.id !== 'guest_user') {
      try {
        await addDoc(collection(db, 'private_messages'), {
          chatId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatarColor: currentUser.avatarColor || '',
          receiverId: partner.id,
          receiverName: partner.name,
          content: '🎤 Mensagem de Voz Gravada',
          audioUrl: audioDataUrl,
          audioDuration: durationSeconds,
          isDeleted: false,
          isEdited: false,
          reactions: {},
          createdAt: serverTimestamp()
        });
      } catch (err) {}
    }
  };

  // File (Image, Audio, Document) upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showFeedback('O ficheiro selecionado deve ter no máximo 15MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    soundService.playUISelect();

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name);

      const newMsg: ChatMessageItem = {
        id: (isAudio ? 'audio_' : isImage ? 'img_' : 'file_') + Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatarColor: currentUser.avatarColor,
        text: isAudio
          ? `🎵 Áudio: ${file.name}`
          : isImage
          ? '📸 Imagem / Comprovativo'
          : `📄 Ficheiro: ${file.name}`,
        imageUrl: isImage ? base64 : undefined,
        audioUrl: isAudio ? base64 : undefined,
        fileUrl: (!isImage && !isAudio) ? base64 : undefined,
        fileName: file.name,
        fileSize: file.size,
        audioDuration: isAudio ? 0 : undefined,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      saveMessages([...messages, newMsg]);
      setIsUploadingImage(false);
      showFeedback(
        isImage
          ? 'Comprovativo enviado com sucesso!'
          : isAudio
          ? 'Áudio enviado com sucesso!'
          : 'Ficheiro anexado com sucesso!'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (currentUser.id && currentUser.id !== 'guest_user') {
        try {
          await addDoc(collection(db, 'private_messages'), {
            chatId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatarColor: currentUser.avatarColor || '',
            receiverId: partner.id,
            receiverName: partner.name,
            content: newMsg.text,
            imageUrl: newMsg.imageUrl || null,
            audioUrl: newMsg.audioUrl || null,
            fileUrl: newMsg.fileUrl || null,
            fileName: newMsg.fileName || null,
            fileSize: newMsg.fileSize || null,
            isDeleted: false,
            isEdited: false,
            reactions: {},
            createdAt: serverTimestamp()
          });
        } catch (err) {}
      }
    };
    reader.readAsDataURL(file);
  };

  // Send verified IBAN banking details
  const handleSendVerifiedIban = () => {
    const cleanIban = ibanNumber.trim().toUpperCase();
    if (!cleanIban) {
      showFeedback('Por favor, informe o IBAN para recebimento.', 'error');
      return;
    }

    if (!cleanIban.startsWith('AO06') && cleanIban.length !== 21 && cleanIban.length !== 25) {
      showFeedback('Aviso: O IBAN angolano padrão começa com AO06 seguido de 21 dígitos numéricos.', 'warning');
    }

    const text = `🏦 DADOS BANCÁRIOS OFICIAIS PARA DEPÓSITO:\n• Banco: ${ibanBankName}\n• Titular: ${ibanAccountHolder}\n• IBAN: ${cleanIban}\n\n⚠️ Por favor, efetue a transferência bancária e anexe aqui o comprovativo.`;

    handleSendMessage(text, false, false, {
      type: 'IBAN_DETAILS',
      bankName: ibanBankName,
      iban: cleanIban,
      status: 'VERIFIED'
    });

    setIsIbanModalOpen(false);
    setIbanNumber('');
    showFeedback('Dados bancários enviados com selo de verificação.', 'success');
  };

  // Quick P2P transfer
  const handleQuickTransfer = () => {
    const amount = parseFloat(quickTransferAmount);
    if (isNaN(amount) || amount <= 0) {
      showFeedback('Informe um valor válido em USDT.', 'error');
      return;
    }

    if (onSendP2PTransfer) {
      onSendP2PTransfer(amount);
      const text = `💸 Transferência direta realizada: ${amount.toFixed(2)} USDT enviados para ${partner.name}!`;
      handleSendMessage(text, false, false, {
        type: 'P2P_TRANSFER',
        amount,
        currency: 'USDT',
        status: 'COMPLETED'
      });
      setIsQuickTransferOpen(false);
      showFeedback(`Transferência de ${amount.toFixed(2)} USDT enviada!`, 'success');
    } else {
      showFeedback('Transação enviada para processamento na rede P2P.', 'success');
      setIsQuickTransferOpen(false);
    }
  };

  // React to message
  const handleReactToMessage = async (msg: ChatMessageItem, emoji: string) => {
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

    if (currentUser.id && !msg.id.startsWith('msg_') && !msg.id.startsWith('local_')) {
      try {
        const found = updated.find(m => m.id === msg.id);
        if (found) {
          await updateDoc(doc(db, 'private_messages', msg.id), {
            reactions: found.reactions || {}
          });
        }
      } catch (err) {}
    }
  };

  // Delete message completely (purges message and removes bubble entirely)
  const handleDeleteMessage = async (id: string) => {
    soundService.playUISelect();
    setSelectedMsgActionId(null);
    setReactingToMsgId(null);
    if (replyingTo?.id === id) {
      setReplyingTo(null);
    }
    const updated = messages
      .filter(m => m.id !== id)
      .map(m => (m.replyTo?.id === id ? { ...m, replyTo: undefined } : m));
    saveMessages(updated);
    showFeedback('Mensagem eliminada com sucesso.');

    if (
      currentUser.id &&
      !id.startsWith('msg_') &&
      !id.startsWith('local_') &&
      !id.startsWith('voice_') &&
      !id.startsWith('audio_') &&
      !id.startsWith('img_') &&
      !id.startsWith('file_')
    ) {
      try {
        await deleteDoc(doc(db, 'private_messages', id));
      } catch (err) {
        try {
          await updateDoc(doc(db, 'private_messages', id), {
            content: '',
            isDeleted: true,
            audioUrl: null,
            imageUrl: null,
            fileUrl: null
          });
        } catch (e) {}
      }
    }
  };

  // Save edited message
  const handleSaveEdit = async (id: string) => {
    const text = editingMsgText.trim();
    if (!text) return;

    const offPlatformCheck = checkOffPlatformAttempt(text);
    if (offPlatformCheck.isOffPlatform) {
      soundService.playCrash();
      showFeedback(
        offPlatformCheck.reason || 'Todas as conversas e negociações devem ser feitas exclusivamente dentro da CryptonBet.',
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

    if (currentUser.id && !id.startsWith('msg_') && !id.startsWith('local_')) {
      try {
        await updateDoc(doc(db, 'private_messages', id), {
          content: text,
          isEdited: true
        });
      } catch (err) {}
    }
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
    showFeedback('Denúncia de fraude enviada com sucesso aos moderadores de segurança.', 'success');
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <div
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
        top: `${viewportTop}px`,
        left: 0,
        right: 0,
        position: 'fixed',
      }}
      className="z-[9999] flex flex-col items-center justify-end sm:justify-center sm:p-4 p-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#0f1724] sm:border border-white/15 sm:rounded-[2.2rem] rounded-none w-full max-w-2xl h-full sm:max-h-[820px] flex flex-col shadow-2xl overflow-hidden relative min-h-0">

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
        {/* CHAT HEADER: Unified Social & Negotiation Navigation                      */}
        {/* ========================================================================= */}
        <div className="px-3.5 sm:px-5 py-3 bg-[#131d2c] border-b border-white/10 flex items-center justify-between shrink-0 shadow-md">
          {/* Partner Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm uppercase shadow-md border border-white/15 ${
                  partner.avatarColor || 'bg-gradient-to-tr from-[#049444] to-[#FFCC00]'
                }`}
              >
                {partner.name.charAt(0)}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-[#131d2c] transition-all duration-300 ${
                  partnerPresence.isOnline
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                    : 'bg-slate-500'
                }`}
                title={partnerPresence.isOnline ? 'Online' : partnerPresence.statusText}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase truncate">{partner.name}</h3>
                {partner.verified !== false && (
                  <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[9px] font-black shrink-0" title="Verificado Oficial">
                    ✓
                  </span>
                )}
                {partner.roleBadge && (
                  <span className="px-1.5 py-0.5 bg-[#FFCC00]/20 border border-[#FFCC00]/30 text-[#FFCC00] rounded-full text-[8px] font-black uppercase shrink-0">
                    {partner.roleBadge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                {partnerPresence.isOnline ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>{partnerPresence.statusText}</span>
                  </span>
                )}
                {partner.rating && (
                  <span className="text-amber-400 font-bold hidden sm:inline">★ {partner.rating.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Actions: Active Order Badge, Transfer, Report, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {tradeContext && (
              <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                <span>Ordem #{tradeContext.tradeId.slice(-6)}</span>
              </div>
            )}

            {/* Quick P2P Transfer Button */}
            {onSendP2PTransfer && (
              <button
                type="button"
                onClick={() => {
                  soundService.playUISelect();
                  setIsQuickTransferOpen(true);
                }}
                className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                title="Enviar Saldo P2P"
              >
                <Wallet className="w-4 h-4" />
              </button>
            )}

            {/* Denunciar Fraude */}
            <button
              onClick={() => {
                soundService.playUISelect();
                setIsReportModalOpen(true);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              title="Reportar Tentativa de Burla ou Fraude"
            >
              <Flag className="w-4 h-4" />
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Fechar Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GOLDEN ANTI-FRAUD BANNER (Visible in Negotiation Mode)                   */}
        {/* ========================================================================= */}
        {chatMode === 'NEGOTIATION' && (
          <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-black/80 border-b border-amber-500/30 px-3.5 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <p className="text-[11px] leading-tight text-amber-100/90 truncate">
                <strong className="text-amber-300 uppercase">Segurança na Negociação:</strong> Vendedor, confirme o extrato bancário oficial antes de confirmar a libertação.
              </p>
            </div>
          </div>
        )}

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
                  <span className="text-white font-black">{tradeContext.paymentMethod || 'Multicaixa / BAI Directo / BFA Net'}</span>
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
        {/* Protected against horizontal slide gestures with overflow-x-hidden & touch-pan-y */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-x-none w-full max-w-full p-3 sm:p-4 space-y-3 bg-[#0b1017]/70 no-scrollbar">
          {filterActiveMessages(messages).map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isSystem = msg.isSystem;

            // System / Security Banner Bubble
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2 w-full max-w-full">
                  <div
                    className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed border text-center shadow-md space-y-1 break-words [word-break:break-word] ${
                      msg.fraudWarning
                        ? 'bg-red-950/85 border-red-500/50 text-red-200'
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
                    <p className="text-[11px] font-medium opacity-90 break-words [word-break:break-word]">{msg.text}</p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group mb-1 w-full max-w-full`}
              >
                {/* Sender Name and Time */}
                <div className={`flex items-center gap-1.5 mb-1 px-1 text-[9px] text-slate-500 font-bold uppercase ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span>{isMe ? 'Você' : msg.senderName}</span>
                  <span>•</span>
                  <span className="font-mono lowercase">{msg.time}</span>
                  {msg.isEdited && <span className="text-[8px] text-slate-400 lowercase">(editado)</span>}
                </div>

                {/* Bubble Container - Clicking toggles quick actions on mobile */}
                <div
                  onClick={() => setSelectedMsgActionId(selectedMsgActionId === msg.id ? null : msg.id)}
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-3.5 sm:px-4 py-2.5 text-xs font-medium leading-relaxed shadow-md relative break-words [word-break:break-word] overflow-hidden transition-all ${
                    isMe
                      ? 'bg-[#1877f2] text-white rounded-br-none'
                      : 'bg-[#192638] text-slate-100 rounded-bl-none border border-white/10'
                  } ${selectedMsgActionId === msg.id ? 'ring-2 ring-amber-400/80 shadow-lg' : ''}`}
                >
                  {/* Quoted Reply Block */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-xl text-[10px] border-l-2 flex items-center gap-1.5 break-words [word-break:break-word] ${
                        isMe ? 'bg-black/20 border-white text-blue-100' : 'bg-black/40 border-[#1877f2] text-slate-300'
                      }`}
                    >
                      <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                      <div className="truncate max-w-full">
                        <span className="font-black mr-1">{msg.replyTo.senderName}:</span>
                        <span className="italic opacity-90">"{msg.replyTo.text}"</span>
                      </div>
                    </div>
                  )}

                  {/* Audio Voice Player */}
                  {msg.audioUrl && (
                    <div className="my-1 max-w-full">
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
                          <ImageIcon className="w-3 h-3 text-emerald-400" /> Clique para ver comprovativo
                        </span>
                        <Download className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                      </div>
                    </div>
                  )}

                  {/* Document / File Attachment */}
                  {msg.fileUrl && (
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName || 'ficheiro_anexo'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="my-1.5 p-2.5 rounded-xl border border-white/20 bg-black/40 flex items-center justify-between gap-3 text-xs text-white hover:bg-black/60 transition-colors max-w-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="truncate text-left">
                          <div className="font-bold truncate text-[11px]">{msg.fileName || 'Ficheiro Anexo'}</div>
                          {msg.fileSize && (
                            <div className="text-[9px] text-slate-400 font-mono">{(msg.fileSize / 1024).toFixed(1)} KB</div>
                          )}
                        </div>
                      </div>
                      <Download className="w-3.5 h-3.5 text-slate-300 hover:text-white shrink-0" />
                    </a>
                  )}

                  {/* Verified IBAN Card Badge */}
                  {msg.tradeData?.type === 'IBAN_DETAILS' && (
                    <div className="my-2 p-3 bg-black/30 rounded-xl border border-amber-500/30 text-amber-200 space-y-1 break-words">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 tracking-wider">
                        <Building2 className="w-3.5 h-3.5" /> Dados Bancários com Selo de Proteção
                      </div>
                      <div className="text-[11px] font-mono text-white font-bold break-all">
                        {msg.tradeData.iban}
                      </div>
                    </div>
                  )}

                  {/* P2P Transfer Card Badge */}
                  {msg.tradeData?.type === 'P2P_TRANSFER' && (
                    <div className="my-2 p-2.5 bg-emerald-950/60 rounded-xl border border-emerald-500/30 text-emerald-200 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400">
                        <Wallet className="w-3.5 h-3.5" /> Transferência P2P Concluída
                      </div>
                      <p className="text-xs font-bold text-white">
                        {msg.tradeData.amount} USDT creditados
                      </p>
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
                          className="px-2.5 py-1 text-[10px] rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-2.5 py-1 text-[10px] rounded-lg bg-white text-slate-900 font-bold"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words [word-break:break-word]">
                      {msg.text}
                    </p>
                  )}

                  {/* Message Reactions display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 -mb-1">
                      {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReactToMessage(msg, emoji)}
                          className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all cursor-pointer ${
                            userIds.includes(currentUser.id)
                              ? 'bg-blue-500/30 border-blue-400 text-white font-bold'
                              : 'bg-black/30 border-white/10 text-slate-300 hover:bg-black/50'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{userIds.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Interactive Context Options (Visible on Mobile & Touch, Hover on Desktop) */}
                <div
                  className={`flex items-center flex-wrap gap-1.5 mt-1.5 px-1 text-[10px] sm:text-[11px] text-slate-400 transition-opacity ${
                    isMe ? 'flex-row-reverse' : 'flex-row'
                  } ${
                    selectedMsgActionId === msg.id
                      ? 'opacity-100 bg-white/5 py-1 px-2 rounded-xl border border-white/10'
                      : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
                  }`}
                >
                    {/* Reply */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundService.playUISelect();
                        setReplyingTo(msg);
                      }}
                      className="hover:text-blue-400 text-slate-300 flex items-center gap-1 cursor-pointer font-bold transition-colors py-0.5 px-1.5 rounded-md hover:bg-white/10"
                      title="Responder a esta mensagem"
                    >
                      <Reply className="w-3 h-3 text-blue-400" />
                      <span>Responder</span>
                    </button>

                    {/* Copy text */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundService.playTick();
                        navigator.clipboard.writeText(msg.text);
                        showFeedback('Texto copiado com sucesso!', 'success');
                      }}
                      className="hover:text-slate-200 text-slate-400 flex items-center gap-1 cursor-pointer font-bold transition-colors py-0.5 px-1.5 rounded-md hover:bg-white/10"
                      title="Copiar texto da mensagem"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="hidden xs:inline">Copiar</span>
                    </button>

                    {/* Quick Reactions */}
                    {!isMe && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundService.playTick();
                            setReactingToMsgId(reactingToMsgId === msg.id ? null : msg.id);
                          }}
                          className="hover:text-amber-400 text-slate-300 flex items-center gap-1 cursor-pointer font-bold transition-colors py-0.5 px-1.5 rounded-md hover:bg-white/10"
                          title="Reagir com emoji"
                        >
                          <Smile className="w-3 h-3 text-amber-400" />
                          <span>Reagir</span>
                        </button>

                        {reactingToMsgId === msg.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-6 left-0 z-50 bg-[#1e293b] border border-white/20 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1 animate-in fade-in zoom-in-95"
                          >
                            {['❤️', '👍', '🔥', '🤝', '⚡', '👏'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReactToMessage(msg, emoji)}
                                className="p-1.5 hover:bg-white/15 rounded-xl text-sm transition-transform hover:scale-125 active:scale-95 cursor-pointer"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            soundService.playUISelect();
                            setEditingMsgId(msg.id);
                            setEditingMsgText(msg.text);
                          }}
                          className="hover:text-blue-400 text-slate-300 flex items-center gap-1 cursor-pointer font-bold transition-colors py-0.5 px-1.5 rounded-md hover:bg-white/10"
                          title="Editar mensagem"
                        >
                          <Edit3 className="w-3 h-3 text-blue-400" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(msg.id);
                          }}
                          className="hover:text-red-400 text-red-400/90 flex items-center gap-1 cursor-pointer font-bold transition-colors py-0.5 px-1.5 rounded-md hover:bg-red-500/10"
                          title="Eliminar mensagem"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span>Eliminar</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* QUICK ACTION CHIPS (Safe P2P Responses, Escrow Tools, Game Challenges)   */}
        {/* ========================================================================= */}
        <div className="px-3 sm:px-4 py-2 bg-[#101722] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {chatMode === 'NEGOTIATION' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  soundService.playUISelect();
                  setIsIbanModalOpen(true);
                }}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-300 whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <Building2 className="w-3 h-3 text-amber-400" />
                <span>📋 Enviar IBAN Verificado</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[10px] font-bold text-emerald-400 whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3 text-emerald-400" />
                <span>📸 Anexar Comprovativo</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('⏳ A aguardar a confirmação do crédito no extrato bancário oficial antes de libertar fundos.')}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
              >
                ⏳ Aguardar Extrato
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('✅ Pagamento confirmado no extrato bancário! Procedendo com a liberação de saldo.')}
                className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-[10px] font-bold text-emerald-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
              >
                ✅ Confirmar Pagamento
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSendMessage('👋 Olá! Tudo bem? Como estão as apostas hoje?')}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
              >
                👋 Olá! Tudo bem?
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playWin();
                  setChatMode('NEGOTIATION');
                  handleSendMessage('🤝 Tenho interesse em negociar USDT com você via negociação P2P.');
                }}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-300 whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>🤝 Negociar USDT (P2P)</span>
              </button>
              {onSelectGame && (
                <button
                  type="button"
                  onClick={() => {
                    handleSendMessage('🚀 Vamos apostar no Aviator? Aceitas o desafio?');
                    onSelectGame('AVIATOR');
                  }}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-[10px] font-bold text-red-300 whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Gamepad2 className="w-3 h-3 text-red-400" />
                  <span>🚀 Desafiar no Aviator</span>
                </button>
              )}
            </>
          )}
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
          <div className="p-2 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#131d2c] border-t border-white/10 flex items-center justify-between gap-2 shrink-0 z-30">
            <div className="flex-1 min-w-0">
              <AudioVoiceRecorder
                autoStart={true}
                onAudioRecorded={(audioUrl, duration) => {
                  handleVoiceRecorded(audioUrl, duration);
                  setIsRecordingVoice(false);
                }}
                onCancel={() => setIsRecordingVoice(false)}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsRecordingVoice(false)}
              className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-all cursor-pointer shrink-0"
            >
              Voltar ao texto
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* CHAT INPUT BAR (Always fixed at bottom with responsive safe area)         */
          /* ========================================================================= */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`p-2.5 sm:p-3 bg-[#131d2c] border-t border-white/10 flex items-center gap-1.5 sm:gap-2 shrink-0 z-30 transition-all ${
              isKeyboardVisible ? 'pb-2 sm:pb-2.5' : 'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
            }`}
          >
            {/* Hidden file input for images, audio, documents */}
            <input
              ref={fileInputRef}
              id="social-chat-file-input"
              type="file"
              accept="image/*,audio/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Attach file / image / audio button */}
            <label
              htmlFor="social-chat-file-input"
              className={`p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 flex items-center justify-center border border-white/10 active:scale-95 ${
                isUploadingImage ? 'opacity-50 pointer-events-none animate-pulse' : ''
              }`}
              title="Anexar Comprovativo, Imagem ou Áudio"
            >
              <Paperclip className="w-4 h-4 text-emerald-400" />
            </label>

            {/* Voice record toggle */}
            <button
              type="button"
              onClick={() => {
                soundService.playUISelect();
                setIsRecordingVoice(true);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shrink-0 flex items-center justify-center border border-white/10 active:scale-95"
              title="Gravar Mensagem de Voz (Áudio)"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Message input field */}
            <input
              ref={messageInputRef}
              type="text"
              id="social-chat-message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 80);
                setTimeout(() => {
                  messageInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 280);
              }}
              placeholder="Escreva uma mensagem..."
              className="flex-1 min-w-0 bg-black/50 border border-white/20 focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner"
              autoComplete="off"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center active:scale-95 ${
                inputText.trim()
                  ? 'bg-[#1877f2] hover:bg-[#166fe5] text-white cursor-pointer shadow-blue-500/30'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
              }`}
              title="Enviar Mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* IBAN ENTRY MODAL (Formatted Angolan Banking AO06)                        */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isIbanModalOpen && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#131d2c] border border-white/15 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-black text-white uppercase">Enviar Dados Bancários Oficiais</h4>
                  </div>
                  <button onClick={() => setIsIbanModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Insira a sua conta ou IBAN angolano oficial para que o comprador possa efetuar a transferência bancária com segurança.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Banco Angolano</label>
                    <select
                      value={ibanBankName}
                      onChange={(e) => setIbanBankName(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="BAI (Banco Angolano de Investimentos)">BAI (Banco Angolano de Investimentos)</option>
                      <option value="BFA (Banco de Fomento Angola)">BFA (Banco de Fomento Angola)</option>
                      <option value="BCI (Banco de Comércio e Indústria)">BCI (Banco de Comércio e Indústria)</option>
                      <option value="Banco Sol">Banco Sol</option>
                      <option value="Banco Millennium Atlântico">Banco Millennium Atlântico</option>
                      <option value="Banco BIC">Banco BIC</option>
                      <option value="Multicaixa Express (Número de Telemóvel)">Multicaixa Express</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Nome do Titular da Conta</label>
                    <input
                      type="text"
                      value={ibanAccountHolder}
                      onChange={(e) => setIbanAccountHolder(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                      placeholder="Nome completo do titular"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">IBAN Oficial (Ex: AO06.0040...)</label>
                    <input
                      type="text"
                      value={ibanNumber}
                      onChange={(e) => setIbanNumber(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      placeholder="AO06 0000 0000 0000 0000 0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsIbanModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendVerifiedIban}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider"
                  >
                    Confirmar e Enviar no Chat
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* QUICK P2P TRANSFER MODAL                                                 */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isQuickTransferOpen && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#131d2c] border border-white/15 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-sm font-black text-white uppercase">Transferir Saldo P2P</h4>
                  </div>
                  <button onClick={() => setIsQuickTransferOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Envie USDT diretamente para <strong>{partner.name}</strong> com liquidação imediata e comprovativo oficial.
                </p>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Valor a Transferir (USDT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={quickTransferAmount}
                      onChange={(e) => setQuickTransferAmount(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl pl-3 pr-16 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-400">USDT</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickTransferOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickTransfer}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider"
                  >
                    Transferir Agora
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* REPORT FRAUD MODAL                                                        */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isReportModalOpen && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#131d2c] border border-red-500/30 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h4 className="text-sm font-black text-white uppercase">Denunciar Tentativa de Burla</h4>
                  </div>
                  <button onClick={() => setIsReportModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A CryptonBet possui tolerância zero contra burlas e fraudes. Descreva o que ocorreu para que os moderadores congelem as credenciais do utilizador:
                </p>

                <div className="space-y-2">
                  {[
                    'Tentativa de desviar a negociação para o WhatsApp / Telegram',
                    'Envio de comprovativo bancário falso ou adulterado',
                    'Pedido de senhas ou códigos de confirmação SMS',
                    'Recusa em libertar a custódia após pagamento comprovado no extrato'
                  ].map((preReason) => (
                    <button
                      key={preReason}
                      type="button"
                      onClick={() => setReportReason(preReason)}
                      className={`w-full text-left p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer ${
                        reportReason === preReason
                          ? 'bg-red-500/20 border-red-500/50 text-red-200 font-bold'
                          : 'bg-black/30 border-white/10 text-slate-300 hover:bg-black/50'
                      }`}
                    >
                      {preReason}
                    </button>
                  ))}

                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Ou descreva com detalhes o que aconteceu..."
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-red-400 h-20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitFraudReport}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-md"
                  >
                    Enviar Denúncia
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* LIGHTBOX FOR IMAGE ATTACHMENTS                                            */}
        {/* ========================================================================= */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-[1300] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <img src={lightboxImage} alt="Comprovativo ampliado" className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/20 shadow-2xl" />
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SecureSocialChatModal;
