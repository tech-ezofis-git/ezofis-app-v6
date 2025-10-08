import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import GoogleButton from '@/components/base/button/GoogleButton'
import MicrosoftButton from '@/components/base/button/MicrosoftButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import HeroText from '@/components/common/HeroText'
import authUserStore from '@/stores/authUserStore'

interface Props {
  onChangeView: () => void
}

const SignInForm = ({ onChangeView }: Props) => {
  const navigate = useNavigate()
  const { user } = authUserStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)

      if (user.profile.twoStepVerification.enabled) {
        onChangeView()
      } else {
        navigate({ replace: true, to: '/' })
      }
    }, 1000)
  }

  const forgotPassword = () => navigate({ to: '/forgot-password' })

  return (
    <>
      <IconIllustrated icon='tabler:user' />
      <HeroText
        description='Sign in to continue managing your workspace.'
        title='Welcome Back'
      />

      <div className='space-y-3'>
        <GoogleButton onClick={() => {}} />
        <MicrosoftButton onClick={() => {}} />
      </div>

      <Divider label='Or' />

      <div className='-mt-2 space-y-4'>
        <InputText
          label='Email'
          leftSection={<Icon className='text-gray-8' name='tabler:mail' />}
          placeholder='hello@ezofis.com'
          value={email}
          onChange={setEmail}
        />
        <InputPassword
          label='Password'
          leftSection={<Icon className='text-gray-8' name='tabler:lock' />}
          value={password}
          showPlaceholder
          onChange={setPassword}
        />
      </div>

      <div className='flex items-center justify-between gap-4'>
        <InputCheckbox label='Keep me logged in' labelClassName='text-gray' />

        <div
          className='cursor-pointer text-gray-11 underline hover:text-gray-12'
          onClick={forgotPassword}
        >
          Forgot password?
        </div>
      </div>

      <Button
        className='w-full justify-center'
        label='Sign In'
        loading={loading}
        onClick={signIn}
      />
    </>
  )
}

SignInForm.displayName = 'SignInForm'
export default SignInForm
