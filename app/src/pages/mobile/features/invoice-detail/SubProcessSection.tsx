import {
  getSubProcessStatus,
  type MainProcessDetails,
  type SubProcessRow,
  type SubProcessStatus,
} from '@/features/sub-workflow'
import cn from '@/utils/cn'
import { formatUtcToLocalDateTime } from '@/utils/utcDate'
import { Icon } from '../../components/primitives/Icon'
import { EmptyState } from './InvoiceDetailPieces'

// Mobile, read-only view of sub-workflow links (desktop has the full
// Sub Process panel with navigation). Localhost-only like the rest.

const STATUS: Record<
  SubProcessStatus,
  { icon: 'CircleCheck' | 'Clock' | 'SquareX'; label: string; tone: string }
> = {
  completed: {
    icon: 'CircleCheck',
    label: 'Completed',
    tone: 'text-[var(--green-9)]',
  },
  forceClosed: {
    icon: 'SquareX',
    label: 'Force Closed',
    tone: 'text-[var(--red-9)]',
  },
  running: { icon: 'Clock', label: 'Running', tone: 'text-[var(--orange-9)]' },
}

const formatWhen = (value?: string) => {
  if (!value) return ''
  try {
    return formatUtcToLocalDateTime(value, '') || ''
  } catch {
    return ''
  }
}

export function ParentRequestStrip({ parent }: { parent: MainProcessDetails }) {
  const finished = Number(parent.flowStatus) === 1
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-top-1 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold duration-200',
        finished
          ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-11)]'
          : 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-11)]',
      )}
    >
      <Icon className='size-3.5' name='Link' />
      <span className='truncate'>
        Sub-process of {parent.requestNo}
        {parent.workflowName ? ` · ${parent.workflowName}` : ''}
      </span>
    </div>
  )
}

export function SubProcessList({
  isLoading,
  rows,
}: {
  isLoading: boolean
  rows: SubProcessRow[]
}) {
  if (isLoading) {
    return (
      <p className='py-6 text-center text-[11px] text-[var(--gray-11)]'>
        Loading sub-processes…
      </p>
    )
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Icon className='size-4 text-[var(--gray-9)]' name='Network' />}
        message='No sub-processes yet'
      />
    )
  }
  return (
    <div className='animate-in fade-in rounded-xl border border-[var(--gray-3)] bg-surface-primary px-2.5 duration-200'>
      {rows.map((row) => {
        const status = STATUS[getSubProcessStatus(row)]
        const meta = [row.subWorkflowName, row.stage, formatWhen(row.raisedAt)]
          .filter(Boolean)
          .join(' · ')
        return (
          <div
            className='flex items-center gap-2 border-b border-[var(--gray-3)] py-2 last:border-b-0'
            key={`${row.subWorkflowId}:${row.processId}`}
          >
            <Icon className={cn('size-4', status.tone)} name={status.icon} />
            <div className='min-w-0 flex-1'>
              <div className='flex items-center justify-between gap-2'>
                <span className='truncate text-[12px] font-semibold text-[var(--gray-13)]'>
                  {row.requestNo}
                </span>
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-semibold',
                    status.tone,
                  )}
                >
                  {status.label}
                </span>
              </div>
              {meta ? (
                <p className='truncate text-[10px] text-[var(--gray-11)]'>
                  {meta}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
