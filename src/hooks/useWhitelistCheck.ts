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

  useEffect(() => {
    // 1. Capture the email in a local variable
    const userEmail = user?.primaryEmailAddress?.emailAddress

    // 2. Only proceed if we have everything we need
    if (!isLoaded || !userEmail) {
      return
    }

    const verifyEmail = async () => {
      setIsChecking(true)
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/verify-whitelist`,
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
      } catch (error) {
        console.error('Whitelist check error:', error)
        setWhitelistStatus({ allowed: false, reason: 'Error verifying email access' })
      } finally {
        setIsChecking(false)
      }
    }

    verifyEmail()
  }, [user, isLoaded])

  return { whitelistStatus, isChecking }
}
