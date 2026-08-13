import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
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
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const user = localUsers.find((u: any) => u.uid === uid);
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
      const user = localUsers.find((u: any) => u.uid === uid);
      return user || null;
    }
  },

  createUserProfile: async (uid: string, profile: any) => {
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid);
      const newUser = {
        ...profile,
        uid,
        balance: profile.balance !== undefined ? profile.balance : 100.00,
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
          if (parsed.uid === uid) {
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
        balance: profile.balance !== undefined ? profile.balance : 100.00,
        totalWins: profile.totalWins || 0,
        totalBets: profile.totalBets || 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn("Firestore createUserProfile failed, trying local fallback", error);
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid);
      const newUser = {
        ...profile,
        uid,
        balance: profile.balance !== undefined ? profile.balance : 100.00,
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
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid);
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
            if (parsed.uid === uid) {
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
      const index = localUsers.findIndex((u: any) => u.uid === uid);
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
    const path = `users/${uid}`;
    if (uid.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const index = localUsers.findIndex((u: any) => u.uid === uid);
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
            if (parsed.uid === uid) {
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
      const index = localUsers.findIndex((u: any) => u.uid === uid);
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
    const finalResult = {
      ...result,
      userId: result.userId || auth.currentUser?.uid || 'local_anonymous'
    };
    
    if (finalResult.userId.startsWith('local_')) {
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
  }
};
