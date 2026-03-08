import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

const SSOCallback = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, error } = useAuth0()

  useEffect(() => {
    if (isLoading) return

    if (error) {
      console.error('Auth0 callback error:', error)
      // Redirect to login on error
      setTimeout(() => {
        navigate('/login')
      }, 2000)
      return
    }

    if (isAuthenticated) {
      // Successfully authenticated, redirect to home
      navigate('/home')
    } else {
      // Not authenticated, redirect to login
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, error, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1a1f2a] to-[#0a3d28] flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="animate-in fade-in duration-300">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 font-medium">Authentification échouée</p>
            <p className="text-gray-400 text-sm mt-2">Redirection en cours...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008751] mx-auto mb-4"></div>
            <p className="text-gray-300">Authentification en cours...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SSOCallback