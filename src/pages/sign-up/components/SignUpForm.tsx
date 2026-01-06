import { useState } from 'react'
import Button from '@/components/base/button/Button'
import GoogleButton from '@/components/base/button/GoogleButton'
import MicrosoftButton from '@/components/base/button/MicrosoftButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputText from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'

interface Props {
  email: string
  setEmail: (value: string) => void
  onChangeView: () => void
}

const SignUpForm = ({ email, setEmail, onChangeView }: Props) => {
  const [loading, setLoading] = useState(false)

  const signUp = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onChangeView()
    }, 1000)
  }

  return (
    <>
      <IconIllustrated icon='lucide:user-plus' />
      <Title
        className='text-center'
        description='Sign up to start managing your workspace.'
        level={1}
        title='Create Your Account'
      />

      <div className='space-y-3'>
        <GoogleButton onClick={() => {}} />
        <MicrosoftButton onClick={() => {}} />
      </div>

      <Divider label='Or' />

      <InputText
        className='-mt-2'
        label='Email'
        leftSection={<Icon className='text-gray-9' name='lucide:mail' />}
        placeholder='hello@ezofis.com'
        value={email}
        onChange={setEmail}
      />

      <div className='space-y-3'>
        <Button
          className='w-full justify-center'
          label='Sign Up'
          loading={loading}
          onClick={signUp}
        />

        <div className='text-center text-xs leading-5 text-pretty text-gray-10'>
          By signing up, you agree to our{' '}
          <span className='cursor-pointer font-medium text-gray-11 underline'>
            Terms of Service
          </span>{' '}
          and{' '}
          <span className='cursor-pointer font-medium text-gray-11 underline'>
            Privacy Policy
          </span>
        </div>
      </div>
    </>
  )
}

SignUpForm.displayName = 'SignUpForm'
export default SignUpForm
