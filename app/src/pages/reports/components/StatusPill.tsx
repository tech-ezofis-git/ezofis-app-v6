import type { ReactNode } from 'react'
import { getHighlightColorClass } from '@/pages/report-builder/highlightColors'
import cn from '@/utils/cn'

interface Props {
  color: string
  label: string
  /** Shown instead of the label, e.g. a link that keeps the highlight color. */
  children?: ReactNode
}

const StatusPill = ({ color, label, children }: Props) => (
  <span
    className={cn(
      'inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-normal',
      getHighlightColorClass(color),
    )}
  >
    {children ?? label}
  </span>
)

StatusPill.displayName = 'StatusPill'
export default StatusPill
