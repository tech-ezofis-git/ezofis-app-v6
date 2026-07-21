import { useSearch } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import AnimateEntrancePop from '@/components/common/animations/AnimateEntrancePop'
import ShareSignInForm from './components/ShareSignInForm'
import SignInForm from './components/SignInForm'
import VerificationForm from './components/VerificationForm'

type View = 'verification-form' | 'sign-in-form' | 'share-sign-in-form'

const SignInPage = () => {
  const search: any = useSearch({ strict: false })
  const shareToken = search?.shareToken
  const email = search?.email
  const isNew =
    search?.isNew === 'true' ||
    search?.isnew === 'true' ||
    search?.isNew === true ||
    search?.isnew === true

  const [view, setView] = useState<View>(
    shareToken && email && isNew ? 'share-sign-in-form' : 'sign-in-form',
  )

  return (
    <AnimatePresence initial={false} mode='wait'>
      <AnimateEntrancePop key={view}>
        {view === 'verification-form' && <VerificationForm />}
        {view === 'sign-in-form' && (
          <SignInForm onChangeView={() => setView('verification-form')} />
        )}
        {view === 'share-sign-in-form' && (
          <ShareSignInForm email={email} shareToken={shareToken} />
        )}
      </AnimateEntrancePop>
    </AnimatePresence>
  )
}

SignInPage.displayName = 'SignInPage'
export default SignInPage
