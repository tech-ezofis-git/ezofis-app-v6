import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPin from '@/components/base/inputs/InputPin'
import Title from '@/components/base/Title'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import authUserStore from '@/stores/authUserStore'

const VerificationForm = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { user } = authUserStore()

  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const { elapsed, resendLabel, resetTimer } = useResendTimer(
    t`Didn't receive the code? Resend`,
  )
  const verificationMethod = user.profile.twoStepVerification.method

  const description = () => {
    const methods = {
      app: t`Enter the code from your authenticator app.`,
      email: t`We've sent a 6-digit code to ${user.email}.`,
      sms: t`We've sent a 6-digit code to ${user.profile.phoneNumber}.`,
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
        title={t`Two-Step Verification`}
      />

      <InputPin
        length={6}
        placeholder='0'
        value={code}
        autoFocus
        onChange={setCode}
      />

      <div className='space-y-2'>
        <Button
          className='w-full justify-center'
          label={t`Verify`}
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
