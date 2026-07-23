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
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import cn from '@/utils/cn'
import StepFour from './steps/step-four/StepFour'
import StepOne from './steps/step-one/StepOne'
import StepThree from './steps/step-three/StepThree'
import StepTwo from './steps/step-two/StepTwo'
// import StepZero from './steps/StepZero'

const OAUTH_ERP_SYSTEMS = ['QuickBooks'] as const

const steps = [
  {
    description: 'Configure invoice ingestion',
    icon: 'tabler:file-upload',
    id: 1,
    label: 'Scan & Upload',
  },
  {
    description: 'Connect your accounting software',
    icon: 'tabler:database',
    id: 2,
    label: 'Sync ERP',
  },
  {
    description: 'Archive and store backups',
    icon: 'tabler:cloud',
    id: 3,
    label: 'Cloud Storage',
  },
  {
    description: 'Review and launch workflow',
    icon: 'tabler:check',
    id: 4,
    label: 'Ready to Go',
  },
]

const isEmailStepComplete = (emailSettings?: {
  isConnected?: boolean
  provider?: string
} | null) => Boolean(emailSettings?.provider && emailSettings?.isConnected)

const isErpStepComplete = (erpSettings?: {
  isConnected?: boolean
  lineItemHeaders?: string[]
  lineItemMapping?: Record<string, string>
  mapping?: Record<string, string>
  system?: string
  templateUploaded?: boolean
} | null) => {
  if (!erpSettings?.system) return false
  if (erpSettings.system === 'PREDEFINED') return true

  if (erpSettings.system === 'FILE_BASED_IMPORT') {
    const mapping = erpSettings.mapping || {}
    const lineItemMapping = erpSettings.lineItemMapping || {}
    const lineItemHeaders = erpSettings.lineItemHeaders || []

    const requiredHeaderColumns = SYSTEM_TEMPLATE_COLUMNS.filter(
      (c) => c.required,
    )
    const isHeaderMappingComplete =
      requiredHeaderColumns.length > 0 &&
      requiredHeaderColumns.every(
        (col) =>
          !!mapping[col.key] && mapping[col.key] !== 'Skip to Import',
      )

    const hasLineItems = lineItemHeaders.length > 0
    const requiredLineItemColumns = LINE_ITEM_TEMPLATE_COLUMNS.filter(
      (c) => c.required,
    )
    const isLineItemMappingComplete =
      !hasLineItems ||
      (requiredLineItemColumns.length > 0 &&
        requiredLineItemColumns.every(
          (col) =>
            !!lineItemMapping[col.key] &&
            lineItemMapping[col.key] !== 'Skip to Import',
        ))

    return (
      !!erpSettings.templateUploaded &&
      isHeaderMappingComplete &&
      isLineItemMappingComplete
    )
  }

  const isOAuthErp = OAUTH_ERP_SYSTEMS.includes(
    erpSettings.system as (typeof OAUTH_ERP_SYSTEMS)[number],
  )

  return isOAuthErp
    ? !!erpSettings.isConnected
    : Boolean(erpSettings.system && erpSettings.isConnected)
}

const isStorageStepComplete = (storageSettings?: {
  isConnected?: boolean
  system?: string
} | null) =>
  storageSettings?.system === 'Included storage' ||
  !!storageSettings?.isConnected

const getSetupProgress = (state: {
  emailSettings?: {
    isConnected?: boolean
    provider?: string
  } | null
  erpSettings?: {
    isConnected?: boolean
    lineItemHeaders?: string[]
    lineItemMapping?: Record<string, string>
    mapping?: Record<string, string>
    system?: string
    templateUploaded?: boolean
  } | null
  isApSetUpCompleted?: boolean
  step?: number
  storageSettings?: {
    isConnected?: boolean
    system?: string
  } | null
}) => {
  if (state?.isApSetUpCompleted) return 100

  const currentStep = Math.max(0, Math.min(state?.step ?? 0, steps.length - 1))

  // Step 4 is review-only — show 90% once reached with prior steps configured
  if (currentStep === 3) {
    const priorStepsReady =
      isEmailStepComplete(state?.emailSettings) &&
      isErpStepComplete(state?.erpSettings) &&
      isStorageStepComplete(state?.storageSettings)
    return priorStepsReady ? 90 : 75
  }

  const stepConfigured = [
    isEmailStepComplete(state?.emailSettings),
    isErpStepComplete(state?.erpSettings),
    isStorageStepComplete(state?.storageSettings),
  ]

  let completedSteps = 0
  for (let i = 0; i <= currentStep && i < stepConfigured.length; i++) {
    if (stepConfigured[i]) completedSteps += 1
  }

  return Math.round((completedSteps / steps.length) * 100)
}

const Steps = () => {
  const step = setupStore((state) => state.step)
  const setStep = setupStore((state) => state.setStep)
  const progress = setupStore(getSetupProgress)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to top of step content when step changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        behavior: 'smooth',
        top: 0,
      })
    }
    window.scrollTo({ behavior: 'smooth', top: 0 })
    const scrollables = document.querySelectorAll(
      '.overflow-y-auto, [class*="overflow-y-auto"]',
    )
    scrollables.forEach((el) => {
      el.scrollTo({
        behavior: 'smooth',
        top: 0,
      })
    })
  }, [step])

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
    // Allow clicking only on the current and previous steps (cannot click forward to next steps)
    clickable: idx <= step,
    // Disable steps beyond the current active step
    disabled: idx > step,
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
        <div className='mb-4 flex items-center justify-between border-b border-gray-3 px-6 py-4 md:px-8'>
          <div className='flex flex-col gap-1'>
            <h2 className='text-18/6 font-semibold tracking-tight text-gray-13'>
              Accounts Payable Setup
            </h2>
            <p className='text-13/5 text-gray-11'>
              Configure your integrations and settings
            </p>
          </div>

          <div className='flex items-center gap-4'>
            <div className='flex flex-col items-end gap-1'>
              <span
                className={cn(
                  'text-13/5 font-semibold transition-colors duration-500',
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
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[290px_1fr]'>
        <AnimateSlideUp delay={0.2}>
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
          className='col-span-1 h-full w-full overflow-y-auto'
          ref={scrollContainerRef}
        >
          <div className='mx-auto w-full max-w-3xl px-6 pb-12 md:px-8 lg:px-10'>
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
