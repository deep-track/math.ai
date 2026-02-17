import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { getAdminMetrics } from '../services/api'

export function useAdminAnalytics(days = 30) {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!isLoaded) return
      const email = user?.primaryEmailAddress?.emailAddress
      if (!email) {
        setData(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const token = await getToken().catch(() => undefined)
        const res = await getAdminMetrics(email, days, token || undefined)
        setData(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin analytics')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.id, isLoaded, days, getToken])

  return { data, loading, error }
}
