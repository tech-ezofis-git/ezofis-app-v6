import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import { AnimateSlideUp, AnimateStagger } from '@/components/common/animations'
import cn from '@/utils/cn'
import {
  portalWorkflowIcon,
  portalWorkflowKind,
  portalWorkflowLabel,
  type PortalWorkflowSummary,
  workflowDescriptionFallback,
} from '../helpers/portalWorkflows'
import PortalBackButton from './PortalBackButton'
import { PortalWorkflowCardsSkeleton } from './PortalLayoutSkeleton'

type PortalPickerProps = {
  loading?: boolean
  workflows: PortalWorkflowSummary[]
  onBack: () => void
  onSelectWorkflow: (workflowId: string, workflowName: string) => void
}

export default function PortalPicker({
  loading,
  workflows,
  onBack,
  onSelectWorkflow,
}: PortalPickerProps) {
  const { t } = useLingui()
  const [query, setQuery] = useState('')
  const visibleWorkflows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return workflows.filter((workflow) => {
      const name = portalWorkflowLabel(workflow).toLowerCase()
      const description = String(workflow.description || '').toLowerCase()
      return !needle || name.includes(needle) || description.includes(needle)
    })
  }, [query, workflows])

  return (
    <div className='flex flex-col gap-5'>
      <AnimateSlideUp>
        <PortalBackButton onClick={onBack} />
      </AnimateSlideUp>

      <AnimateSlideUp
        className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
        delay={0.05}
      >
        <div className='min-w-0'>
          <h1 className='text-xl font-semibold text-gray-13 sm:text-2xl'>
            {t`New Submission`}
          </h1>
          <p className='mt-1 text-13 text-gray-10'>
            {t`Choose what you'd like to submit. We'll guide you through the rest.`}
          </p>
        </div>
        <div className='w-full sm:max-w-72'>
          <InputText
            placeholder={t`Search request types…`}
            value={query}
            leftSection={
              <Icon className='size-4 text-gray-9' name='lucide:search' />
            }
            onChange={setQuery}
          />
        </div>
      </AnimateSlideUp>

      {loading && workflows.length === 0 ? (
        <PortalWorkflowCardsSkeleton />
      ) : visibleWorkflows.length === 0 ? (
        <AnimateSlideUp delay={0.1}>
          <div className='rounded-xl border border-gray-4 bg-surface p-10 text-center text-13 text-gray-9'>
            {t`No workflows are connected to this portal yet.`}
          </div>
        </AnimateSlideUp>
      ) : (
        <AnimateStagger
          className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
          staggerDelay={0.06}
        >
          {visibleWorkflows.map((workflow, index) => {
            const name = portalWorkflowLabel(workflow)
            const kind = portalWorkflowKind(name)

            return (
              <button
                key={String(workflow.id)}
                type='button'
                className={cn(
                  'flex flex-col gap-3 rounded-xl border border-gray-4 bg-surface p-4 text-left shadow-2xs transition',
                  'hover:border-primary-6 hover:shadow-xs active:scale-[0.99]',
                )}
                onClick={() => onSelectWorkflow(String(workflow.id), name)}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex min-w-0 items-start gap-3'>
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-3 text-primary-11'>
                      <Icon
                        className='size-4.5'
                        name={portalWorkflowIcon(index)}
                      />
                    </span>
                    <div className='min-w-0 pt-1'>
                      <div className='truncate text-15 font-semibold text-gray-13'>
                        {name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-11 font-semibold tracking-wide uppercase',
                      kind === 'upload'
                        ? 'bg-green-3 text-green-11'
                        : 'bg-primary-3 text-primary-11',
                    )}
                  >
                    {kind === 'upload' ? t`Upload` : t`Form`}
                  </span>
                </div>
                <p className='line-clamp-2 text-13 text-gray-10'>
                  {workflow.description || workflowDescriptionFallback(name)}
                </p>
                <div className='mt-auto flex justify-end border-t border-gray-3 pt-3 text-13 font-semibold text-primary-11'>
                  {t`Start`}
                  <Icon className='ml-1 size-4' name='lucide:arrow-right' />
                </div>
              </button>
            )
          })}
        </AnimateStagger>
      )}
    </div>
  )
}
