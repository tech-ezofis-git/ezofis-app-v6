import { ActionIcon, Button, Group, Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import Page from './Page'
import { useFormStore, type Page as PageType } from '@/pages/form-builder/store/formStore'
import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import QuestionCard from './QuestionCard';

const Form = () => {
  const {
    pages,
    addPage,
    moveQuestion,
  } = useFormStore()

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (pages.length === 0) {
      addPage()
    }
  }, [pages.length, addPage])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let sourcePageId = '';
    let destPageId = '';
    let sourceQuestionIndex = -1;
    let destQuestionIndex = -1;

    for (const page of pages) {
      const qIndex = page.questions.findIndex(q => q.id === activeId)
      if (qIndex !== -1) {
        sourcePageId = page.id
        sourceQuestionIndex = qIndex
        break
      }
    }

    for (const page of pages) {
      const qIndex = page.questions.findIndex(q => q.id === overId)
      if (qIndex !== -1) {
        destPageId = page.id
        destQuestionIndex = qIndex
        break
      }
    }

    if (sourcePageId && destPageId && sourcePageId === destPageId) {
      if (sourceQuestionIndex !== destQuestionIndex) {
        moveQuestion(activeId, destPageId, destQuestionIndex)
      }
    } else if (sourcePageId && destPageId) {
      moveQuestion(activeId, destPageId, destQuestionIndex)
    }
  };

  const activeQuestion = pages.flatMap(p => p.questions).find(q => q.id === activeId)

  return (
    <div className='w-full max-w-[860px] mx-auto pb-40 px-4'>
      {/* Form Structure Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-2'>
          <Icon name="tabler:layout-list" width={18} height={18} className="text-accent-primary" />
          <Text size="lg" fw={700} className="text-gray-13">Form Structure</Text>
        </div>

        <Group gap="xs">
          {/* Auto-save badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-subtle border border-green-200">
            <div className="size-1.5 rounded-full bg-green-500" />
            <Text size="10px" fw={700} className="text-green-700 uppercase tracking-wider">
              Auto-saved 2m ago
            </Text>
          </div>

          {/* Undo / Redo */}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            className="hover:bg-gray-2 active:scale-90 transition-all"
            title="Undo"
          >
            <Icon name="tabler:arrow-back-up" width={16} height={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            className="hover:bg-gray-2 active:scale-90 transition-all"
            title="Redo"
          >
            <Icon name="tabler:arrow-forward-up" width={16} height={16} />
          </ActionIcon>
        </Group>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className='space-y-6'>
          {pages.map((page: PageType, i: number) => (
            <Page key={page.id} page={page} pageIndex={i} />
          ))}
        </div>

        <DragOverlay>
          {activeQuestion ? (
            <div className="opacity-80 rotate-1 scale-105 cursor-grabbing">
              <QuestionCard
                question={activeQuestion}
                index={0}
                isActive={true}
                onSelect={() => { }}
                onUpdate={() => { }}
                onDelete={() => { }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Page Button */}
      <div className="flex justify-center mt-8">
        <Button
          variant="outline"
          color="gray"
          size="md"
          className="border-2 border-dashed border-gray-3 hover:border-accent-primary hover:bg-accent-soft/5 hover:text-accent-primary transition-all"
          leftSection={<Icon name="tabler:circle-plus" width={18} height={18} />}
          onClick={() => addPage()}
        >
          Add New Page
        </Button>
      </div>
    </div>
  )
}

export default Form
