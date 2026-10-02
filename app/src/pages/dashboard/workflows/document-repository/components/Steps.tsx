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
import useDmsSetupStore from '../stores/useDmsSetupStore'
import ConfigureFieldsStep from './steps/ConfigureFieldsStep'
import FolderSetupStep from './steps/FolderSetupStep'
import ReviewLaunchStep from './steps/ReviewLaunchStep'
import StorageStep from './steps/StorageStep'

const steps = [
  {
    description: "Tell us what it's for",
    icon: 'tabler:folder',
    id: 1,
    label: 'Folder Basics',
  },
  {
    description: 'Set up document fields',
    icon: 'tabler:list-details',
    id: 2,
    label: 'Configure Fields',
  },
  {
    description: 'Choose where files are stored',
    icon: 'tabler:cloud',
    id: 3,
    label: 'Choose Storage',
  },
  {
    description: 'Check and complete',
    icon: 'tabler:rocket',
    id: 4,
    label: 'Review and Finish',
  },
]

const getSetupProgress = (state: {
  fields?: unknown[]
  folderName?: string
  isSetupCompleted?: boolean
  step?: number
  storageConnectorId?: string | null
  storageProviderCode?: string
}) => {
  if (state?.isSetupCompleted) return 100

  const currentStep = Math.max(0, Math.min(state?.step ?? 0, steps.length - 1))
  const configured = [
    Boolean(state?.folderName?.trim()),
    Array.isArray(state?.fields) && state.fields.length > 0,
    Boolean(state?.storageProviderCode),
  ]

  if (currentStep === 3) {
    const priorReady = configured.every(Boolean)
    return priorReady ? 90 : 75
  }

  let completed = 0
  for (let i = 0; i <= currentStep && i < configured.length; i += 1) {
    if (configured[i]) completed += 1
  }

  return Math.round((completed / steps.length) * 100)
}

const DocumentRepositorySteps = () => {
  const step = useDmsSetupStore((state) => state.step)
  const setStep = useDmsSetupStore((state) => state.setStep)
  const progress = useDmsSetupStore(getSetupProgress)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        behavior: 'smooth',
        top: 0,
      })
    }
  }, [step])

  const getProgressStyles = () => {
    if (progress <= 25) return { bg: 'bg-orange-9', text: 'text-orange-11' }
    if (progress <= 50) return { bg: 'bg-blue-9', text: 'text-blue-11' }
    if (progress <= 75) return { bg: 'bg-purple-9', text: 'text-purple-11' }
    return { bg: 'bg-green-9', text: 'text-green-11' }
  }

  const { bg, text } = getProgressStyles()

  const formattedSteps = steps.map((item, idx) => {
    let status: 'active' | 'upcoming' | 'completed' = 'upcoming'
    if (idx < step) status = 'completed'
    else if (idx === step) status = 'active'

    return {
      ...item,
      clickable: idx <= step,
      disabled: idx > step,
      status,
    }
  })

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'
      exit={{ opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <AnimateSlideRight delay={0.1}>
        <div className='mb-4 flex items-center justify-between border-b border-gray-3 px-4 py-4'>
          <div className='flex flex-col gap-1'>
            <h2 className='text-18/6 font-semibold tracking-tight text-gray-13'>
              Set up your folder
            </h2>
            <p className='text-13/5 text-gray-11'>
              Create a place to store and organize your documents
            </p>
          </div>

          <div className='flex flex-col items-end gap-1'>
            <span
              className={cn(
                'text-13/5 font-semibold transition-colors duration-500',
                text,
              )}
            >
              {progress}% complete
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
      </AnimateSlideRight>

      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]'>
        <AnimateSlideUp className='h-full' delay={0.2}>
          <div className='hidden h-full border-r border-gray-3 bg-gray-1/30 pt-3 pr-2 pb-3 pl-3.5 xl:block'>
            <Stepper
              active={step}
              orientation='vertical'
              steps={formattedSteps}
              setActive={setStep}
            />
          </div>
        </AnimateSlideUp>

        <div
          className='scrollbar col-span-1 h-full min-h-0 w-full overflow-y-auto'
          ref={scrollContainerRef}
        >
          <div className='mx-auto w-full max-w-3xl px-6 pb-12 md:px-8 lg:px-10'>
            <AnimatePresence initial={false} mode='wait'>
              {step === 0 && (
                <AnimateSlideUp delay={0.1} key='dms-step-0'>
                  <FolderSetupStep />
                </AnimateSlideUp>
              )}
              {step === 1 && (
                <AnimateScale delay={0.1} key='dms-step-1'>
                  <ConfigureFieldsStep />
                </AnimateScale>
              )}
              {step === 2 && (
                <AnimateBounce delay={0.1} key='dms-step-2'>
                  <StorageStep />
                </AnimateBounce>
              )}
              {step === 3 && (
                <AnimateFadeIn delay={0.1} key='dms-step-3'>
                  <ReviewLaunchStep />
                </AnimateFadeIn>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

DocumentRepositorySteps.displayName = 'DocumentRepositorySteps'
export default DocumentRepositorySteps
