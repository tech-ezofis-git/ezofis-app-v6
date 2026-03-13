import { useMsal } from '@azure/msal-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import authApi from '@/api/auth'
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

interface Props {
  email: string
  setEmail: (value: string) => void
  onChangeView: () => void // OTP view switcher (only for email)
}

const SignUpForm = ({ email, setEmail, onChangeView }: Props) => {
  const navigate = useNavigate()
  const { instance: msalInstance } = useMsal()

  const { resetSignUpUserData, setSignUpUserData } = authUserStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSendOtp = async () => {
    try {
      setError(null)
      if (!email) {
        setError('Email is required')
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
      const { error, status } = await authApi.sendMailOTP({
        email,
        requiredOTP: true,
      })

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
    onError: () => setError('Google sign-up was cancelled or failed'),
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
        await authApi.sendMailOTP({ email: gEmail, requiredOTP: false })

        // skip verify screen
        navigate({ to: '/reset-password' })
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
      await authApi.sendMailOTP({ email: msEmail, requiredOTP: false })

      navigate({ to: '/reset-password' })
    } catch (e: any) {
      setError(e?.message ?? 'Microsoft sign-up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <IconIllustrated icon='tabler:user-plus' />
      <Title
        description='Sign up to start managing your workspace.'
        level={1}
        title='Create Your Account'
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
        placeholder='hello@ezofis.com'
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
          label='Send OTP'
          loading={loading}
          onClick={handleEmailSendOtp}
        />

        {error && (
          <div className='text-red-500 text-center text-sm'>{error}</div>
        )}
      </div>
    </>
  )
}

SignUpForm.displayName = 'SignUpForm'
export default SignUpForm
