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
const LOCAL_NOTIFS_INIT_KEY = 'cryptonbet_notifications_initialized_v2';
const LOCAL_DELETED_NOTIFS_KEY = 'cryptonbet_deleted_notif_ids';

export const INITIAL_SYSTEM_NOTIFICATIONS: AppNotification[] = [];

// Legacy sample IDs to automatically purge
const LEGACY_SAMPLE_IDS = ['notif_welcome_system', 'notif_aviator_promo'];

export const notificationService = {
  // Retrieve deleted notification IDs to prevent resurrection from snapshot or cache
  getDeletedIds: (): Set<string> => {
    const set = new Set<string>(LEGACY_SAMPLE_IDS);
    try {
      const stored = localStorage.getItem(LOCAL_DELETED_NOTIFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach(id => set.add(id));
        }
      }
    } catch (e) {}
    return set;
  },

  // Record deleted notification IDs permanently
  addDeletedIds: (ids: string[]) => {
    try {
      const current = notificationService.getDeletedIds();
      ids.forEach(id => {
        if (id) current.add(id);
      });
      localStorage.setItem(LOCAL_DELETED_NOTIFS_KEY, JSON.stringify(Array.from(current)));
    } catch (e) {}
  },

  // Get all notifications from LocalStorage fallback or initialize
  getLocalNotifications: (): AppNotification[] => {
    const isInitialized = localStorage.getItem(LOCAL_NOTIFS_INIT_KEY) === 'true';
    const deletedIds = notificationService.getDeletedIds();

    try {
      const stored = localStorage.getItem(LOCAL_NOTIFS_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((n: AppNotification) => n && n.id && !deletedIds.has(n.id));
        }
      }
    } catch (e) {
      console.warn('Failed to parse local notifications:', e);
    }

    // Initialize default if never initialized on this browser
    if (!isInitialized) {
      localStorage.setItem(LOCAL_NOTIFS_INIT_KEY, 'true');
      const filteredDefaults = INITIAL_SYSTEM_NOTIFICATIONS.filter(n => !deletedIds.has(n.id));
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(filteredDefaults));
      return filteredDefaults;
    }

    return [];
  },

  // Save to LocalStorage
  saveLocalNotifications: (notifs: AppNotification[]) => {
    try {
      localStorage.setItem(LOCAL_NOTIFS_INIT_KEY, 'true');
      const deletedIds = notificationService.getDeletedIds();
      const filtered = (notifs || []).filter(n => n && n.id && !deletedIds.has(n.id));
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('cryptonbet_notifs_changed', { detail: filtered }));
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

  // Delete notification (Admin global deletion)
  deleteNotification: async (notificationId: string): Promise<void> => {
    if (!notificationId) return;

    // 1. Mark as permanently deleted
    notificationService.addDeletedIds([notificationId]);

    // 2. Remove from local storage
    const current = notificationService.getLocalNotifications();
    const updated = current.filter(n => n.id !== notificationId);
    notificationService.saveLocalNotifications(updated);

    // 3. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (e) {
      console.warn('Firestore deleteDoc failed for notification:', e);
    }
  },

  // Delete multiple notifications (Admin batch deletion)
  deleteAllNotifications: async (notificationIds?: string[]): Promise<void> => {
    const current = notificationService.getLocalNotifications();
    const toDelete = notificationIds && notificationIds.length > 0 ? notificationIds : current.map(n => n.id);
    
    // 1. Mark IDs as permanently deleted
    notificationService.addDeletedIds(toDelete);

    // 2. Update local storage
    const idsSet = new Set(toDelete);
    const updated = current.filter(n => !idsSet.has(n.id));
    notificationService.saveLocalNotifications(updated);

    // 3. Delete each from Firestore
    for (const id of toDelete) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch (e) {
        // ignore
      }
    }
  },

  // Delete / Dismiss notification for a specific user
  deleteNotificationForUser: async (notificationId: string, userId: string): Promise<void> => {
    if (!userId || !notificationId) return;

    const current = notificationService.getLocalNotifications();
    const targetNotif = current.find(n => n.id === notificationId);

    // If it is exclusively targeted to this user, we can completely delete it
    const isExclusivelyForUser = targetNotif && (targetNotif.target === userId || targetNotif.targetUserId === userId);

    if (isExclusivelyForUser) {
      await notificationService.deleteNotification(notificationId);
      return;
    }

    // Otherwise (broadcast to ALL), mark as deletedBy this user
    const updated = current.map(n => {
      if (n.id === notificationId) {
        const deletedBy = n.deletedBy || [];
        if (!deletedBy.includes(userId)) {
          return { ...n, deletedBy: [...deletedBy, userId] };
        }
      }
      return n;
    });

    notificationService.saveLocalNotifications(updated);

    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        deletedBy: arrayUnion(userId)
      });
    } catch (e) {
      // Local fallback handled
    }
  },

  // Clear / Delete all notifications for a specific user
  clearAllForUser: async (userId: string, notifications: AppNotification[]): Promise<void> => {
    if (!userId) return;

    const current = notificationService.getLocalNotifications();
    const updated = current.map(n => {
      const isTarget = n.target === 'ALL' || n.target === userId || n.targetUserId === userId;
      if (isTarget) {
        const deletedBy = n.deletedBy || [];
        if (!deletedBy.includes(userId)) {
          return { ...n, deletedBy: [...deletedBy, userId] };
        }
      }
      return n;
    });

    notificationService.saveLocalNotifications(updated);

    for (const notif of notifications) {
      const isTarget = notif.target === 'ALL' || notif.target === userId || notif.targetUserId === userId;
      if (isTarget) {
        const isExclusivelyForUser = notif.target === userId || notif.targetUserId === userId;
        if (isExclusivelyForUser) {
          try {
            await deleteDoc(doc(db, 'notifications', notif.id));
          } catch (e) {
            // ignore
          }
        } else {
          try {
            await updateDoc(doc(db, 'notifications', notif.id), {
              deletedBy: arrayUnion(userId)
            });
          } catch (e) {
            // ignore
          }
        }
      }
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
        const deletedIds = notificationService.getDeletedIds();

        if (!snapshot.empty) {
          const list: AppNotification[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as AppNotification;
            if (data && data.id && !deletedIds.has(data.id)) {
              list.push(data);
            }
          });
          // Sort newest first
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          notificationService.saveLocalNotifications(list);
          callback(list);
        } else {
          // If empty in Firestore, check if we have local notifications that aren't deleted
          const local = notificationService.getLocalNotifications();
          callback(local);
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
