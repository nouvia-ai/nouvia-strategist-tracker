import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBN3fwHPjhseL-XJsulQNVFJSInIe9Cz9E",
  authDomain: "nouvia-os.firebaseapp.com",
  projectId: "nouvia-os",
  storageBucket: "nouvia-os.firebasestorage.app",
  messagingSenderId: "899147386050",
  appId: "1:899147386050:web:66ae933ea052748b29ff5b",
  measurementId: "G-CSHX139D26"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
