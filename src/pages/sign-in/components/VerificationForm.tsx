import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPin from '@/components/base/inputs/InputPin'
import Title from '@/components/base/Title'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import authUserStore from '@/stores/authUserStore'

const VerificationForm = () => {
  const navigate = useNavigate()
  const { user } = authUserStore()

  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const { elapsed, resendLabel, resetTimer } = useResendTimer(
    "Didn't receive the code? Resend",
  )
  const verificationMethod = user.profile.twoStepVerification.method

  const description = () => {
    const methods = {
      app: 'Enter the code from your authenticator app.',
      email: `We've sent a 6-digit code to ${user.email}.`,
      sms: `We've sent a 6-digit code to ${user.profile.phoneNumber}.`,
    }

    return methods[verificationMethod]
  }

  const verifyCode = () => {
    navigate({ replace: true, to: '/' })
  }

  const resendLink = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      resetTimer()
    }, 1000)
  }

  return (
    <>
      <IconIllustrated icon='lucide:shield' />
      <Title
        className='text-center'
        description={description()}
        level={1}
        title='Two-Step Verification'
      />

      <InputPin length={6} placeholder='0' value={code} onChange={setCode} />

      <div className='space-y-2'>
        <Button
          className='w-full justify-center'
          label='Verify'
          onClick={verifyCode}
        />

        {verificationMethod !== 'app' && (
          <Button
            className='w-full justify-center underline'
            color='gray'
            disabled={elapsed !== 0}
            label={resendLabel}
            loading={loading}
            variant='ghost'
            onClick={resendLink}
          />
        )}
      </div>
    </>
  )
}

VerificationForm.displayName = 'VerificationForm'
export default VerificationForm
