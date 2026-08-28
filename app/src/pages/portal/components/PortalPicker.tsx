import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import {
  AnimateSlideUp,
  AnimateStagger,
} from '@/components/common/animations'
import type { PortalConfig } from '@/pages/settings/helpers/portalConfigStorage'
import cn from '@/utils/cn'
import { portalWorkflowIcon } from '../helpers/portalWorkflows'
import PortalBackButton from './PortalBackButton'

type PortalPickerProps = {
  portal: PortalConfig
  onBack: () => void
  onSelectWorkflow: (workflowId: string, workflowName: string) => void
}

export default function PortalPicker({
  onBack,
  onSelectWorkflow,
  portal,
}: PortalPickerProps) {
  const { t } = useLingui()
  const [query, setQuery] = useState('')
  const workflows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return portal.workflows.filter((workflow) =>
      workflow.name.toLowerCase().includes(needle),
    )
  }, [portal.workflows, query])

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
            leftSection={
              <Icon className='size-4 text-gray-9' name='lucide:search' />
            }
            placeholder={t`Search request types…`}
            value={query}
            onChange={setQuery}
          />
        </div>
      </AnimateSlideUp>

      {workflows.length === 0 ? (
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
          {workflows.map((workflow, index) => (
            <button
              className={cn(
                'flex flex-col gap-3 rounded-xl border border-gray-4 bg-surface p-4 text-left shadow-2xs transition',
                'hover:border-primary-6 hover:shadow-xs active:scale-[0.99]',
              )}
              key={String(workflow.id)}
              type='button'
              onClick={() =>
                onSelectWorkflow(String(workflow.id), workflow.name)
              }
            >
              <div className='flex items-start gap-3'>
                <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-3 text-primary-11'>
                  <Icon
                    className='size-4.5'
                    name={portalWorkflowIcon(index)}
                  />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-15 font-semibold text-gray-13'>
                    {workflow.name}
                  </div>
                  <div className='text-11 font-semibold tracking-wide text-gray-9 uppercase'>
                    {t`Workflow`}
                  </div>
                </div>
                <span className='rounded-full bg-primary-3 px-2 py-0.5 text-11 font-semibold text-primary-11'>
                  {t`Form`}
                </span>
              </div>
              <p className='line-clamp-2 text-13 text-gray-10'>
                {t`Start this request and we'll collect the details you need.`}
              </p>
              <div className='mt-auto flex justify-end border-t border-gray-3 pt-3 text-13 font-semibold text-primary-11'>
                {t`Start`}
                <Icon className='ml-1 size-4' name='lucide:arrow-right' />
              </div>
            </button>
          ))}
        </AnimateStagger>
      )}
    </div>
  )
}
