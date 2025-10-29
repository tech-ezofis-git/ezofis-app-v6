import { useState } from 'react'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import PasswordRequirements from '@/layouts/auth/components/PasswordRequirements'
import onBoardingStore from '../store/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const StepOne = () => {
  const password = onBoardingStore((state) => state.password)
  const setPassword = onBoardingStore((state) => state.setPassword)
  const [confirmPassword, setConfirmPassword] = useState('')

  return (
    <>
      <StepHeader
        description="Let's create a strong password to keep your account safe."
        icon='tabler:lock'
        title='Secure Your Account'
      />

      <div className='space-y-4'>
        <InputPassword
          label='Password'
          size='lg'
          value={password}
          onChange={setPassword}
        />

        <PasswordRequirements password={password} />

        <InputPassword
          label='Confirm password'
          size='lg'
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      <StepFooter />
    </>
  )
}

StepOne.displayName = 'StepOne'
export default StepOne
