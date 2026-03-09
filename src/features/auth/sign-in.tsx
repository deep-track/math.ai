import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

const SignInPage = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const justRegistered = searchParams.get('registered') === 'true'

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/home')
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Resource Owner Password Grant — pure API call, no Auth0 UI, no redirects, works in all browsers
      const tokenRes = await fetch(`https://${import.meta.env.VITE_AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
          username: email,
          password,
          realm: 'Username-Password-Authentication',
          client_id: import.meta.env.VITE_AUTH0_CLIENT_ID,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email',
        }),
      })

      const data = await tokenRes.json()

      if (!tokenRes.ok) {
        console.error('Auth0 login error:', data)
        const message =
          data.error === 'invalid_grant'
            ? 'Email ou mot de passe incorrect'
            : data.error_description === 'Authorization server not configured with default connection.'
            ? 'Connexion indisponible: la connexion par mot de passe n\'est pas encore activée dans Auth0.'
            : data.error_description || 'Erreur de connexion'
        throw new Error(message)
      }

      // Store tokens and reload via loginWithRedirect using a silent prompt
      // Tokens obtained — now get Auth0 to create the SPA session via redirect
      sessionStorage.setItem('auth0_access_token', data.access_token)
      if (data.id_token) sessionStorage.setItem('auth0_id_token', data.id_token)

      await loginWithRedirect({
        authorizationParams: {
          login_hint: email,
          prompt: 'none',   // Silent: Auth0 uses the just-validated session, no UI shown
        },
        appState: { returnTo: '/home' },
      })
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Email ou mot de passe incorrect')
      setLoading(false)
    }
  }

  const handleSignInWithGoogle = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: 'google-oauth2'
        },
        appState: { returnTo: '/home' },
      })
    } catch (err: any) {
      setError('Google login failed')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1a1f2a] to-[#0a3d28] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008751]"></div>
      </div>
    )
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
            {justRegistered && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-200 text-sm">
                ✓ Compte créé avec succès ! Connectez-vous maintenant.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#2a3138] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#008751] transition-colors"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#2a3138] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#008751] transition-colors pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 5C7 5 2.73 8.11 1 12.46c1.73 4.35 6 7.54 11 7.54s9.27-3.19 11-7.54C21.27 8.11 17 5 12 5m0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <Link to="/forgot-password" className="text-xs text-[#00b876] hover:text-[#00d488] transition-colors">
                    Mot de passe oublié?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1f2228] text-gray-400">Ou continuer avec</span>
              </div>
            </div>

            <button
              onClick={handleSignInWithGoogle}
              className="w-full bg-[#2a3138] border border-gray-600 text-white rounded-lg py-3 hover:bg-[#333a42] hover:border-[#008751] transition-all duration-200 font-medium flex items-center justify-center"
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

          {/* Footer */}
          <div className="bg-[#16191f] px-8 py-5 text-center border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Pas encore inscrit? <Link to="/signup" className="text-[#00b876] hover:text-[#00d488] font-bold transition-colors">Créer un compte</Link>
            </p>
            <div className="mt-3">
              <Link to="/" className="text-xs text-gray-400 hover:text-white transition-colors">
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>

        {/* Info text */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">Résolvez des problèmes mathématiques avec l'IA</p>
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

export default SignInPage