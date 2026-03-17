import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

const ALLOWED_EMAIL = 'benmelchionno@nouvia.ai';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u && u.email === ALLOWED_EMAIL) {
        setUser(u);
        setError(null);
      } else if (u) {
        auth.signOut();
        setError('Access restricted to authorized Nouvia accounts.');
        setUser(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Sign-in error:', e.code, e.message);
      setError(`Error: ${e.code} — ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-zinc-900 text-lg font-bold">N</span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 mb-2">Nouvia Strategist</h1>
          <p className="text-sm text-zinc-500 mb-6">Sign in to access your strategy dashboard</p>
          {error && <p className="text-sm text-red-400 mb-4 max-w-md mx-auto break-words">{error}</p>}
          <button
            onClick={handleSignIn}
            className="bg-zinc-100 text-zinc-900 text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-white transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return children;
}
