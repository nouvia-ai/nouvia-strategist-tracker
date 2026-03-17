import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

function getUserId() {
  return auth.currentUser?.uid;
}

function getDocRef(key) {
  const uid = getUserId();
  if (!uid) throw new Error('Not authenticated');
  return doc(db, 'users', uid, 'data', key);
}

export async function getData(key) {
  try {
    const snap = await getDoc(getDocRef(key));
    if (snap.exists()) {
      return JSON.parse(snap.data().value);
    }
    return null;
  } catch (e) {
    console.error('getData error:', e);
    return null;
  }
}

export async function setData(key, value) {
  try {
    await setDoc(getDocRef(key), {
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('setData error:', e);
  }
}

export async function deleteData(key) {
  try {
    await deleteDoc(getDocRef(key));
  } catch (e) {
    console.error('deleteData error:', e);
  }
}
