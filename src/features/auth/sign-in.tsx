import { useState } from 'react'
import { useSignIn } from '@clerk/clerk-react'
import { useNavigate, Link } from 'react-router-dom'

const SignInPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSignUpModal, setShowSignUpModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isLoaded || !signIn) {
      setLoading(false)
      return
    }

    try {
      // Validate inputs
      if (!email || !password) {
        setError('Veuillez entrer votre email et mot de passe')
        setLoading(false)
        return
      }

      // Attempt to sign in
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === 'complete') {
        // Sign in successful
        await setActive({ session: result.createdSessionId })
        navigate('/home')
      } else {
        // The user needs to complete additional steps
        console.log(result)
      }
    } catch (err: any) {
      console.error('Error signing in:', err)
      const errorMessage = err.errors?.[0]?.message || err.message || 'An error occurred during sign in'
      
      // Log the full error for debugging
      console.log('Full error object:', err)
      console.log('Error code:', err.errors?.[0]?.code)
      console.log('Error message:', errorMessage)
      
      // For any sign-in error, show the sign-up modal as it's likely they don't have an account
      // Clerk errors for non-existent users or wrong credentials are handled the same way
      setShowSignUpModal(true)
      setError('')
    } finally {
      setLoading(false)
    }
  }

  const handleSignInWithOAuth = async (provider: 'google') => {
    try {
      if (!signIn) return
      await signIn.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/home',
      })
    } catch (err: any) {
      console.error(`Error with ${provider} sign in:`, err)
      // Show sign-up modal for OAuth errors as well (likely no account exists)
      setShowSignUpModal(true)
      setError('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1a1f2a] to-[#0a3d28] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#008751] rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00b876] rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1f2228] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-[#008751] to-[#00b876] px-8 py-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full mix-blend-screen blur-2xl"></div>
            </div>
            <div className="relative z-10">
              <h1 className="text-5xl font-bold text-white mb-3">MathAI</h1>
              <p className="text-green-100 text-lg">Connectez-vous</p>
            </div>
          </div>

          {/* Form Container */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-gray-300 font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#2a3138] border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:border-[#008751] focus:ring-2 focus:ring-[#008751] focus:ring-opacity-30 transition-all duration-200"
                  placeholder="Votre email"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-gray-300 font-medium mb-2">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#2a3138] border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:border-[#008751] focus:ring-2 focus:ring-[#008751] focus:ring-opacity-30 transition-all duration-200"
                  placeholder="Votre mot de passe"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#008751] focus:ring-[#008751] border-gray-600 rounded bg-[#2a3138]"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                    Se souvenir de moi
                  </label>
                </div>
                <Link to="/forgot-password" className="text-sm text-[#00b876] hover:text-[#00d488] font-semibold transition-colors">
                  Mot de passe oublié?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || !isLoaded}
                className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1f2228] text-gray-400">Ou continuer avec</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleSignInWithOAuth('google')}
                  disabled={loading || !isLoaded}
                  className="w-full bg-[#2a3138] border border-gray-600 text-white rounded-lg py-3 hover:bg-[#333a42] hover:border-[#008751] transition-all duration-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-[#16191f] px-8 py-5 text-center border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Pas encore inscrit? <button onClick={() => navigate('/signup')} className="text-[#00b876] hover:text-[#00d488] font-bold transition-colors cursor-pointer bg-none border-none">Créer un compte</button>
            </p>
          </div>
        </div>

        {/* Info text */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">Résolvez des problèmes mathématiques avec l'IA</p>
        </div>
      </div>

      {/* No Account Modal */}
      {showSignUpModal && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-40"
            onClick={() => setShowSignUpModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
            <div className="bg-[#1f2228] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300 backdrop-blur-sm">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#008751] to-[#00b876] mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Pas de compte?</h2>
                <p className="text-gray-400 text-sm">Il semble que vous n'ayez pas encore créé de compte avec ces identifiants.</p>
              </div>

              {/* Content */}
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#00b876] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">Créez un compte gratuitement</p>
                    <p className="text-xs text-gray-400 mt-1">Accédez à tous les outils d'apprentissage mathématique</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#00b876] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">Compte en 2 minutes</p>
                    <p className="text-xs text-gray-400 mt-1">Vérification rapide par email</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#00b876] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">Sécurisé et fiable</p>
                    <p className="text-xs text-gray-400 mt-1">Vos données sont protégées</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSignUpModal(false)
                    navigate('/signup')
                  }}
                  className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  S'inscrire maintenant
                </button>
                <button
                  onClick={() => {
                    setShowSignUpModal(false)
                    setEmail('')
                    setPassword('')
                  }}
                  className="w-full bg-[#2a3138] hover:bg-[#333a42] text-gray-300 font-medium py-3 rounded-lg transition-all duration-200 border border-gray-600"
                >
                  Retour à la connexion
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}

export default SignInPage