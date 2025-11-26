import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import onBoardingStore from '../store/onBoardingStore'

const StepFooter = () => {
  const navigate = useNavigate()
  const back = onBoardingStore((state) => state.back)
  const next = onBoardingStore((state) => state.next)
  const step = onBoardingStore((state) => state.step)
  const totalSteps = onBoardingStore((state) => state.totalSteps)

  const handleNext = () => {
    if (step === totalSteps) {
      navigate({ replace: true, to: '/' })
    }
    next()
  }

  return (
    <div className='flex items-center justify-end gap-2'>
      <Button
        color='gray'
        icon='tabler:arrow-left'
        label='Back'
        variant='outline'
        onClick={back}
      />
      <div className='flex-1' />

      {step > 1 && (
        <Button
          color='gray'
          label='Skip'
          variant='ghost'
          onClick={handleNext}
        />
      )}
      <Button
        label={step === totalSteps ? "Let's Go" : 'Continue'}
        suffixIcon='tabler:arrow-right'
        onClick={handleNext}
      />
    </div>
  )
}

StepFooter.displayName = 'StepFooter'
export default StepFooter
