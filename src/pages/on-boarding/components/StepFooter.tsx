import Button from '@/components/base/button/Button'
import onBoardingStore from '../stores/onBoardingStore'

interface Props {
  disabled?: boolean
  loading?: boolean
  onNext?: () => Promise<void> | void
}

const StepFooter = ({ disabled, loading, onNext }: Props) => {
  const back = onBoardingStore((state) => state.back)
  const next = onBoardingStore((state) => state.next)
  const step = onBoardingStore((state) => state.step)
  const totalSteps = onBoardingStore((state) => state.totalSteps)

  const handleNext = async () => {
    if (onNext) {
      await onNext()
      return
    }
    next()
  }

  return (
    <div className='flex items-center justify-end gap-2'>
      {step > 1 && (
        <Button
          color='gray'
          icon='lucide:arrow-left'
          label='Back'
          variant='outline'
          onClick={back}
        />
      )}
      <div className='flex-1' />

      {step < totalSteps && (
        <Button
          color='gray'
          label='Skip'
          variant='ghost'
          onClick={handleNext}
        />
      )}
      <Button
        disabled={disabled}
        label={step === totalSteps ? "Let's Go" : 'Continue'}
        loading={loading}
        suffixIcon='lucide:arrow-right'
        onClick={handleNext}
      />
    </div>
  )
}

StepFooter.displayName = 'StepFooter'
export default StepFooter
