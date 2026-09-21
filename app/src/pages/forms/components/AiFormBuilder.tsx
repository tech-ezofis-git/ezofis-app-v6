import { useLingui } from '@lingui/react/macro'
import { Textarea } from '@mantine/core'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  buildFormPayloadFromAiSuggestion,
  type FormTypeOption,
  generateFormConfigViaQwen,
  shortenDescription,
  shortenFormName,
} from '@/services/ai/formConfig'

interface AiFormBuilderProps {
  onApply: (payload: any) => void
  onBack: () => void
  onManualCreate?: () => void
}

const FORM_TYPE_OPTIONS = [
  {
    description: 'Use this form in workflows',
    icon: 'lucide:workflow',
    id: 'WORKFLOW',
    name: 'Workflow Form',
  },
  {
    description: 'Use this form to collect master data',
    icon: 'lucide:database',
    id: 'MASTER',
    name: 'Master Form',
  },
]

const SAMPLE_PROMPTS = [
  {
    label: 'Accounts Receivable Invoice',
    prompt:
      'An accounts receivable form with customer name, invoice number, due date, billing amount, payment terms, and collection status.',
  },
  {
    label: 'Order to Pay',
    prompt:
      'An order to pay form with order ID, customer details, itemized goods, payment method, and fulfillment status.',
  },
  {
    label: 'Purchase Order Request',
    prompt:
      'A purchase order request form with requisition number, vendor name, item description, quantity, unit price and total cost.',
  },
  {
    label: 'Employee Onboarding',
    prompt:
      'An employee onboarding form to collect personal details, department, joining date and required documents.',
  },
  {
    label: 'Leave Request',
    prompt:
      'A leave request form with employee name, leave type, start date, end date and reason.',
  },
]

export default function AiFormBuilder({
  onApply,
  onBack,
  onManualCreate,
}: AiFormBuilderProps) {
  const { t } = useLingui()

  const [formType, setFormType] = useState<FormTypeOption | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleManual = () => {
    if (onManualCreate) {
      onManualCreate()
    } else {
      onApply(null)
    }
  }

  const handleGenerate = async () => {
    const text = prompt.trim()
    if (!text || !formType) {
      showToast({
        message: t`Please describe the form you want to create.`,
        variant: 'error',
      })
      return
    }

    setIsGenerating(true)

    try {
      const shortName = shortenFormName(text)
      const shortDesc = shortenDescription(text)
      const result = await generateFormConfigViaQwen({
        description: shortDesc,
        formType,
        name: shortName,
        prompt: text,
      })
      const payload = buildFormPayloadFromAiSuggestion(result)

      onApply(payload)
    } catch (error) {
      console.error('Form generation error:', error)
      showToast({
        message: t`Something went wrong. Please try again.`,
        variant: 'error',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className='flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface-primary text-gray-12'
      initial={{ opacity: 0, scale: 0.98, y: 12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className='flex shrink-0 items-center gap-3 border-b border-gray-4 bg-surface-primary px-6 py-3.5 shadow-xs'>
        <IconButton
          ariaLabel={t`Back`}
          color='gray'
          icon='lucide:arrow-left'
          size='sm'
          variant='ghost'
          onClick={onBack}
        />
        <h2 className='text-sm font-semibold text-gray-12'>{t`New Form`}</h2>
      </div>

      <div className='flex flex-1 flex-col items-center justify-start gap-6 overflow-y-auto p-6 pt-6 sm:pt-8 md:pt-10'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex h-12 w-12 items-center justify-center rounded-2xl'>
            <AiBrandIcon className='size-6' variant='outline-purple' />
          </div>
          <h1 className='text-xl font-semibold text-gray-12 md:text-2xl'>
            {formType
              ? t`What form shall we create?`
              : t`What type of form do you want to create?`}
          </h1>
        </div>

        <AnimatePresence initial={false} mode='wait'>
          {!formType ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className='grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2'
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              key='type-select'
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {FORM_TYPE_OPTIONS.map((option) => (
                <button
                  className='flex flex-col items-start gap-2.5 rounded-2xl border border-gray-4 bg-surface-primary p-5 text-left transition-all hover:border-primary-9/50 hover:shadow-xs'
                  key={option.id}
                  type='button'
                  onClick={() => setFormType(option.id as FormTypeOption)}
                >
                  <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary-2 text-primary-9'>
                    <Icon className='size-5' name={option.icon} />
                  </div>
                  <span className='text-sm font-semibold text-gray-12'>
                    {option.name}
                  </span>
                  <span className='text-xs text-gray-9'>
                    {option.description}
                  </span>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className='flex w-full max-w-2xl flex-col gap-3'
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              key='describe'
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                className='inline-flex items-center gap-1.5 self-center text-xs font-medium text-gray-9 hover:text-primary-9'
                type='button'
                onClick={() => setFormType(null)}
              >
                <Icon className='size-3.5' name='lucide:arrow-left' />
                <span>
                  {t`Type:`}{' '}
                  {FORM_TYPE_OPTIONS.find((o) => o.id === formType)!.name}
                </span>
                <span className='text-primary-9 underline'>{t`Change`}</span>
              </button>

              <div className='w-full rounded-3xl border border-gray-4 bg-surface-primary p-4 shadow-xs transition-colors focus-within:border-primary-9'>
                <Textarea
                  disabled={isGenerating}
                  maxRows={6}
                  minRows={2}
                  placeholder={t`Describe the form you want to create...`}
                  value={prompt}
                  autoFocus
                  autosize
                  classNames={{
                    input:
                      'border-none bg-transparent p-0 text-sm text-gray-12 placeholder:text-gray-8 focus:outline-none md:text-base',
                  }}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleGenerate()
                    }
                  }}
                />

                <div className='mt-3 flex items-center justify-end gap-3'>
                  <IconButton
                    ariaLabel={t`Send`}
                    color='primary'
                    disabled={!prompt.trim() || isGenerating}
                    icon='lucide:arrow-up'
                    loading={isGenerating}
                    size='md'
                    variant='solid'
                    onClick={handleGenerate}
                  />
                </div>
              </div>

              <div className='flex w-full flex-wrap items-center justify-center gap-2'>
                {SAMPLE_PROMPTS.map((sample) => {
                  const isSelected = prompt === sample.prompt
                  return (
                    <button
                      key={sample.label}
                      type='button'
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-primary-9 bg-primary-2 text-primary-11 shadow-xs ring-2 ring-primary-5/20'
                          : 'border-gray-4 bg-surface-primary text-gray-11 hover:border-primary-9/50 hover:text-primary-10'
                      }`}
                      onClick={() => setPrompt(sample.prompt)}
                    >
                      {sample.label}
                    </button>
                  )
                })}
              </div>

              <div className='mt-2 flex items-center justify-center gap-2 text-xs text-gray-9'>
                <span>{t`Or prefer to build from scratch?`}</span>
                <button
                  className='inline-flex items-center gap-1 font-semibold text-primary-9 hover:underline'
                  type='button'
                  onClick={handleManual}
                >
                  <Icon className='size-3.5' name='lucide:pencil' />
                  <span>{t`Build Manually`}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
