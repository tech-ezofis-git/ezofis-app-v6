import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { t } from '@lingui/macro'
import { Box, Button, Stack } from '@mantine/core'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { type Field as FieldType, useFormStore } from '../store'
import Page from './Page'
import QuestionCard from './QuestionCard'

const Canvas = () => {
  const { moveField, pages, setIsDragging } = useFormStore()
  const [activeField, setActiveField] = useState<FieldType | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const field = pages.flatMap((p) => p.fields).find((f) => f.id === active.id)
    if (field) {
      setActiveField(field)
      setIsDragging(true)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveField(null)
    setIsDragging(false)

    if (over && active.id !== over.id) {
      const activePage = pages.find((p) =>
        p.fields.some((f) => f.id === active.id),
      )
      const overPage = pages.find((p) => p.fields.some((f) => f.id === over.id))

      if (activePage && overPage) {
        const oldIndex = activePage.fields.findIndex((f) => f.id === active.id)
        const newIndex = overPage.fields.findIndex((f) => f.id === over.id)

        if (activePage.id === overPage.id) {
          const newFields = arrayMove(activePage.fields, oldIndex, newIndex)
          useFormStore
            .getState()
            .updatePage(activePage.id, { fields: newFields })
        } else {
          moveField(active.id as string, overPage.id, newIndex)
        }
      }
    }
  }

  return (
    <Box className='mx-auto max-w-4xl px-6 py-12'>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <Stack gap='xl'>
          {pages.map((page, index) => (
            <Page index={index} key={page.id} page={page} />
          ))}

          <Button
            className='border-slate-300 hover:border-indigo-400 hover:bg-slate-50 h-16 rounded-xl border-2 border-dashed'
            color='gray'
            leftSection={<Icon className='size-[18px]' name='tabler:plus' />}
            size='md'
            variant='light'
            fullWidth
            onClick={() => useFormStore.getState().addField('page-1')}
          >
            {t`Add New Page`}
          </Button>
        </Stack>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.5' } },
            }),
          }}
        >
          {activeField ? (
            <QuestionCard field={activeField} isDraggingOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  )
}

export default Canvas
