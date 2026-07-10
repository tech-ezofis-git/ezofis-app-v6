import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { apiRouter } from '@/api/apiRouter'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPin from '@/components/base/inputs/InputPin'
import Title from '@/components/base/Title'
import showToast from '@/components/base/toast/showToast'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import authUserStore from '@/stores/authUserStore'

interface Props {
  onBack?: () => void
}

const VerifyEmailForm = ({ onBack }: Props) => {
  const navigate = useNavigate()
  const { signUpUserData, setSignUpUserData } = authUserStore()

  const email = signUpUserData.email
  const loginType = String(signUpUserData.loginType || 'EZOFIS')

  const [loading, setLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { elapsed, resendLabel, resetTimer } = useResendTimer()
  const [otpValue, setOtpValue] = useState<string | number>('')

  const resendOtp = async () => {
    try {
      setError(null)
      if (!email) {
        setError('Email missing. Please restart signup.')
        return
      }

      setLoading(true)
      const { error } = await apiRouter.sendMailOTP({
        email,
        requiredOTP: true,
      })
      if (error) {
        setError('Failed to send OTP. Please try again.')
        return
      }
      resetTimer()
    } catch (e: any) {
      setError('Unable to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    try {
      setError(null)
      if (!email) {
        setError('Email missing. Please restart signup.')
        return
      }

      const otp = String(otpValue ?? '').trim()
      if (otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP')
        return
      }

      setVerifyLoading(true)
      const { data, error } = await apiRouter.verifyMailOTP({ email, otp })
      console.log(data, error)

      if (error || data !== 'Success') {
        setError('Invalid OTP. Please try again.')
        return
      }

      showToast({ message: 'OTP verified successfully', variant: 'success' })
      setSignUpUserData({ loginType: loginType || 'EZOFIS' })

      navigate({ to: '/reset-password' })
    } catch (e: any) {
      setError('OTP verification failed. Please try again.')
    } finally {
      setVerifyLoading(false)
    }
  }

  return (
    <>
      <IconIllustrated icon='lucide:mail-check' />
      <Title
        className='text-center'
        description={`We've sent a 6-digit verification code to ${email || ''}`}
        level={1}
        title='Verify your email'
      />

      <InputPin
        // label={`Please enter the OTP sent to '${email}'`}
        aria-label='One time code'
        inputMode='numeric'
        // placeholder='enter your otp'
        length={6}
        value={otpValue as string}
        autoFocus
        // maxLength={6}
        onChange={(v) => setOtpValue(v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') verifyOtp()
        }}
      />

      <Button
        className='w-full justify-center'
        label='Verify'
        loading={verifyLoading}
        onClick={verifyOtp}
      />

      {error && (
        <div className='text-red-500 mt-2 text-center text-sm'>{error}</div>
      )}

      <Button
        className='w-full justify-center'
        disabled={elapsed !== 0}
        label={elapsed !== 0 ? resendLabel : 'Resend OTP'}
        loading={loading}
        variant='ghost'
        onClick={resendOtp}
      />

      {onBack && (
        <Button
          className='w-full justify-center underline -mt-2'
          color='gray'
          label='Try with a different email'
          variant='ghost'
          onClick={onBack}
        />
      )}
    </>
  )
}

VerifyEmailForm.displayName = 'VerifyEmailForm'
export default VerifyEmailForm
