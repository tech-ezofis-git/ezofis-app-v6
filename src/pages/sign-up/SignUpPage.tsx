import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import AnimateEntrance from '@/components/common/AnimateEntrance'
import SignUpForm from './components/SignUpForm'
import VerifyEmailForm from './components/VerifyEmailForm'

type View = 'verify-email-form' | 'sign-up-form'

const SignUpPage = () => {
  const [email, setEmail] = useState('charles@ezofis.com')
  const [view, setView] = useState<View>('sign-up-form')

  return (
    <AnimatePresence initial={false} mode='wait'>
      <AnimateEntrance key={view}>
        {view === 'verify-email-form' && <VerifyEmailForm email={email} />}
        {view === 'sign-up-form' && (
          <SignUpForm
            email={email}
            setEmail={setEmail}
            onChangeView={() => setView('verify-email-form')}
          />
        )}
      </AnimateEntrance>
    </AnimatePresence>
  )
}

SignUpPage.displayName = 'SignUpPage'
export default SignUpPage
