import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'

/**
 * Hook to verify if the current user's email is on the whitelist.
 * Returns null while loading, then {allowed: boolean, reason?: string}
 */
export function useWhitelistCheck() {
  const { user, isLoaded } = useUser()
  const [whitelistStatus, setWhitelistStatus] = useState<{
    allowed: boolean
    reason?: string
  } | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    // 1. Capture the email in a local variable
    const userEmail = user?.primaryEmailAddress?.emailAddress

    // 2. Only proceed if we have everything we need
    if (!isLoaded || !userEmail) {
      return
    }

    setTimedOut(false)

    const cacheKey = `whitelist_cache_${userEmail.toLowerCase()}`
    const now = Date.now()
    const ttlMs = 6 * 60 * 60 * 1000
    let hasValidCache = false

    try {
      const cachedRaw = localStorage.getItem(cacheKey)
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { allowed: boolean; reason?: string; ts: number }
        if (cached && typeof cached.allowed === 'boolean' && typeof cached.ts === 'number') {
          if (now - cached.ts <= ttlMs) {
            hasValidCache = true
            setWhitelistStatus({ allowed: cached.allowed, reason: cached.reason })
          }
        }
      }
    } catch (e) {
      // Ignore cache parse errors
    }

    const verifyEmail = async () => {
      if (!hasValidCache) {
        setIsChecking(true)
        setTimedOut(false)
      }

      let timeoutId: number | undefined
      if (!hasValidCache) {
        timeoutId = window.setTimeout(() => {
          setTimedOut(true)
          setIsChecking(false)
        }, 3000)
      }

      try {
        // Build API base URL the same way as api.ts
        let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
        API_BASE_URL = API_BASE_URL.replace(/\/$/, '')
        // Add /api prefix for backend endpoints only if not already present
        if (!API_BASE_URL.endsWith('/api')) {
          API_BASE_URL = `${API_BASE_URL}/api`
        }

        const response = await fetch(
          `${API_BASE_URL}/verify-whitelist`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 3. Use the captured local variable here
            body: JSON.stringify({ email: userEmail })
          }
        )

        if (!response.ok) {
          setWhitelistStatus({ allowed: false, reason: 'Failed to verify email' })
          return
        }

        const result = await response.json()
        setWhitelistStatus(result)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ allowed: result.allowed, reason: result.reason, ts: Date.now() }))
        } catch (e) {
          // Ignore cache write errors
        }
      } catch (error) {
        console.error('Whitelist check error:', error)
        setWhitelistStatus({ allowed: false, reason: 'Error verifying email access' })
      } finally {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId)
        }
        setIsChecking(false)
      }
    }

    verifyEmail()
  }, [user, isLoaded])

  return { whitelistStatus, isChecking, timedOut }
}
