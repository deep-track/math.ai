import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const domain = import.meta.env.VITE_AUTH0_DOMAIN
      const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID

      // Send password reset email via Auth0
      const response = await fetch(`https://${domain}/dbconnections/change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          email: email,
          connection: 'Username-Password-Authentication',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.description || errorData.message || 'Failed to send reset email')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la demande de réinitialisation')
    } finally {
      setLoading(false)
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
              <h1 className="text-4xl font-bold text-white mb-2">MathAI</h1>
              <p className="text-green-100 text-lg">Réinitialiser le mot de passe</p>
            </div>
          </div>

          {/* Form Container */}
          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {success ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-lg">
                  <p className="text-emerald-200 text-sm">
                    ✓ Un email de réinitialisation a été envoyé à <strong>{email}</strong>
                  </p>
                </div>
                <p className="text-gray-300 text-sm">
                  Veuillez vérifier votre boîte de réception (et le dossier spam) pour l'email contenant le lien de réinitialisation.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 text-base shadow-lg hover:shadow-xl"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-300 text-sm mb-6">
                  Entrez l'email associé à votre compte et nous vous enverrons des instructions pour réinitialiser votre mot de passe.
                </p>

                <form onSubmit={handleForgotPassword} className="space-y-4">
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#008751] to-[#00b876] hover:from-[#006b42] hover:to-[#009a5c] text-white font-bold py-3 rounded-lg transition-all duration-300 text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Envoi en cours...' : 'Envoyer les instructions'}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#16191f] px-8 py-5 text-center border-t border-gray-700">
            <p className="text-sm text-gray-400">
              <Link to="/login" className="text-[#00b876] hover:text-[#00d488] font-bold transition-colors">Retour à la connexion</Link>
            </p>
          </div>
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

export default ForgotPasswordPage