import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import { type HistoryRow, useHistory } from '@/pages/requests/hooks/useHistory'
import { formatDatetime } from '@/utils/dayjs'

type PortalActivityProps = {
  enabled?: boolean
  instanceId?: string | number
  processId?: number | string
  workflowId?: number | string
}

const toDateValue = (value: HistoryRow['actionAt']): Date | string | null => {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return String(value)
}

const getActivityDate = (row: HistoryRow) =>
  toDateValue(row.processedOn) ||
  toDateValue(row.receivedOn) ||
  toDateValue(row.actionAt)

const getActivityTitle = (row: HistoryRow) =>
  row.title ||
  row.stageName ||
  row.stage ||
  row.status ||
  row.action ||
  'Update'

const getActivityName = (row: HistoryRow) => {
  const name =
    row.actionUser ||
    row.performedByUserName ||
    row.processedBy ||
    row.agentType
  if (name && String(name).trim()) return String(name).trim()
  return ''
}

const PortalActivity = ({
  enabled,
  instanceId,
  processId,
  workflowId,
}: PortalActivityProps) => {
  const { t } = useLingui()
  const {
    data: flows = [],
    error,
    isLoading,
  } = useHistory(workflowId, instanceId || processId, enabled)

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 py-4 text-12 text-gray-10'>
        <Icon
          className='size-4 animate-spin text-primary-9'
          name='tabler:loader-2'
        />
        {t`Loading activity...`}
      </div>
    )
  }

  if (error && !flows.length) {
    return (
      <div className='py-4 text-12 font-medium text-red-9'>
        {t`Unable to load activity.`}
      </div>
    )
  }

  if (!flows.length) {
    return (
      <div className='py-4 text-12 text-gray-10'>{t`No activity yet.`}</div>
    )
  }

  return (
    <ul className='relative flex flex-col gap-4'>
      {flows.length > 1 ? (
        <span
          className='pointer-events-none absolute top-2 bottom-2 left-[3px] z-0 w-px bg-primary-6'
          aria-hidden
        />
      ) : null}
      {flows.map((row, index) => {
        const dateValue = getActivityDate(row)
        const date = dateValue ? formatDatetime(dateValue, 'D MMM YYYY') : ''
        const name = getActivityName(row)
        const meta = [date, name].filter(Boolean).join(', ')

        return (
          <li
            className='animate-in fade-in slide-in-from-left-4 relative z-10 flex items-start gap-3 duration-300'
            key={`${row.activityId ?? index}-${index}`}
          >
            <span
              className='mt-1.5 size-2 shrink-0 rounded-full bg-primary-9 ring-2 ring-surface'
              aria-hidden
            />
            <div className='min-w-0 flex-1'>
              <div className='text-13 font-semibold text-gray-13'>
                {getActivityTitle(row)}
              </div>
              {meta ? (
                <div className='mt-0.5 text-12 text-gray-10'>{meta}</div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

PortalActivity.displayName = 'PortalActivity'
export default PortalActivity
