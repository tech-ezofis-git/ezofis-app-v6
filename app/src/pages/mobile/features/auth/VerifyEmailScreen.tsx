import { useNavigate } from '@tanstack/react-router'
import { useRef, useState, type KeyboardEvent } from 'react'
import { apiRouter } from '@/api/apiRouter'
import showToast from '@/components/base/toast/showToast'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { AppButton } from '../../components/primitives/AppButton'
import { Icon } from '../../components/primitives/Icon'
import { AuthHeroShell } from './AuthHeroShell'

type VerifyEmailScreenProps = {
  onBack?: () => void
}

const OTP_LENGTH = 6

export function VerifyEmailScreen({ onBack }: VerifyEmailScreenProps) {
  const navigate = useNavigate()
  const { signUpUserData, setSignUpUserData } = authUserStore()
  const email = signUpUserData.email
  const loginType = String(signUpUserData.loginType || 'EZOFIS')

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const { elapsed, resendLabel, resetTimer } = useResendTimer()

  const otpValue = digits.join('')

  const setDigitAt = (index: number, value: string) => {
    const next = [...digits]
    next[index] = value
    setDigits(next)
    setError(null)
  }

  const handleChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '').slice(-1)
    setDigitAt(index, value)
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (event.key === 'Enter') {
      void verifyOtp()
    }
  }

  const handlePaste = (raw: string) => {
    const chars = raw.replace(/\D/g, '').slice(0, OTP_LENGTH).split('')
    if (!chars.length) return
    const next = Array(OTP_LENGTH).fill('')
    chars.forEach((c, i) => {
      next[i] = c
    })
    setDigits(next)
    const focusIndex = Math.min(chars.length, OTP_LENGTH - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  const resendOtp = async () => {
    try {
      setError(null)
      if (!email) {
        setError(
          "We couldn't find your email address. Please start the sign-up process again.",
        )
        return
      }

      setLoading(true)
      const { error: apiError } = await apiRouter.sendMailOTP({
        email,
        requiredOTP: true,
      })
      if (apiError) {
        setError('Failed to send OTP. Please try again.')
        return
      }
      resetTimer()
      showToast({ message: 'OTP resent', variant: 'default' })
    } catch {
      setError('Unable to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    try {
      setError(null)
      if (!email) {
        setError(
          "We couldn't find your email address. Please start the sign-up process again.",
        )
        return
      }

      const otp = otpValue.trim()
      if (otp.length !== OTP_LENGTH) {
        setError('Please enter the 6-digit verification code sent to your email.')
        return
      }

      setVerifyLoading(true)
      const { data, error: apiError } = await apiRouter.verifyMailOTP({
        email,
        otp,
      })

      if (apiError || data !== 'Success') {
        setError('Invalid OTP. Please try again.')
        return
      }

      showToast({ message: 'OTP verified successfully', variant: 'success' })
      setSignUpUserData({ loginType: loginType || 'EZOFIS' })
      void navigate({ to: '/reset-password' })
    } catch {
      setError('OTP verification failed. Please try again.')
    } finally {
      setVerifyLoading(false)
    }
  }

  return (
    <AuthHeroShell>
      {onBack ? (
        <button
          className='mb-4 inline-flex items-center gap-1.5 text-12 font-medium text-text-secondary'
          type='button'
          onClick={onBack}
        >
          <Icon className='size-3.5' name='ChevronLeft' />
          Try a different email
        </button>
      ) : null}

      <div className='mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-primary'>
        <Icon className='size-7' name='MailCheck' />
      </div>

      <h2 className='text-center text-16 font-semibold text-text-primary'>
        Verify your email
      </h2>
      <p className='mt-1.5 text-center text-12 text-text-muted'>
        We&apos;ve sent a 6-digit code to{' '}
        <span className='font-medium text-text-secondary'>{email || '—'}</span>
      </p>

      <div className='mt-6 flex justify-between gap-2'>
        {digits.map((digit, index) => (
          <input
            aria-label={`Digit ${index + 1}`}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            className={cn(
              'size-11 rounded-xl border border-border-default bg-surface-muted text-center text-16 font-semibold text-text-primary outline-none transition-all',
              'focus:border-border-focus focus:bg-surface-primary focus:ring-2 focus:ring-accent-soft',
            )}
            inputMode='numeric'
            key={index}
            maxLength={1}
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => {
              event.preventDefault()
              handlePaste(event.clipboardData.getData('text'))
            }}
          />
        ))}
      </div>

      {error ? (
        <p className='mt-3 rounded-xl bg-red-2 px-3 py-2 text-center text-12 text-error-main'>
          {error}
        </p>
      ) : null}

      <AppButton
        className='mt-5 min-h-12 text-14'
        fullWidth
        loading={verifyLoading}
        type='button'
        onClick={() => void verifyOtp()}
      >
        Verify
      </AppButton>

      <AppButton
        className='mt-2'
        disabled={elapsed !== 0}
        fullWidth
        loading={loading}
        type='button'
        variant='ghost'
        onClick={() => void resendOtp()}
      >
        {elapsed !== 0 ? resendLabel : 'Resend OTP'}
      </AppButton>
    </AuthHeroShell>
  )
}
