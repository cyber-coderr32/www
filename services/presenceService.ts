import { doc, setDoc, updateDoc, onSnapshot, collection, query, limit } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface UserPresence {
  isOnline: boolean;
  lastSeen: number | null;
  statusText: string;
}

export type UserPresenceStatus = UserPresence;

const HEARTBEAT_INTERVAL_MS = 25000; // 25s heartbeat
const ONLINE_THRESHOLD_MS = 65000;    // Considered online if heartbeat received in last 65s

export function computePresence(data: any): UserPresence {
  if (!data) {
    return { isOnline: false, lastSeen: null, statusText: 'Offline' };
  }

  let lastSeenMs: number | null = null;
  if (data.lastSeen) {
    if (typeof data.lastSeen?.toMillis === 'function') {
      lastSeenMs = data.lastSeen.toMillis();
    } else if (typeof data.lastSeen === 'number') {
      lastSeenMs = data.lastSeen;
    } else if (typeof data.lastSeen === 'string') {
      const parsed = new Date(data.lastSeen).getTime();
      if (!isNaN(parsed)) lastSeenMs = parsed;
    }
  } else if (data.updatedAt) {
    if (typeof data.updatedAt?.toMillis === 'function') {
      lastSeenMs = data.updatedAt.toMillis();
    } else if (typeof data.updatedAt === 'string') {
      const parsed = new Date(data.updatedAt).getTime();
      if (!isNaN(parsed)) lastSeenMs = parsed;
    }
  }

  const now = Date.now();
  const diffMs = lastSeenMs ? now - lastSeenMs : Infinity;
  const isOnline = Boolean(data.isOnline && diffMs < ONLINE_THRESHOLD_MS);

  let statusText = 'Offline';
  if (isOnline) {
    statusText = 'Online';
  } else if (lastSeenMs && lastSeenMs > 0 && diffMs < 30 * 24 * 60 * 60 * 1000) {
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) {
      statusText = 'Visto há instantes';
    } else if (diffMins < 60) {
      statusText = `Visto há ${diffMins} min`;
    } else if (diffHours < 24) {
      const timeStr = new Date(lastSeenMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      statusText = `Visto hoje às ${timeStr}`;
    } else if (diffDays === 1) {
      const timeStr = new Date(lastSeenMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      statusText = `Visto ontem às ${timeStr}`;
    } else if (diffDays < 7) {
      statusText = `Visto há ${diffDays} dias`;
    } else {
      statusText = 'Offline';
    }
  }

  return { isOnline, lastSeen: lastSeenMs, statusText };
}

class PresenceService {
  private activeUid: string | null = null;
  private heartbeatTimer: any = null;
  private isListeningLifecycle = false;

  public startPresence(uid: string) {
    if (!uid) return;
    if (this.activeUid === uid && this.heartbeatTimer) return;

    this.stopPresence();
    this.activeUid = uid;

    // Send initial online heartbeat
    this.sendHeartbeat(true);

    // Setup periodic heartbeat
    this.heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.sendHeartbeat(true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    if (!this.isListeningLifecycle && typeof window !== 'undefined') {
      this.isListeningLifecycle = true;

      document.addEventListener('visibilitychange', () => {
        if (!this.activeUid) return;
        if (document.visibilityState === 'visible') {
          this.sendHeartbeat(true);
        } else {
          this.sendHeartbeat(false);
        }
      });

      const handleUnload = () => {
        if (this.activeUid) {
          this.sendHeartbeat(false);
        }
      };

      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }
  }

  public startTracking(uid: string, _name?: string): () => void {
    this.startPresence(uid);
    return () => {
      this.stopPresence();
    };
  }

  public stopPresence() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.activeUid) {
      this.sendHeartbeat(false);
      this.activeUid = null;
    }
  }

  private async sendHeartbeat(isOnline: boolean) {
    if (!this.activeUid) return;
    const uid = this.activeUid;
    const nowIso = new Date().toISOString();

    // Cache locally
    try {
      localStorage.setItem(`cryptonbet_presence_${uid}`, JSON.stringify({ isOnline, lastSeen: nowIso }));
    } catch (e) {}

    // Only update Firestore if authenticated
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
      return;
    }

    try {
      // 1. Update user_presence collection
      const presenceRef = doc(db, 'user_presence', uid);
      await setDoc(presenceRef, {
        uid,
        isOnline,
        lastSeen: nowIso
      }, { merge: true });

      // 2. Also update users collection
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: nowIso
      }).catch(() => {});
    } catch (err) {
      // Suppress network or permission errors silently
    }
  }

  public subscribeUserPresence(uid: string, callback: (presence: UserPresence) => void): () => void {
    if (!uid) {
      callback({ isOnline: false, lastSeen: null, statusText: 'Offline' });
      return () => {};
    }

    let rawData: any = null;

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(`cryptonbet_presence_${uid}`);
      if (cached) {
        rawData = JSON.parse(cached);
        callback(computePresence(rawData));
      }
    } catch (e) {}

    const updateFromData = () => {
      callback(computePresence(rawData));
    };

    // Re-evaluate every 10s to update relative times or timeout
    const ticker = setInterval(updateFromData, 10000);

    // Listen to real-time Firestore user_presence doc
    const presenceRef = doc(db, 'user_presence', uid);
    const unsubPresence = onSnapshot(presenceRef, (snap) => {
      if (snap.exists()) {
        rawData = snap.data();
        updateFromData();
      } else {
        // Fallback to check users collection
        const userRef = doc(db, 'users', uid);
        onSnapshot(userRef, (uSnap) => {
          if (uSnap.exists()) {
            rawData = uSnap.data();
            updateFromData();
          }
        }, () => {});
      }
    }, () => {
      // Fallback if offline
      updateFromData();
    });

    return () => {
      clearInterval(ticker);
      unsubPresence();
    };
  }

  public subscribeAllPresence(callback: (map: Record<string, UserPresence>) => void): () => void {
    const presenceMap: Record<string, any> = {};

    const emit = () => {
      const computed: Record<string, UserPresence> = {};
      Object.keys(presenceMap).forEach((id) => {
        computed[id] = computePresence(presenceMap[id]);
      });
      callback(computed);
    };

    const ticker = setInterval(emit, 15000);

    const q = query(collection(db, 'user_presence'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      snap.forEach((d) => {
        presenceMap[d.id] = d.data();
      });
      emit();
    }, () => {
      emit();
    });

    return () => {
      clearInterval(ticker);
      unsub();
    };
  }

  public stopTracking() {
    this.stopPresence();
  }

  public subscribeToUserPresence(uid: string, callback: (presence: UserPresence) => void) {
    return this.subscribeUserPresence(uid, callback);
  }
}

export const presenceService = new PresenceService();
