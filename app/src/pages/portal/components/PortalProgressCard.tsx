import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type {
  PortalStepStatus,
  PortalWorkflowStep,
} from '../helpers/portalDetail'

type PortalProgressCardProps = {
  statuses: PortalStepStatus[]
  steps: PortalWorkflowStep[]
}

export default function PortalProgressCard({
  statuses,
  steps,
}: PortalProgressCardProps) {
  const { t } = useLingui()

  if (!steps.length) return null

  return (
    <div className='animate-in fade-in slide-in-from-left-4 w-full rounded-xl border border-gray-4 bg-surface p-4 shadow-sm duration-300 sm:p-5'>
      <div className='mb-4 text-15 font-semibold text-gray-13'>{t`Progress`}</div>
      <ol className='flex flex-col'>
        {steps.map((step, index) => {
          const status = statuses[index] || 'pending'
          const isLast = index === steps.length - 1
          const nextStatus = statuses[index + 1]
          const lineDone = status === 'completed' && nextStatus !== 'pending'

          return (
            <li className='relative flex gap-3' key={step.id}>
              {!isLast && (
                <span
                  className={cn(
                    'absolute top-7 left-[13px] h-[calc(100%-8px)] w-0.5 rounded-full',
                    lineDone ? 'bg-green-9' : 'bg-gray-4',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-12 font-semibold transition-all',
                  status === 'completed' && 'bg-green-9 text-white',
                  status === 'current' && 'bg-primary-9 text-white',
                  status === 'pending' &&
                    'border border-gray-5 bg-surface text-gray-8',
                )}
              >
                {status === 'completed' ? (
                  <Icon className='size-3.5' name='lucide:check' />
                ) : (
                  index + 1
                )}
              </span>
              <div className={cn('min-w-0 pb-5', isLast && 'pb-0')}>
                <div
                  className={cn(
                    'text-13 font-medium',
                    status === 'pending' ? 'text-gray-8' : 'text-gray-12',
                  )}
                >
                  {step.title}
                </div>
                {status === 'current' && (
                  <div className='mt-0.5 text-12 font-medium text-primary-9'>
                    {t`In progress...`}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
