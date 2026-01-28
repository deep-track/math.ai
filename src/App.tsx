import MainLayout from "./layouts/MainLayout"
// import { ThemeProvider } from "./theme/ThemeProvider"

// import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import SignInPage from "./features/auth/sign-in.tsx"
import SignUpPage from "./features/auth/sign-up.tsx"

function App() {

  return (
    <BrowserRouter>
        <Routes>
          <Route path="/login" element = {<SignInPage/>}/>
          <Route path="/signup" element = {<SignUpPage/>}/>
          <Route path='/home' element = {<MainLayout/>}/>
        </Routes>
    </BrowserRouter>
  )
}

export default App
{/* <div>
          <ThemeProvider>
            <MainLayout/>
          </ThemeProvider>
        </div> */}
        {/* <header>
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </header> */}