import { useLingui } from '@lingui/react/macro'
import { Textarea } from '@mantine/core'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import InputSegmentedControl from '@/components/base/inputs/InputSegmentedControl'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  buildFormPayloadFromAiSuggestion,
  type FormTypeOption,
  generateFormConfigViaQwen,
} from '@/services/ai/formConfig'

interface AiFormBuilderProps {
  onApply: (payload: any) => void
  onBack: () => void
}

const FORM_TYPE_OPTIONS = [
  { id: 'WORKFLOW', name: 'Workflow Form' },
  { id: 'MASTER', name: 'Master Form' },
]

const SAMPLE_PROMPTS = [
  {
    label: 'General Feedback Form',
    prompt:
      'A general feedback form to collect ratings, comments and suggestions from users.',
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

const SESSION_KEY = 'ezofis_aiformbuilder_state'

export default function AiFormBuilder({ onApply, onBack }: AiFormBuilderProps) {
  const { t } = useLingui()
  const storedState = useMemo(() => getStoredState(), [])

  const [formType, setFormType] = useState<FormTypeOption>(
    storedState?.formType ?? 'WORKFLOW',
  )
  const [prompt, setPrompt] = useState(storedState?.prompt ?? '')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ formType, prompt }))
    } catch {
      // ignore
    }
  }, [formType, prompt])

  const handleGenerate = async () => {
    const text = prompt.trim()
    if (!text) {
      showToast({
        message: t`Please describe what form you want to create`,
        variant: 'error',
      })
      return
    }

    setIsGenerating(true)

    try {
      const result = await generateFormConfigViaQwen({
        description: text,
        formType,
        name: text.length <= 40 ? text : `${text.slice(0, 40)}...`,
        prompt: text,
      })
      const payload = buildFormPayloadFromAiSuggestion(result)

      showToast({ message: t`Opening Form Builder...`, variant: 'success' })
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

      <div className='flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex h-12 w-12 items-center justify-center rounded-2xl'>
            <AiBrandIcon className='size-6' variant='outline-purple' />
          </div>
          <h1 className='text-xl font-semibold text-gray-12 md:text-2xl'>
            {t`What form shall we create?`}
          </h1>
        </div>

        <div className='w-full max-w-2xl rounded-3xl border border-gray-4 bg-surface-primary p-4 shadow-sm transition-colors focus-within:border-primary-9'>
          <Textarea
            disabled={isGenerating}
            maxRows={6}
            minRows={2}
            placeholder={t`Describe the form you want to create...`}
            value={prompt}
            autosize
            classNames={{
              input:
                'border-none bg-transparent p-0 text-base text-gray-12 placeholder:text-gray-8 focus:outline-none',
            }}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleGenerate()
              }
            }}
          />

          <div className='mt-3 flex items-center justify-between gap-3'>
            <div className='w-56'>
              <InputSegmentedControl
                options={FORM_TYPE_OPTIONS}
                value={FORM_TYPE_OPTIONS.find((o) => o.id === formType)!}
                onChange={(option) => setFormType(option.id as FormTypeOption)}
              />
            </div>

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

        <div className='flex w-full max-w-2xl flex-wrap items-center justify-center gap-2'>
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              className='inline-flex items-center gap-1.5 rounded-full border border-gray-4 bg-surface-primary px-3.5 py-2 text-xs font-medium text-gray-11 transition-colors hover:border-primary-9 hover:text-primary-9'
              key={sample.label}
              type='button'
              onClick={() => setPrompt(sample.prompt)}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}
