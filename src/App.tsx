import MainLayout from "./layouts/MainLayout"
// import { ThemeProvider } from "./theme/ThemeProvider"

import * as React from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { Routes, Route, Navigate } from "react-router-dom"
import SignInPage from "./features/auth/sign-in.tsx"
import SignUpPage from "./features/auth/sign-up.tsx"
import ForgotPasswordPage from "./features/auth/forgot-password.tsx"
import SSOCallback from "./features/auth/sso-callback.tsx"
import LoadingState from "./components/LoadingState"
// import { useWhitelistCheck } from "./hooks/useWhitelistCheck" // Commented out - open access to all users
import { useAdminCheck } from "./hooks/useAdminCheck"
import LandingPage from "./features/landing/LandingPage"
import AdminLayout from "./layouts/AdminLayout"

function App() {
  const { isAuthenticated, isLoading } = useAuth0()
  // const { whitelistStatus, isChecking, timedOut } = useWhitelistCheck() // Commented out - open access to all users
  const { adminStatus, isCheckingAdmin } = useAdminCheck()
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
      // Whitelist checking commented out - open access to all users
      // let isWhitelisted: boolean | null = null
      // if (isAuthenticated && whitelistStatus !== null) {
      //   isWhitelisted = whitelistStatus.allowed
      // }

      setAuthState({ 
        isSignedIn: isAuthenticated ?? null, 
        isLoaded: !isLoading, 
        isWhitelisted: true // Always allow - whitelist disabled
      })
    }, 50) // Small delay to prevent rapid state changes

    return () => clearTimeout(timer)
  }, [isAuthenticated, isLoading]) // Removed whitelistStatus dependency

  // Whitelist access denial - commented out for open access
  // if (authState.isSignedIn && authState.isWhitelisted === false && !isChecking) {
  //   const reason = whitelistStatus?.reason || 'You do not have access to this application.'
  //   
  //   return (
  //     <div className="flex items-center justify-center w-full h-screen bg-gray-100">
  //       <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
  //         <h1 className="text-2xl font-bold text-red-600 mb-4">Acces refuse</h1>
  //         <p className="text-gray-700 mb-6">{reason}</p>
  //         <button
  //           onClick={() => signOut({ redirectUrl: '/' })}
  //           className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
  //         >
  //          Revenir a la connexion
  //         </button>
  //       </div>
  //     </div>
  //   )
  // }

  // Whitelist status check - commented out for open access
  // if (authState.isSignedIn && (authState.isWhitelisted === null || isChecking) && !timedOut) {
  //   return <LoadingState variant="login" message="Verification de l'acces en cours..." />
  // }

  if (!authState.isLoaded) {
    return <LoadingState variant="login" message="Authentification en cours..." />
  }

  return (
    <Routes>
      <Route path="/" element={authState.isSignedIn ? <Navigate to="/home" replace /> : <LandingPage />}/>
      <Route path="/login" element={!authState.isSignedIn ? <SignInPage/> : <Navigate to="/home" replace />}/>
      <Route path="/signup" element={!authState.isSignedIn ? <SignUpPage/> : <Navigate to="/home" replace />}/>
      <Route path="/forgot-password" element={!authState.isSignedIn ? <ForgotPasswordPage/> : <Navigate to="/home" replace />}/>
      <Route path="/sso-callback" element={<SSOCallback/>}/>
      <Route path='/home' element={authState.isSignedIn ? <MainLayout/> : <Navigate to="/login" replace />}/>
      <Route
        path='/admin'
        element={
          authState.isSignedIn
            ? (isCheckingAdmin || adminStatus === null
              ? <LoadingState variant="login" message="Verification de l'acces administrateur en cours..." />
              : (adminStatus.allowed ? <AdminLayout/> : <Navigate to="/home" replace />))
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />}/>
    </Routes>
  )
}

export default React.memo(App)