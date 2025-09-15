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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

interface Props {
  items: string[]
  children?: ReactNode
  onItemsChange: (items: string[]) => void
}

const SortableContainer = ({ children, items, onItemsChange }: Props) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && over?.id) {
      const oldIndex = items.findIndex((item) => item === active.id)
      const newIndex = items.findIndex((item) => item === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newState = arrayMove(items, oldIndex, newIndex)
        onItemsChange(newState)
      }
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

SortableContainer.displayName = 'SortableContainer'
export default SortableContainer
