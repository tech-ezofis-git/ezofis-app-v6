import { Trans } from '@lingui/react/macro'
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import Stepper from '@/components/base/Stepper'
import AnimateEntranceSlideLeft from '@/components/common/animations/AnimateEntranceSlideLeft'
import setupStore from '../../../stores/useSetupStore'
import StepFour from './steps/step-four/StepFour'
import StepOne from './steps/step-one/StepOne'
import StepThree from './steps/step-three/StepThree'
import StepTwo from './steps/step-two/StepTwo'
// import StepZero from './steps/StepZero'

const steps = [
  { description: 'Connect Email', id: 1, icon: 'tabler:mail', label: 'Step 1' },
  { description: 'Connect ERP System', id: 2, icon: 'tabler:database', label: 'Step 2' },
  { description: 'Connect Document Storage', id: 3, icon: 'tabler:cloud', label: 'Step 3' },
  { description: 'Review & Finish', id: 4, icon: 'tabler:check', label: 'Step 4' },
]

const Steps = () => {
  const step = setupStore((state) => state.step)
  const setStep = setupStore((state) => state.setStep)
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)
  const stepContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to top of step content when step changes
    if (stepContentRef.current) {
      stepContentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [step])

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className='flex min-h-[calc(100vh-200px)] w-full flex-col'
    >
      <div className='mb-6 flex items-center justify-between border-b border-gray-3 px-6 py-4 md:px-8'>
        <div className='flex flex-col gap-1'>
          <h2 className='text-18 font-semibold text-gray-13'>
            Accounts Payable Setup
          </h2>
          <p className='text-13 text-gray-11'>
            Configure your integrations and settings
          </p>
        </div>
        <button
          className='flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-4 bg-surface px-4 py-2 text-14 font-medium text-gray-11 transition-colors hover:border-gray-5 hover:bg-gray-2 hover:text-gray-12'
          onClick={() => setIsSetupStarted(false)}
          type='button'
        >
          <span>
            <Trans>Skip for now</Trans>
          </span>
          <Icon className='size-4' name='tabler:arrow-right' />
        </button>
      </div>
      <div className='grid min-h-full grid-cols-1 gap-6 xl:grid-cols-[auto_1fr] xl:gap-0'>

        <div className='hidden border-r border-gray-3 px-8 py-6 xl:block'>
          <Stepper
            active={step}
            orientation='vertical'
            steps={steps}
            setActive={setStep}
          />
        </div>

        <div className='col-span-1 h-full w-full overflow-y-auto'>
          <div ref={stepContentRef} className='mx-auto max-w-4xl'>
            <AnimatePresence initial={false} mode='wait'>
              <AnimateEntranceSlideLeft className='w-full' key={step}>
                {/* {step === -1 && <StepZero />} */}
                {step === 0 && <StepOne />}
                {step === 1 && <StepTwo />}
                {step === 2 && <StepThree />}
                {step === 3 && <StepFour />}
              </AnimateEntranceSlideLeft>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

Steps.displayName = 'Steps'
export default Steps