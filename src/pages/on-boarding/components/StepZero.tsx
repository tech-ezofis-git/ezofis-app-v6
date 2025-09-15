import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import AuthTitle from '@/layouts/auth/components/AuthTitle'
import authUserStore from '@/stores/authUserStore'
import onBoardingStore from '../store/onBoardingStore'

const StepZero = () => {
  const authUser = authUserStore((state) => state.user)
  const setStep = onBoardingStore((state) => state.setStep)

  const handleNext = () => setStep(authUser.signUpMethod === 'email' ? 1 : 2)

  return (
    <>
      <IconIllustrated icon='solar:hand-shake-outline' />
      <AuthTitle
        description="We're excited to have you join us! To personalize your experience and help you get the most out of EZOFIS, we'd love to learn a bit about you. This will only take a few minutes."
        title='Welcome to EZOFIS!'
      />

      <div className='flex justify-center'>
        <Button
          label='Continue'
          suffixIcon='tabler:arrow-right'
          onClick={handleNext}
        />
      </div>
    </>
  )
}

StepZero.displayName = 'StepZero'
export default StepZero
