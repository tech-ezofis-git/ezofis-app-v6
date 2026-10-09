import { useSearch } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import AnimateEntrancePop from '@/components/common/animations/AnimateEntrancePop'
import authUserStore from '@/stores/authUserStore'
import GuestOtpVerificationForm from './components/GuestOtpVerificationForm'
import ShareSignInForm from './components/ShareSignInForm'
import SignInForm from './components/SignInForm'
import SignRequestSignInForm from './components/SignRequestSignInForm'
import VerificationForm from './components/VerificationForm'

type View =
  | 'verification-form'
  | 'sign-in-form'
  | 'share-sign-in-form'
  | 'sign-request-sign-in-form'
  | 'guest-otp-form'

const SignInPage = () => {
  const search: any = useSearch({ strict: false })
  const shareToken = search?.shareToken
  const inviteToken = search?.inviteToken
  const email = search?.email
  const isOtp = search?.auth === 'otp'
  const isNew =
    search?.isNew === 'true' ||
    search?.isnew === 'true' ||
    search?.isNew === true ||
    search?.isnew === true

  useEffect(() => {
    if (
      (shareToken || inviteToken) &&
      authUserStore.getState().isAuthenticated
    ) {
      authUserStore.getState().resetAuthState()
    }
  }, [shareToken, inviteToken])

  // Share + sign-request use dedicated invite forms (centered AuthLayout).
  // Plain /sign-in uses the standard app SignInForm (two-column AuthLayout).
  const initialView: View =
    isOtp && (shareToken || inviteToken)
      ? 'guest-otp-form'
      : inviteToken && email
        ? 'sign-request-sign-in-form'
        : shareToken && email
          ? 'share-sign-in-form'
          : 'sign-in-form'

  const [view, setView] = useState<View>(initialView)

  useEffect(() => {
    if (isOtp && (shareToken || inviteToken)) {
      setView('guest-otp-form')
    }
  }, [isOtp, shareToken, inviteToken])

  return (
    <AnimatePresence initial={false} mode='wait'>
      <AnimateEntrancePop key={view}>
        {view === 'verification-form' && <VerificationForm />}
        {view === 'sign-in-form' && (
          <SignInForm onChangeView={() => setView('verification-form')} />
        )}
        {view === 'guest-otp-form' && (
          <GuestOtpVerificationForm
            email={email}
            inviteToken={inviteToken}
            shareToken={shareToken}
          />
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
