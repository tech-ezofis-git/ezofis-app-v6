// import { Text } from '@mantine/core'
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
      onClick={(e) => onClick(e)}
      className={cn(
        "w-full flex items-center justify-center border border-dashed border-accent-primary/40 rounded-xl bg-accent-soft/5 transition-all text-accent-primary group/add",
        isSmall ? "h-8 py-1 px-3" : "h-10 py-2 px-4",
        "hover:bg-accent-soft/20 hover:border-accent-primary/60 hover:shadow-sm active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-center gap-2 transition-transform group-hover/add:scale-105">
        <div className={cn(
          "flex items-center justify-center rounded-full bg-accent-primary text-white shadow-sm",
          isSmall ? "size-5" : "size-6"
        )}>
          <Icon name="lucide:plus" width={isSmall ? 12 : 14} height={isSmall ? 12 : 14} />
        </div>
        <span className="text-[12px] font-semibold tracking-tight uppercase">
          Add Field
        </span>
      </div>
    </button>
  )
}

export default AddFieldButton
