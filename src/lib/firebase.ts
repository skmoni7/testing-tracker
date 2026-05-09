// ====================================================
// FIREBASE INITIALIZATION
// Import and configure Firebase services used across the app
// ====================================================
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

/* ---- Your Firebase project configuration ---- */
const firebaseConfig = {
  apiKey: "AIzaSyBYfPDX49cZUrew9Qik76LSFrUf9GlLexI",
  authDomain: "protrack1.firebaseapp.com",
  projectId: "protrack1",
  storageBucket: "protrack1.firebasestorage.app",
  messagingSenderId: "1056257131427",
  appId: "1:1056257131427:web:e609bc78fda2e19ec75016",
}

// ====================================================
// PREVENT DUPLICATE FIREBASE INSTANCES (important for Next.js)
// ====================================================
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
