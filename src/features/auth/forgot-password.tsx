import { useState } from 'react'
import { useSignIn } from '@clerk/clerk-react'
import { useNavigate, Link } from 'react-router-dom'

const ForgotPasswordPage = () => {
  const { isLoaded, signIn } = useSignIn()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isLoaded || !signIn) return

    setLoading(true)

    try {
      // Create a password reset request
      const resetRes = await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      })

      // Move to code verification step after successful request
      setStep('code')
      setSuccess('Un email de réinitialisation a été envoyé à votre adresse.')
      console.log('Password reset initiated:', resetRes.status)
    } catch (err: any) {
      console.error('Error starting password reset:', err)
      setError(err.errors?.[0]?.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isLoaded || !signIn) return

    setLoading(true)

    try {
      // Attempt to reset password with code
      const resetRes = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      })

      if (resetRes.status === 'needs_new_password') {
        setStep('password')
        setSuccess('')
      }
    } catch (err: any) {
      console.error('Error verifying code:', err)
      setError(err.errors?.[0]?.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isLoaded || !signIn) return

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)

    try {
      // Reset the password with the new password
      const resetRes = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      })

      if (resetRes.status === 'complete') {
        setSuccess('Votre mot de passe a été réinitialisé avec succès!')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (err: any) {
      console.error('Error resetting password:', err)
      setError(err.errors?.[0]?.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#1a1f2a] to-[#0a3d28] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1f2228] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#008751] to-[#00b876] px-8 py-12 text-center">
            <h1 className="text-3xl font-bold text-white">Réinitialiser le mot de passe</h1>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
                {success}
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
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

                <button
                  type="submit"
                  disabled={loading || !isLoaded}
                  className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer le code'}
                </button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-6">
                <div>
                  <p className="text-gray-300 mb-4">
                    Nous avons envoyé un code de vérification à <span className="font-semibold text-green-300">{email}</span>.
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
                  className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Vérification...' : 'Vérifier le code'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Modifier l'email
                </button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-gray-300 font-medium mb-2">
                    Nouveau mot de passe
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

                <button
                  type="submit"
                  disabled={loading || !isLoaded}
                  className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link to="/login" className="text-[#00b876] hover:text-[#00d488] font-semibold transition-colors">
                Retour à la connexion
              </Link>
              <div className="mt-3">
                <Link to="/" className="text-xs text-gray-400 hover:text-white transition-colors">
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage