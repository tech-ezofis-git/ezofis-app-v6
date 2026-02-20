import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Stepper from '@/components/base/Stepper'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import setupStore from '../../../stores/useSetupStore'
import StepFour from './steps/step-four/StepFour'
import StepOne from './steps/step-one/StepOne'
import StepThree from './steps/step-three/StepThree'
import StepTwo from './steps/step-two/StepTwo'
// import StepZero from './steps/StepZero'

const steps = [
  { description: 'Invoice Capture', id: 1, icon: 'tabler:file-upload', label: 'Step 1' },
  { description: 'ERP & Import', id: 2, icon: 'tabler:database', label: 'Step 2' },
  { description: 'Connect Storage', id: 3, icon: 'tabler:cloud', label: 'Step 3' },
  { description: 'Review & Complete', id: 4, icon: 'tabler:check', label: 'Step 4' },
]

const Steps = () => {
  const step = setupStore((state) => state.step)
  const setStep = setupStore((state) => state.setStep)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to top of step content when step changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        behavior: 'smooth',
        top: 0,
      })
    }
  }, [step])

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      // Changed h-full to flex-1 to work well within flex container
      className='flex flex-1 min-h-0 w-full flex-col overflow-hidden'
    >
      <div className='mb-4 flex items-center justify-between border-b border-gray-3 px-6 py-3 md:px-8 shrink-0'>
        <div className='flex flex-col gap-0.5'>
          <h2 className='text-18 font-semibold text-gray-13'>
            Accounts Payable Setup
          </h2>
          <p className='text-13 text-gray-11'>
            Configure your integrations and settings
          </p>
        </div>
      </div>
      {/* Changed min-h-full to flex-1 to avoid overflow */}
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[240px_1fr]'>

        <AnimateSlideUp delay={0.2}>
          <div className='hidden border-r border-gray-3 bg-gray-1/30 px-4 py-3 xl:block h-full'>
            <Stepper
              active={step}
              orientation='vertical'
              steps={steps}
              setActive={setStep}
            />
          </div>
        </AnimateSlideUp>

        <div ref={scrollContainerRef} className='col-span-1 h-full w-full overflow-y-auto'>
          <div className='ml-32 mr-auto max-w-3xl pb-10'>
            <AnimatePresence initial={false} mode='wait'>
              {step === 0 && (
                <AnimateSlideUp key='step-0' delay={0.1}>
                  <StepOne />
                </AnimateSlideUp>
              )}
              {step === 1 && (
                <AnimateScale key='step-1' delay={0.1}>
                  <StepTwo />
                </AnimateScale>
              )}
              {step === 2 && (
                <AnimateBounce key='step-2' delay={0.1}>
                  <StepThree />
                </AnimateBounce>
              )}
              {step === 3 && (
                <AnimateFadeIn key='step-3' delay={0.1}>
                  <StepFour />
                </AnimateFadeIn>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

Steps.displayName = 'Steps'
export default Steps