// ======================================================
// LOGIN PAGE
// Handles sign-in, sign-up, and forgot password (reset email)
// Uses Firebase Authentication
// ======================================================
'use client'
import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

const REMEMBER_ME_KEY = 'rememberMeExpiry'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export default function LoginPage() {
  const router = useRouter()

  // ----- Form state -----
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // ----- Forgot password mode -----
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // ----- Handle forgot password: send reset email -----
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Please enter your email address above first.')
      return
    }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  // ----- Handle login or sign-up submit -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        // Set Firebase persistence based on "Remember me" checkbox
        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        )
        await signInWithEmailAndPassword(auth, email, password)

        // If "Remember me" is checked, store an expiry timestamp
        if (rememberMe) {
          localStorage.setItem(
            REMEMBER_ME_KEY,
            String(Date.now() + THIRTY_DAYS_MS)
          )
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY)
        }
      }
      router.push('/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError('An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // ----- Render: Forgot Password mode -----
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center text-indigo-600 mb-1">Reset Password</h1>
          <p className="text-center text-gray-500 text-sm mb-6">We will send a reset link to your email</p>

          {/* Success message */}
          {resetSent ? (
            <div className="text-center">
              <p className="text-green-600 font-semibold mb-2">Reset email sent!</p>
              <p className="text-gray-500 text-sm mb-6">
                Check your inbox at <strong>{email}</strong> and follow the link to reset your password.
              </p>
              <button
                onClick={() => { setIsForgotPassword(false); setResetSent(false) }}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              {/* Email input */}
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {/* Error */}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {/* Send button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              {/* Back to login */}
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError('') }}
                className="text-indigo-500 hover:underline"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ----- Render: Login / Sign-up mode -----
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-1">ProTrack</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Free Testing Order Tracker</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email input */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {/* Password input */}
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          {/* Remember me for 30 days - only shown on sign-in mode */}
          {!isSignUp && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              Remember me for 30 days
            </label>
          )}

          {/* Error message */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          {/* Forgot Password link - only shown on sign-in mode */}
          {!isSignUp && (
            <button
              type="button"
              onClick={() => { setIsForgotPassword(true); setError('') }}
              className="text-indigo-500 hover:underline"
            >
              Forgot Password?
            </button>
          )}

          {/* Toggle sign-in / sign-up */}
          <p className="text-center text-sm text-gray-500">
            {isSignUp ? 'Already have an account?' : 'New user?'}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-indigo-500 hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
