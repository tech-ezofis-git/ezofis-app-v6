import Button from '@/components/base/button/Button'
import onBoardingStore from '../store/onBoardingStore'

const StepFooter = () => {
  const back = onBoardingStore((state) => state.back)
  const next = onBoardingStore((state) => state.next)
  const step = onBoardingStore((state) => state.step)
  const totalSteps = onBoardingStore((state) => state.totalSteps)

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
        <Button color='gray' label='Skip' variant='ghost' onClick={next} />
      )}
      <Button
        label={step === totalSteps ? "Let's Go" : 'Continue'}
        suffixIcon='tabler:arrow-right'
        onClick={next}
      />
    </div>
  )
}

StepFooter.displayName = 'StepFooter'
export default StepFooter
