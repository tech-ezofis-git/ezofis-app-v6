import { useState } from 'react'
import { SignUpScreen } from './SignUpScreen'
import { VerifyEmailScreen } from './VerifyEmailScreen'

type View = 'sign-up' | 'verify-email'

/** Mobile sign-up flow: email/social signup → OTP verify. */
export function MobileSignUpFlow() {
  const [email, setEmail] = useState('')
  const [view, setView] = useState<View>('sign-up')

  if (view === 'verify-email') {
    return <VerifyEmailScreen onBack={() => setView('sign-up')} />
  }

  return (
    <SignUpScreen
      email={email}
      setEmail={setEmail}
      onContinueEmail={() => setView('verify-email')}
    />
  )
}
