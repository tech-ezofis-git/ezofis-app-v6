import { getHighlightColorClass } from '@/pages/report-builder/highlightColors'
import cn from '@/utils/cn'

interface Props {
  color: string
  label: string
}

const StatusPill = ({ color, label }: Props) => (
  <span
    className={cn(
      'inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-normal',
      getHighlightColorClass(color),
    )}
  >
    {label}
  </span>
)

StatusPill.displayName = 'StatusPill'
export default StatusPill
