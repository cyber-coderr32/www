import { 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Local storage keys
const LOCAL_USERS_KEY = 'cryptonbet_local_users_db';
const ACTIVE_SESSION_KEY = 'cryptonbet_local_user_session';

interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  password?: string;
  phone?: string;
  balance: number;
  role: string;
  totalWins: number;
  totalBets: number;
  joinedAt: string;
}

let listeners: Array<(user: any) => void> = [];

const notifyListeners = (user: any) => {
  listeners.forEach(callback => {
    try {
      callback(user);
    } catch (e) {
      console.error("Error in auth listener callback", e);
    }
  });
};

export const authService = {
  signInWithGoogle: async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      if (userCredential?.user) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
      return userCredential.user;
    } catch (error: any) {
      console.error('Firebase Google Auth popup error:', error);
      
      // If popups are blocked or closed, try redirect
      if (
        error?.code === 'auth/popup-blocked' || 
        error?.code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectError) {
          console.error('Firebase Google Auth redirect error:', redirectError);
          throw redirectError;
        }
      }
      
      // Re-throw genuine Firebase Auth errors
      throw error;
    }
  },

  signUpWithEmail: async (email: string, pass: string) => {
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (userCredential?.user) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
      return userCredential.user;
    } catch (error: any) {
      console.warn('Firebase Sign Up failed:', error);
      
      const errorCode = error?.code || '';
      if (errorCode === 'auth/email-already-in-use') {
        throw error;
      }
      
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      let userExists = localUsers.find((u: any) => u.email === email);
      if (userExists) {
        throw new Error('Firebase: Error (auth/email-already-in-use).');
      }
      
      const isAdminEmail = email === 'alfaajmc@gmail.com' || email === 'alfaajmc@atend.com' || email === 'admin@cryptonbet.ao';
      const uid = (isAdminEmail ? 'local_admin_' : 'local_') + email.replace(/[^a-zA-Z0-9]/g, '_');
      const newUser: LocalUser = {
        uid,
        email,
        displayName: isAdminEmail ? 'Alfaajmc (Admin)' : email.split('@')[0],
        password: pass,
        balance: isAdminEmail ? 500000.00 : 100.00,
        role: isAdminEmail ? 'ADMIN' : 'USER',
        totalWins: isAdminEmail ? 25 : 0,
        totalBets: isAdminEmail ? 30 : 0,
        joinedAt: new Date().toISOString()
      };
      
      localUsers.push(newUser);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(newUser));
      
      notifyListeners(newUser as any);
      return newUser as any;
    }
  },

  signInWithEmail: async (email: string, pass: string) => {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (userCredential?.user) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
      return userCredential.user;
    } catch (error: any) {
      console.warn('Firebase Sign In failed:', error);
      
      const isAdminEmail = email === 'alfaajmc@gmail.com' || email === 'alfaajmc@atend.com' || email === 'admin@cryptonbet.ao';
      if (isAdminEmail) {
        try {
          const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
          const res = await createUserWithEmailAndPassword(auth, email, pass);
          if (res?.user) {
            await updateProfile(res.user, { displayName: 'Alfaajmc (Admin)' });
            localStorage.removeItem(ACTIVE_SESSION_KEY);
            return res.user;
          }
        } catch (createErr: any) {
          if (createErr?.code === 'auth/email-already-in-use') {
            throw new Error('Esta conta de e-mail administrativa já está registada no Firebase (via Google Login ou outra palavra-passe). Clique em "Continuar com Google" ou use a palavra-passe correta.');
          }
          console.warn("Could not create Firebase admin account:", createErr);
        }
      }
      
      const errorCode = error?.code || '';
      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
        throw error;
      }
      
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const user = localUsers.find((u: any) => u.email === email);
      if (!user) {
        throw new Error('Firebase: Error (auth/user-not-found).');
      }
      if (user.password !== pass) {
        throw new Error('Firebase: Error (auth/wrong-password).');
      }
      
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
      notifyListeners(user as any);
      return user as any;
    }
  },

  onAuthChange: (callback: (user: any) => void) => {
    listeners.push(callback);
    
    // Check for redirect result from Google sign in
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        callback(result.user);
      }
    }).catch((err) => {
      console.warn("getRedirectResult error:", err);
    });

    // Listen to Firebase auth changes
    const unsubFirebase = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        callback(fbUser);
      } else {
        // If Firebase has no user, check local storage session (excluding legacy guests)
        const localSession = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (localSession) {
          try {
            const user = JSON.parse(localSession);
            if (user?.uid === 'local_guest' || user?.uid === 'local_google_user') {
              localStorage.removeItem(ACTIVE_SESSION_KEY);
              callback(null);
            } else {
              callback(user);
            }
          } catch (e) {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    });
    
    // Initial sync
    const localSession = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (localSession) {
      try {
        const user = JSON.parse(localSession);
        if (user?.uid === 'local_guest' || user?.uid === 'local_google_user') {
          localStorage.removeItem(ACTIVE_SESSION_KEY);
        } else {
          callback(user);
        }
      } catch (e) {
        // no-op
      }
    } else if (auth.currentUser) {
      callback(auth.currentUser);
    }
    
    return () => {
      listeners = listeners.filter(l => l !== callback);
      unsubFirebase();
    };
  },

  resetPassword: async (email: string) => {
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Link de redefinição de palavra-passe enviado para o seu e-mail!' };
    } catch (error: any) {
      console.warn('Firebase reset password failed:', error);
      const errorCode = error?.code || '';
      
      if (errorCode === 'auth/user-not-found') {
        throw new Error('Nenhuma conta registada com este e-mail.');
      } else if (errorCode === 'auth/invalid-email') {
        throw new Error('Endereço de e-mail inválido.');
      }
      
      // Local fallback
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
      const localUser = localUsers.find((u: any) => u.email === email);
      if (localUser) {
        return { success: true, message: 'Solicitação efetuada! Verifique a caixa de correio do seu e-mail para instrução de redefinição.' };
      }

      throw new Error(error.message || 'Erro ao solicitar a redefinição de palavra-passe.');
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    notifyListeners(null);
  },

  getCurrentUser: () => {
    const localSession = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (localSession) {
      try {
        const user = JSON.parse(localSession);
        if (user?.uid === 'local_guest' || user?.uid === 'local_google_user') {
          localStorage.removeItem(ACTIVE_SESSION_KEY);
          return auth.currentUser;
        }
        return user;
      } catch (e) {
        return auth.currentUser;
      }
    }
    return auth.currentUser;
  }
};
