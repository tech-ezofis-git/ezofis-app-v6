import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  currentLabel: string
  isTerminal: boolean
  previousLabel: string | null
}

// Previous → Current stage indicator, shared between the generic grid
// card and the generic table's Status column so both views read the same
// way. Previous is always a quiet, done-looking check; Current is the one
// color that carries meaning — primary while it's sitting with someone,
// green once it's landed on a terminal (ACTION/END) block.
const GenericStagePill = ({
  currentLabel,
  isTerminal,
  previousLabel: _previousLabel,
}: Props) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors',
        isTerminal
          ? 'dark:bg-green-950/40 dark:text-green-400 border-green-3 bg-green-1 text-green-9 dark:border-green-9/30'
          : 'dark:bg-purple-950/40 dark:text-purple-400 border-purple-3 bg-purple-1 text-purple-9 dark:border-purple-9/30',
      )}
    >
      {currentLabel}
    </span>
  )
}

GenericStagePill.displayName = 'GenericStagePill'
export default GenericStagePill
