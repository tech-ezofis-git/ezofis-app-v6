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

export interface SortableReorderInfo {
  activeId: string
  newIndex: number
  oldIndex: number
  overId: string
}

interface Props {
  items: string[]
  children?: ReactNode
  constrainToParent?: boolean
  onItemsChange: (items: string[], info?: SortableReorderInfo) => void
}

const SortableContainer = ({
  children,
  constrainToParent = true,
  items,
  onItemsChange,
}: Props) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
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
        onItemsChange(newState, {
          activeId: String(active.id),
          newIndex,
          oldIndex,
          overId: String(over.id),
        })
      }
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      modifiers={
        constrainToParent
          ? [restrictToVerticalAxis, restrictToParentElement]
          : [restrictToVerticalAxis]
      }
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
