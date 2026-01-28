import MainLayout from "./layouts/MainLayout"
// import { ThemeProvider } from "./theme/ThemeProvider"

import { useUser } from "@clerk/clerk-react"
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import SignInPage from "./features/auth/sign-in.tsx"
import SignUpPage from "./features/auth/sign-up.tsx"
import ForgotPasswordPage from "./features/auth/forgot-password.tsx"
import SSOCallback from "./features/auth/sso-callback.tsx"
import LoadingState from "./components/LoadingState"

function App() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return <LoadingState variant="login" message="Authenticating..." />
  }

  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={isSignedIn ? <Navigate to="/home" /> : <Navigate to="/login" />}/>
          <Route path="/login" element={!isSignedIn ? <SignInPage/> : <Navigate to="/home" />}/>
          <Route path="/signup" element={!isSignedIn ? <SignUpPage/> : <Navigate to="/home" />}/>
          <Route path="/forgot-password" element={!isSignedIn ? <ForgotPasswordPage/> : <Navigate to="/home" />}/>
          <Route path="/sso-callback" element={<SSOCallback/>}/>
          <Route path='/home' element={isSignedIn ? <MainLayout/> : <Navigate to="/login" />}/>
          <Route path="*" element={<Navigate to="/" />}/>
        </Routes>
    </BrowserRouter>
  )
}

export default App