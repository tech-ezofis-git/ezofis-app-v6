import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  currentLabel: string
  isTerminal: boolean
  previousLabel: string | null
  /** Stage trail color (connection button color into this stage). */
  color?: string
}

// Previous → Current stage indicator, shared between the generic grid
// card and the generic table's Status column so both views read the same
// way. Previous is always a quiet, done-looking check; Current is the one
// color that carries meaning — primary while it's sitting with someone,
// green once it's landed on a terminal (ACTION/END) block. When the
// connection into the stage has a button color, that color is used instead,
// matching the list icon and the header stage trail.
const PILL_TONE: Record<string, string> = {
  green: 'border-green-3 bg-green-1 text-green-11',
  orange: 'border-orange-3 bg-orange-1 text-orange-11',
  primary: 'border-primary-3 bg-primary-1 text-primary-11',
  red: 'border-red-3 bg-red-1 text-red-11',
  secondary: 'border-secondary-3 bg-secondary-1 text-secondary-11',
}

const GenericStagePill = ({
  color,
  currentLabel,
  isTerminal,
  previousLabel: _previousLabel,
}: Props) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors',
        (color && PILL_TONE[color]) ||
          (isTerminal
            ? 'border-green-3 bg-green-1 text-green-11'
            : 'border-purple-3 bg-purple-1 text-purple-11'),
      )}
    >
      {currentLabel}
    </span>
  )
}

GenericStagePill.displayName = 'GenericStagePill'
export default GenericStagePill
