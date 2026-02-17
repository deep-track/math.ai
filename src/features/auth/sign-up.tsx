import { useState, useEffect } from 'react'
import { useSignUp } from '@clerk/clerk-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const SignUpPage = () => {
  const { isLoaded, signUp, setActive } = useSignUp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isOAuthRedirect = searchParams.get('oauth') === 'true'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState('')

  // Show message for OAuth redirects
  useEffect(() => {
    if (isOAuthRedirect) {
      setError('Votre compte Google n\'existe pas encore. Veuillez créer un compte ou continuer avec Google.')
    }
  }, [isOAuthRedirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (!isLoaded) return

    setLoading(true)

    try {
      // Start the sign-up process
      await signUp.create({
        emailAddress: email,
        password,
      })

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      
      setVerifying(true)
    } catch (err: any) {
      console.error('Error signing up:', err)
      setError(err.errors?.[0]?.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isLoaded) return

    setLoading(true)

    try {
      // Complete the sign-up process
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId })
        navigate('/home')
      } else {
        console.log(completeSignUp)
      }
    } catch (err: any) {
      console.error('Error verifying:', err)
      setError(err.errors?.[0]?.message || 'An error occurred during verification')
    } finally {
      setLoading(false)
    }
  }

  const handleSignInWithOAuth = async (provider: 'google' | 'github') => {
    if (!signUp) return
    try {
      await signUp.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/home',
      })
    } catch (err: any) {
      setError(err.errors?.[0]?.message || `An error occurred with ${provider} sign up`)
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
              <p className="text-green-100 text-lg">{verifying ? 'Vérifiez votre email' : 'Créer un compte'}</p>
            </div>
          </div>

          {/* Form Container */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {!verifying ? (
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
                    placeholder="Créez un mot de passe sécurisé"
                    required
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-400">Minimum 8 caractères</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-gray-300 font-medium mb-2">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#2a3138] border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:border-[#008751] focus:ring-2 focus:ring-[#008751] focus:ring-opacity-30 transition-all duration-200"
                    placeholder="Confirmez votre mot de passe"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="terms"
                    type="checkbox"
                    className="h-4 w-4 text-[#008751] focus:ring-[#008751] border-gray-600 rounded bg-[#2a3138]"
                    required
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
                    J'accepte les{' '}
                    <a href="/terms" className="text-[#00b876] hover:text-[#00d488] font-semibold transition-colors">
                      conditions d'utilisation
                    </a>{' '}
                    et la{' '}
                    <a href="/privacy" className="text-[#00b876] hover:text-[#00d488] font-semibold transition-colors">
                      politique de confidentialité
                    </a>
                  </label>
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
                      Création en cours...
                    </>
                  ) : (
                    "S'inscrire"
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
            ) : (
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <p className="text-gray-300 mb-4">
                    Nous avons envoyé un code de vérification à <span className="font-semibold text-green-300">{email}</span>.
                    Veuillez saisir le code ci-dessous.
                  </p>
                  <label htmlFor="code" className="block text-gray-300 font-medium mb-2">
                    Code de vérification
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#2a3138] border border-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:border-[#008751] focus:ring-2 focus:ring-[#008751] focus:ring-opacity-30 transition-all duration-200 text-center text-xl tracking-widest"
                    placeholder="123456"
                    required
                    disabled={loading}
                  />
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
                      Vérification...
                    </>
                  ) : (
                    'Vérifier le code'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setVerifying(false)}
                  className="w-full text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Modifier l'email
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#16191f] px-8 py-5 text-center border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Vous avez déjà un compte? <a href="/login" className="text-[#00b876] hover:text-[#00d488] font-bold transition-colors">Se connecter</a>
            </p>
            <div className="mt-3">
              <a href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
                Retour à l'accueil
              </a>
            </div>
          </div>
        </div>

        {/* Info text */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">Rejoignez des milliers d'utilisateurs résolvant des maths avec l'IA</p>
        </div>
      </div>

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

export default SignUpPage