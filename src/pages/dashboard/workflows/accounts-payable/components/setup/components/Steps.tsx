import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
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
  {
    description: 'Invoice Capture',
    icon: 'tabler:file-upload',
    id: 1,
    label: 'Step 1',
  },
  {
    description: 'ERP & Import',
    icon: 'tabler:database',
    id: 2,
    label: 'Step 2',
  },
  {
    description: 'Connect Storage',
    icon: 'tabler:cloud',
    id: 3,
    label: 'Step 3',
  },
  {
    description: 'Review & Complete',
    icon: 'tabler:check',
    id: 4,
    label: 'Step 4',
  },
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
      // Changed h-full to flex-1 to work well within flex container
      className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >

      {/* Changed min-h-full to flex-1 to avoid overflow */}
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[240px_1fr]'>
        <AnimateSlideUp delay={0.2}>
          <div className='hidden h-full border-r border-gray-3 bg-gray-1/30 px-4 py-3 xl:block'>
            <Stepper
              active={step}
              orientation='vertical'
              steps={steps}
              setActive={setStep}
            />
          </div>
        </AnimateSlideUp>

        <div
          className='col-span-1 h-full w-full overflow-y-auto'
          ref={scrollContainerRef}
        >
          <div className='mr-auto ml-32 max-w-3xl pb-10'>
            <AnimatePresence initial={false} mode='wait'>
              {step === 0 && (
                <AnimateSlideUp delay={0.1} key='step-0'>
                  <StepOne />
                </AnimateSlideUp>
              )}
              {step === 1 && (
                <AnimateScale delay={0.1} key='step-1'>
                  <StepTwo />
                </AnimateScale>
              )}
              {step === 2 && (
                <AnimateBounce delay={0.1} key='step-2'>
                  <StepThree />
                </AnimateBounce>
              )}
              {step === 3 && (
                <AnimateFadeIn delay={0.1} key='step-3'>
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
