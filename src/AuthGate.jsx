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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <div className="text-zinc-500 text-sm font-medium">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <div className="text-center">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-5">
            <span className="text-zinc-900 text-xl font-bold">N</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2 tracking-tight">Nouvia Strategist</h1>
          <p className="text-sm text-zinc-500 mb-8">Sign in to access your strategy dashboard</p>
          {error && <p className="text-sm text-red-400 mb-5 max-w-md mx-auto break-words">{error}</p>}
          <button
            onClick={handleSignIn}
            className="bg-zinc-100 text-zinc-900 text-sm font-semibold px-8 py-3 rounded-xl hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return children;
}
