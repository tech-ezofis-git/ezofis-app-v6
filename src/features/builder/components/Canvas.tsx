import { useState } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Box, Button, Stack } from '@mantine/core'
import { t } from '@lingui/macro'
import { useFormStore, type Field as FieldType } from '../store'
import Page from './Page'
import QuestionCard from './QuestionCard'
import Icon from '@/components/base/icon/Icon'

const Canvas = () => {
    const { pages, moveField, setIsDragging } = useFormStore()
    const [activeField, setActiveField] = useState<FieldType | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const field = pages.flatMap(p => p.fields).find(f => f.id === active.id)
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
            const activePage = pages.find(p => p.fields.some(f => f.id === active.id))
            const overPage = pages.find(p => p.fields.some(f => f.id === over.id))

            if (activePage && overPage) {
                const oldIndex = activePage.fields.findIndex(f => f.id === active.id)
                const newIndex = overPage.fields.findIndex(f => f.id === over.id)

                if (activePage.id === overPage.id) {
                    const newFields = arrayMove(activePage.fields, oldIndex, newIndex)
                    useFormStore.getState().updatePage(activePage.id, { fields: newFields })
                } else {
                    moveField(active.id as string, overPage.id, newIndex)
                }
            }
        }
    }

    return (
        <Box className="max-w-4xl mx-auto py-12 px-6">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <Stack gap="xl">
                    {pages.map((page, index) => (
                        <Page key={page.id} page={page} index={index} />
                    ))}

                    <Button
                        variant="light"
                        color="gray"
                        size="md"
                        className="border-2 border-dashed border-slate-300 h-16 rounded-xl hover:border-indigo-400 hover:bg-slate-50"
                        fullWidth
                        leftSection={<Icon name="tabler:plus" className="size-[18px]" />}
                        onClick={() => useFormStore.getState().addField('page-1')}
                    >
                        {t`Add New Page`}
                    </Button>
                </Stack>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: { active: { opacity: '0.5' } }
                    })
                }}>
                    {activeField ? (
                        <QuestionCard field={activeField} isDraggingOverlay />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </Box>
    )
}

export default Canvas
