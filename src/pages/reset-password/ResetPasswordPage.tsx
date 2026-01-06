import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Title from '@/components/base/Title'
import PasswordRequirements from '@/layouts/auth/components/PasswordRequirements'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate({ to: '/sign-in' })
    }, 1000)
  }

  return (
    <div className='flex flex-col gap-6'>
      <IconIllustrated icon='lucide:lock' />
      <Title
        className='text-center'
        description='Create a new password for your account.'
        level={1}
        title='Reset Password'
      />

      <div className='space-y-4'>
        <InputPassword
          label='Password'
          value={password}
          onChange={setPassword}
        />

        <PasswordRequirements password={password} />

        <InputPassword
          label='Confirm password'
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      <Button
        className='w-full justify-center'
        label='Reset Password'
        loading={loading}
        onClick={reset}
      />
    </div>
  )
}

ResetPasswordPage.displayName = 'ResetPasswordPage'
export default ResetPasswordPage
