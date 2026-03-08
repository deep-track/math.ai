import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

type AdminStatus = {
  allowed: boolean
  reason?: string
}

export function useAdminCheck() {
  const { user, isLoading } = useAuth0()
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false)

  useEffect(() => {
    const userEmail = user?.email
    if (isLoading || !userEmail) {
      return
    }

    const cacheKey = `admin_access_cache_${userEmail.toLowerCase()}`
    const now = Date.now()
    const ttlMs = 10 * 60 * 1000

    try {
      const cachedRaw = localStorage.getItem(cacheKey)
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { allowed: boolean; reason?: string; ts: number }
        if (cached && typeof cached.allowed === 'boolean' && typeof cached.ts === 'number' && now - cached.ts <= ttlMs) {
          setAdminStatus({ allowed: cached.allowed, reason: cached.reason })
          return
        }
      }
    } catch (e) {
      // ignore cache parsing errors
    }

    const verifyAdmin = async () => {
      setIsCheckingAdmin(true)
      try {
        let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
        API_BASE_URL = API_BASE_URL.replace(/\/$/, '')
        if (!API_BASE_URL.endsWith('/api')) {
          API_BASE_URL = `${API_BASE_URL}/api`
        }

        const response = await fetch(`${API_BASE_URL}/verify-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail }),
        })

        if (!response.ok) {
          const denied = { allowed: false, reason: 'Failed to verify admin access' }
          setAdminStatus(denied)
          return
        }

        const result = await response.json()
        setAdminStatus(result)

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ allowed: !!result.allowed, reason: result.reason, ts: Date.now() }))
        } catch (e) {
          // ignore cache write errors
        }
      } catch (error) {
        setAdminStatus({ allowed: false, reason: 'Error verifying admin access' })
      } finally {
        setIsCheckingAdmin(false)
      }
    }

    verifyAdmin()
  }, [user, isLoading])

  return { adminStatus, isCheckingAdmin }
}
