import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  id: string
  className?: string
  handlerClassName?: string
  handlerPosition?: 'before' | 'after'
  trailing?: ReactNode
}

const SortableItem = ({
  children,
  className,
  handlerClassName,
  handlerPosition = 'after',
  id,
  trailing,
}: Props) => {
  const { attributes, listeners, transform, transition, setNodeRef } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handler = (
    <div
      className={cn(
        'group flex size-8 shrink-0 cursor-grab items-center justify-center rounded outline-primary-8 transition-colors hover:bg-gray-4',
        handlerClassName,
      )}
      {...attributes}
      {...listeners}
    >
      <Icon
        className='group-hover:text-gray text-gray-9 transition-colors'
        name='lucide:grip-vertical'
      />
    </div>
  )

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      ref={setNodeRef}
      style={style}
    >
      {handlerPosition === 'before' ? handler : null}
      {children}
      {handlerPosition === 'after' ? handler : null}
      {trailing}
    </div>
  )
}

SortableItem.displayName = 'SortableItem'
export default SortableItem
