import { useLingui } from '@lingui/react/macro'
import { Textarea } from '@mantine/core'
import { motion } from 'motion/react'
import { useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { generateWorkflowConfigViaQwen } from '@/services/ai/workflowConfig'

interface AiWorkflowBuilderProps {
  onApply: (payload: any, promptName: string) => void
  onBack: () => void
}

const SAMPLE_PROMPTS = [
  {
    label: 'Accounts Receivable',
    prompt:
      'An accounts receivable workflow to track customer invoicing, payment collection, credit checks, and revenue posting.',
  },
  {
    label: 'Order to Pay',
    prompt:
      'An order to pay process workflow for sales order intake, credit validation, order fulfillment, billing, and payment processing.',
  },
  {
    label: 'Purchase Requisition Approval',
    prompt:
      'A purchase requisition approval workflow with department head review, budget validation, purchasing agent assignment and PO generation.',
  },
  {
    label: 'Employee Onboarding',
    prompt:
      'An employee onboarding workflow with HR review, IT equipment provisioning, manager approval and document collection.',
  },
  {
    label: 'Contract Review & Signing',
    prompt:
      'A contract review workflow with legal team assessment, executive sign-off, digital signature collection and repository archiving.',
  },
]

export default function AiWorkflowBuilder({
  onApply,
  onBack,
}: AiWorkflowBuilderProps) {
  const { t } = useLingui()

  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    const text = prompt.trim()
    if (!text) {
      showToast({
        message: t`Please describe what workflow you want to create`,
        variant: 'error',
      })
      return
    }

    setIsGenerating(true)

    try {
      const workflowPayload = await generateWorkflowConfigViaQwen({
        description: text,
        name: text.length <= 40 ? text : `${text.slice(0, 40)}...`,
        prompt: text,
      })

      const name = text.length <= 40 ? text : `${text.slice(0, 40)}...`
      onApply(workflowPayload, name)
    } catch (error) {
      console.error('Workflow generation error:', error)
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
        <h2 className='text-sm font-semibold text-gray-12'>{t`New Workflow`}</h2>
      </div>

      <div className='flex flex-1 flex-col items-center justify-start gap-6 overflow-y-auto p-6 pt-12 sm:pt-16 md:pt-20 lg:pt-24'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex h-12 w-12 items-center justify-center rounded-2xl'>
            <AiBrandIcon className='size-6' variant='outline-purple' />
          </div>
          <h1 className='text-xl font-semibold text-gray-12 md:text-2xl'>
            {t`What workflow shall we create?`}
          </h1>
        </div>

        <div className='flex w-full max-w-2xl flex-col gap-3'>
          <div className='w-full rounded-3xl border border-gray-4 bg-surface-primary p-4 shadow-xs transition-colors focus-within:border-primary-9'>
            <Textarea
              disabled={isGenerating}
              maxRows={6}
              minRows={2}
              placeholder={t`Describe the workflow you want to create...`}
              value={prompt}
              autosize
              classNames={{
                input:
                  'border-none bg-transparent p-0 text-sm md:text-base text-gray-12 placeholder:text-gray-8 focus:outline-none',
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
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-primary-9 bg-primary-2 text-primary-11 shadow-xs ring-2 ring-primary-5/20'
                      : 'border-gray-4 bg-surface-primary text-gray-11 hover:border-primary-9/50 hover:text-primary-10'
                  }`}
                  key={sample.label}
                  type='button'
                  onClick={() => setPrompt(sample.prompt)}
                >
                  {sample.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
