import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import AnimateEntrancePop from '@/components/common/animations/AnimateEntrancePop'
import SignUpForm from './components/SignUpForm'
import VerifyEmailForm from './components/VerifyEmailForm'

type View = 'verify-email-form' | 'sign-up-form'

const SignUpPage = () => {
  const [email, setEmail] = useState('')
  const [view, setView] = useState<View>('sign-up-form')
  // const [loginType, setLoginType] = useState<'NORMAL' | 'GOOGLE' | 'MICROSOFT'>('NORMAL')


  return (
    <AnimatePresence initial={false} mode='wait'>
      <AnimateEntrancePop key={view}>
        {view === 'verify-email-form' && <VerifyEmailForm />}
        {view === 'sign-up-form' && (
          <SignUpForm
            email={email}
            setEmail={setEmail}
            onChangeView={() => setView('verify-email-form')}
          />
        )}
      </AnimateEntrancePop>
    </AnimatePresence>
  )
}

SignUpPage.displayName = 'SignUpPage'
export default SignUpPage
