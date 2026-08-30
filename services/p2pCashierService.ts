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
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { P2PCashierProfile, P2PCashierRequest } from '../types';

const LOCAL_CASHIER_PROFILES_KEY = 'crypton_local_cashier_profiles';
const LOCAL_CASHIER_REQUESTS_KEY = 'crypton_local_cashier_requests';
const LOCAL_CASHIER_MESSAGES_KEY = 'crypton_local_cashier_messages';

export interface CashierChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isSystem?: boolean;
}

// Initial demo cashiers for rich realistic ecosystem
const INITIAL_DEMO_CASHIER_PROFILES: P2PCashierProfile[] = [
  {
    id: 'cashier_prof_1',
    userId: 'cashier_user_1',
    userName: 'KwanzaFast Express ⚡',
    userAvatarColor: 'bg-emerald-600',
    whatsapp: '+244 923 111 222',
    isOnline: true,
    acceptedMethods: ['Multicaixa Express', 'BAI Directo', 'Unitel Money', 'BFA Net'],
    commissionRate: 2.0,
    minAmount: 5,
    maxAmount: 1500,
    totalTrades: 428,
    completedTrades: 425,
    totalVolumeUSDT: 48900,
    totalEarnedCommissionsUSDT: 978,
    rating: 4.98,
    ratingCount: 390,
    avgResponseTimeMinutes: 2,
    bankDetailsNote: 'Multicaixa Express: 923 111 222 | BAI Directo: AO06 0040 0000 1289 4432 1',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cashier_prof_2',
    userId: 'cashier_user_2',
    userName: 'Luanda Crypto Liquidity 💎',
    userAvatarColor: 'bg-blue-600',
    whatsapp: '+244 934 555 777',
    isOnline: true,
    acceptedMethods: ['Multicaixa Express', 'BAI Directo', 'Atlântico Directo', 'Banco Sol', 'PIX Brasil'],
    commissionRate: 2.5,
    minAmount: 10,
    maxAmount: 3000,
    totalTrades: 760,
    completedTrades: 756,
    totalVolumeUSDT: 92400,
    totalEarnedCommissionsUSDT: 2310,
    rating: 4.96,
    ratingCount: 710,
    avgResponseTimeMinutes: 3,
    bankDetailsNote: 'Atlântico: AO06 0055 0000 8871 2234 9 | Chave PIX: luandacrypto@pix.com.br',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cashier_prof_3',
    userId: 'cashier_user_3',
    userName: 'GlobalP2P Angola & M-Pesa 🌍',
    userAvatarColor: 'bg-purple-600',
    whatsapp: '+244 945 888 999',
    isOnline: true,
    acceptedMethods: ['Multicaixa Express', 'Unitel Money', 'M-Pesa Moçambique', 'PIX Brasil', 'Wise'],
    commissionRate: 3.0,
    minAmount: 5,
    maxAmount: 800,
    totalTrades: 312,
    completedTrades: 310,
    totalVolumeUSDT: 26500,
    totalEarnedCommissionsUSDT: 795,
    rating: 4.94,
    ratingCount: 295,
    avgResponseTimeMinutes: 4,
    bankDetailsNote: 'Unitel Money: 945 888 999 | M-Pesa: +258 84 123 4567',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Initial demo requests in the matching pool
const INITIAL_DEMO_REQUESTS: P2PCashierRequest[] = [
  {
    id: 'req_demo_1',
    requesterId: 'client_usr_1',
    requesterName: 'Manuel Ferreira',
    requesterPhone: '+244 921 444 333',
    requesterAvatarColor: 'bg-amber-600',
    type: 'DEPOSIT',
    amountUSDT: 50,
    fiatAmount: 60000,
    fiatCurrency: 'AOA',
    paymentMethod: 'Multicaixa Express',
    userPaymentDetails: 'Multicaixa Express: 921 444 333 (Manuel Ferreira)',
    commissionAmountUSDT: 1.25,
    status: 'OPEN',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 'req_demo_2',
    requesterId: 'client_usr_2',
    requesterName: 'Ana Paula Santos',
    requesterPhone: '+244 932 777 888',
    requesterAvatarColor: 'bg-rose-600',
    type: 'WITHDRAW',
    amountUSDT: 80,
    fiatAmount: 96000,
    fiatCurrency: 'AOA',
    paymentMethod: 'BAI Directo',
    userPaymentDetails: 'IBAN BAI: AO06 0040 0000 9941 2284 1 (Ana Santos)',
    commissionAmountUSDT: 2.00,
    status: 'OPEN',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60000).toISOString()
  },
  {
    id: 'req_demo_3',
    requesterId: 'client_usr_3',
    requesterName: 'Lucas Bragança',
    requesterPhone: '+55 11 98888-7777',
    requesterAvatarColor: 'bg-emerald-600',
    type: 'DEPOSIT',
    amountUSDT: 30,
    fiatAmount: 175,
    fiatCurrency: 'BRL',
    paymentMethod: 'PIX Brasil',
    userPaymentDetails: 'Chave PIX: lucas.braganca@email.com',
    commissionAmountUSDT: 0.75,
    status: 'OPEN',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60000).toISOString()
  }
];

