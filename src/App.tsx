import MainLayout from "./layouts/MainLayout"
// import { ThemeProvider } from "./theme/ThemeProvider"

import * as React from "react"
import { useUser, useAuth } from "@clerk/clerk-react"
import { Routes, Route, Navigate } from "react-router-dom"
import SignInPage from "./features/auth/sign-in.tsx"
import SignUpPage from "./features/auth/sign-up.tsx"
import ForgotPasswordPage from "./features/auth/forgot-password.tsx"
import SSOCallback from "./features/auth/sso-callback.tsx"
import LoadingState from "./components/LoadingState"
import { useWhitelistCheck } from "./hooks/useWhitelistCheck"

function App() {
  const { isSignedIn, isLoaded } = useUser()
  const { signOut } = useAuth()
  const { whitelistStatus, isChecking } = useWhitelistCheck()
  const [authState, setAuthState] = React.useState<{ 
    isSignedIn: boolean | null; 
    isLoaded: boolean;
    isWhitelisted: boolean | null;
  }>({
    isSignedIn: null,
    isLoaded: false,
    isWhitelisted: null
  })

  // Debounce authentication state changes to prevent rapid re-renders
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // If signed in and whitelist is configured, check if allowed
      let isWhitelisted: boolean | null = null
      if (isSignedIn && whitelistStatus !== null) {
        isWhitelisted = whitelistStatus.allowed
      }

      setAuthState({ 
        isSignedIn: isSignedIn ?? null, 
        isLoaded, 
        isWhitelisted 
      })
    }, 50) // Small delay to prevent rapid state changes

    return () => clearTimeout(timer)
  }, [isSignedIn, isLoaded, whitelistStatus])

  // If not allowed and we know the result, sign out and show error
  if (authState.isSignedIn && authState.isWhitelisted === false && !isChecking) {
    const reason = whitelistStatus?.reason || 'You do not have access to this application.'
    
    return (
      <div className="flex items-center justify-center w-full h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès refusé</h1>
          <p className="text-gray-700 mb-6">{reason}</p>
          <button
            onClick={() => signOut({ redirectUrl: '/login' })}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
           Revenir à la connexion
          </button>
        </div>
      </div>
    )
  }

  // Still checking whitelist status
  if (authState.isSignedIn && (authState.isWhitelisted === null || isChecking)) {
    return <LoadingState variant="login" message="Verifying access..." />
  }

  if (!authState.isLoaded) {
    return <LoadingState variant="login" message="Authenticating..." />
  }

  return (
    <Routes>
      <Route path="/" element={authState.isSignedIn ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}/>
      <Route path="/login" element={!authState.isSignedIn ? <SignInPage/> : <Navigate to="/home" replace />}/>
      <Route path="/signup" element={!authState.isSignedIn ? <SignUpPage/> : <Navigate to="/home" replace />}/>
      <Route path="/forgot-password" element={!authState.isSignedIn ? <ForgotPasswordPage/> : <Navigate to="/home" replace />}/>
      <Route path="/sso-callback" element={<SSOCallback/>}/>
      <Route path='/home' element={authState.isSignedIn && authState.isWhitelisted !== false ? <MainLayout/> : <Navigate to="/login" replace />}/>
      <Route path="*" element={<Navigate to="/" replace />}/>
    </Routes>
  )
}

export default React.memo(App)