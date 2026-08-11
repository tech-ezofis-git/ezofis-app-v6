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

const SendEmailForm = ({ email }: Props) => {
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
        description="We've sent a reset link to your email. Follow the instructions to set a new password."
        level={1}
        title='Check Your Email'
      />

      <InputText
        leftSection={<Icon className='text-gray-8' name='lucide:mail' />}
        value={email || 'charles@ezofis.com'}
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

SendEmailForm.displayName = 'SendEmailForm'
export default SendEmailForm
