import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import Stepper from '@/components/base/Stepper'
import {
  AnimateBounce,
  AnimateFadeIn,
  AnimateScale,
  AnimateSlideRight,
  AnimateSlideUp,
} from '@/components/common/animations'
import cn from '@/utils/cn'
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
  const isConnected = setupStore((state) => state.emailSettings.isConnected)
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

  const progress = Math.round(((step + 1) / steps.length) * 100)

  // Color mapping based on progress percentage
  const getProgressStyles = () => {
    if (progress <= 25)
      return { bg: 'bg-orange-9', label: 'Orange', text: 'text-orange-11' }
    if (progress <= 50)
      return { bg: 'bg-blue-9', label: 'Blue', text: 'text-blue-11' }
    if (progress <= 75)
      return { bg: 'bg-purple-9', label: 'Purple', text: 'text-purple-11' }
    return { bg: 'bg-green-9', label: 'Green', text: 'text-green-11' }
  }

  const { bg, text } = getProgressStyles()

  const formattedSteps = steps.map((s, idx) => ({
    ...s,
    // Allow clicking only if connected or it's the current step
    clickable: idx === 0 || isConnected,
    // Disable steps beyond Step 1 (index 0) if not connected
    disabled: idx > 0 && !isConnected,
  }))

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      // Changed h-full to flex-1 to work well within flex container
      className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <AnimateSlideRight delay={0.1}>
        <div className='mb-4 flex items-center justify-between border-b border-gray-3 px-6 py-3 md:px-8'>
          <div className='flex flex-col gap-0.5'>
            <h2 className='text-18 font-semibold text-gray-13'>
              Accounts Payable Setup
            </h2>
            <p className='text-13 text-gray-11'>
              Configure your integrations and settings
            </p>
          </div>

          <div className='flex items-center gap-4'>
            <div className='flex flex-col items-end gap-1'>
              <span
                className={cn(
                  'text-13 font-semibold transition-colors duration-500',
                  text,
                )}
              >
                {progress}% Complete
              </span>
              <div className='h-1.5 w-32 overflow-hidden rounded-full bg-gray-3'>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  className={cn('h-full transition-colors duration-500', bg)}
                  initial={{ width: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      </AnimateSlideRight>
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[240px_1fr]'>
        <AnimateSlideUp delay={0.2}>
          <div className='hidden h-full border-r border-gray-3 bg-gray-1/30 px-4 py-3 xl:block'>
            <Stepper
              active={step}
              orientation='vertical'
              steps={formattedSteps}
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
