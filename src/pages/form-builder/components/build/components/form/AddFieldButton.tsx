import { Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  className?: string
  size?: 'sm' | 'md'
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const AddFieldButton = ({ className, size = 'md', onClick }: Props) => {
  const isSmall = size === 'sm'

  return (
    <button
      className={cn(
        'group/add flex w-full items-center justify-center rounded-xl border border-dashed border-accent-primary/40 bg-accent-soft/5 text-accent-primary transition-all',
        isSmall ? 'h-9 px-3 py-1' : 'h-12 px-4 py-3',
        'hover:border-accent-primary/60 hover:bg-accent-soft/20 hover:shadow-sm active:scale-[0.98]',
        className,
      )}
      onClick={(e) => onClick(e)}
    >
      <div className='flex items-center gap-2.5 transition-transform group-hover/add:scale-105'>
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-accent-primary text-white shadow-sm',
            isSmall ? 'size-5' : 'size-6',
          )}
        >
          <Icon
            height={isSmall ? 12 : 14}
            name='lucide:plus'
            width={isSmall ? 12 : 14}
          />
        </div>
        <Text className='text-13 font-semibold tracking-tight uppercase'>
          Add Field
        </Text>
      </div>
    </button>
  )
}

export default AddFieldButton
