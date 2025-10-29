import { AnimatePresence } from 'motion/react'
import Stepper from '@/components/base/Stepper'
import AnimateEntranceSlideLeft from '@/components/common/animations/AnimateEntranceSlideLeft'
import setupStore from '../../../stores/useSetupStore'
import StepFour from './steps/step-four/StepFour'
import StepOne from './steps/step-one/StepOne'
import StepThree from './steps/step-three/StepThree'
import StepTwo from './steps/step-two/StepTwo'
import StepZero from './steps/StepZero'

const steps = [
  { description: 'Overview', id: 1, label: 'Step 1' },
  { description: 'Connect Email', id: 2, label: 'Step 2' },
  { description: 'Connect ERP System', id: 3, label: 'Step 3' },
  { description: 'Connect Document Storage', id: 4, label: 'Step 4' },
  { description: 'Review & Finish', id: 5, label: 'Step 5' },
]

const Steps = () => {
  const isSetupStarted = setupStore((state) => state.isSetupStarted)
  const step = setupStore((state) => state.step)
  const setStep = setupStore((state) => state.setStep)

  if (isSetupStarted) {
    return (
      <div className='grid min-h-full grid-cols-1 gap-6 xl:grid-cols-[auto_1fr] xl:gap-0'>
        <div className='hidden border-r border-gray-3 px-8 py-6 xl:block'>
          <Stepper
            active={step}
            orientation='vertical'
            steps={steps}
            setActive={setStep}
          />
        </div>

        <div className='col-span-1'>
          <AnimatePresence initial={false} mode='wait'>
            <AnimateEntranceSlideLeft className='h-full' key={step}>
              {step === 0 && <StepZero />}
              {step === 1 && <StepOne />}
              {step === 2 && <StepTwo />}
              {step === 3 && <StepThree />}
              {step === 4 && <StepFour />}
            </AnimateEntranceSlideLeft>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return null
}

Steps.displayName = 'Steps'
export default Steps
