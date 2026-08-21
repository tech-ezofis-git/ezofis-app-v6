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
  previousLabel,
}: Props) => {
  return (
    <div className='flex items-center gap-1.5 text-12'>
      {previousLabel && (
        <>
          <span className='flex items-center gap-1 text-gray-9'>
            <Icon
              className='size-3.5 text-green-9'
              name='tabler:circle-check'
            />
            <span className='truncate font-medium'>{previousLabel}</span>
          </span>
          <span className='text-gray-5'>—</span>
        </>
      )}
      <span
        className={cn(
          'flex items-center gap-1.5 font-bold',
          isTerminal ? 'text-green-9' : 'text-primary-9',
        )}
      >
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full',
            isTerminal ? 'bg-green-9' : 'bg-primary-9',
          )}
        >
          <Icon
            className='size-2.5 text-white'
            name={isTerminal ? 'tabler:flag-filled' : 'tabler:user-filled'}
          />
        </span>
        <span className='truncate'>{currentLabel}</span>
      </span>
    </div>
  )
}

GenericStagePill.displayName = 'GenericStagePill'
export default GenericStagePill
