import type { NavigateOptions } from '@tanstack/react-router'
import { useMsal } from '@azure/msal-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { apiRouter } from '@/api/apiRouter'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import GoogleButton from '@/components/base/button/GoogleButton'
import MicrosoftButton from '@/components/base/button/MicrosoftButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputText from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'
import showToast from '@/components/base/toast/showToast'
import authUserStore from '@/stores/authUserStore'
import { resolveAuthPath, useIsWhiteLabel } from '@/utils/whiteLabel'

interface Props {
  email: string
  setEmail: (value: string) => void
  onChangeView: () => void // OTP view switcher (only for email)
}

const SignUpForm = ({ email, setEmail, onChangeView }: Props) => {
  const navigate = useNavigate()
  const isWhiteLabel = useIsWhiteLabel()
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

      // reset prior signup context (optional but clean)
      resetSignUpUserData()

      // write to store
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
      const { error, status } = await apiRouter.sendMailOTP({
        email,
        requiredOTP: true,
      })

      if (status === 409) {
        setError('Tenant is already exists, Please change the Email for signup')
        return
      }
      if (error) {
        setError(error)
        return
      }
      if (status && status >= 400) {
        setError('Unable to send OTP')
        return
      }
      showToast({ message: 'OTP sent successfully', variant: 'default' })

      onChangeView() // show OTP screen only for email signup
    } catch (e: any) {
      setError(e?.message ?? 'Unable to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Google signup: no OTP view
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

        // derive names smartly (future-proof)
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

        // OPTIONAL: call sendMailOTP with requiredOTP false (you asked for it earlier)
        const { error: otpError, status: otpStatus } =
          await apiRouter.sendMailOTP({ email: gEmail, requiredOTP: false })

        if (otpStatus === 409) {
          setError(
            'Tenant is already exists, Please change the Email for signup',
          )
          return
        }
        if (otpError) {
          setError(otpError)
          return
        }

        // skip verify screen
        navigate({
          to: resolveAuthPath(
            '/reset-password',
            isWhiteLabel,
          ) as NavigateOptions['to'],
        })
      } catch (e: any) {
        setError(e?.message ?? 'Google sign-up failed')
      } finally {
        setLoading(false)
      }
    },
  })

  const handleGoogleSignUp = () => googleLogin()

  // ✅ Microsoft signup: no OTP view
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

      // OPTIONAL: call sendMailOTP with requiredOTP false
      const { error: otpError, status: otpStatus } =
        await apiRouter.sendMailOTP({ email: msEmail, requiredOTP: false })

      if (otpStatus === 409) {
        setError('Tenant is already exists, Please change the Email for signup')
        return
      }
      if (otpError) {
        setError(otpError)
        return
      }

      navigate({ to: '/reset-password' })
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

  return (
    <>
      <IconIllustrated icon='tabler:user-plus' />
      <Title
        className='text-center'
        description='Sign up to start managing your workspace'
        level={1}
        title='Create your account'
      />

      <div className='space-y-3'>
        <GoogleButton onClick={handleGoogleSignUp} />
        <MicrosoftButton onClick={handleMicrosoftSignUp} />
      </div>

      <Divider label='Or' />

      <InputText
        className='-mt-2'
        label='Email'
        leftSection={<Icon className='text-gray-9' name='lucide:mail' />}
        placeholder={`${isWhiteLabel ? "hello@exmaple.com" : "hello@ezofis.com"}`}
        value={email}
        onChange={(v) => {
          setEmail(v)
          setError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleEmailSendOtp()
        }}
      />

      <div className='space-y-3'>
        <Button
          className='w-full justify-center'
          label='Continue'
          loading={loading}
          onClick={handleEmailSendOtp}
        />

        {error && <Alert className='mt-2' text={error} variant='primary' />}
      </div>
    </>
  )
}

SignUpForm.displayName = 'SignUpForm'
export default SignUpForm
