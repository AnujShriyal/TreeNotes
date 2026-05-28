import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Handle email magic link redirect when user clicks the link in their inbox
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem('treenotes_email_for_link');

      // If the user opened the link on a different device, prompt for email
      if (!email) {
        email = window.prompt('Please enter your email to confirm sign-in:');
      }

      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            localStorage.removeItem('treenotes_email_for_link');
            // Clean the magic link params from the URL
            window.history.replaceState({}, '', '/');
          })
          .catch((err) => setError(err.message));
      }
    }

    return unsub;
  }, []);

  // ─── Email Magic Link ─────────────────────────────────────────────────────────

  const sendEmailLink = useCallback(async (email) => {
    setError('');
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save email so we can complete sign-in when user comes back
      localStorage.setItem('treenotes_email_for_link', email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ─── Sign Out ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      setError,
      sendEmailLink,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
