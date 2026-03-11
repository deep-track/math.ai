import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { getAdminMetrics } from '../services/api'

export function useAdminAnalytics(days = 30) {
  const { user, isLoading, getAccessTokenSilently } = useAuth0()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (isLoading) return
      const email = user?.email
      if (!email) {
        setData(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE || undefined,
          },
        })
        const res = await getAdminMetrics(email, days, token)
        setData(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin analytics')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.sub, isLoading, days, getAccessTokenSilently])

  return { data, loading, error }
}
