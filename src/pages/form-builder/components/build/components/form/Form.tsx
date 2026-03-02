import { ActionIcon, Button, Text, UnstyledButton } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import Page from './Page'
import { useFormStore, type Panel as PanelType } from '@/pages/form-builder/store/formStore'
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
import AddPageInline from './AddPageInline'
// import PublishModal from './PublishModal'

const Form = () => {
  const {
    panels,
    addPanel,
    moveQuestion,
    welcomePage,
    thankYouPage,
    setWelcomePage,
    setThankYouPage,
    setSelectionType,
    setActiveQuestionId
  } = useFormStore()

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddPageAt, setShowAddPageAt] = useState<number | null>(null)
  const [addPageAnchorRect, setAddPageAnchorRect] = useState<DOMRect | null>(null)

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
    if (panels.length === 0) {
      addPanel()
    }
  }, [panels.length, addPanel])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Find source and destination panels
    let sourcePanelId = '';
    let destPanelId = '';
    let destIndex = -1;

    for (const panel of panels) {
      if (panel.fields.some(f => f.id === activeId)) {
        sourcePanelId = panel.id;
      }
      const qIndex = panel.fields.findIndex(f => f.id === overId);
      if (qIndex !== -1) {
        destPanelId = panel.id;
        destIndex = qIndex;
      }
    }

    // Is it over a panel container directly?
    if (!destPanelId) {
      const panel = panels.find(p => p.id === overId);
      if (panel) {
        destPanelId = panel.id;
        destIndex = panel.fields.length;
      }
    }

    if (sourcePanelId && destPanelId && sourcePanelId !== destPanelId) {
      // CROSS-PANEL MOVE: Update immediately for visual feedback
      moveQuestion(activeId, destPanelId, destIndex);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination
    let sourcePanelId = '';
    let destPanelId = '';
    let destIndex = -1;

    for (const panel of panels) {
      if (panel.fields.some(f => f.id === activeId)) {
        sourcePanelId = panel.id;
      }
      const qIndex = panel.fields.findIndex(f => f.id === overId);
      if (qIndex !== -1) {
        destPanelId = panel.id;
        destIndex = qIndex;
      }
    }

    // Check if over a panel container
    if (!destPanelId) {
      const panel = panels.find(p => p.id === overId);
      if (panel) {
        destPanelId = panel.id;
        destIndex = panel.fields.length;
      }
    }

    if (sourcePanelId && destPanelId) {
      // Final update (handles both same-panel and cross-panel)
      moveQuestion(activeId, destPanelId, destIndex);
    }
  };

  const handleAddPanel = (type: 'blank' | 'welcome' | 'thank_you', index: number) => {
    if (type === 'blank') {
      addPanel(index)
    } else if (type === 'welcome') {
      setWelcomePage({ enabled: true })
      setSelectionType('welcome')
      setActiveQuestionId(null)
    } else if (type === 'thank_you') {
      setThankYouPage({ enabled: true })
      setSelectionType('thank_you')
      setActiveQuestionId(null)
    }
    setShowAddPageAt(null)
    setAddPageAnchorRect(null)
  }

  // Handle Ctrl+V Paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const { copiedQuestion, pasteQuestion, activeQuestionId, panels } = useFormStore.getState()
        if (!copiedQuestion) return

        // Find where to paste: after active question on its panel
        let targetPanelId = ''
        let targetIndex = -1

        for (const panel of panels) {
          const qIndex = panel.fields.findIndex(f => f.id === activeQuestionId)
          if (qIndex !== -1) {
            targetPanelId = panel.id
            targetIndex = qIndex + 1 // Paste below
            break
          }
        }

        // If no active question, paste at end of first panel
        if (!targetPanelId && panels.length > 0) {
          targetPanelId = panels[0].id
          targetIndex = panels[0].fields.length
        }

        if (targetPanelId) {
          pasteQuestion(targetPanelId, targetIndex)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const activeQuestion = panels.flatMap(p => p.fields).find(f => f.id === activeId)

  return (
    <div className='w-full max-w-[1200px] mx-auto pb-40 px-4 font-inter'>


      <div className='space-y-8'>
        {/* Welcome Page Slot (Only if enabled) */}
        {welcomePage.enabled && (
          <CanvasSlot
            type="welcome"
            enabled={true}
            title={welcomePage.title}
          />
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className='space-y-6 relative'>
            {panels.length > 0 ? (
              panels.map((panel: PanelType, i: number) => (
                <div key={panel.id} className="relative group/page-wrapper">
                  {/* Insertion trigger before each panel */}
                  <div className="absolute top-[-20px] left-0 right-0 h-10 z-[50] flex items-center justify-center opacity-0 group-hover/page-wrapper:opacity-100 transition-opacity duration-200 pointer-events-none group/add-page">
                    <div className="w-full h-[1px] bg-accent-primary/40 absolute pointer-events-none group-hover/add-page:bg-accent-primary/60" />
                    <button
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setAddPageAnchorRect(rect)
                        setShowAddPageAt(i)
                      }}
                      className="size-8 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-lg hover:scale-125 transition-all pointer-events-auto"
                    >
                      <Icon name="lucide:plus" width={18} height={18} />
                    </button>
                  </div>

                  <Page panel={panel} panelIndex={i} />

                  {/* Final insertion trigger (Only after last panel) */}
                  {i === panels.length - 1 && (
                    <div className="absolute bottom-[-24px] left-0 right-0 h-10 z-[50] flex items-center justify-center opacity-0 group-hover/page-wrapper:opacity-100 transition-opacity duration-200 pointer-events-none group/add-page">
                      <div className="w-full h-[1px] bg-accent-primary/40 absolute pointer-events-none group-hover/add-page:bg-accent-primary/60" />
                      <button
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setAddPageAnchorRect(rect)
                          setShowAddPageAt(i + 1)
                        }}
                        className="size-8 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-lg hover:scale-125 transition-all pointer-events-auto"
                      >
                        <Icon name="lucide:plus" width={18} height={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center bg-white/40 rounded-3xl border-2 border-dashed border-gray-2 animate-in fade-in zoom-in-95 duration-500">
                <div className="size-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                  <Icon name="lucide:layout" width={40} height={40} className="text-gray-300" />
                </div>
                <Text size="xl" fw={800} className="text-gray-13 tracking-tight mb-2">No sections yet</Text>
                <Text size="sm" className="text-gray-500 max-w-xs mx-auto mb-8">
                  Your form needs at least one section to start adding questions. Click the button below to add your first section.
                </Text>
                <UnstyledButton
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setAddPageAnchorRect(rect)
                    setShowAddPageAt(0)
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent-soft/20"
                >
                  <Icon name="lucide:plus-circle" width={18} height={18} />
                  <span>Add First Section</span>
                </UnstyledButton>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeQuestion ? (
              <div className="z-[1000] rotate-[2deg] scale-[1.02] cursor-grabbing shadow-2xl rounded-2xl ring-2 ring-accent-primary/20">
                <QuestionCard
                  question={activeQuestion}
                  isActive={true}
                  onSelect={() => { }}
                  onUpdate={() => { }}
                  onDelete={() => { }}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Global Add Page Button */}
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            color="gray"
            size="md"
            className="w-full flex items-center justify-center border border-dashed border-accent-primary rounded-xl bg-accent-soft/5 hover:bg-accent-soft/10 transition-all text-accent-primary group/add h-12 py-3 px-4 font-bold uppercase tracking-widest text-[11px]"
            leftSection={<Icon name="lucide:plus" width={18} height={18} />}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setAddPageAnchorRect(rect)
              setShowAddPageAt(panels.length)
            }}
          >
            Add New Section
          </Button>
        </div>

        {/* Thank You Page Slot (Only if enabled) */}
        {thankYouPage.enabled && (
          <CanvasSlot
            type="thank_you"
            enabled={true}
            title={thankYouPage.title}
          />
        )}
      </div>

      {showAddPageAt !== null && (
        <AddPageInline
          onSelect={(type) => handleAddPanel(type, showAddPageAt)}
          onClose={() => {
            setShowAddPageAt(null)
            setAddPageAnchorRect(null)
          }}
          anchorRect={addPageAnchorRect}
        />
      )}

      {/* <PublishModal /> */}
    </div>
  )
}

const CanvasSlot = ({ type, title }: { type: 'welcome' | 'thank_you', enabled: boolean, title: string }) => {
  const isWelcome = type === 'welcome'
  const { setSelectionType, setActiveQuestionId, selectionType, setWelcomePage, setThankYouPage, setSidebarOpen } = useFormStore()
  const isActive = selectionType === type

  return (
    <div
      onClick={() => {
        setSelectionType(type)
        setActiveQuestionId(null)
        setSidebarOpen(true)
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
                <div className="flex items-center gap-1.5">
                  <Text size="10px" fw={800} className={cn(
                    "uppercase tracking-tight",
                    isActive ? "text-accent-primary" : "text-gray-5"
                  )}>
                    {isWelcome ? 'Welcome Screen' : 'Completion Screen'}
                  </Text>
                  {isActive && (
                    <div className="size-1 rounded-full bg-accent-primary" />
                  )}
                </div>
                <div className="px-1.5 py-0.5 rounded-full bg-gray-1 border border-gray-2 text-[8px] font-extrabold text-gray-4 tracking-tighter uppercase">
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
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              className="hover:bg-red-50 text-red-500 active:scale-95 transition-all"
              onClick={(e) => {
                e.stopPropagation()
                if (isWelcome) setWelcomePage({ enabled: false })
                else setThankYouPage({ enabled: false })
                setSelectionType('general')
              }}
            >
              <Icon name="lucide:trash" width={14} height={14} />
            </ActionIcon>
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
