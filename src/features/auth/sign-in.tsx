import { SignIn } from '@clerk/clerk-react'

const SignInPage = () => {
  return (
    <SignIn signUpUrl='/signup' forceRedirectUrl={"/home"}/>
  )
}

export default SignInPage