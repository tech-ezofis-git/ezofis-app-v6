import { Progress } from '@mantine/core'
import onBoardingStore from '../stores/onBoardingStore'

const StepIndicator = () => {
  const step = onBoardingStore((state) => state.step)
  const totalSteps = onBoardingStore((state) => state.totalSteps)

  const progress = Math.round((step / totalSteps) * 100)

  return (
    <Progress
      className='absolute top-0 left-0 w-full bg-surface'
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
