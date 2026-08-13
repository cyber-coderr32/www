import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Wallet,
  ArrowUpDown,
  ShieldCheck,
  DollarSign,
  Building,
  Clock,
  Check,
  XCircle,
  AlertCircle,
  MessageSquare,
  Phone,
  PlusCircle,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw
} from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { soundService } from '../services/soundService';
import { userService } from '../services/userService';
import { P2POffer, P2PTrade, UserAccount } from '../types';

interface P2PChatMessage {
  id: string;
  tradeId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
}

interface P2PViewProps {
  balance: number;
  user: UserAccount;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const P2PView: React.FC<P2PViewProps> = ({ balance, user, onUpdateBalance, onBack }) => {
  const [activeTab, setActiveTab] = useState<'market' | 'my-offers' | 'my-trades' | 'wallet'>('market');
  const [marketType, setMarketType] = useState<'BUY' | 'SELL'>('BUY'); // BUY means buy USDT (showing SELL offers), SELL means sell USDT (showing BUY offers)

  // Real DB state
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [trades, setTrades] = useState<P2PTrade[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(true);

  // User Profile from DB (to get latest balance and usdtBalance)
  const [profile, setProfile] = useState<any>(null);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);

  // Notification alert state
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Creation Form state
  const [offerType, setOfferType] = useState<'BUY' | 'SELL'>('SELL');
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [offerPrice, setOfferPrice] = useState<string>('1200'); // Default AOA rate per USDT
  const [paymentDetails, setPaymentDetails] = useState<string>('');
  const [pixKey, setPixKey] = useState<string>('');
  const [internationalPayments, setInternationalPayments] = useState<string>('');
  const [minLimit, setMinLimit] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Active Trade initiation modal
  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);
  const [tradeAmountInput, setTradeAmountInput] = useState<string>('');
  const [initiatingTrade, setInitiatingTrade] = useState(false);

  // Payment proof simulation
  const [proofInput, setProofInput] = useState<{ [tradeId: string]: string }>({});

  // Integrated Secure Escrow Chat state
  const [activeChatTradeId, setActiveChatTradeId] = useState<string | null>(null);
  const [p2pChatMessages, setP2pChatMessages] = useState<P2PChatMessage[]>([]);
  const [newP2pChatInput, setNewP2pChatInput] = useState<string>('');

  const currentUserId = auth.currentUser?.uid || user?.id || 'guest_user';

  // Show customized alert
  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const sendP2PAlert = async (recipientId: string, text: string) => {
    if (!recipientId || recipientId === currentUserId) return;
    const notifObj = {
      userId: recipientId,
      senderId: currentUserId,
      senderName: profile?.displayName || user.name || 'Trader P2P',
      type: 'p2p_order',
      content: text,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    if (currentUserId === 'guest_user' || recipientId === 'guest_user') {
      const localNotifs = JSON.parse(localStorage.getItem('cryptonbet_local_notifications') || '[]');
      localNotifs.unshift({ ...notifObj, id: 'notif_' + Date.now() });
      localStorage.setItem('cryptonbet_local_notifications', JSON.stringify(localNotifs));
      return;
    }
    try {
      await addDoc(collection(db, 'social_notifications'), notifObj);
    } catch (err) {
      console.error("Error sending P2P alert:", err);
    }
  };

  const handleSendP2PChat = async (trade: P2PTrade, textToSend?: string) => {
    const content = textToSend || newP2pChatInput;
    if (!content.trim()) return;
    if (!textToSend) setNewP2pChatInput('');
    soundService.playUISelect();

    const recipientId = trade.buyerId === currentUserId ? trade.sellerId : trade.buyerId;
    const senderName = profile?.displayName || user.name || 'Trader';

    const newMsgObj: P2PChatMessage = {
      id: 'p2p_msg_' + Date.now(),
      tradeId: trade.id,
      senderId: currentUserId,
      senderName,
      content,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (currentUserId === 'guest_user') {
      const localMsgs = JSON.parse(localStorage.getItem('crypton_p2p_chat_messages') || '[]');
      localMsgs.push(newMsgObj);
      localStorage.setItem('crypton_p2p_chat_messages', JSON.stringify(localMsgs));
      setP2pChatMessages(prev => [...prev, newMsgObj]);
      sendP2PAlert(recipientId, `💬 Chat Escrow (Ordem #${trade.id.slice(-6)}): ${senderName} diz: "${content.slice(0, 30)}..."`);
      return;
    }

    try {
      await addDoc(collection(db, 'p2p_chat_messages'), {
        tradeId: trade.id,
        senderId: currentUserId,
        senderName,
        content,
        createdAt: serverTimestamp()
      });
      sendP2PAlert(recipientId, `💬 Chat Escrow (Ordem #${trade.id.slice(-6)}): ${senderName} diz: "${content.slice(0, 30)}..."`);
    } catch (err) {
      console.error("Error sending P2P chat:", err);
    }
  };

  // Subscribe to User profile
  useEffect(() => {
    if (currentUserId === 'guest_user') {
      // Local Simulation Profile
      setProfile({
        displayName: 'Guest Pilot',
        balance: balance,
        usdtBalance: Number(localStorage.getItem('crypton_local_usdt_balance') || '250.00'),
        whatsapp: '+244 923 000 000',
        paymentDetails: 'Multicaixa Express - AO06 0000 0000 0000 0000 0'
      });
      setUsdtBalance(Number(localStorage.getItem('crypton_local_usdt_balance') || '250.00'));
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', currentUserId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setUsdtBalance(data.usdtBalance !== undefined ? data.usdtBalance : 100.0);
        // Save fallback locally just in case
        localStorage.setItem(`crypton_usdt_${currentUserId}`, String(data.usdtBalance !== undefined ? data.usdtBalance : 100.0));
      }
    }, (err) => {
      console.error("Error subscribing to profile in P2P", err);
    });

    return () => unsubscribe();
  }, [currentUserId, balance]);

  // Subscribe to P2P Offers
  useEffect(() => {
    let unsubscribe = () => {};

    if (currentUserId === 'guest_user') {
      // Simulation list
      const localOffers = JSON.parse(localStorage.getItem('crypton_local_p2p_offers') || '[]');
      if (localOffers.length === 0) {
        // Pre-populate with some beautiful simulated offers
        const initialOffers: P2POffer[] = [
          {
            id: 'sim_off_1',
            userId: 'merchant_1',
            userName: 'AngolaCrypto VIP',
            type: 'SELL',
            amount: 1500,
            totalAmount: 1500,
            price: 1180,
            paymentDetails: 'Banco BAI - AO06 0040 0000 2341 5567 1',
            pixKey: 'merchant.vip@pix.com.br',
            internationalPayments: 'Wise: @angolacryptovip | Revolut: @angolacrypto',
            whatsapp: '+244 934 111 222',
            createdAt: new Date().toISOString(),
            status: 'ACTIVE'
          },
          {
            id: 'sim_off_2',
            userId: 'merchant_2',
            userName: 'TetherKwanza Express',
            type: 'SELL',
            amount: 300,
            totalAmount: 300,
            price: 1210,
            paymentDetails: 'BIC - AO06 0050 0000 4432 1198 2',
            pixKey: '123.456.789-00',
            internationalPayments: 'Binance Pay ID: 88471920',
            whatsapp: '+244 912 333 444',
            createdAt: new Date().toISOString(),
            status: 'ACTIVE'
          },
          {
            id: 'sim_off_3',
            userId: 'merchant_3',
            userName: 'KwanzaPro',
            type: 'BUY',
            amount: 800,
            totalAmount: 800,
            price: 1150,
            paymentDetails: 'Multicaixa Express - AO06 0000 1234 5678 9',
            pixKey: '+5511999998888',
            internationalPayments: 'PayPal / Wise / Revolut',
            whatsapp: '+244 922 999 000',
            createdAt: new Date().toISOString(),
            status: 'ACTIVE'
          }
        ];
        localStorage.setItem('crypton_local_p2p_offers', JSON.stringify(initialOffers));
        setOffers(initialOffers);
      } else {
        setOffers(localOffers);
      }
      setLoadingOffers(false);
    } else {
      // Real Database connection
      const q = query(collection(db, 'p2p_offers'), where('status', '==', 'ACTIVE'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: P2POffer[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as P2POffer);
        });
        setOffers(fetched);
        setLoadingOffers(false);
      }, (err) => {
        console.error("Firestore error loading P2P offers:", err);
        setLoadingOffers(false);
      });
    }

