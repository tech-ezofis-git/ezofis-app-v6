import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import authApi from '@/api/auth'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPin from '@/components/base/inputs/InputPin'
import Title from '@/components/base/Title'
import showToast from '@/components/base/toast/showToast'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import authUserStore from '@/stores/authUserStore'

const VerifyEmailForm = () => {
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
      const { error } = await authApi.sendMailOTP({
        email,
        requiredOTP: true,
      })
      if (error) {
        setError(error)
        return
      }
      resetTimer()
    } catch (e: any) {
      setError(e?.message ?? 'Unable to resend OTP')
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
      const { data, error } = await authApi.verifyMailOTP({ email, otp })
      // console.log(data)

      // if (error) {
      //   setError(error)
      //   return
      // }

      console.log(data, error)
      if (data == 'Success') {
        showToast({ message: 'OTP verified successfully', variant: 'success' })
        setSignUpUserData({ loginType: loginType || 'EZOFIS' })

        navigate({ to: '/reset-password' })
      }
      // upgrade the signup type (still NORMAL)
    } catch (e: any) {
      setError(e?.message ?? 'OTP verification failed')
    } finally {
      setVerifyLoading(false)
    }
  }

  return (
    <>
      <IconIllustrated icon='lucide:mail-check' />
      <Title
        className='text-center'
        description='Enter the OTP to continue.'
        level={1}
        title='Verify Your Email'
      />

      <InputPin
        // label={`Please enter the OTP sent to '${email}'`}
        aria-label='One time code'
        inputMode='numeric'
        // placeholder='enter your otp'
        length={6}
        value={otpValue as string}
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
    </>
  )
}

VerifyEmailForm.displayName = 'VerifyEmailForm'
export default VerifyEmailForm
