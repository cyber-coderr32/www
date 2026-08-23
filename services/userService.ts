import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LOCAL_USERS_KEY = 'cryptonbet_local_users_db';
const ACTIVE_SESSION_KEY = 'cryptonbet_local_user_session';

export const userService = {
  getUserProfile: async (uid: string) => {
    if (!uid || typeof uid !== 'string') {
      return null;
    }
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const user = localUsers.find((u: any) => u.uid === uid || u.id === uid);
      return user || null;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.warn("Firestore getUserProfile failed, trying local fallback", error);
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const user = localUsers.find((u: any) => u.uid === uid || u.id === uid);
      return user || null;
    }
  },

  createUserProfile: async (uid: string, profile: any) => {
    if (!uid || typeof uid !== 'string') {
      console.warn("createUserProfile called without valid uid:", uid);
      return;
    }
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid || u.id === uid);
      const newUser = {
        ...profile,
        uid,
        id: uid,
        balance: profile.balance !== undefined ? profile.balance : 0.00,
        totalWins: profile.totalWins || 0,
        totalBets: profile.totalBets || 0,
        updatedAt: new Date().toISOString()
      };
      if (index >= 0) {
        localUsers[index] = newUser;
      } else {
        localUsers.push(newUser);
      }
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
      
      const activeSession = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (activeSession) {
        try {
          const parsed = JSON.parse(activeSession);
          if (parsed.uid === uid || parsed.id === uid) {
            localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(newUser));
          }
        } catch (e) {
          // ignore
        }
      }
      return;
    }
    
    try {
      await setDoc(doc(db, 'users', uid), {
        ...profile,
        uid,
        id: uid,
        balance: profile.balance !== undefined ? profile.balance : 0.00,
        totalWins: profile.totalWins || 0,
        totalBets: profile.totalBets || 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn("Firestore createUserProfile failed, trying local fallback", error);
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid || u.id === uid);
      const newUser = {
        ...profile,
        uid,
        id: uid,
        balance: profile.balance !== undefined ? profile.balance : 0.00,
        totalWins: profile.totalWins || 0,
        totalBets: profile.totalBets || 0,
        updatedAt: new Date().toISOString()
      };
      if (index >= 0) {
        localUsers[index] = newUser;
      } else {
        localUsers.push(newUser);
      }
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
    }
  },

  updateUserProfile: async (uid: string, updates: any) => {
    if (!uid || typeof uid !== 'string') {
      console.warn("updateUserProfile called without valid uid:", uid);
      return;
    }
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid || u.id === uid);
      if (index >= 0) {
        localUsers[index] = {
          ...localUsers[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
        
        const activeSession = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (activeSession) {
          try {
            const parsed = JSON.parse(activeSession);
            if (parsed.uid === uid || parsed.id === uid) {
              localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(localUsers[index]));
            }
          } catch (e) {
            // ignore
          }
        }
      }
      return;
    }
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn("Firestore updateUserProfile failed, trying local fallback", error);
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid || u.id === uid);
      if (index >= 0) {
        localUsers[index] = {
          ...localUsers[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
      }
    }
  },

  updateBalance: async (uid: string, newBalance: number, statsUpdate: { winsDelta?: number, betsDelta?: number } = {}) => {
    if (!uid || typeof uid !== 'string') {
      console.warn("updateBalance called without valid uid:", uid);
      return;
    }
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid || u.id === uid);
      if (index >= 0) {
        localUsers[index].balance = newBalance;
        localUsers[index].totalWins = (localUsers[index].totalWins || 0) + (statsUpdate.winsDelta || 0);
        localUsers[index].totalBets = (localUsers[index].totalBets || 0) + (statsUpdate.betsDelta || 0);
        localUsers[index].updatedAt = new Date().toISOString();
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
        
        const activeSession = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (activeSession) {
          try {
            const parsed = JSON.parse(activeSession);
            if (parsed.uid === uid || parsed.id === uid) {
              localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(localUsers[index]));
            }
          } catch (e) {
            // ignore
          }
        }
      }
      return;
    }
    
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        balance: newBalance,
        totalWins: increment(statsUpdate.winsDelta || 0),
        totalBets: increment(statsUpdate.betsDelta || 0),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn("Firestore updateBalance failed, trying local fallback", error);
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid || u.id === uid);
      if (index >= 0) {
        localUsers[index].balance = newBalance;
        localUsers[index].totalWins = (localUsers[index].totalWins || 0) + (statsUpdate.winsDelta || 0);
        localUsers[index].totalBets = (localUsers[index].totalBets || 0) + (statsUpdate.betsDelta || 0);
        localUsers[index].updatedAt = new Date().toISOString();
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
      }
    }
  },

  logGameResult: async (result: any) => {
    const path = 'game_history';
    const rawUserId = result?.userId || auth.currentUser?.uid || 'local_anonymous';
    const finalUserId = String(rawUserId || 'local_anonymous');
    const finalResult = {
      ...result,
      userId: finalUserId
    };
    
    if (finalUserId.startsWith('local_')) {
      const history = JSON.parse(localStorage.getItem('cryptonbet_local_game_history') || '[]');
      history.push({
        ...finalResult,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('cryptonbet_local_game_history', JSON.stringify(history));
      return;
    }
    
    try {
      await addDoc(collection(db, 'game_history'), {
        ...finalResult,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.warn("Firestore logGameResult failed, trying local fallback", error);
      const history = JSON.parse(localStorage.getItem('cryptonbet_local_game_history') || '[]');
      history.push({
        ...finalResult,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('cryptonbet_local_game_history', JSON.stringify(history));
    }
  },

  deleteUserProfile: async (uid: string) => {
    if (!uid) return;

    // 1. Remove from cryptonbet_local_users_db
    try {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const filtered = localUsers.filter((u: any) => u.uid !== uid && u.id !== uid);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
    } catch (e) {}

    // 2. Remove from legacy skyhigh_users
    try {
      const skyUsers = JSON.parse(localStorage.getItem('skyhigh_users') || '[]');
      const filteredSky = skyUsers.filter((u: any) => u.id !== uid && u.uid !== uid);
      localStorage.setItem('skyhigh_users', JSON.stringify(filteredSky));
    } catch (e) {}

    // 3. Clear active session if this user was logged in
    try {
      const active = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (active) {
        const parsed = JSON.parse(active);
        if (parsed.uid === uid || parsed.id === uid) {
          localStorage.removeItem(ACTIVE_SESSION_KEY);
        }
      }
      const skyUser = localStorage.getItem('skyhigh_user');
      if (skyUser) {
        const parsed = JSON.parse(skyUser);
        if (parsed.id === uid || parsed.uid === uid) {
          localStorage.removeItem('skyhigh_user');
        }
      }
    } catch (e) {}

    // 4. Delete Firestore document
    if (!uid.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        console.warn("Firestore deleteUserProfile failed:", error);
      }
    }
  }
};
