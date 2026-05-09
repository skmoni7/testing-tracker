// ======================================================
// AUTH CONTEXT
// Wraps the entire app so any page knows if user is logged in
// Also exposes a logout() function used by the dashboard
// Enforces "Remember me for 30 days" expiry on session restore
// ======================================================
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const REMEMBER_ME_KEY = 'rememberMeExpiry'

/* ----- Shape of what useAuth() returns ----- */
interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ----- Listen for login/logout changes from Firebase -----
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Check if "Remember me for 30 days" has expired
        const expiryStr = localStorage.getItem(REMEMBER_ME_KEY)
        if (expiryStr !== null) {
          // rememberMe was set — check if it has expired
          const expiry = parseInt(expiryStr, 10)
          if (Date.now() > expiry) {
            // Expired: sign the user out and clear the key
            localStorage.removeItem(REMEMBER_ME_KEY)
            await signOut(auth)
            setUser(null)
            setLoading(false)
            return
          }
        }
        // Session is valid (either rememberMe not expired, or it's a session-only login)
        setUser(u)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe // cleanup on unmount
  }, [])

  /* ----- Logout: signs out from Firebase and clears rememberMe ----- */
  async function logout() {
    localStorage.removeItem(REMEMBER_ME_KEY)
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
