import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../lib/firebase';
import { UserPrivateInfo, UserProfile } from '../types/whop';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  privateInfo: UserPrivateInfo | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updatePayoutAccount: (account: string) => Promise<void>;
  updatePublicProfile: (displayName: string, handle: string, bio: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sanitizeHandle(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
  return cleaned.length >= 2 ? cleaned : `creator_${Math.floor(1000 + Math.random() * 9000)}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthError(null);

      if (!firebaseUser) {
        setProfile(null);
        setPrivateInfo(null);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const privateRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');

        let userSnap;
        try {
          userSnap = await getDoc(userRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }

        const displayName = (firebaseUser.displayName || 'Whop Member').slice(0, 80);
        const baseHandle = sanitizeHandle(
          firebaseUser.email?.split('@')[0] || displayName
        );

        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName,
            handle: baseHandle,
            bio: 'Building and exploring digital products on Whop.',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          try {
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
          }
        } else {
          setProfile(userSnap.data() as UserProfile);
        }

        let privSnap;
        try {
          privSnap = await getDoc(privateRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}/private/info`);
        }

        if (!privSnap.exists()) {
          const newPriv: UserPrivateInfo = {
            uid: firebaseUser.uid,
            email: (firebaseUser.email || 'user@whop.local').slice(0, 200),
            payoutAccount: 'Chase Checking •••• 4821',
            updatedAt: serverTimestamp(),
          };
          try {
            await setDoc(privateRef, newPriv);
            setPrivateInfo(newPriv);
          } catch (err) {
            handleFirestoreError(
              err,
              OperationType.CREATE,
              `users/${firebaseUser.uid}/private/info`
            );
          }
        } else {
          setPrivateInfo(privSnap.data() as UserPrivateInfo);
        }
      } catch (err) {
        console.error('Auth profile sync issue:', err);
        setAuthError(
          err instanceof Error ? err.message : 'Unable to load user profile.'
        );
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign-in was cancelled or blocked.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updatePayoutAccount = async (account: string) => {
    if (!user) return;
    const trimmed = account.trim().slice(0, 120);
    if (!trimmed) return;
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    try {
      await updateDoc(privateRef, {
        payoutAccount: trimmed,
        updatedAt: serverTimestamp(),
      });
      setPrivateInfo((prev) => (prev ? { ...prev, payoutAccount: trimmed } : prev));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/private/info`);
    }
  };

  const updatePublicProfile = async (
    displayName: string,
    handle: string,
    bio: string
  ) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const cleanName = displayName.trim().slice(0, 80) || 'Whop Creator';
    const cleanHandle = sanitizeHandle(handle);
    const cleanBio = bio.trim().slice(0, 300);
    try {
      await updateDoc(userRef, {
        displayName: cleanName,
        handle: cleanHandle,
        bio: cleanBio,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) =>
        prev
          ? { ...prev, displayName: cleanName, handle: cleanHandle, bio: cleanBio }
          : prev
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        privateInfo,
        authReady,
        signingIn,
        authError,
        signInWithGoogle,
        logout,
        updatePayoutAccount,
        updatePublicProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
