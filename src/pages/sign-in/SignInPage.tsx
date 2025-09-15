import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import AnimateEntrance from '@/components/common/AnimateEntrance'
import SignInForm from './components/SignInForm'
import VerificationForm from './components/VerificationForm'

type View = 'verification-form' | 'sign-in-form'

const SignInPage = () => {
  const [view, setView] = useState<View>('sign-in-form')

  return (
    <AnimatePresence initial={false} mode='wait'>
      <AnimateEntrance key={view}>
        {view === 'verification-form' && <VerificationForm />}
        {view === 'sign-in-form' && (
          <SignInForm onChangeView={() => setView('verification-form')} />
        )}
      </AnimateEntrance>
    </AnimatePresence>
  )
}

SignInPage.displayName = 'SignInPage'
export default SignInPage
