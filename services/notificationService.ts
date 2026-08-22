import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  arrayUnion 
} from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification } from '../types';

const LOCAL_NOTIFS_KEY = 'cryptonbet_notifications_db';

export const INITIAL_SYSTEM_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome_system',
    title: '🎉 Bem-vindo à CryptonBet Angola!',
    message: 'Aproveite o melhor ecossistema de apostas com saques rápidos via Cripto (USDT), Multicaixa Express e PIX. Conheça também o Mercado P2P e os E-books exclusivos!',
    type: 'INFO',
    target: 'ALL',
    targetUserName: 'Todos os Jogadores',
    senderName: 'Equipa CryptonBet',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    readBy: [],
    priority: 'HIGH',
    actionView: 'PROMOTIONS',
    actionText: 'Ver Bónus'
  },
  {
    id: 'notif_aviator_promo',
    title: '🚀 Torneio de Aviator & Poke Chomp VIP',
    message: 'Grandes multiplicadores hoje! Acumule pontos jogando e dispute o jackpot semanal com premiação direta em USDT.',
    type: 'PROMO',
    target: 'ALL',
    targetUserName: 'Todos os Jogadores',
    senderName: 'Administração',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    readBy: [],
    priority: 'NORMAL',
    actionView: 'AVIATOR',
    actionText: 'Jogar Aviator'
  }
];

export const notificationService = {
  // Get all notifications from LocalStorage fallback or initialize
  getLocalNotifications: (): AppNotification[] => {
    try {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse local notifications:', e);
    }
    // Initialize default if empty
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(INITIAL_SYSTEM_NOTIFICATIONS));
    return INITIAL_SYSTEM_NOTIFICATIONS;
  },

  // Save to LocalStorage
  saveLocalNotifications: (notifs: AppNotification[]) => {
    try {
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs));
      window.dispatchEvent(new CustomEvent('cryptonbet_notifs_changed', { detail: notifs }));
    } catch (e) {
      console.warn('Failed to save notifications locally:', e);
    }
  },

  // Send a new notification (Collective or Individual)
  sendNotification: async (
    data: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>
  ): Promise<AppNotification> => {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newNotif: AppNotification = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      readBy: [],
      priority: data.priority || 'NORMAL'
    };

    // Update LocalStorage first
    const current = notificationService.getLocalNotifications();
    const updated = [newNotif, ...current];
    notificationService.saveLocalNotifications(updated);

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'notifications', id), newNotif);
    } catch (e) {
      console.warn('Firestore setDoc failed for notification, using local fallback:', e);
    }

    return newNotif;
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<void> => {
    const current = notificationService.getLocalNotifications();
    const updated = current.filter(n => n.id !== notificationId);
    notificationService.saveLocalNotifications(updated);

    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (e) {
      console.warn('Firestore deleteDoc failed for notification:', e);
    }
  },

  // Mark a specific notification as read by a user
  markAsRead: async (notificationId: string, userId: string): Promise<void> => {
    if (!userId) return;

    const current = notificationService.getLocalNotifications();
    const updated = current.map(n => {
      if (n.id === notificationId) {
        const readBy = n.readBy || [];
        if (!readBy.includes(userId)) {
          return { ...n, readBy: [...readBy, userId] };
        }
      }
      return n;
    });
    notificationService.saveLocalNotifications(updated);

    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(userId)
      });
    } catch (e) {
      // Local fallback handled
    }
  },

  // Mark all notifications relevant to a user as read
  markAllAsRead: async (userId: string, notifications: AppNotification[]): Promise<void> => {
    if (!userId) return;

    const current = notificationService.getLocalNotifications();
    const updated = current.map(n => {
      const isTarget = n.target === 'ALL' || n.target === userId || n.targetUserId === userId;
      if (isTarget) {
        const readBy = n.readBy || [];
        if (!readBy.includes(userId)) {
          return { ...n, readBy: [...readBy, userId] };
        }
      }
      return n;
    });
    notificationService.saveLocalNotifications(updated);

    // Update Firestore for each
    for (const notif of notifications) {
      const isTarget = notif.target === 'ALL' || notif.target === userId || notif.targetUserId === userId;
      const isRead = (notif.readBy || []).includes(userId);
      if (isTarget && !isRead) {
        try {
          await updateDoc(doc(db, 'notifications', notif.id), {
            readBy: arrayUnion(userId)
          });
        } catch (e) {
          // ignore
        }
      }
    }
  },

  // Subscribe to notifications with real-time updates and fallback
  subscribeToNotifications: (
    callback: (notifications: AppNotification[]) => void
  ): (() => void) => {
    let unsubFirestore: (() => void) | null = null;

    // Immediately dispatch local data
    callback(notificationService.getLocalNotifications());

    // Listen to Firestore
    try {
      const notifCol = collection(db, 'notifications');
      unsubFirestore = onSnapshot(notifCol, (snapshot) => {
        if (!snapshot.empty) {
          const list: AppNotification[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as AppNotification);
          });
          // Sort newest first
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          notificationService.saveLocalNotifications(list);
          callback(list);
        } else {
          // If empty in Firestore, use local notifications
          callback(notificationService.getLocalNotifications());
        }
      }, (error) => {
        console.warn('Firestore notifications subscription error:', error);
        callback(notificationService.getLocalNotifications());
      });
    } catch (e) {
      console.warn('Error initiating Firestore snapshot for notifications:', e);
    }

    // Listen to local storage / custom events
    const handleLocalChange = (e: any) => {
      if (e.detail) {
        callback(e.detail);
      } else {
        callback(notificationService.getLocalNotifications());
      }
    };
    window.addEventListener('cryptonbet_notifs_changed', handleLocalChange);
    window.addEventListener('storage', handleLocalChange);

    return () => {
      if (unsubFirestore) unsubFirestore();
      window.removeEventListener('cryptonbet_notifs_changed', handleLocalChange);
      window.removeEventListener('storage', handleLocalChange);
    };
  }
};
