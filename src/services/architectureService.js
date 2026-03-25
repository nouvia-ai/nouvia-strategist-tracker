import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function getArchitectureStatus() {
  const snap = await getDoc(doc(db, 'nip_architecture', 'current_status'));
  if (snap.exists()) return snap.data();
  return null;
}

export async function saveArchitectureStatus(statusData) {
  await setDoc(doc(db, 'nip_architecture', 'current_status'), {
    ...statusData,
    savedAt: serverTimestamp(),
  });
}
