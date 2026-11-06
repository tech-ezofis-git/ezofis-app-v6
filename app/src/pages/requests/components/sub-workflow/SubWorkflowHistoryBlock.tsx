import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useState } from 'react'
import {
  isConnectorFinished,
  type SubWorkflowHistoryRow,
} from '@/features/sub-workflow'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  rows: SubWorkflowHistoryRow[]
  /** Draws one child step in the same format as the request's own history. */
  renderStep: (row: SubWorkflowHistoryRow, index: number) => ReactNode
}

// V5 ProcessHistory connector row: the child request's own steps, collapsed
// under the parent's connector stage until opened.
const SubWorkflowHistoryBlock = ({ renderStep, rows }: Props) => {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  if (rows.length === 0) return null
  const requestNo = rows[0].requestNo
  const stepCount = rows.length
  const finished = isConnectorFinished(rows)

  return (
    <div className='mt-1.5'>
      <button
        aria-expanded={open}
        className='inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-3 bg-gray-1 px-2 py-1 text-11 font-semibold text-gray-11 transition-all duration-200 hover:border-primary-5 hover:bg-primary-1 hover:text-primary-11 active:scale-95'
        type='button'
        onClick={() => setOpen((v) => !v)}
      >
        <Icon
          name='tabler:chevron-right'
          className={cn(
            'size-3.5 transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
        <Icon
          name={finished ? 'tabler:circle-check' : 'tabler:progress'}
          className={cn(
            'size-3.5',
            finished ? 'text-green-9' : 'text-orange-9',
          )}
        />
        {requestNo}
        <span className='font-medium text-gray-9'>
          · {t`${stepCount} steps`}
        </span>
      </button>

      {open && (
        <div className='animate-in fade-in slide-in-from-top-1 relative mt-3 flex flex-col gap-4 duration-200'>
          {rows.length > 1 && (
            <div className='absolute top-6 bottom-6 left-[15px] z-0 w-0 border-l-[1.5px] border-dotted border-[var(--gray-5)]' />
          )}
          {rows.map((row, i) => (
            <div key={`${row.activityId ?? row.stage}-${i}`}>
              {renderStep(row, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubWorkflowHistoryBlock
