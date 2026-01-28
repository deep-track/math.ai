
import { SignUp } from "@clerk/clerk-react"

const SignUpPage = () => {
  return (
    <SignUp signInUrl="/login" forceRedirectUrl={"/login"}/>
  )
}

export default SignUpPage