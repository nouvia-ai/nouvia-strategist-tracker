import { useState, useEffect, createContext, useContext } from 'react';
import {
  onAuthStateChanged, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

/* ── User context ──────────────────────────────── */
const UserContext = createContext(null);
export function useUser() { return useContext(UserContext); }

/* ── Known admin emails ────────────────────────── */
const ADMIN_EMAILS = ['benmelchionno@nouvia.ai'];

/* ── Known client accounts (auto-provisioned) ──── */
const KNOWN_CLIENTS = {
  'demo-client@nouvia.ai': { client_id: 'ivc', display_name: 'Demo Client', company_name: 'IVC' },
  'nick@weareivc.com':     { client_id: 'ivc', display_name: 'Nick Vardaro', company_name: 'IVC' },
  'nvardaro@weareivc.com': { client_id: 'ivc', display_name: 'Nick Vardaro', company_name: 'IVC' },
};

async function resolveUserRole(firebaseUser) {
  const email = firebaseUser.email;
  const uid = firebaseUser.uid;

  const userRef = doc(db, 'portal_users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await setDoc(userRef, { last_login: serverTimestamp() }, { merge: true });
    return userSnap.data();
  }

  // Auto-provision known admins
  if (ADMIN_EMAILS.includes(email)) {
    const userData = {
      email, display_name: firebaseUser.displayName || 'Ben Melchionno',
      role: 'admin', client_id: null, company_name: 'Nouvia',
      last_login: serverTimestamp(), created_at: serverTimestamp(),
    };
    await setDoc(userRef, userData);
    return userData;
  }

  // Auto-provision known clients
  if (KNOWN_CLIENTS[email]) {
    const client = KNOWN_CLIENTS[email];
    const userData = {
      email, display_name: client.display_name,
      role: 'client', client_id: client.client_id,
      company_name: client.company_name,
      last_login: serverTimestamp(), created_at: serverTimestamp(),
    };
    await setDoc(userRef, userData);
    return userData;
  }

  // Also check portal_users by email (for pre-registered users with different doc IDs)
  // This handles the nick-weareivc doc created earlier
  const { getDocs, query, where, collection } = await import('firebase/firestore');
  const emailQuery = query(collection(db, 'portal_users'), where('email', '==', email));
  const emailSnap = await getDocs(emailQuery);
  if (!emailSnap.empty) {
    const existingData = emailSnap.docs[0].data();
    // Copy to UID-keyed doc for future lookups
    await setDoc(userRef, { ...existingData, last_login: serverTimestamp() }, { merge: true });
    return existingData;
  }

  // Unknown user — reject
  return null;
}

export default function AuthGate({ children, portalApp }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth mode: 'login' | 'register' | 'forgot' | 'verify'
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Check email verification for email/password users
        if (u.providerData[0]?.providerId === 'password' && !u.emailVerified) {
          setUser(u);
          setUserRole(null);
          setAuthMode('verify');
          setLoading(false);
          return;
        }

        try {
          const role = await resolveUserRole(u);
          if (role) {
            setUser(u);
            setUserRole(role);
            setError(null);
          } else {
            await auth.signOut();
            setError('Access restricted. Contact Nouvia to request access.');
            setUser(null);
            setUserRole(null);
          }
        } catch (e) {
          console.error('Role resolution error:', e);
          setError('Error checking access. Please try again.');
          setUser(null);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
  }, []);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        setError('No account found with this email. Click "Create account" to register.');
      } else if (e.code === 'auth/wrong-password') {
        setError('Incorrect password. Try again or click "Forgot password?"');
      } else if (e.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(e.message);
      }
    }
    setSubmitting(false);
  };

  const handleRegister = async () => {
    if (!email.trim() || !password) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
      setAuthMode('verify');
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Sign in instead.');
      } else if (e.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(e.message);
      }
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg('Password reset email sent. Check your inbox.');
      setTimeout(() => { setSuccessMsg(null); setAuthMode('login'); }, 4000);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(e.message);
      }
    }
    setSubmitting(false);
  };

  const handleResendVerification = async () => {
    if (user) {
      setSubmitting(true);
      try {
        await sendEmailVerification(user);
        setSuccessMsg('Verification email sent. Check your inbox.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } catch (e) {
        setError('Could not send verification email. Please try again in a few minutes.');
      }
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(`Error: ${e.code} — ${e.message}`);
    }
  };

  // Styles
  const pageStyle = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8F9FA', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };
  const inputStyle = {
    width: '100%', fontSize: 14, padding: '10px 14px', borderRadius: 8,
    border: '1px solid #E5E5EA', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const primaryBtn = {
    backgroundColor: '#0A84FF', color: '#fff', fontSize: 14, fontWeight: 600,
    padding: '12px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
    width: '100%', transition: 'all 0.2s',
  };
  const textBtn = {
    backgroundColor: 'transparent', color: '#636366', fontSize: 12, fontWeight: 500,
    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ color: '#636366', fontSize: 14, fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  // Email verification screen
  if (authMode === 'verify' && user && !user.emailVerified) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1C1C1E', marginBottom: 8 }}>
            Verify your email
          </h1>
          <p style={{ fontSize: 14, color: '#636366', marginBottom: 24, lineHeight: '1.5' }}>
            We sent a verification link to <strong>{user.email}</strong>. Click the link in the email, then come back here and click "I've verified."
          </p>

          {successMsg && <p style={{ fontSize: 13, color: '#34C759', marginBottom: 16 }}>{successMsg}</p>}
          {error && <p style={{ fontSize: 13, color: '#FF3B30', marginBottom: 16 }}>{error}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={async () => {
                // Reload user to check verification status
                await user.reload();
                if (user.emailVerified) {
                  // Re-trigger auth state
                  window.location.reload();
                } else {
                  setError('Email not yet verified. Please check your inbox and click the verification link.');
                }
              }}
              style={primaryBtn}
            >
              I've verified my email
            </button>
            <button onClick={handleResendVerification} disabled={submitting} style={textBtn}>
              {submitting ? 'Sending...' : 'Resend verification email'}
            </button>
            <button onClick={() => { auth.signOut(); setAuthMode('login'); setError(null); }} style={textBtn}>
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login / Register / Forgot password screen
  if (!user || !userRole) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', width: 320 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', backgroundColor: '#0A84FF',
          }}>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>N</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1C1C1E', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Nouvia
          </h1>
          <p style={{ fontSize: 14, color: '#636366', marginBottom: 24 }}>
            {authMode === 'login' ? 'Sign in to your platform' :
             authMode === 'register' ? 'Create your account' :
             'Reset your password'}
          </p>

          {error && <p style={{ fontSize: 13, color: '#FF3B30', marginBottom: 16, lineHeight: '1.4' }}>{error}</p>}
          {successMsg && <p style={{ fontSize: 13, color: '#34C759', marginBottom: 16 }}>{successMsg}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Email input */}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#0A84FF'; }}
              onBlur={e => { e.target.style.borderColor = '#E5E5EA'; }}
              onKeyDown={e => { if (e.key === 'Enter' && authMode === 'forgot') handleForgotPassword(); }}
            />

            {/* Password input (not shown for forgot) */}
            {authMode !== 'forgot' && (
              <input
                type="password"
                placeholder={authMode === 'register' ? 'Create a password (6+ characters)' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#0A84FF'; }}
                onBlur={e => { e.target.style.borderColor = '#E5E5EA'; }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (authMode === 'login') handleEmailLogin();
                    else if (authMode === 'register') handleRegister();
                  }
                }}
              />
            )}

            {/* Primary action button */}
            {authMode === 'login' && (
              <button onClick={handleEmailLogin} disabled={submitting}
                style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
            )}
            {authMode === 'register' && (
              <button onClick={handleRegister} disabled={submitting}
                style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Creating account...' : 'Create account'}
              </button>
            )}
            {authMode === 'forgot' && (
              <button onClick={handleForgotPassword} disabled={submitting}
                style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Sending...' : 'Send reset link'}
              </button>
            )}

            {/* Secondary actions */}
            {authMode === 'login' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <button onClick={() => { setAuthMode('register'); setError(null); setPassword(''); }} style={textBtn}>
                    Create account
                  </button>
                  <button onClick={() => { setAuthMode('forgot'); setError(null); setPassword(''); }} style={textBtn}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ borderTop: '1px solid #E5E5EA', marginTop: 8, paddingTop: 12 }}>
                  <button onClick={handleGoogleSignIn} style={{
                    ...textBtn, width: '100%', border: '1px solid #E5E5EA', borderRadius: 8, padding: '10px 16px',
                  }}>
                    Nouvia team: Sign in with Google
                  </button>
                </div>
              </>
            )}
            {authMode === 'register' && (
              <button onClick={() => { setAuthMode('login'); setError(null); setPassword(''); }} style={textBtn}>
                Already have an account? Sign in
              </button>
            )}
            {authMode === 'forgot' && (
              <button onClick={() => { setAuthMode('login'); setError(null); setSuccessMsg(null); }} style={textBtn}>
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Route based on role
  const contextValue = { user, ...userRole };
  const urlParams = new URLSearchParams(window.location.search);
  const forcePortal = urlParams.get('view') === 'portal';
  const showPortal = userRole.role === 'client' || (userRole.role === 'admin' && forcePortal);

  const portalContext = forcePortal && userRole.role === 'admin'
    ? { user, ...userRole, client_id: 'ivc', company_name: 'IVC', display_name: userRole.display_name || 'Ben' }
    : { user, ...userRole };

  return (
    <UserContext.Provider value={showPortal ? portalContext : contextValue}>
      {showPortal ? portalApp : children}
    </UserContext.Provider>
  );
}
