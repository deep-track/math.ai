import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignIn, useSignUp, useClerk } from '@clerk/clerk-react'

const SSOCallback = () => {
  const navigate = useNavigate()
  const { setActive } = useClerk()
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!signInLoaded && !signUpLoaded) return

    const handleCallback = async () => {
      try {
        // Handle the OAuth callback - Clerk automatically handles the redirect
        // The signIn or signUp should already have the OAuth result
        
        if (signIn?.status === 'complete' && signInLoaded) {
          // OAuth sign-in successful
          await setActive({ session: signIn.createdSessionId })
          navigate('/home')
          return
        }

        if (signUp?.status === 'complete' && signUpLoaded) {
          // OAuth sign-up successful
          await setActive({ session: signUp.createdSessionId })
          navigate('/home')
          return
        }

        // If we reach here, OAuth authentication might have failed
        // Redirect back to login with error
        console.log('OAuth authentication did not complete. SignIn status:', signIn?.status, 'SignUp status:', signUp?.status)
        setError('Authentification échouée. Veuillez créer un compte.')
        
        setTimeout(() => {
          navigate('/signup?oauth=true')
        }, 2000)
      } catch (err: any) {
        console.error('Error handling OAuth callback:', err)
        setError('Une erreur est survenue lors de l\'authentification')
        
        setTimeout(() => {
          navigate('/signup?oauth=true')
        }, 2000)
      }
    }

    handleCallback()
  }, [signIn, signUp, signInLoaded, signUpLoaded, navigate, setActive])

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
            <p className="text-red-400 font-medium">{error}</p>
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