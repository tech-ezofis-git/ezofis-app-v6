import { useSearch } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import AnimateEntrancePop from '@/components/common/animations/AnimateEntrancePop'
import ShareSignInForm from './components/ShareSignInForm'
import SignInForm from './components/SignInForm'
import SignRequestSignInForm from './components/SignRequestSignInForm'
import VerificationForm from './components/VerificationForm'

type View =
  | 'verification-form'
  | 'sign-in-form'
  | 'share-sign-in-form'
  | 'sign-request-sign-in-form'

const SignInPage = () => {
  const search: any = useSearch({ strict: false })
  const shareToken = search?.shareToken
  const inviteToken = search?.inviteToken
  const email = search?.email
  const isNew =
    search?.isNew === 'true' ||
    search?.isnew === 'true' ||
    search?.isNew === true ||
    search?.isnew === true

  // Share + sign-request use dedicated invite forms (centered AuthLayout).
  // Plain /sign-in uses the standard app SignInForm (two-column AuthLayout).
  const initialView: View =
    inviteToken && email
      ? 'sign-request-sign-in-form'
      : shareToken && email
        ? 'share-sign-in-form'
        : 'sign-in-form'

  const [view, setView] = useState<View>(initialView)

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
        {view === 'sign-request-sign-in-form' && (
          <SignRequestSignInForm
            email={email}
            inviteToken={inviteToken}
            needsPasswordSetup={isNew}
          />
        )}
      </AnimateEntrancePop>
    </AnimatePresence>
  )
}

SignInPage.displayName = 'SignInPage'
export default SignInPage
