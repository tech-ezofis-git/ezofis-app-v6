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
        'group/add flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-3 text-gray-10 transition-all duration-200',
        isSmall ? 'h-8.5 px-3 py-1.5' : 'h-10 px-4 py-2',
        'text-xs font-medium hover:border-primary-9 hover:bg-primary-3/40 hover:text-primary-9 active:scale-[0.99]',
        'outline-none focus-visible:ring-2 focus-visible:ring-primary-4',
        className,
      )}
      onClick={(e) => onClick(e)}
    >
      <Icon
        className='transition-transform duration-200 group-hover/add:scale-110'
        height={14}
        name='lucide:plus'
        width={14}
      />
      <span className='font-semibold'>Add field</span>
    </button>
  )
}

export default AddFieldButton
