import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputText from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'

interface Props {
  email: string
}

const VerifyEmailForm = ({ email }: Props) => {
  const [loading, setLoading] = useState(false)
  const { elapsed, resendLabel, resetTimer } = useResendTimer()

  const resendLink = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      resetTimer()
    }, 1000)
  }

  return (
    <>
      <IconIllustrated icon='lucide:mail-check' />
      <Title
        className='text-center'
        description="We've sent you a verification link. Open your inbox and confirm your email to continue."
        level={1}
        title='Verify Your Email'
      />

      <InputText
        leftSection={<Icon className='text-gray-9' name='lucide:mail' />}
        value={email}
        disabled
        onChange={() => {}}
      />

      <Button
        className='w-full justify-center'
        disabled={elapsed !== 0}
        label={resendLabel}
        loading={loading}
        onClick={resendLink}
      />
    </>
  )
}

VerifyEmailForm.displayName = 'VerifyEmailForm'
export default VerifyEmailForm
