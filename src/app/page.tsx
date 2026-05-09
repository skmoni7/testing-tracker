// ============================================================
// HOME PAGE
// Redirects logged-in users to dashboard, others to login
// ============================================================
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // ---- Send to dashboard if logged in, else login page ----
      router.replace(user ? '/dashboard' : '/login')
    }
  }, [user, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl font-bold text-indigo-600 mb-2">ProTrack</div>
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    </div>
  )
}
