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
}

const SortableItem = ({ children, className, handlerClassName, id }: Props) => {
  const { attributes, listeners, transform, transition, setNodeRef } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      ref={setNodeRef}
      style={style}
    >
      {children}
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
    </div>
  )
}

SortableItem.displayName = 'SortableItem'
export default SortableItem
