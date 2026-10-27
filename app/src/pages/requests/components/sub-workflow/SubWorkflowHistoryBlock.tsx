import { useLingui } from '@lingui/react/macro'
import dayjs from 'dayjs'
import { useState } from 'react'
import type { SubWorkflowHistoryRow } from '@/features/sub-workflow'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import { parseUtcDate } from '@/utils/utcDate'

interface Props {
  rows: SubWorkflowHistoryRow[]
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const parsed = parseUtcDate(value)
  return parsed ? dayjs(parsed).format('DD-MMM-YYYY hh:mm A') : '—'
}

const isDone = (status?: string) =>
  /approve|submit|complet|done/i.test(String(status || ''))

// V5 ProcessHistory connector row: the child request's own steps, collapsed
// under the parent's connector stage until opened.
const SubWorkflowHistoryBlock = ({ rows }: Props) => {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  if (rows.length === 0) return null
  const requestNo = rows[0].requestNo
  const stepCount = rows.length
  const last = rows[rows.length - 1]
  const finished = isDone(last.status) && Boolean(last.processedOn)

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
        <div className='animate-in fade-in slide-in-from-top-1 mt-2 overflow-x-auto rounded-lg border border-gray-3 duration-200'>
          <table className='w-full min-w-[320px] text-left text-[11px]'>
            <thead className='bg-gray-2 text-gray-10'>
              <tr>
                <th className='px-2 py-1.5 font-semibold'>{t`Stage`}</th>
                <th className='px-2 py-1.5 font-semibold'>{t`User`}</th>
                <th className='px-2 py-1.5 font-semibold'>{t`Received`}</th>
                <th className='px-2 py-1.5 font-semibold'>{t`Processed`}</th>
                <th className='px-2 py-1.5 font-semibold'>{t`Status`}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  className='border-t border-gray-3 text-gray-12 transition-colors hover:bg-gray-1'
                  key={`${row.stage}-${i}`}
                >
                  <td className='px-2 py-1.5 font-medium'>{row.stage}</td>
                  <td className='max-w-[110px] truncate px-2 py-1.5'>
                    {row.processedBy || row.actionUser || '—'}
                  </td>
                  <td className='px-2 py-1.5 whitespace-nowrap'>
                    {formatDate(row.receivedOn)}
                  </td>
                  <td className='px-2 py-1.5 whitespace-nowrap'>
                    {formatDate(row.processedOn)}
                  </td>
                  <td className='px-2 py-1.5'>{row.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SubWorkflowHistoryBlock
