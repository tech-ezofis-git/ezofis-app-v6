import { ActionIcon, Button, Text,  UnstyledButton } from '@mantine/core'
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
  type DragOverEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import QuestionCard from './QuestionCard';
import cn from '@/utils/cn'
// import PublishModal from './PublishModal'

const Form = () => {
  const {
    pages,
    addPage,
    moveQuestion,
    welcomePage,
    thankYouPage,
    // setSelectionType,
    // setActiveQuestionId
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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Find source and destination pages
    let sourcePageId = '';
    let destPageId = '';
    let destIndex = -1;

    for (const page of pages) {
      if (page.questions.some(q => q.id === activeId)) {
        sourcePageId = page.id;
      }
      const qIndex = page.questions.findIndex(q => q.id === overId);
      if (qIndex !== -1) {
        destPageId = page.id;
        destIndex = qIndex;
      }
    }

    // Is it over a page container directly?
    if (!destPageId) {
      const page = pages.find(p => p.id === overId);
      if (page) {
        destPageId = page.id;
        destIndex = page.questions.length;
      }
    }

    if (sourcePageId && destPageId && sourcePageId !== destPageId) {
      // CROSS-PAGE MOVE: Update immediately for visual feedback
      moveQuestion(activeId, destPageId, destIndex);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination
    let sourcePageId = '';
    let destPageId = '';
    let destIndex = -1;

    for (const page of pages) {
      if (page.questions.some(q => q.id === activeId)) {
        sourcePageId = page.id;
      }
      const qIndex = page.questions.findIndex(q => q.id === overId);
      if (qIndex !== -1) {
        destPageId = page.id;
        destIndex = qIndex;
      }
    }

    // Check if over a page container
    if (!destPageId) {
      const page = pages.find(p => p.id === overId);
      if (page) {
        destPageId = page.id;
        destIndex = page.questions.length;
      }
    }

    if (sourcePageId && destPageId) {
      // Final update (handles both same-page and cross-page)
      moveQuestion(activeId, destPageId, destIndex);
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
      </div>

      <div className='space-y-8'>
        {/* Welcome Page Slot */}
        <CanvasSlot
          type="welcome"
          enabled={welcomePage.enabled}
          title={welcomePage.title}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
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
              <div className="z-[1000] rotate-[2deg] scale-[1.02] cursor-grabbing shadow-2xl rounded-2xl ring-2 ring-accent-primary/20">
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
            className="border-2 border-dashed border-gray-7 hover:border-accent-primary hover:bg-accent-soft/5 hover:text-accent-primary transition-all rounded-xl h-12"
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
        />
      </div>

      {/* <PublishModal /> */}
    </div>
  )
}

const CanvasSlot = ({ type, enabled, title }: { type: 'welcome' | 'thank_you', enabled: boolean, title: string }) => {
  const isWelcome = type === 'welcome'
  const { setSelectionType, setActiveQuestionId, selectionType } = useFormStore()
  const isActive = selectionType === type

  if (!enabled && !isActive) {
    return (
      <UnstyledButton
        onClick={() => {
          setSelectionType(type)
          setActiveQuestionId(null)
        }}
        className="w-full py-4 border-2 border-dashed border-gray-2 rounded-2xl flex items-center justify-center gap-3 text-gray-4 hover:border-accent-primary hover:text-accent-primary transition-all group"
      >
        <Icon name={isWelcome ? "lucide:megaphone" : "lucide:party-popper"} width={16} height={16} className="opacity-50 group-hover:opacity-100" />
        <Text size="xs" fw={700} className="uppercase tracking-widest">Toggle {isWelcome ? 'Welcome' : 'Thank You'} Page</Text>
      </UnstyledButton>
    )
  }

  return (
    <div
      onClick={() => {
        setSelectionType(type)
        setActiveQuestionId(null)
      }}
      className={cn(
        "group relative bg-white rounded-2xl border transition-all duration-300 cursor-pointer",
        isActive
          ? "border-accent-primary shadow-lg ring-1 ring-accent-primary shadow-accent-soft/10 scale-[1.01] z-20"
          : "border-gray-2 shadow-sm hover:border-gray-3 hover:shadow-md z-10"
      )}
    >
      {/* Visual Indicator for Active */}
      {isActive && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-primary rounded-l-2xl" />
      )}

      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              isActive ? "bg-accent-primary text-white" : "bg-gray-1 text-accent-primary"
            )}>
              <Icon
                name={isWelcome ? "lucide:megaphone" : "lucide:party-popper"}
                width={20} height={20}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Text size="10px" fw={900} className={cn(
                  "uppercase tracking-[0.15em]",
                  isActive ? "text-accent-primary" : "text-gray-5"
                )}>
                  {isWelcome ? 'Welcome Screen' : 'Completion Screen'}
                </Text>
                <div className="px-1.5 py-0.5 rounded-full bg-gray-1 border border-gray-2 text-[8px] font-black text-gray-4 tracking-tighter uppercase">
                  Fixed Section
                </div>
              </div>

              <Text size="lg" fw={800} className={cn("tracking-tight mb-1 truncate", isActive ? "text-gray-13" : "text-gray-11")}>
                {title || (isWelcome ? 'Welcome to our form' : 'Thank you!')}
              </Text>

              <Text size="xs" className="text-gray-5 line-clamp-2 leading-relaxed">
                {isWelcome
                  ? "This is the first screen your users will see. Customize the title, description, and start button in the settings."
                  : "Final screen shown after submission. You can add a custom message or redirect users from the completion settings."}
              </Text>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-1 transition-opacity",
            !isActive && "opacity-0 group-hover:opacity-100"
          )}>
            <ActionIcon variant="subtle" color="gray" size="sm" className="hover:bg-gray-2 active:scale-95 transition-all">
              <Icon name="lucide:settings" width={14} height={14} />
            </ActionIcon>
          </div>
        </div>
      </div>

      {/* Footer Branding Area */}
      <div className={cn(
        "px-6 py-2 rounded-b-2xl border-t bg-gray-50/50 flex items-center justify-between",
        isActive ? "border-accent-primary/20" : "border-gray-1"
      )}>
        <Text size="9px" fw={700} className="text-gray-4 uppercase tracking-widest">
          {isWelcome ? 'Form Entry Point' : 'Form Completion Handler'}
        </Text>
        <Icon name="lucide:chevron-right" width={10} height={10} className="text-gray-3" />
      </div>
    </div>
  )
}

export default Form
