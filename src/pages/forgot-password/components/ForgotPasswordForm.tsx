import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputText from '@/components/base/inputs/InputText'
import AuthTitle from '@/layouts/auth/components/AuthTitle'

interface Props {
  email: string
  setEmail: (value: string) => void
  onChangeView: () => void
}

const ForgotPasswordForm = ({ email, setEmail, onChangeView }: Props) => {
  const [loading, setLoading] = useState(false)

  const sendLink = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onChangeView()
    }, 1000)
  }

  return (
    <>
      <IconIllustrated icon='tabler:mail-share' />
      <AuthTitle
        description="Enter your email and we'll send you a 6-digit verification code."
        title='Forgot Password?'
      />

      <InputText
        leftSection={<Icon className='text-gray-8' name='tabler:mail' />}
        placeholder='hello@ezofis.com'
        value={email}
        onChange={setEmail}
      />

      <Button
        className='w-full justify-center'
        label='Send Link'
        loading={loading}
        onClick={sendLink}
      />
    </>
  )
}

ForgotPasswordForm.displayName = 'ForgotPasswordForm'
export default ForgotPasswordForm
