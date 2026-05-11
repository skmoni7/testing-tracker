// ======================================================
// FIREBASE CONFIG — ProTrack Mobile
// Same Firebase project as the web app (protrack1)
// Connects to the same Firestore database
// ======================================================
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBYfPDX49cZUrew9Qik76LSFrUf9GlLexI',
  authDomain: 'protrack1.firebaseapp.com',
  projectId: 'protrack1',
  storageBucket: 'protrack1.firebasestorage.app',
  messagingSenderId: '1056257131427',
  appId: '1:1056257131427:web:e609bc78fda2e19ec75016',
};

// ----- Prevent duplicate Firebase instances -----
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ----- Auth with AsyncStorage persistence (remembers login) -----
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
