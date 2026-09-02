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
    <div className='animate-in fade-in slide-in-from-bottom-2 w-full rounded-xl border border-gray-4 bg-surface p-6 shadow-sm duration-300 sm:px-8 sm:py-7'>
      <div className='mb-6 text-15 font-semibold text-gray-13'>{t`Progress`}</div>
      <ol className='flex flex-col'>
        {steps.map((step, index) => {
          const status = statuses[index] || 'pending'
          const isLast = index === steps.length - 1
          const nextStatus = statuses[index + 1]
          const lineDone = status === 'completed' && nextStatus !== 'pending'
          console.log(step)
          return (
            <li className='relative flex items-start gap-4' key={step.id}>
              {!isLast && (
                <span
                  className={cn(
                    'absolute top-8 left-[15px] h-[calc(100%-4px)] w-0.5 rounded-full',
                    lineDone ? 'bg-green-9' : 'bg-gray-4',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-13 font-semibold transition-all',
                  status === 'completed' && 'bg-green-9 text-white',
                  status === 'current' && 'bg-primary-9 text-white shadow-sm',
                  status === 'pending' &&
                    'border border-gray-5 bg-surface text-gray-8',
                )}
              >
                {status === 'completed' ? (
                  <Icon className='size-4' name='lucide:check' />
                ) : (
                  index + 1
                )}
              </span>
              <div
                className={cn(
                  'flex min-h-8 min-w-0 flex-1 flex-col justify-center py-0.5',
                  isLast ? 'pb-0' : 'pb-7',
                )}
              >
                <div
                  className={cn(
                    'text-14 leading-5',
                    status === 'current' && 'font-semibold text-gray-13',
                    status === 'completed' && 'font-medium text-gray-12',
                    status === 'pending' && 'font-medium text-gray-8',
                  )}
                >
                  {step.title}
                </div>
                {status === 'current' && (
                  <div className='mt-1 text-12 font-medium text-primary-9'>
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
