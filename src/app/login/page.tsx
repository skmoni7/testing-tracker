// ============================================================
// LOGIN PAGE
// Handles sign-in and sign-up using Firebase email/password
// ============================================================
'use client'
import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ---- Handle form submit for login or signup ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* ---- App Title ---- */}
        <h1 className="text-3xl font-bold text-center mb-2 text-indigo-600 dark:text-indigo-400">ProTrack</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Free Testing Order Tracker</p>

        {/* ---- Login / Sign Up Form ---- */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* ---- Error message display ---- */}
          {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-950 p-2 rounded">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* ---- Toggle between sign in and sign up ---- */}
        <p className="text-center text-sm text-gray-500 mt-4">
          {isSignUp ? 'Already have an account?' : 'New user?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-indigo-500 hover:underline font-medium"
          >
            {isSignUp ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </div>
  )
}
