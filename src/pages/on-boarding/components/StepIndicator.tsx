import { Progress } from '@mantine/core'
import authUserStore from '@/stores/authUserStore'
import onBoardingStore from '../store/onBoardingStore'

const StepIndicator = () => {
  const authUser = authUserStore((state) => state.user)
  const step = onBoardingStore((state) => state.step)
  const totalSteps = onBoardingStore((state) => state.totalSteps)
  const newStep = authUser.signUpMethod === 'email' ? step : step - 1
  const newTotalSteps =
    authUser.signUpMethod === 'email' ? totalSteps : totalSteps - 1

  const progress = Math.round((newStep / newTotalSteps) * 100)

  return (
    <Progress
      className='absolute top-0 left-0 w-full bg-gray-1'
      value={progress}
      animated
      classNames={{
        root: 'h-1.5 rounded-none',
        section: 'h-1.5 rounded-none',
      }}
    />
  )
}

StepIndicator.displayName = 'StepIndicator'
export default StepIndicator
