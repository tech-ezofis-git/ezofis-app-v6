import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

/** Stable, unique sortable ids for table rows (falls back to the index). */
export const useSortableRowIds = (rows: Array<{ _rowId?: unknown }>) =>
  useMemo(() => {
    const seen = new Set<string>()
    return rows.map((row, index) => {
      let id = String(row?._rowId || `row-${index}`)
      if (seen.has(id)) id = `${id}-${index}`
      seen.add(id)
      return id
    })
  }, [rows])

/** Drag-and-drop context for reordering table rows vertically. */
export const SortableRows = ({
  children,
  ids,
  onDragActiveChange,
  onMove,
}: {
  children: ReactNode
  ids: string[]
  onDragActiveChange?: (active: boolean) => void
  onMove: (fromIndex: number, toIndex: number) => void
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    onDragActiveChange?.(false)
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    onMove(from, to)
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      sensors={sensors}
      onDragCancel={() => onDragActiveChange?.(false)}
      onDragEnd={handleDragEnd}
      onDragStart={() => onDragActiveChange?.(true)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

/** Wire a <tr> into the sortable list; returns its ref, style and drag handle. */
export const useSortableRow = (id: string, disabled = false) => {
  const { t } = useLingui()
  const {
    attributes,
    isDragging,
    listeners,
    transform,
    transition,
    setActivatorNodeRef,
    setNodeRef,
  } = useSortable({ disabled, id })

  const rowProps = {
    className: cn(
      isDragging && 'relative z-30 bg-surface opacity-95 shadow-lg',
    ),
    ref: setNodeRef,
    // dnd-kit drives the drag position through a transform.
    style: { transform: CSS.Translate.toString(transform), transition },
  }

  const handle = disabled ? null : (
    <Tooltip content={t`Drag to reorder`} position='left'>
      <button
        aria-label={t`Drag to reorder`}
        ref={setActivatorNodeRef}
        type='button'
        className={cn(
          'inline-flex size-6 cursor-grab touch-none items-center justify-center rounded-md text-gray-8 transition-all group-hover:text-gray-11 hover:bg-gray-2 active:cursor-grabbing',
          isDragging && 'cursor-grabbing bg-gray-2 text-gray-12',
        )}
        {...attributes}
        {...listeners}
      >
        <Icon className='h-4 w-4' icon='tabler:grip-vertical' />
      </button>
    </Tooltip>
  )

  return { handle, isDragging, rowProps }
}

/** A sortable <tr> with a leading drag-handle cell. */
export const SortableTableRow = ({
  autoFocus = false,
  children,
  className,
  disabled = false,
  handleCellClassName,
  id,
}: {
  /** Freshly added row: scroll into view and focus its first field. */
  autoFocus?: boolean
  children: ReactNode
  className?: string
  disabled?: boolean
  handleCellClassName?: string
  id: string
}) => {
  const { handle, rowProps } = useSortableRow(id, disabled)
  const rowElRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    if (!autoFocus) return
    const frame = window.requestAnimationFrame(() => {
      const row = rowElRef.current
      if (!row) return
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      row
        .querySelector<HTMLElement>('input, textarea, select')
        ?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [autoFocus])

  return (
    <tr
      className={cn(className, rowProps.className)}
      style={rowProps.style}
      ref={(node) => {
        rowProps.ref(node)
        rowElRef.current = node
      }}
    >
      {disabled ? null : (
        <td
          className={cn(
            'w-8 border border-gray-3 p-1 text-center align-top',
            handleCellClassName,
          )}
        >
          {handle}
        </td>
      )}
      {children}
    </tr>
  )
}
