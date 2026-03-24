import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

/* ── User context ──────────────────────────────── */
const UserContext = createContext(null);
export function useUser() { return useContext(UserContext); }

/* ── Known admin emails ────────────────────────── */
const ADMIN_EMAILS = ['benmelchionno@nouvia.ai'];

/* ── Demo client accounts (auto-provisioned) ───── */
const DEMO_CLIENTS = {
  'demo-client@nouvia.ai': { client_id: 'ivc', display_name: 'Nick Vardaro', company_name: 'IVC' },
  'nick@weareivc.com':     { client_id: 'ivc', display_name: 'Nick Vardaro', company_name: 'IVC' },
  'nvardaro@weareivc.com': { client_id: 'ivc', display_name: 'Nick Vardaro', company_name: 'IVC' },
};

async function resolveUserRole(firebaseUser) {
  const email = firebaseUser.email;
  const uid = firebaseUser.uid;

  // Check if user doc exists in portal_users
  const userRef = doc(db, 'portal_users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    // Update last_login
    await setDoc(userRef, { last_login: serverTimestamp() }, { merge: true });
    return data;
  }

  // Auto-provision known admins
  if (ADMIN_EMAILS.includes(email)) {
    const userData = {
      email,
      display_name: firebaseUser.displayName || 'Ben Melchionno',
      role: 'admin',
      client_id: null,
      company_name: 'Nouvia',
      last_login: serverTimestamp(),
      created_at: serverTimestamp(),
    };
    await setDoc(userRef, userData);
    return userData;
  }

  // Auto-provision known demo clients
  if (DEMO_CLIENTS[email]) {
    const demo = DEMO_CLIENTS[email];
    const userData = {
      email,
      display_name: demo.display_name,
      role: 'client',
      client_id: demo.client_id,
      company_name: demo.company_name,
      last_login: serverTimestamp(),
      created_at: serverTimestamp(),
    };
    await setDoc(userRef, userData);
    return userData;
  }

  // Unknown user — reject
  return null;
}

export default function AuthGate({ children, portalApp }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
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
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F8F9FA', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <div style={{ color: '#636366', fontSize: 14, fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  if (!user || !userRole) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F8F9FA', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', backgroundColor: '#0A84FF',
          }}>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>N</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1C1C1E', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Nouvia
          </h1>
          <p style={{ fontSize: 14, color: '#636366', marginBottom: 32 }}>
            Sign in to access your platform
          </p>
          {error && <p style={{ fontSize: 14, color: '#FF3B30', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>{error}</p>}
          <button
            onClick={handleSignIn}
            style={{
              backgroundColor: '#0A84FF', color: '#fff', fontSize: 14, fontWeight: 600,
              padding: '12px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0070E0'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0A84FF'; }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Route based on role
  const contextValue = { user, ...userRole };

  return (
    <UserContext.Provider value={contextValue}>
      {userRole.role === 'client' ? portalApp : children}
    </UserContext.Provider>
  );
}