export const p2pCashierService = {
  // Get all cashier profiles locally
  getLocalCashierProfiles: (): P2PCashierProfile[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CASHIER_PROFILES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    localStorage.setItem(LOCAL_CASHIER_PROFILES_KEY, JSON.stringify(INITIAL_DEMO_CASHIER_PROFILES));
    return INITIAL_DEMO_CASHIER_PROFILES;
  },

  saveLocalCashierProfiles: (profiles: P2PCashierProfile[]) => {
    try {
      localStorage.setItem(LOCAL_CASHIER_PROFILES_KEY, JSON.stringify(profiles));
    } catch (e) {}
  },

  // Get all cashier requests locally
  getLocalRequests: (): P2PCashierRequest[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CASHIER_REQUESTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    localStorage.setItem(LOCAL_CASHIER_REQUESTS_KEY, JSON.stringify(INITIAL_DEMO_REQUESTS));
    return INITIAL_DEMO_REQUESTS;
  },

  saveLocalRequests: (requests: P2PCashierRequest[]) => {
    try {
      localStorage.setItem(LOCAL_CASHIER_REQUESTS_KEY, JSON.stringify(requests));
      window.dispatchEvent(new CustomEvent('crypton_cashier_requests_changed', { detail: requests }));
    } catch (e) {}
  },

  // Get or Create Cashier Profile for a user
  getCashierProfile: async (userId: string): Promise<P2PCashierProfile | null> => {
    if (!userId) return null;
    const localProfiles = p2pCashierService.getLocalCashierProfiles();
    const foundLocal = localProfiles.find(p => p.userId === userId);

    if (userId === 'guest_user') {
      return foundLocal || null;
    }

    try {
      const docRef = doc(db, 'p2p_cashier_profiles', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as P2PCashierProfile;
      }
    } catch (e) {
      console.warn("Could not fetch cashier profile from Firestore, using local fallback", e);
    }
    return foundLocal || null;
  },

  // Save or update Cashier Profile
  saveCashierProfile: async (profile: Partial<P2PCashierProfile> & { userId: string }): Promise<P2PCashierProfile> => {
    const localProfiles = p2pCashierService.getLocalCashierProfiles();
    const existingIndex = localProfiles.findIndex(p => p.userId === profile.userId);
    
    let updatedProfile: P2PCashierProfile;
    if (existingIndex >= 0) {
      updatedProfile = {
        ...localProfiles[existingIndex],
        ...profile,
        updatedAt: new Date().toISOString()
      };
      localProfiles[existingIndex] = updatedProfile;
    } else {
      updatedProfile = {
        id: 'cashier_' + profile.userId,
        userId: profile.userId,
        userName: profile.userName || 'Caixa P2P',
        userAvatarColor: profile.userAvatarColor || 'bg-emerald-600',
        whatsapp: profile.whatsapp || '',
        isOnline: profile.isOnline ?? true,
        acceptedMethods: profile.acceptedMethods || ['Multicaixa Express', 'BAI Directo', 'Unitel Money'],
        commissionRate: profile.commissionRate || 2.5,
        minAmount: profile.minAmount || 5,
        maxAmount: profile.maxAmount || 1000,
        totalTrades: 0,
        completedTrades: 0,
        totalVolumeUSDT: 0,
        totalEarnedCommissionsUSDT: 0,
        rating: 5.0,
        ratingCount: 1,
        avgResponseTimeMinutes: 3,
        bankDetailsNote: profile.bankDetailsNote || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localProfiles.push(updatedProfile);
    }

    p2pCashierService.saveLocalCashierProfiles(localProfiles);

    if (profile.userId !== 'guest_user') {
      try {
        const docRef = doc(db, 'p2p_cashier_profiles', profile.userId);
        await updateDoc(docRef, { ...updatedProfile, updatedAt: serverTimestamp() }).catch(async () => {
          await addDoc(collection(db, 'p2p_cashier_profiles'), updatedProfile);
        });
      } catch (e) {
        console.warn("Firestore cashier profile save fallback", e);
      }
    }

    return updatedProfile;
  },

  // Toggle online status
  toggleCashierOnline: async (userId: string, isOnline: boolean) => {
    const localProfiles = p2pCashierService.getLocalCashierProfiles();
    const updated = localProfiles.map(p => p.userId === userId ? { ...p, isOnline, updatedAt: new Date().toISOString() } : p);
    p2pCashierService.saveLocalCashierProfiles(updated);

    if (userId !== 'guest_user') {
      try {
        const docRef = doc(db, 'p2p_cashier_profiles', userId);
        await updateDoc(docRef, { isOnline, updatedAt: serverTimestamp() }).catch(() => {});
      } catch (e) {}
    }
  },

  // Subscribe to Cashier Requests in Realtime
  subscribeToRequests: (callback: (requests: P2PCashierRequest[]) => void) => {
    const initialLocal = p2pCashierService.getLocalRequests();
    callback(initialLocal);

    // Event listener for local storage changes
    const handleLocalEvent = (e: any) => {
      callback(e.detail || p2pCashierService.getLocalRequests());
    };
    window.addEventListener('crypton_cashier_requests_changed', handleLocalEvent);

    let unsubscribeFirestore = () => {};
    try {
      const q = query(collection(db, 'p2p_cashier_requests'), orderBy('createdAt', 'desc'));
      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: P2PCashierRequest[] = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() } as P2PCashierRequest);
          });
          p2pCashierService.saveLocalRequests(list);
          callback(list);
        }
      }, (err) => {
        console.warn("Firestore cashier requests subscription fallback to local", err);
      });
    } catch (e) {
      console.warn("Firestore not available for cashier requests", e);
    }

    return () => {
      window.removeEventListener('crypton_cashier_requests_changed', handleLocalEvent);
      unsubscribeFirestore();
    };
  },

  // Create a new Deposit or Withdraw Request (User side)
  createRequest: async (req: Omit<P2PCashierRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<P2PCashierRequest> => {
    const newId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newRequest: P2PCashierRequest = {
      ...req,
      id: newId,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString() // 15 min window
    };

    const localReqs = p2pCashierService.getLocalRequests();
    localReqs.unshift(newRequest);
    p2pCashierService.saveLocalRequests(localReqs);

    if (req.requesterId !== 'guest_user') {
      try {
        await addDoc(collection(db, 'p2p_cashier_requests'), {
          ...newRequest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.warn("Firestore add request fallback", e);
      }
    }

    return newRequest;
  },

  // Cashier accepts request (Matches with customer)
  acceptRequest: async (
    requestId: string,
    cashierId: string,
    cashierName: string,
    cashierPaymentDetails: string,
    cashierPhone?: string,
    cashierAvatarColor?: string
  ) => {
    const localReqs = p2pCashierService.getLocalRequests();
    const updated = localReqs.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'MATCHED' as const,
          matchedCashierId: cashierId,
          matchedCashierName: cashierName,
          matchedCashierPhone: cashierPhone || '',
          matchedCashierAvatarColor: cashierAvatarColor || 'bg-emerald-600',
          cashierPaymentDetails,
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 20 * 60000).toISOString()
        };
      }
      return r;
    });

    p2pCashierService.saveLocalRequests(updated);

    if (cashierId !== 'guest_user') {
      try {
        const docRef = doc(db, 'p2p_cashier_requests', requestId);
        await updateDoc(docRef, {
          status: 'MATCHED',
          matchedCashierId: cashierId,
          matchedCashierName: cashierName,
          matchedCashierPhone: cashierPhone || '',
          matchedCashierAvatarColor: cashierAvatarColor || 'bg-emerald-600',
          cashierPaymentDetails,
          updatedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 20 * 60000).toISOString()
        }).catch(() => {});
      } catch (e) {}
    }
  },

  // Mark request as paid (User or Cashier uploaded proof)
  markAsPaid: async (requestId: string, proofUrl: string) => {
    const localReqs = p2pCashierService.getLocalRequests();
    const updated = localReqs.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'PAID' as const,
          paymentProofUrl: proofUrl,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    p2pCashierService.saveLocalRequests(updated);

    try {
      const docRef = doc(db, 'p2p_cashier_requests', requestId);
      await updateDoc(docRef, {
        status: 'PAID',
        paymentProofUrl: proofUrl,
        updatedAt: serverTimestamp()
      }).catch(() => {});
    } catch (e) {}
  },

  // Complete and release funds (Receiving party confirms bank receipt)
  completeRequest: async (
    requestId: string,
    rating?: number,
    feedback?: string
  ) => {
    const localReqs = p2pCashierService.getLocalRequests();
    const targetReq = localReqs.find(r => r.id === requestId);

    const updated = localReqs.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'COMPLETED' as const,
          ratingGiven: rating,
          feedback: feedback,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    p2pCashierService.saveLocalRequests(updated);

    // Update Cashier stats
    if (targetReq && targetReq.matchedCashierId) {
      const localProfiles = p2pCashierService.getLocalCashierProfiles();
      const updatedProfiles = localProfiles.map(p => {
        if (p.userId === targetReq.matchedCashierId) {
          const newTrades = (p.totalTrades || 0) + 1;
          const newCompleted = (p.completedTrades || 0) + 1;
          const newVol = (p.totalVolumeUSDT || 0) + targetReq.amountUSDT;
          const newEarned = (p.totalEarnedCommissionsUSDT || 0) + (targetReq.commissionAmountUSDT || 0);
          const currentCount = p.ratingCount || 1;
          const newRating = rating ? ((p.rating * currentCount) + rating) / (currentCount + 1) : p.rating;

          return {
            ...p,
            totalTrades: newTrades,
            completedTrades: newCompleted,
            totalVolumeUSDT: newVol,
            totalEarnedCommissionsUSDT: Number(newEarned.toFixed(2)),
            rating: Number(newRating.toFixed(2)),
            ratingCount: currentCount + (rating ? 1 : 0),
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      p2pCashierService.saveLocalCashierProfiles(updatedProfiles);
    }

    try {
      const docRef = doc(db, 'p2p_cashier_requests', requestId);
      await updateDoc(docRef, {
        status: 'COMPLETED',
        ratingGiven: rating || 5,
        feedback: feedback || '',
        updatedAt: serverTimestamp()
      }).catch(() => {});
    } catch (e) {}
  },

  // Cancel Request
  cancelRequest: async (requestId: string) => {
    const localReqs = p2pCashierService.getLocalRequests();
    const updated = localReqs.map(r => r.id === requestId ? { ...r, status: 'CANCELLED' as const, updatedAt: new Date().toISOString() } : r);
    p2pCashierService.saveLocalRequests(updated);

    try {
      const docRef = doc(db, 'p2p_cashier_requests', requestId);
      await updateDoc(docRef, { status: 'CANCELLED', updatedAt: serverTimestamp() }).catch(() => {});
    } catch (e) {}
  },

  // Dispute Request
  disputeRequest: async (requestId: string, reason: string, disputedBy: string) => {
    const localReqs = p2pCashierService.getLocalRequests();
    const updated = localReqs.map(r => r.id === requestId ? {
      ...r,
      status: 'DISPUTED' as const,
      disputeReason: reason,
      disputedBy,
      updatedAt: new Date().toISOString()
    } : r);
    p2pCashierService.saveLocalRequests(updated);

    try {
      const docRef = doc(db, 'p2p_cashier_requests', requestId);
      await updateDoc(docRef, {
        status: 'DISPUTED',
        disputeReason: reason,
        disputedBy,
        updatedAt: serverTimestamp()
      }).catch(() => {});
    } catch (e) {}
  },

  // Chat for specific request
  subscribeToChat: (requestId: string, callback: (messages: CashierChatMessage[]) => void) => {
    const getLocalMsgs = (): CashierChatMessage[] => {
      try {
        const stored = localStorage.getItem(LOCAL_CASHIER_MESSAGES_KEY + '_' + requestId);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    };

    callback(getLocalMsgs());

    let unsubscribeFirestore = () => {};
    try {
      const q = query(
        collection(db, 'p2p_cashier_messages'),
        where('requestId', '==', requestId),
        orderBy('createdAt', 'asc')
      );
      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const msgs: CashierChatMessage[] = [];
        snapshot.forEach(docSnap => {
          msgs.push({ id: docSnap.id, ...docSnap.data() } as CashierChatMessage);
        });
        if (msgs.length > 0) {
          localStorage.setItem(LOCAL_CASHIER_MESSAGES_KEY + '_' + requestId, JSON.stringify(msgs));
          callback(msgs);
        }
      }, () => {});
    } catch (e) {}

    return () => unsubscribeFirestore();
  },

  // Send message in request chat
  sendMessage: async (
    requestId: string,
    senderId: string,
    senderName: string,
    content: string,
    isSystem: boolean = false
  ) => {
    const newMsg: CashierChatMessage = {
      id: 'cmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      requestId,
      senderId,
      senderName,
      content,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem
    };

    try {
      const stored = localStorage.getItem(LOCAL_CASHIER_MESSAGES_KEY + '_' + requestId);
      const list = stored ? JSON.parse(stored) : [];
      list.push(newMsg);
      localStorage.setItem(LOCAL_CASHIER_MESSAGES_KEY + '_' + requestId, JSON.stringify(list));
    } catch (e) {}

    if (senderId !== 'guest_user') {
      try {
        await addDoc(collection(db, 'p2p_cashier_messages'), {
          ...newMsg,
          createdAt: serverTimestamp()
        });
      } catch (e) {}
    }

    return newMsg;
  }
};
