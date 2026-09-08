import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import type { ReportStatus } from '@/pages/report-builder/types'
import cn from '@/utils/cn'

interface Props {
  status: ReportStatus | string
}

const ReportStatusBadge = ({ status }: Props) => {
  const { t } = useLingui()
  const normalized = String(status || '')
    .trim()
    .toUpperCase()

  const { className, label } = useMemo(() => {
    if (normalized === 'PUBLISHED') {
      return {
        className:
          'border-[var(--green-5)] bg-[var(--green-3)] text-[var(--green-11)]',
        label: t`Published`,
      }
    }
    return {
      className:
        'border-[var(--gray-4)] bg-[var(--gray-2)] text-[var(--gray-10)]',
      label: t`Draft`,
    }
  }, [normalized, t])

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-normal',
        className,
      )}
    >
      {label}
    </span>
  )
}

ReportStatusBadge.displayName = 'ReportStatusBadge'
export default ReportStatusBadge
