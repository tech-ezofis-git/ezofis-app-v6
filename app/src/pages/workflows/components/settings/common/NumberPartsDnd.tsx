import type { ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

type NumberPartRowProps = {
  children: ReactNode
  id: string
}

// One part of the request number: a drag handle plus the part's own inputs.
export const NumberPartRow = ({ children, id }: NumberPartRowProps) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-start gap-1.5 rounded-xl border border-gray-2 bg-surface-muted p-2',
        isDragging && 'relative z-10 opacity-80 shadow-md',
      )}
    >
      <button
        aria-label='Drag to reorder'
        className='mt-1.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-gray-9 transition-colors hover:bg-gray-4 hover:text-gray-11'
        title='Drag to reorder'
        type='button'
        {...attributes}
        {...listeners}
      >
        <Icon className='size-4' name='lucide:grip-vertical' />
      </button>
      {children}
    </div>
  )
}

type NumberPartsDndProps = {
  children: ReactNode
  /** Ids of the reorderable parts, in their current order. */
  tokenIds: string[]
  onReorder: (orderedIds: string[]) => void
}

const NumberPartsDnd = ({
  children,
  onReorder,
  tokenIds,
}: NumberPartsDndProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const oldIndex = tokenIds.indexOf(String(active.id))
    const newIndex = tokenIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(tokenIds, oldIndex, newIndex))
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tokenIds} strategy={verticalListSortingStrategy}>
        <div className='space-y-2'>{children}</div>
      </SortableContext>
    </DndContext>
  )
}

export default NumberPartsDnd
