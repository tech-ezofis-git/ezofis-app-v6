import { ActionIcon, Button, Text, Box, UnstyledButton } from '@mantine/core'
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
import cn from '@/utils/cn'

interface FormProps {
  setTab: (value: string | null) => void
}

const Form = ({ setTab }: FormProps) => {
  const {
    pages,
    addPage,
    moveQuestion,
    welcomePage,
    thankYouPage,
    showHeaderFooter,
    headerText,
    footerText
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
    <div className='w-full max-w-[860px] mx-auto pb-40 px-4 font-inter'>
      {/* Form Structure Header */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <div className="size-8 bg-accent-soft/20 rounded-lg flex items-center justify-center">
            <Icon name="tabler:layout-list" width={18} height={18} className="text-accent-primary" />
          </div>
          <Text size="lg" fw={800} className="text-gray-13 tracking-tight">Form Structure</Text>
        </div>

        {/* <Group gap="xs">
          {showHeaderFooter && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-2">
              <Icon name="lucide:layout-template" width={12} height={12} className="text-gray-500" />
              <Text size="10px" fw={700} className="text-gray-600 uppercase tracking-wider">H & F Active</Text>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-subtle border border-green-200">
            <div className="size-1.5 rounded-full bg-green-500" />
            <Text size="10px" fw={700} className="text-green-700 uppercase tracking-wider">
              Auto-saved
            </Text>
          </div>
        </Group> */}
      </div>

      <div className='space-y-8'>
        {/* Welcome Page Slot */}
        <CanvasSlot
          type="welcome"
          enabled={welcomePage.enabled}
          title={welcomePage.title}
          setTab={setTab}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className='space-y-6'>
            {pages.length > 0 ? (
              pages.map((page: PageType, i: number) => (
                <Page key={page.id} page={page} pageIndex={i} />
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center bg-white/40 rounded-3xl border-2 border-dashed border-gray-2 animate-in fade-in zoom-in-95 duration-500">
                <div className="size-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                  <Icon name="lucide:layout" width={40} height={40} className="text-gray-300" />
                </div>
                <Text size="xl" fw={800} className="text-gray-13 tracking-tight mb-2">No pages yet</Text>
                <Text size="sm" className="text-gray-500 max-w-xs mx-auto mb-8">
                  Your form needs at least one page to start adding questions. Click the button below to add your first page.
                </Text>
                <UnstyledButton
                  onClick={() => addPage()}
                  className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent-soft/20"
                >
                  <Icon name="lucide:plus-circle" width={18} height={18} />
                  <span>Add First Page</span>
                </UnstyledButton>
              </div>
            )}
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
        <div className="flex justify-center">
          <Button
            variant="outline"
            color="gray"
            size="md"
            className="border-2 border-dashed border-gray-200 hover:border-accent-primary hover:bg-accent-soft/5 hover:text-accent-primary transition-all rounded-xl h-12"
            leftSection={<Icon name="tabler:circle-plus" width={18} height={18} />}
            onClick={() => addPage()}
          >
            Add New Page
          </Button>
        </div>

        {/* Thank You Page Slot */}
        <CanvasSlot
          type="thank_you"
          enabled={thankYouPage.enabled}
          title={thankYouPage.title}
          setTab={setTab}
        />
      </div>

    </div>
  )
}

const CanvasSlot = ({ type, enabled, title, setTab }: { type: 'welcome' | 'thank_you', enabled: boolean, title: string, setTab: (v: string | null) => void }) => {
  const isWelcome = type === 'welcome'

  return (
    <div
      onClick={() => setTab('Settings')}
      className={cn(
        "group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
        enabled
          ? "bg-white border-gray-2 shadow-sm hover:border-accent-primary hover:shadow-md"
          : "bg-gray-50/50 border-dashed border-gray-2 border-opacity-60 hover:border-gray-200"
      )}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={cn(
          "size-10 rounded-xl flex items-center justify-center shrink-0",
          enabled ? "bg-accent-soft/30" : "bg-gray-100"
        )}>
          <Icon
            name={isWelcome ? "lucide:megaphone" : "lucide:party-popper"}
            className={enabled ? "text-accent-primary" : "text-gray-400"}
            width={20} height={20}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Text size="sm" fw={800} className={cn(
              "uppercase tracking-tight",
              enabled ? "text-gray-900" : "text-gray-400"
            )}>
              {isWelcome ? 'Welcome Page' : 'Thank You Page'}
            </Text>
            {!enabled && (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded">
                Inactive
              </span>
            )}
          </div>
          <Text size="xs" className={cn(
            "truncate mt-0.5",
            enabled ? "text-gray-600" : "text-gray-400 italic"
          )}>
            {enabled ? title : `The ${isWelcome ? 'welcome' : 'completion'} screen is currently hidden`}
          </Text>
        </div>

        {enabled && (
          <ActionIcon variant="subtle" color="gray" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Icon name="lucide:settings" width={14} height={14} />
          </ActionIcon>
        )}
      </div>

      {/* Background Accent */}
      {enabled && (
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-accent-soft/5 to-transparent pointer-events-none" />
      )}

      {/* Connection Line */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 w-[2px] h-8 bg-gray-100 z-0",
        isWelcome ? "top-full" : "bottom-full"
      )} />
    </div>
  )
}

export default Form