    return () => unsubscribe();
  }, [currentUserId]);

  // Subscribe to P2P Trades/Escrow Transactions
  useEffect(() => {
    let unsubscribe = () => {};

    if (currentUserId === 'guest_user') {
      const localTrades = JSON.parse(localStorage.getItem('crypton_local_p2p_trades') || '[]');
      setTrades(localTrades);
      setLoadingTrades(false);
    } else {
      // Fetch trades where the user is either the buyer or the seller
      const q = query(
        collection(db, 'p2p_trades'),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: P2PTrade[] = [];
        snapshot.forEach((docSnap) => {
          const t = { id: docSnap.id, ...docSnap.data() } as P2PTrade;
          if (t.buyerId === currentUserId || t.sellerId === currentUserId) {
            fetched.push(t);
          }
        });
        setTrades(fetched);
        setLoadingTrades(false);
      }, (err) => {
        console.error("Firestore error loading P2P trades:", err);
        setLoadingTrades(false);
      });
    }

    return () => unsubscribe();
  }, [currentUserId]);

  // Subscribe to P2P Escrow Chat messages
  useEffect(() => {
    let unsubscribe = () => {};
    if (currentUserId === 'guest_user') {
      const localMsgs = JSON.parse(localStorage.getItem('crypton_p2p_chat_messages') || '[]');
      if (localMsgs.length === 0) {
        const sampleMsg: P2PChatMessage = {
          id: 'sample_msg_1',
          tradeId: 'local_trd_sample',
          senderId: 'system',
          senderName: 'Sistema Escrow',
          content: 'O USDT está retido em Escrow. Envie os dados de pagamento de forma segura.',
          createdAt: '12:00',
          isSystem: true
        };
        localStorage.setItem('crypton_p2p_chat_messages', JSON.stringify([sampleMsg]));
        setP2pChatMessages([sampleMsg]);
      } else {
        setP2pChatMessages(localMsgs);
      }
    } else {
      const q = query(collection(db, 'p2p_chat_messages'), orderBy('createdAt', 'asc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched: P2PChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as P2PChatMessage);
        });
        setP2pChatMessages(fetched);
      }, (err) => {
        console.error("Error loading P2P chat messages:", err);
      });
    }
    return () => unsubscribe();
  }, [currentUserId]);

  // Faucet claim USDT to trade
  const claimUSDTFaucet = async () => {
    soundService.playUISelect();
    const claimAmount = 250.0;
    if (currentUserId === 'guest_user') {
      const newUsdt = usdtBalance + claimAmount;
      localStorage.setItem('crypton_local_usdt_balance', String(newUsdt));
      setUsdtBalance(newUsdt);
      setProfile(prev => ({ ...prev, usdtBalance: newUsdt }));
      showAlert('Claims de 250 USDT adicionados com sucesso!', 'success');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', currentUserId), {
        usdtBalance: usdtBalance + claimAmount,
        updatedAt: serverTimestamp()
      });
      showAlert(`Recebeste +${claimAmount} USDT para Negociações P2P!`, 'success');
    } catch (e) {
      console.error(e);
      showAlert('Erro ao reivindicar USDT.', 'error');
    }
  };

  // Conversion inside wallet between AOA/KZ and USDT
  const convertKzToUsdt = async (aoaAmount: number) => {
    if (aoaAmount <= 0 || aoaAmount > balance) {
      showAlert('Saldo de Kwanza (KZ) insuficiente.', 'error');
      return;
    }
    const rate = 1200; // standard conversion rate
    const usdtGain = aoaAmount / rate;

    soundService.playWin();

    if (currentUserId === 'guest_user') {
      onUpdateBalance(-aoaAmount);
      const newUsdt = usdtBalance + usdtGain;
      localStorage.setItem('crypton_local_usdt_balance', String(newUsdt));
      setUsdtBalance(newUsdt);
      setProfile(prev => ({ ...prev, usdtBalance: newUsdt }));
      showAlert(`Convertido ${aoaAmount.toFixed(2)} KZ para ${usdtGain.toFixed(2)} USDT!`, 'success');
      return;
    }

    try {
      await userService.updateBalance(currentUserId, balance - aoaAmount);
      await updateDoc(doc(db, 'users', currentUserId), {
        usdtBalance: usdtBalance + usdtGain,
        updatedAt: serverTimestamp()
      });
      showAlert(`Convertido ${aoaAmount.toFixed(2)} KZ em ${usdtGain.toFixed(2)} USDT!`, 'success');
    } catch (e) {
      console.error(e);
      showAlert('Erro ao converter saldo.', 'error');
    }
  };

  // Convert USDT back to KZ inside wallet
  const convertUsdtToKz = async (usdtAmount: number) => {
    if (usdtAmount <= 0 || usdtAmount > usdtBalance) {
      showAlert('Saldo de USDT insuficiente.', 'error');
      return;
    }
    const rate = 1200;
    const kzGain = usdtAmount * rate;

    soundService.playWin();

    if (currentUserId === 'guest_user') {
      const newUsdt = usdtBalance - usdtAmount;
      localStorage.setItem('crypton_local_usdt_balance', String(newUsdt));
      setUsdtBalance(newUsdt);
      setProfile(prev => ({ ...prev, usdtBalance: newUsdt }));
      onUpdateBalance(kzGain);
      showAlert(`Convertido ${usdtAmount.toFixed(2)} USDT para ${kzGain.toFixed(2)} KZ!`, 'success');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', currentUserId), {
        usdtBalance: usdtBalance - usdtAmount,
        updatedAt: serverTimestamp()
      });
      await userService.updateBalance(currentUserId, balance + kzGain);
      showAlert(`Convertido ${usdtAmount.toFixed(2)} USDT em ${kzGain.toFixed(2)} KZ!`, 'success');
    } catch (e) {
      console.error(e);
      showAlert('Erro ao converter saldo.', 'error');
    }
  };

  // Handle Offer Submission (Selling or Buying)
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(offerAmount);
    const priceVal = parseFloat(offerPrice);
    const limitVal = parseFloat(minLimit) || 1;

    if (isNaN(amountVal) || amountVal <= 0) {
      showAlert('Informa um valor válido.', 'error');
      return;
    }
    if (isNaN(priceVal) || priceVal <= 0) {
      showAlert('Preço unitário em KZ inválido.', 'error');
      return;
    }

    // If selling USDT, we must check and WITHHOLD the seller's USDT immediately into the escrow system
    if (offerType === 'SELL') {
      if (usdtBalance < amountVal) {
        showAlert('Saldo de USDT insuficiente para vender.', 'error');
        return;
      }
    }

    setSubmittingOffer(true);
    soundService.playUISelect();

    if (currentUserId === 'guest_user') {
      // Simulate
      if (offerType === 'SELL') {
        const newUsdt = usdtBalance - amountVal;
        localStorage.setItem('crypton_local_usdt_balance', String(newUsdt));
        setUsdtBalance(newUsdt);
      }

      const newOffer: P2POffer = {
        id: `local_off_${Date.now()}`,
        userId: currentUserId,
        userName: profile?.displayName || 'Guest Pilot',
        type: offerType,
        amount: amountVal,
        totalAmount: amountVal,
        price: priceVal,
        minLimit: limitVal,
        whatsapp: whatsapp || profile?.whatsapp || '',
        paymentDetails: paymentDetails || 'Multicaixa Express - AO06 0000 0000 0000 0000 0',
        pixKey: pixKey,
        internationalPayments: internationalPayments,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      const localOffers = JSON.parse(localStorage.getItem('crypton_local_p2p_offers') || '[]');
      localOffers.unshift(newOffer);
      localStorage.setItem('crypton_local_p2p_offers', JSON.stringify(localOffers));
      setOffers(localOffers);

      showAlert('Anúncio P2P publicado com sucesso! USDT retido em Escrow.', 'success');
      setOfferAmount('');
      setMinLimit('');
      setPaymentDetails('');
      setPixKey('');
      setInternationalPayments('');
      setActiveTab('market');
      setSubmittingOffer(false);
      return;
    }

    try {
      // Lock funds if selling USDT
      if (offerType === 'SELL') {
        await updateDoc(doc(db, 'users', currentUserId), {
          usdtBalance: usdtBalance - amountVal,
          updatedAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'p2p_offers'), {
        userId: currentUserId,
        userName: profile?.displayName || 'Piloto',
        type: offerType,
        amount: amountVal,
        totalAmount: amountVal,
        price: priceVal,
        minLimit: limitVal,
        whatsapp: whatsapp || profile?.whatsapp || '',
        paymentDetails: paymentDetails || 'IBAN não configurado',
        pixKey: pixKey,
        internationalPayments: internationalPayments,
        createdAt: serverTimestamp(),
        status: 'ACTIVE'
      });

      showAlert('Anúncio P2P publicado com sucesso! USDT reservado no Escrow.', 'success');
      setOfferAmount('');
      setMinLimit('');
      setPaymentDetails('');
      setPixKey('');
      setInternationalPayments('');
      setActiveTab('market');
    } catch (err) {
      console.error(err);
      showAlert('Falha ao registar anúncio.', 'error');
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Initiate Trade (Take an offer)
  const handleInitiateTrade = async () => {
    if (!selectedOffer) return;
    const amountVal = parseFloat(tradeAmountInput);

    if (isNaN(amountVal) || amountVal <= 0 || amountVal > selectedOffer.amount) {
      showAlert('Quantia de USDT inválida.', 'error');
      return;
    }

    setInitiatingTrade(true);
    soundService.playUISelect();

    const isBuyingUsdt = selectedOffer.type === 'SELL'; // If they selling, we are buying
    const totalKZ = amountVal * selectedOffer.price;

    // Buyer's details
    const buyerId = currentUserId;
    const buyerName = profile?.displayName || 'Comprador';
    const sellerId = selectedOffer.userId;
    const sellerName = selectedOffer.userName;

    if (buyerId === sellerId) {
      showAlert('Não podes negociar com o teu próprio anúncio.', 'error');
      setInitiatingTrade(false);
      setSelectedOffer(null);
      return;
    }

    if (currentUserId === 'guest_user') {
      // Simulating Trade Creation
      const newTrade: P2PTrade = {
        id: `local_trd_${Date.now()}`,
        offerId: selectedOffer.id,
        buyerId,
        buyerName,
        sellerId,
        sellerName,
        amount: amountVal,
        price: selectedOffer.price,
        totalKZ,
        status: 'PENDING_PAYMENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        buyerPhone: profile?.whatsapp || '',
        sellerPhone: selectedOffer.whatsapp || '',
        paymentDetails: selectedOffer.paymentDetails || '',
        pixKey: selectedOffer.pixKey || '',
        internationalPayments: selectedOffer.internationalPayments || ''
      };

      // Subtract amount from active local offer
      const localOffers = JSON.parse(localStorage.getItem('crypton_local_p2p_offers') || '[]');
      const updatedOffers = localOffers.map((o: P2POffer) => {
        if (o.id === selectedOffer.id) {
          const rem = o.amount - amountVal;
          return {
            ...o,
            amount: rem,
            status: rem <= 0.01 ? 'COMPLETED' : 'ACTIVE'
          };
        }
        return o;
      });
      localStorage.setItem('crypton_local_p2p_offers', JSON.stringify(updatedOffers));
      setOffers(updatedOffers);

      // Save trade
      const localTrades = JSON.parse(localStorage.getItem('crypton_local_p2p_trades') || '[]');
      localTrades.unshift(newTrade);
      localStorage.setItem('crypton_local_p2p_trades', JSON.stringify(localTrades));
      setTrades(localTrades);

      sendP2PAlert(selectedOffer.userId, `⚡ ALERTA P2P: O cliente ${buyerName} iniciou uma compra de ${amountVal.toFixed(2)} USDT (${totalKZ.toLocaleString('pt-AO')} KZ) do teu anúncio P2P! Acede ao chat seguro de Escrow para coordenar o pagamento.`);

      showAlert('Negociação Iniciada com Sucesso! Fundos USDT estão retidos no Escrow.', 'success');
      setSelectedOffer(null);
      setTradeAmountInput('');
      setActiveTab('my-trades');
      setInitiatingTrade(false);
      return;
    }

    try {
      // 1. Update the remaining amount in the P2P offer
      const offerRef = doc(db, 'p2p_offers', selectedOffer.id);
      const remAmount = selectedOffer.amount - amountVal;
      await updateDoc(offerRef, {
        amount: remAmount,
        status: remAmount <= 0.01 ? 'COMPLETED' : 'ACTIVE'
      });

      // 2. Create the Escrow P2P Trade doc
      await addDoc(collection(db, 'p2p_trades'), {
        offerId: selectedOffer.id,
        buyerId,
        buyerName,
        sellerId,
        sellerName,
        amount: amountVal,
        price: selectedOffer.price,
        totalKZ,
        status: 'PENDING_PAYMENT',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        buyerPhone: profile?.whatsapp || '',
        sellerPhone: selectedOffer.whatsapp || '',
        paymentDetails: selectedOffer.paymentDetails || '',
        pixKey: selectedOffer.pixKey || '',
        internationalPayments: selectedOffer.internationalPayments || '',
        paymentProofUrl: ''
      });

      sendP2PAlert(selectedOffer.userId, `⚡ ALERTA P2P: O cliente ${buyerName} iniciou uma compra de ${amountVal.toFixed(2)} USDT (${totalKZ.toLocaleString('pt-AO')} KZ) do teu anúncio P2P! Acede ao chat seguro de Escrow para coordenar o pagamento.`);

      showAlert('Ordem Criada! A quantia de USDT foi congelada em Escrow.', 'success');
      setSelectedOffer(null);
      setTradeAmountInput('');
      setActiveTab('my-trades');
    } catch (err) {
      console.error(err);
      showAlert('Erro ao iniciar transação.', 'error');
    } finally {
      setInitiatingTrade(false);
    }
  };

  // Buyer Marks as Paid (uploads receipt)
  const handleMarkAsPaid = async (tradeId: string) => {
    soundService.playUISelect();
    const proofUrl = proofInput[tradeId] || 'Simulado - Recibo de Transferência Multicaixa';

    if (currentUserId === 'guest_user') {
      const localTrades = JSON.parse(localStorage.getItem('crypton_local_p2p_trades') || '[]');
      const updated = localTrades.map((t: P2PTrade) => {
        if (t.id === tradeId) {
          return {
            ...t,
            status: 'PAID',
            paymentProofUrl: proofUrl,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      localStorage.setItem('crypton_local_p2p_trades', JSON.stringify(updated));
      setTrades(updated);
      const targetTrade = trades.find(t => t.id === tradeId);
      if (targetTrade) {
        sendP2PAlert(targetTrade.sellerId, `💸 ALERTA P2P ESCROW: O comprador ${targetTrade.buyerName} confirmou o pagamento e anexou comprovativo (Ordem #${tradeId.slice(-6)}). Verifica a tua conta bancária antes de libertar os USDT!`);
      }
      showAlert('Negociação marcada como paga! Aguarda liberação do Vendedor.', 'success');
      return;
    }

    try {
      await updateDoc(doc(db, 'p2p_trades', tradeId), {
        status: 'PAID',
        paymentProofUrl: proofUrl,
        updatedAt: serverTimestamp()
      });
      const targetTrade = trades.find(t => t.id === tradeId);
      if (targetTrade) {
        sendP2PAlert(targetTrade.sellerId, `💸 ALERTA P2P ESCROW: O comprador ${targetTrade.buyerName} confirmou o pagamento e anexou comprovativo (Ordem #${tradeId.slice(-6)}). Verifica a tua conta bancária antes de libertar os USDT!`);
      }
      showAlert('Comprovativo submetido! Notificámos o Vendedor.', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Falha ao registar pagamento.', 'error');
    }
  };

  // Seller releases Escrow (USDT goes to buyer, KZ transferred externally)
  const handleReleaseEscrow = async (trade: P2PTrade) => {
    soundService.playWin();

    if (currentUserId === 'guest_user') {
      // Release USDT to Buyer
      const currentLocalUsdt = Number(localStorage.getItem('crypton_local_usdt_balance') || '250.00');

      if (trade.buyerId === currentUserId) {
        // I am buyer, I receive USDT
        const newUsdt = currentLocalUsdt + trade.amount;
        localStorage.setItem('crypton_local_usdt_balance', String(newUsdt));
        setUsdtBalance(newUsdt);
        setProfile(prev => ({ ...prev, usdtBalance: newUsdt }));
      } else if (trade.sellerId === currentUserId) {
        // I am seller, my locked USDT was already withheld during offer creation. I receive the AOA physically,
        // but let's simulate updating the wallet KZ balances too to make it satisfying!
        onUpdateBalance(trade.totalKZ);
      }

      // Update trade status
      const localTrades = JSON.parse(localStorage.getItem('crypton_local_p2p_trades') || '[]');
      const updated = localTrades.map((t: P2PTrade) => {
        if (t.id === trade.id) {
          return {
            ...t,
            status: 'COMPLETED',
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      localStorage.setItem('crypton_local_p2p_trades', JSON.stringify(updated));
      setTrades(updated);

      sendP2PAlert(trade.buyerId, `✅ ALERTA P2P ESCROW: O vendedor ${trade.sellerName} libertou os ${trade.amount.toFixed(2)} USDT da Ordem #${trade.id.slice(-6)}! O saldo já está disponível na tua conta CryptonBet.`);

      showAlert(`Escrow Libertado! ${trade.amount} USDT creditados.`, 'success');
      return;
    }

    try {
      // 1. Mark trade completed
      await updateDoc(doc(db, 'p2p_trades', trade.id), {
        status: 'COMPLETED',
        updatedAt: serverTimestamp()
      });

      // 2. Credit the buyer with USDT in their profile
      const buyerDocRef = doc(db, 'users', trade.buyerId);
      const buyerSnap = await getDoc(buyerDocRef);
      if (buyerSnap.exists()) {
        const currentBuyerUsdt = buyerSnap.data().usdtBalance !== undefined ? buyerSnap.data().usdtBalance : 100.0;
        await updateDoc(buyerDocRef, {
          usdtBalance: currentBuyerUsdt + trade.amount,
          updatedAt: serverTimestamp()
        });
      }

      // 3. For complete simulation fun: credit the seller in KZ (or let it be manual, but adding automatic wallet credits makes the platform feel 10x more dynamic)
      const sellerDocRef = doc(db, 'users', trade.sellerId);
      const sellerSnap = await getDoc(sellerDocRef);
      if (sellerSnap.exists()) {
        const currentSellerKz = sellerSnap.data().balance !== undefined ? sellerSnap.data().balance : 0.0;
        await updateDoc(sellerDocRef, {
          balance: currentSellerKz + trade.totalKZ,
          updatedAt: serverTimestamp()
        });
      }

      // 4. Update buyer's local wallet KZ balance if I am the buyer
      if (currentUserId === trade.buyerId) {
        onUpdateBalance(-trade.totalKZ);
      }

      sendP2PAlert(trade.buyerId, `✅ ALERTA P2P ESCROW: O vendedor ${trade.sellerName} libertou os ${trade.amount.toFixed(2)} USDT da Ordem #${trade.id.slice(-6)}! O saldo já está disponível na tua conta CryptonBet.`);

      showAlert(`USDT Libertado com Sucesso do Escrow Segurado!`, 'success');
    } catch (e) {
      console.error(e);
      showAlert('Falha ao libertar USDT do escrow.', 'error');
    }
  };

  // Cancel Trade (only allowed if PENDING_PAYMENT)
  const handleCancelTrade = async (trade: P2PTrade) => {
    soundService.playUISelect();

    if (currentUserId === 'guest_user') {
      // Return funds to seller
      if (trade.sellerId === currentUserId) {
        const newUsdt = usdtBalance + trade.amount;
        localStorage.setItem('crypton_local_usdt_balance', String(newUsdt));
        setUsdtBalance(newUsdt);
      }

      // Return amount to the offer
      const localOffers = JSON.parse(localStorage.getItem('crypton_local_p2p_offers') || '[]');
      const updatedOffers = localOffers.map((o: P2POffer) => {
        if (o.id === trade.offerId) {
          return {
            ...o,
            amount: o.amount + trade.amount,
            status: 'ACTIVE'
          };
        }
        return o;
      });
      localStorage.setItem('crypton_local_p2p_offers', JSON.stringify(updatedOffers));
      setOffers(updatedOffers);

      // Cancel trade
      const localTrades = JSON.parse(localStorage.getItem('crypton_local_p2p_trades') || '[]');
      const updated = localTrades.map((t: P2PTrade) => {
        if (t.id === trade.id) {
          return {
            ...t,
            status: 'CANCELLED',
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      localStorage.setItem('crypton_local_p2p_trades', JSON.stringify(updated));
      setTrades(updated);

      showAlert('Negociação Cancelada. USDT reembolsado.', 'success');
      return;
    }

    try {
      // 1. Cancel Trade
      await updateDoc(doc(db, 'p2p_trades', trade.id), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp()
      });

      // 2. Return locked USDT to the offer
      const offerRef = doc(db, 'p2p_offers', trade.offerId);
      const offerSnap = await getDoc(offerRef);
      if (offerSnap.exists()) {
        const currentAmt = offerSnap.data().amount || 0;
        await updateDoc(offerRef, {
          amount: currentAmt + trade.amount,
          status: 'ACTIVE'
        });
      } else {
        // If offer was fully completed/deleted, refund seller directly
        const sellerDocRef = doc(db, 'users', trade.sellerId);
        const sellerSnap = await getDoc(sellerDocRef);
        if (sellerSnap.exists()) {
          const currentSellerUsdt = sellerSnap.data().usdtBalance !== undefined ? sellerSnap.data().usdtBalance : 100.0;
          await updateDoc(sellerDocRef, {
            usdtBalance: currentSellerUsdt + trade.amount,
            updatedAt: serverTimestamp()
          });
        }
      }

      showAlert('Transação cancelada. USDT restituído ao anúncio.', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Erro ao cancelar transação.', 'error');
    }
  };

  // Dispute Trade
  const handleDisputeTrade = async (tradeId: string, reason: string) => {
    soundService.playUISelect();
    if (!reason.trim()) {
      showAlert('Indica a razão da disputa.', 'error');
      return;
    }

    if (currentUserId === 'guest_user') {
      const localTrades = JSON.parse(localStorage.getItem('crypton_local_p2p_trades') || '[]');
      const updated = localTrades.map((t: P2PTrade) => {
        if (t.id === tradeId) {
          return {
            ...t,
            status: 'DISPUTED',
            disputeReason: reason,
            disputedBy: currentUserId,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      localStorage.setItem('crypton_local_p2p_trades', JSON.stringify(updated));
      setTrades(updated);
      const targetTrade = trades.find(t => t.id === tradeId);
      if (targetTrade) {
        const otherId = targetTrade.buyerId === currentUserId ? targetTrade.sellerId : targetTrade.buyerId;
        sendP2PAlert(otherId, `⚠️ ALERTA DE DISPUTA P2P: Foi aberta uma contestação formal na Ordem #${tradeId.slice(-6)}. A moderação e auditoria CryptonBet interveio no Chat Escrow.`);
      }
      showAlert('Disputa aberta! O Suporte Master irá analisar o caso.', 'success');
      return;
    }

    try {
      await updateDoc(doc(db, 'p2p_trades', tradeId), {
        status: 'DISPUTED',
        disputeReason: reason,
        disputedBy: currentUserId,
        updatedAt: serverTimestamp()
      });
      const targetTrade = trades.find(t => t.id === tradeId);
      if (targetTrade) {
        const otherId = targetTrade.buyerId === currentUserId ? targetTrade.sellerId : targetTrade.buyerId;
        sendP2PAlert(otherId, `⚠️ ALERTA DE DISPUTA P2P: Foi aberta uma contestação formal na Ordem #${tradeId.slice(-6)}. A moderação e auditoria CryptonBet interveio no Chat Escrow.`);
      }
      showAlert('Disputa Iniciada! Um moderador do CryptonBet mediará o Escrow.', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  // Close offer (withdraw announcement)
  const handleCancelOffer = async (offer: P2POffer) => {
    soundService.playUISelect();

    if (currentUserId === 'guest_user') {
      // Refund USDT remaining to seller
      if (offer.type === 'SELL') {
        const newUsdt = usdtBalance + offer.amount;
        localStorage.setItem('crypton_local_usdt_balance', String(newUsdt));
        setUsdtBalance(newUsdt);
        setProfile(prev => ({ ...prev, usdtBalance: newUsdt }));
      }

      const localOffers = JSON.parse(localStorage.getItem('crypton_local_p2p_offers') || '[]');
      const filtered = localOffers.filter((o: P2POffer) => o.id !== offer.id);
      localStorage.setItem('crypton_local_p2p_offers', JSON.stringify(filtered));
      setOffers(filtered);

      showAlert('Anúncio removido e fundos desbloqueados.', 'success');
      return;
    }

    try {
      // 1. Mark inactive in DB
      await updateDoc(doc(db, 'p2p_offers', offer.id), {
        status: 'INACTIVE'
      });

      // 2. Refund remaining locked USDT to Seller
      if (offer.type === 'SELL') {
        await updateDoc(doc(db, 'users', currentUserId), {
          usdtBalance: usdtBalance + offer.amount,
          updatedAt: serverTimestamp()
        });
      }

      showAlert('Anúncio retirado de circulação com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Falha ao desativar anúncio.', 'error');
    }
  };

  return (
    <div className="h-full w-full bg-[#0b0e11] text-slate-100 flex flex-col overflow-y-auto no-scrollbar font-sans">

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-[#131d27] to-[#0d141b] border-b border-white/5 p-6 md:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">

        {/* Abstract design elements */}
        <div className="absolute top-[-50px] right-[-50px] w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <button
            onClick={() => { soundService.playTick(); onBack(); }}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all group shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FFCC00]/10 text-[#FFCC00] text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#FFCC00]/25">
                Escrow Garantido 100%
              </span>
              {currentUserId === 'guest_user' && (
                <span className="bg-amber-600/10 text-amber-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/25">
                  Sandbox Modo
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white mt-1">
              Mercado <span className="text-[#049444]">P2P</span> Escrow
            </h1>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
              Negociação P2P Segura em USDT
            </p>
          </div>
        </div>

        {/* WALLET METRICS */}
        <div className="w-full md:w-auto flex items-center gap-4 bg-black/40 border border-white/5 p-4 rounded-3xl backdrop-blur-md z-10 shadow-inner">
          <div className="px-1 text-center">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Saldo Principal (USDT)</span>
            <span className="text-base font-black text-white block mt-0.5 font-mono">
              {balance.toFixed(2)} <span className="text-xs text-[#049444]">USDT</span>
            </span>
          </div>
          <div className="w-[1px] h-10 bg-white/10" />
          <div className="px-1 text-center">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Carteira P2P (USDT)</span>
            <span className="text-base font-black text-white block mt-0.5 font-mono">
              {usdtBalance.toFixed(2)} <span className="text-xs text-[#38e0a3]">USDT</span>
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC ALERT BANNER */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border text-xs font-black uppercase tracking-wider ${
              alertMsg.type === 'success'
                ? 'bg-[#049444] border-emerald-500/30 text-white'
                : 'bg-red-600 border-red-500/30 text-white'
            }`}
          >
            {alertMsg.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {alertMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE CONTENT LAYOUT */}
      <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* SIDE BAR NAVIGATION */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#131d27] border border-white/5 p-4 rounded-[2rem] space-y-2 shadow-xl">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-3">
              Negociar & Escrow
            </span>
            {[
              { id: 'market', label: 'Comprar & Vender', icon: <ArrowUpDown className="w-4 h-4" /> },
              { id: 'my-trades', label: 'Minhas Ordens', icon: <Clock className="w-4 h-4" />, count: trades.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length },
              { id: 'my-offers', label: 'Criar Anúncio', icon: <PlusCircle className="w-4 h-4" /> },
              { id: 'wallet', label: 'Carteira & Swap', icon: <Wallet className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { soundService.playTick(); setActiveTab(tab.id as any); }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20 scale-[1.02]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-2 py-0.5 text-[9px] bg-white text-red-600 rounded-full font-black animate-pulse">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* SECURITY ESCROW INFO CARD */}
          <div className="bg-gradient-to-b from-black/50 to-transparent border border-white/5 p-5 rounded-[2rem] space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#049444]/10 border border-[#049444]/25 flex items-center justify-center text-[#049444] mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Escrow Blindado</h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                O CryptonBet atua como custodiante neutro. O vendedor não pode remover o USDT depois de iniciado o trade, garantindo segurança total para ambas as partes.
              </p>
            </div>
          </div>
        </div>

        {/* MAIN PANEL VIEWPORT */}
        <div className="lg:col-span-9 space-y-6">

          {/* TAB 1: P2P MARKET PLACE */}
          {activeTab === 'market' && (
            <div className="space-y-6">

              {/* Market Filter Header */}
              <div className="bg-[#131d27] border border-white/5 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <button
                    onClick={() => { soundService.playTick(); setMarketType('BUY'); }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                      marketType === 'BUY'
                        ? 'bg-[#049444] text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Quero Comprar USDT
                  </button>
                  <button
                    onClick={() => { soundService.playTick(); setMarketType('SELL'); }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                      marketType === 'SELL'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Quero Vender USDT
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-2xl">
                  <Info className="w-4 h-4 text-[#FFCC00]" />
                  <span>Cotação Média: 1,200 AOA / 1 USDT</span>
                </div>
              </div>

              {/* OFFERS LISTINGS */}
              {loadingOffers ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-[#131d27] rounded-[2rem] border border-white/5">
                  <RefreshCw className="w-8 h-8 text-[#049444] animate-spin" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Mercado Real...</span>
                </div>
              ) : offers.filter(o => marketType === 'BUY' ? o.type === 'SELL' : o.type === 'BUY').length === 0 ? (
                <div className="bg-[#131d27] border border-white/5 rounded-[2rem] p-12 text-center space-y-4">
                  <div className="text-5xl">📦</div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Sem Ofertas Ativas</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Seja o primeiro a publicar uma oferta no Crypton Social P2P!</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('my-offers')}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    Criar Anúncio Agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offers
                    .filter(o => marketType === 'BUY' ? o.type === 'SELL' : o.type === 'BUY')
                    .map((offer) => {
                      const totalOfferValue = offer.amount * offer.price;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={offer.id}
                          className="bg-[#131d27] border border-white/5 p-6 rounded-[2rem] space-y-5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-black uppercase text-xs text-[#FFCC00]">
                                {offer.userName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-black text-xs text-white block uppercase tracking-wide">
                                  {offer.userName}
                                </span>
                                <span className="text-[8px] text-[#049444] font-black block uppercase tracking-widest mt-0.5">
                                  ✓ Comerciante Verificado
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Taxa de Câmbio</span>
                              <span className="text-base font-mono font-black text-[#FFCC00] block">
                                {offer.price.toFixed(2)} <span className="text-xs">USD/USDT</span>
                              </span>
                            </div>
                          </div>

                          <div className="bg-black/35 p-4 rounded-2xl space-y-2.5 font-semibold text-[10px] text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-bold uppercase">Disponível em Escrow:</span>
                              <span className="font-mono text-white font-black">{offer.amount.toFixed(2)} USDT</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-bold uppercase">Equivalente Máximo:</span>
                              <span className="font-mono text-white font-black">{totalOfferValue.toFixed(2)} USDT</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-bold uppercase">Limite Mínimo:</span>
                              <span className="font-mono text-white font-black">{(offer.minLimit || 1).toFixed(2)} USDT</span>
                            </div>

                            {/* Payment Badges */}
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                              {offer.paymentDetails && (
                                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                                  🏦 IBAN / Banco
                                </span>
                              )}
                              {offer.pixKey && (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                                  🇧🇷 PIX
                                </span>
                              )}
                              {offer.internationalPayments && (
                                <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                                  🌍 Internacional
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-3">
                            {offer.userId !== currentUserId ? (
                              <button
                                onClick={() => { soundService.playTick(); setSelectedOffer(offer); setTradeAmountInput(''); }}
                                className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg text-center ${
                                  marketType === 'BUY'
                                    ? 'bg-[#049444] hover:bg-emerald-500 text-white shadow-emerald-500/10'
                                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/10'
                                }`}
                              >
                                {marketType === 'BUY' ? 'Comprar USDT' : 'Vender USDT'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCancelOffer(offer)}
                                className="w-full py-3.5 bg-white/5 hover:bg-red-600/25 border border-white/5 hover:border-red-600/35 text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Remover Anúncio
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

          {/* MODAL / BOTTOM SHEET TO COMMENCE ESCROW TRADE */}
          <AnimatePresence>
            {selectedOffer && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  onClick={() => setSelectedOffer(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-md bg-gradient-to-b from-[#142031] to-[#0a111a] border border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-2xl space-y-6 overflow-hidden text-white"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[3px] bg-gradient-to-r from-transparent via-[#049444] to-transparent animate-pulse" />

                  <div className="space-y-1 text-center">
                    <span className="bg-[#049444]/10 text-[#049444] text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#049444]/25">
                      Negociação com Custódia Escrow
                    </span>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter mt-3">
                      Iniciar Ordem P2P
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Parceiro: {selectedOffer.userName} (Taxa: {selectedOffer.price} AOA)
                    </p>
                  </div>

                  <div className="bg-black/30 p-4 rounded-2xl space-y-3 font-semibold text-xs border border-white/5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Disponível:</span>
                      <span className="font-mono text-white font-black">{selectedOffer.amount.toFixed(2)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Limite Mínimo:</span>
                      <span className="font-mono text-white font-black">{(selectedOffer.minLimit || 1).toFixed(2)} USDT</span>
                    </div>
                    <div className="pt-2 border-t border-white/5 space-y-1.5 text-[10px]">
                      <span className="text-slate-400 font-bold uppercase block text-[9px]">Métodos de Pagamento Aceites:</span>
                      {selectedOffer.paymentDetails && (
                        <div className="flex justify-between text-slate-300">
                          <span>🏦 IBAN / Banco:</span>
                          <span className="font-mono text-white text-[9px] font-bold">{selectedOffer.paymentDetails}</span>
                        </div>
                      )}
                      {selectedOffer.pixKey && (
                        <div className="flex justify-between text-emerald-400">
                          <span>🇧🇷 Chave PIX:</span>
                          <span className="font-mono text-white text-[9px] font-bold">{selectedOffer.pixKey}</span>
                        </div>
                      )}
                      {selectedOffer.internationalPayments && (
                        <div className="flex justify-between text-purple-400">
                          <span>🌍 Internacional:</span>
                          <span className="font-mono text-white text-[9px] font-bold">{selectedOffer.internationalPayments}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input form */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Quantidade a transacionar (USDT)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tradeAmountInput}
                          onChange={(e) => setTradeAmountInput(e.target.value)}
                          placeholder="Min: 1.00 USDT"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-mono font-black text-white text-sm focus:outline-none focus:border-[#049444]"
                        />
                        <button
                          onClick={() => setTradeAmountInput(String(selectedOffer.amount))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-[#049444] uppercase tracking-wider hover:text-emerald-400 cursor-pointer"
                        >
                          Máximo
                        </button>
                      </div>
                    </div>

                    {/* Calculated Outcome */}
                    {parseFloat(tradeAmountInput) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-[#049444]/5 border border-[#049444]/20 p-4 rounded-2xl space-y-1.5 text-xs font-semibold"
                      >
                        <div className="flex justify-between">
                          <span className="text-slate-400">Vais Pagar / Receber:</span>
                          <span className="font-mono text-[#049444] font-black">
                            {(parseFloat(tradeAmountInput) * selectedOffer.price).toLocaleString('pt-AO')} KZ
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">USDT Bloqueado em Escrow:</span>
                          <span className="font-mono text-white font-black">
                            {parseFloat(tradeAmountInput).toFixed(2)} USDT
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSelectedOffer(null)}
                      className="flex-1 py-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleInitiateTrade}
                      disabled={initiatingTrade || !tradeAmountInput || parseFloat(tradeAmountInput) <= 0 || parseFloat(tradeAmountInput) > selectedOffer.amount}
                      className="flex-1 py-4 bg-[#049444] hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {initiatingTrade ? 'A Processar...' : 'Abrir Trade'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>


          {/* TAB 2: ACTIVE TRADES / ESCROW TRANSACTIONS */}
          {activeTab === 'my-trades' && (
            <div className="space-y-6">
              <div className="bg-[#131d27] border border-white/5 p-6 rounded-[2rem] shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-500" />
                  <span>Ordens em Custódia Escrow</span>
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">
                  Todas as tuas compras e vendas de USDT em andamento seguro
                </p>
              </div>

              {loadingTrades ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-[#131d27] rounded-[2rem] border border-white/5">
                  <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A carregar ordens de custódia...</span>
                </div>
              ) : trades.length === 0 ? (
                <div className="bg-[#131d27] border border-white/5 rounded-[2rem] p-12 text-center space-y-4">
                  <div className="text-5xl">🛡️</div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Nenhuma Ordem Aberta</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Podes encontrar anúncios no Mercado e iniciar compras seguras.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('market')}
                    className="px-6 py-3 bg-[#049444] hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    Navegar no Mercado
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trades.map((trade) => {
                    const isBuyer = trade.buyerId === currentUserId;
                    const roleLabel = isBuyer ? 'Comprador' : 'Vendedor';

                    // Style by status
                    const statusColors: { [key: string]: string } = {
                      PENDING_PAYMENT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      PAID: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                      COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      CANCELLED: 'bg-white/5 text-slate-400 border-white/5',
                      DISPUTED: 'bg-red-500/10 text-red-500 border-red-500/20'
                    };

                    const statusLabels: { [key: string]: string } = {
                      PENDING_PAYMENT: 'Aguardando Pagamento',
                      PAID: 'Pago (A libertar)',
                      COMPLETED: 'Concluído (USDT Libertado)',
                      CANCELLED: 'Cancelado',
                      DISPUTED: 'Em Disputa'
                    };

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={trade.id}
                        className="bg-[#131d27] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl text-slate-200"
                      >
                        {/* Status bar */}
                        <div className="bg-black/30 px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#FFCC00]">
                              Ordem: {trade.id.slice(0, 10)}...
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColors[trade.status]}`}>
                              {statusLabels[trade.status]}
                            </span>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${isBuyer ? 'bg-emerald-600/10 text-emerald-400' : 'bg-red-600/10 text-red-400'}`}>
                            És o {roleLabel}
                          </span>
                        </div>

                        {/* Trade Details */}
                        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6">

                          {/* Financials columns */}
                          <div className="md:col-span-4 space-y-4">
                            <div>
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Quantia de USDT Escrow</span>
                              <span className="text-xl font-mono font-black text-white">{trade.amount.toFixed(2)} USDT</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Total em Kwanzas a Enviar</span>
                              <span className="text-lg font-mono font-black text-[#FFCC00]">{trade.totalKZ.toLocaleString('pt-AO')} KZ</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-slate-500 font-bold">Taxa: </span>
                              <span className="font-mono font-bold text-white">{trade.price} KZ / USDT</span>
                            </div>
                          </div>

                          {/* Escrow Instruction Panels based on current state */}
                          <div className="md:col-span-8 bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-4">

                            {/* PENDING PAYMENT STATE instructions */}
                            {trade.status === 'PENDING_PAYMENT' && (
                              <div className="space-y-3">
                                {isBuyer ? (
                                  <>
                                    <h4 className="text-xs font-black uppercase text-amber-500 flex items-center gap-2">
                                      <Info className="w-4 h-4" /> Passo 1: Envia o Valor para o Vendedor
                                    </h4>
                                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                                      Transfere exactamente <span className="text-[#FFCC00] font-black">{trade.totalKZ.toLocaleString('pt-AO')} KZ</span> via o método preferido do vendedor {trade.sellerName}. O USDT correspondente está bloqueado em segurança no nosso contrato Escrow.
                                    </p>
                                    <div className="bg-white/5 p-3 rounded-xl space-y-1.5 text-[9px] font-bold text-slate-300 border border-white/5">
                                      <div className="flex justify-between"><span className="text-slate-500">Nome Vendedor:</span><span className="text-white">{trade.sellerName}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-500">IBAN / Banco:</span><span className="text-white font-mono uppercase">{trade.paymentDetails || 'AO06 0000 0000 1234 5678 9'}</span></div>
                                      {trade.pixKey && (
                                        <div className="flex justify-between"><span className="text-emerald-400">🇧🇷 Chave PIX:</span><span className="text-emerald-300 font-mono font-bold">{trade.pixKey}</span></div>
                                      )}
                                      {trade.internationalPayments && (
                                        <div className="flex justify-between"><span className="text-purple-400">🌍 Internacional:</span><span className="text-purple-300 font-mono font-bold">{trade.internationalPayments}</span></div>
                                      )}
                                      <div className="flex justify-between"><span className="text-slate-500">WhatsApp:</span><span className="text-emerald-400">{trade.sellerPhone || 'Não fornecido'}</span></div>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                      <input
                                        type="text"
                                        placeholder="Código ou Referência do Comprovativo..."
                                        value={proofInput[trade.id] || ''}
                                        onChange={(e) => setProofInput({ ...proofInput, [trade.id]: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-white focus:outline-none font-semibold"
                                      />
                                      <button
                                        onClick={() => handleMarkAsPaid(trade.id)}
                                        className="w-full py-3 bg-[#049444] hover:bg-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all cursor-pointer"
                                      >
                                        Já paguei! Marcar como Pago
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <h4 className="text-xs font-black uppercase text-amber-500">Aguardando Pagamento do Comprador</h4>
                                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                                      O comprador {trade.buyerName} está a efectuar a transferência de <span className="text-[#FFCC00] font-black">{trade.totalKZ.toLocaleString('pt-AO')} KZ</span> para o teu IBAN. O teu USDT está seguro em Escrow e não pode ser cancelado sem mediação.
                                    </p>
                                    <div className="flex gap-2">
                                      <span className="text-[9px] text-slate-500 font-black uppercase">Contacto Comprador: </span>
                                      <span className="text-[9px] text-emerald-400 font-mono font-bold">{trade.buyerPhone || 'Não fornecido'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* PAID STATE instructions */}
                            {trade.status === 'PAID' && (
                              <div className="space-y-3">
                                {isBuyer ? (
                                  <>
                                    <h4 className="text-xs font-black uppercase text-indigo-400 flex items-center gap-2">
                                      <Check className="w-4 h-4" /> Pagamento Comunicado
                                    </h4>
                                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                                      Marcaste esta transação como paga. O vendedor {trade.sellerName} foi notificado para verificar a conta e libertar os fundos USDT.
                                    </p>
                                    <div className="text-[9px] text-slate-400 italic">
                                      Referência: {trade.paymentProofUrl}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <h4 className="text-xs font-black uppercase text-indigo-400 flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4" /> Pagamento Declarado! Verifica o Saldo
                                    </h4>
                                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                                      O comprador {trade.buyerName} afirma ter enviado os <span className="text-[#FFCC00] font-black">{trade.totalKZ.toLocaleString('pt-AO')} KZ</span>. Confirma no teu extrato bancário se recebeste o valor antes de libertar!
                                    </p>
                                    <div className="p-3 bg-white/5 rounded-xl text-[9px] text-slate-400 font-bold border border-white/5">
                                      Comprovativo anexado: <span className="text-white block font-mono mt-1 font-semibold">{trade.paymentProofUrl}</span>
                                    </div>
                                    <button
                                      onClick={() => handleReleaseEscrow(trade)}
                                      className="w-full py-3 bg-[#049444] hover:bg-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                                    >
                                      ✓ Confirmar Recebimento e Libertar USDT
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {/* COMPLETED STATE */}
                            {trade.status === 'COMPLETED' && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-2">
                                  <ShieldCheck className="w-4.5 h-4.5" /> Negócio Concluído com Sucesso!
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                  O USDT custodiado em Escrow seguro foi libertado com sucesso para a carteira do comprador. A transação terminou de forma segura e auditada.
                                </p>
                              </div>
                            )}

                            {/* CANCELLED STATE */}
                            {trade.status === 'CANCELLED' && (
                              <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase text-slate-500">Negociação Cancelada</h4>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  Esta ordem foi cancelada. O USDT retornou ao saldo de venda ou ao comerciante.
                                </p>
                              </div>
                            )}

                            {/* DISPUTED STATE */}
                            {trade.status === 'DISPUTED' && (
                              <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase text-red-500 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" /> Ordem Sob Mediação Administrativa
                                </h4>
                                <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                                  Uma disputa foi aberta para este Escrow por {trade.disputedBy === currentUserId ? 'ti' : 'parceiro'}. O suporte do CryptonBet está a analisar o comprovativo e decidirá a libertação correta do USDT.
                                </p>
                                <div className="p-3 bg-red-600/5 rounded-xl text-[9px] text-red-300 border border-red-500/10 font-bold">
                                  Motivo da Disputa: {trade.disputeReason}
                                </div>
                              </div>
                            )}

                            {/* Control Actions footer */}
                            <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/5">
                              {trade.status === 'PENDING_PAYMENT' && isBuyer && (
                                <button
                                  onClick={() => handleCancelTrade(trade)}
                                  className="px-4 py-2 bg-red-600/10 hover:bg-red-600/25 text-red-400 text-[9px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancelar Trade
                                </button>
                              )}
                              {trade.status === 'PAID' && (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    id={`dispute-reason-${trade.id}`}
                                    placeholder="Motivo da disputa..."
                                    className="bg-black/30 border border-white/5 rounded px-2.5 text-[9px] text-white py-1"
                                  />
                                  <button
                                    onClick={() => {
                                      const reasonEl = document.getElementById(`dispute-reason-${trade.id}`) as HTMLInputElement;
                                      handleDisputeTrade(trade.id, reasonEl?.value || 'Falha na libertação / Sem contacto');
                                    }}
                                    className="px-4 py-2 bg-red-600/10 hover:bg-red-600/25 text-red-500 text-[9px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                                  >
                                    Disputar
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Integrated Secure Escrow Chat Button / Toggle */}
                            <div className="mt-2 pt-3 border-t border-white/10">
                              <button
                                onClick={() => setActiveChatTradeId(activeChatTradeId === trade.id ? null : trade.id)}
                                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-[#049444]/40 hover:from-emerald-900 hover:to-[#049444] border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-black uppercase tracking-wider text-emerald-300 transition-all cursor-pointer shadow-md"
                              >
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                                  <span>💬 Chat Escrow Seguro & Anti-Roubo</span>
                                </div>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono">
                                  {p2pChatMessages.filter(m => m.tradeId === trade.id).length} msgs
                                </span>
                              </button>

                              <AnimatePresence>
                                {activeChatTradeId === trade.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 bg-[#0b1017] border border-emerald-500/40 rounded-2xl p-4 space-y-3 overflow-hidden shadow-2xl"
                                  >
                                    {/* Anti-Scam Security Banner */}
                                    <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-3 flex items-start gap-2.5">
                                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                                      <div className="text-[10px] space-y-1">
                                        <span className="font-black uppercase tracking-wider text-emerald-300 block">🔒 SISTEMA ESCROW 100% PROTEGIDO ANTI-ROUBO</span>
                                        <p className="text-slate-300 font-medium leading-relaxed">
                                          O valor de <span className="text-[#FFCC00] font-bold">${trade.amount.toFixed(2)} USDT</span> está retido em garantia. NUNCA liberte criptomoedas antes do dinheiro entrar no seu extrato bancário oficial. Todas as mensagens são auditadas pela segurança CryptonBet.
                                        </p>
                                      </div>
                                    </div>

                                    {/* Message Stream */}
                                    <div className="max-h-52 overflow-y-auto space-y-2 p-2.5 bg-black/50 rounded-xl border border-white/5 no-scrollbar">
                                      {p2pChatMessages.filter(m => m.tradeId === trade.id).length === 0 ? (
                                        <div className="text-center py-6 text-slate-500 text-[10px] font-bold uppercase">
                                          Nenhuma mensagem neste trade. Inicie a conversa segura com a outra parte!
                                        </div>
                                      ) : (
                                        p2pChatMessages.filter(m => m.tradeId === trade.id).map((msg) => {
                                          const isMeMsg = msg.senderId === currentUserId;
                                          return (
                                            <div key={msg.id} className={`flex flex-col ${isMeMsg ? 'items-end' : 'items-start'}`}>
                                              <div className="flex items-center gap-1.5 px-1 mb-0.5">
                                                <span className="text-[9px] font-extrabold text-slate-400 uppercase">{msg.senderName}</span>
                                                <span className="text-[8px] font-mono text-slate-600">{msg.createdAt}</span>
                                              </div>
                                              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-semibold leading-relaxed ${
                                                msg.isSystem ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px]' :
                                                isMeMsg ? 'bg-[#049444] text-white rounded-br-none' : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/10'
                                              }`}>
                                                {msg.content}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>

                                    {/* Quick Proof Actions */}
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSendP2PChat(trade, `📎 Os meus dados para pagamento: ${trade.paymentDetails || 'IBAN/Multicaixa'}`)}
                                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 transition-all cursor-pointer"
                                      >
                                        📎 Enviar Dados Bancários
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSendP2PChat(trade, `📸 Comprovativo de pagamento efetuado e anexado! Verifique por favor.`)}
                                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[9px] font-bold text-emerald-300 transition-all cursor-pointer"
                                      >
                                        📸 Confirmar Comprovativo
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSendP2PChat(trade, `⚠️ Atenção: Aguardando confirmação no meu extrato bancário oficial.`)}
                                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-[9px] font-bold text-amber-300 transition-all cursor-pointer"
                                      >
                                        ⚠️ Alertar Verificação
                                      </button>
                                    </div>

                                    {/* Input box */}
                                    <div className="flex items-center gap-2 pt-1">
                                      <input
                                        type="text"
                                        value={newP2pChatInput}
                                        onChange={(e) => setNewP2pChatInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendP2PChat(trade); }}
                                        placeholder="Escreva uma mensagem no Chat Escrow..."
                                        className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSendP2PChat(trade)}
                                        className="px-4 py-2 bg-[#049444] hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
                                      >
                                        Enviar
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW OFFER */}
          {activeTab === 'my-offers' && (
            <div className="space-y-6">
              <div className="bg-[#131d27] border border-white/5 p-6 rounded-[2rem] shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Publicar Anúncio de Negócio P2P</h3>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">
                  Cria uma oferta pública para outros usuários comprarem ou venderem USDT contigo
                </p>
              </div>

              <div className="bg-[#131d27] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative">
                <form onSubmit={handleCreateOffer} className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Offer Type */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Eu quero:</label>
                      <div className="grid grid-cols-2 bg-black/40 p-1 rounded-2xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setOfferType('SELL')}
                          className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            offerType === 'SELL'
                              ? 'bg-red-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Vender USDT (Desejo receber KZ)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOfferType('BUY')}
                          className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            offerType === 'BUY'
                              ? 'bg-[#049444] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Comprar USDT (Ofereço KZ)
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantia de USDT</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          placeholder="Quantia total, ex: 100"
                          required
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-mono font-black text-white focus:outline-none focus:border-[#049444]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">USDT</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rate/Price */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço por 1 USDT (Câmbio em KZ)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={offerPrice}
                          onChange={(e) => setOfferPrice(e.target.value)}
                          placeholder="Ex: 1200"
                          required
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-mono font-black text-white focus:outline-none focus:border-[#049444]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">KZ / AOA</span>
                      </div>
                    </div>

                    {/* Min Trade Limit */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limite Mínimo por Ordem (USDT)</label>
                      <input
                        type="number"
                        value={minLimit}
                        onChange={(e) => setMinLimit(e.target.value)}
                        placeholder="Ex: 10 (Opcional)"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-mono font-black text-white focus:outline-none focus:border-[#049444]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Payment details */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Teus Detalhes de Pagamento (IBAN / Banco / Multicaixa)</label>
                      <textarea
                        value={paymentDetails}
                        onChange={(e) => setPaymentDetails(e.target.value)}
                        placeholder="Ex: Banco BAI - AO06 0000 ... Nome: Manuel Silva"
                        required
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-semibold text-white focus:outline-none focus:border-[#049444] resize-none"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Teu Contacto WhatsApp (Para agilizar trades)</label>
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Ex: +244 923 000 000"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-semibold text-white focus:outline-none focus:border-[#049444]"
                      />
                      <span className="text-[8px] text-slate-500 font-bold block px-2">Será exibido apenas aos parceiros que iniciarem uma negociação contigo.</span>
                    </div>
                  </div>

                  {/* Escrow warning message */}
                  <div className="bg-[#FFCC00]/5 border border-[#FFCC00]/25 p-4 rounded-2xl flex gap-3 text-xs text-[#FFCC00] font-semibold leading-relaxed">
                    <Info className="w-5 h-5 shrink-0" />
                    <span>
                      {offerType === 'SELL'
                        ? 'Ao submeteres uma venda de USDT, a quantia selecionada será retida de imediato do teu saldo e mantida sob a custódia do nosso Escrow até libertares após receberes a transferência em Angola.'
                        : 'Como comprador de USDT, concordas em pagar a quantia correspondente em Kwanzas para o IBAN do vendedor assim que uma negociação for aberta.'
                      }
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingOffer}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all cursor-pointer shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingOffer ? 'A Publicar Anúncio...' : '✓ Publicar Anúncio com Garantia Escrow'}
                  </button>

                </form>
              </div>
            </div>
          )}

          {/* TAB 4: WALLET & CONVERSION */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <div className="bg-[#131d27] border border-white/5 p-6 rounded-[2rem] shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Minha Carteira Integrada</h3>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">
                  Gere os teus fundos em Kwanzas, recebe USDT faucet grátis e faz swaps instantâneos
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* claim Faucet card */}
                <div className="bg-[#131d27] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#38e0a3]/10 border border-[#38e0a3]/25 flex items-center justify-center text-[#38e0a3]">
                      <PlusCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">USDT Torneira (Faucet)</h4>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                        Obtém fichas de USDT gratuitas para testares e iniciares vendas de USDT por Kwanza de forma rápida no P2P Escrow!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={claimUSDTFaucet}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/25"
                  >
                    Claim 250.00 USDT Testnet
                  </button>
                </div>

                {/* Swap Instantaneo Card */}
                <div className="bg-[#131d27] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#FFCC00]">Conversor Instantâneo</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Troca instantaneamente entre moedas da tua carteira CryptonBet</p>

                  <div className="space-y-3">
                    {/* Swap KZ to USDT */}
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                      <span className="text-[8px] text-slate-500 font-bold uppercase block">Converter Kwanzas para USDT</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          id="swap-aoa-amount"
                          placeholder="Valor em KZ..."
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-mono"
                        />
                        <button
                          onClick={() => {
                            const valEl = document.getElementById('swap-aoa-amount') as HTMLInputElement;
                            convertKzToUsdt(parseFloat(valEl?.value || '0'));
                          }}
                          className="bg-[#049444] hover:bg-emerald-500 text-white px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Trocar
                        </button>
                      </div>
                    </div>

                    {/* Swap USDT to KZ */}
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                      <span className="text-[8px] text-slate-500 font-bold uppercase block">Converter USDT para Kwanzas</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          id="swap-usdt-amount"
                          placeholder="Valor em USDT..."
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-mono"
                        />
                        <button
                          onClick={() => {
                            const valEl = document.getElementById('swap-usdt-amount') as HTMLInputElement;
                            convertUsdtToKz(parseFloat(valEl?.value || '0'));
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Trocar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default P2PView;
