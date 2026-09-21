import { useMsal } from '@azure/msal-react'
import { useGoogleLogin } from '@react-oauth/google'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { apiRouter } from '@/api/apiRouter'
import showToast from '@/components/base/toast/showToast'
import authUserStore from '@/stores/authUserStore'
import { AppButton } from '../../components/primitives/AppButton'
import { AppInput } from '../../components/primitives/AppInput'
import { Icon } from '../../components/primitives/Icon'
import {
  AuthHeroShell,
  AuthUserAvatar,
  GoogleMark,
  MicrosoftMark,
} from './AuthHeroShell'

type SignUpScreenProps = {
  email: string
  setEmail: (value: string) => void
  onContinueEmail: () => void
}

export function SignUpScreen({
  email,
  setEmail,
  onContinueEmail,
}: SignUpScreenProps) {
  const navigate = useNavigate()
  const { instance: msalInstance } = useMsal()
  const { resetSignUpUserData, setSignUpUserData } = authUserStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSendOtp = async () => {
    try {
      setError(null)
      if (!email) {
        setError('Please enter your email address.')
        return
      }

      resetSignUpUserData()
      setSignUpUserData({
        email,
        firstName: '',
        lastName: '',
        licenseType: '3',
        loginType: 'EZOFIS',
        organisation: '',
        password: '',
      })

      setLoading(true)
      const { error: apiError, status } = await apiRouter.sendMailOTP({
        email,
        requiredOTP: true,
      })

      if (status === 409) {
        setError('Tenant already exists. Please use a different email.')
        return
      }
      if (apiError) {
        setError(apiError)
        return
      }
      if (status && status >= 400) {
        setError('Unable to send OTP')
        return
      }

      showToast({ message: 'OTP sent successfully', variant: 'default' })
      onContinueEmail()
    } catch (e: any) {
      setError(e?.message ?? 'Unable to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onError: () =>
      setError("We couldn't create your account with Google. Please try again."),
    onSuccess: async (tokenResponse) => {
      try {
        setError(null)
        setLoading(true)

        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        )
        const profile = await res.json()
        const gEmail: string = profile.email
        const fullName: string = profile.name ?? ''
        const givenName: string = profile.given_name ?? ''
        const familyName: string = profile.family_name ?? ''

        if (!gEmail) throw new Error('No email returned from Google')

        const firstName = givenName || fullName.split(' ')[0] || ''
        const lastName =
          familyName || fullName.split(' ').slice(1).join(' ') || ''

        resetSignUpUserData()
        setSignUpUserData({
          email: gEmail,
          firstName,
          lastName,
          licenseType: '3',
          loginType: 'GOOGLE',
          organisation: '',
          password: '',
        })

        const { error: otpError, status: otpStatus } =
          await apiRouter.sendMailOTP({ email: gEmail, requiredOTP: false })

        if (otpStatus === 409) {
          setError('Tenant already exists. Please use a different email.')
          return
        }
        if (otpError) {
          setError(otpError)
          return
        }

        void navigate({ to: '/reset-password' })
      } catch (e: any) {
        setError(e?.message ?? 'Google sign-up failed')
      } finally {
        setLoading(false)
      }
    },
  })

  const handleMicrosoftSignUp = async () => {
    try {
      setError(null)
      setLoading(true)

      const loginResponse = await msalInstance.loginPopup({
        loginHint: email || undefined,
        scopes: ['user.read'],
      })

      const account = loginResponse.account
      const msEmail = account?.username || ''
      const displayName = account?.name || ''
      if (!msEmail) throw new Error('No email returned from Microsoft')

      const firstName = displayName.split(' ')[0] || ''
      const lastName = displayName.split(' ').slice(1).join(' ') || ''

      resetSignUpUserData()
      setSignUpUserData({
        email: msEmail,
        firstName,
        lastName,
        licenseType: '3',
        loginType: 'MICROSOFT',
        organisation: '',
        password: '',
      })

      const { error: otpError, status: otpStatus } =
        await apiRouter.sendMailOTP({ email: msEmail, requiredOTP: false })

      if (otpStatus === 409) {
        setError('Tenant already exists. Please use a different email.')
        return
      }
      if (otpError) {
        setError(otpError)
        return
      }

      void navigate({ to: '/reset-password' })
    } catch (e: any) {
      console.error(e)
      const errorMsg = e?.message || ''
      if (
        errorMsg.includes('user_cancelled') ||
        errorMsg.includes('User cancelled the flow')
      ) {
        setError("We couldn't create your account with Microsoft. Please try again.")
      } else {
        setError(errorMsg || 'Microsoft sign-up failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void handleEmailSendOtp()
  }

  return (
    <AuthHeroShell>
      <form className='flex flex-col' onSubmit={handleSubmit}>
        <AuthUserAvatar />
        <h2 className='text-center text-16 font-semibold text-text-primary'>
          Create your account
        </h2>
        <p className='mt-1.5 text-center text-12 text-text-muted'>
          Sign up to start managing your workspace
        </p>

        <div className='mt-5 grid grid-cols-2 gap-2.5'>
          <AppButton
            className='min-h-11 gap-2 text-12'
            disabled={loading}
            leadingIcon={<GoogleMark />}
            type='button'
            variant='outline'
            onClick={() => googleLogin()}
          >
            Google
          </AppButton>
          <AppButton
            className='min-h-11 gap-2 text-12'
            disabled={loading}
            leadingIcon={<MicrosoftMark />}
            type='button'
            variant='outline'
            onClick={() => void handleMicrosoftSignUp()}
          >
            Microsoft
          </AppButton>
        </div>

        <div className='my-4 flex items-center gap-3'>
          <div className='h-px flex-1 bg-border-default' />
          <span className='text-12 font-medium text-text-muted'>Or</span>
          <div className='h-px flex-1 bg-border-default' />
        </div>

        <AppInput
          autoComplete='email'
          label='Email'
          leadingIcon={<Icon className='size-4' name='Mail' />}
          name='email'
          placeholder='hello@ezofis.com'
          type='email'
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
        />

        {error ? (
          <p className='mt-3 rounded-xl bg-red-2 px-3 py-2 text-12 text-error-main'>
            {error}
          </p>
        ) : null}

        <AppButton
          className='mt-4 min-h-12 text-14'
          fullWidth
          loading={loading}
          type='submit'
        >
          Continue
        </AppButton>

        <p className='mt-5 text-center text-12 text-text-muted'>
          Already have an account?{' '}
          <Link
            className='font-semibold text-accent-primary transition-opacity hover:opacity-90'
            to='/sign-in'
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthHeroShell>
  )
}
