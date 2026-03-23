import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { ActionIcon, Button, Text, UnstyledButton } from '@mantine/core'
import { useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  type Panel as PanelType,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import AddPageInline from './AddPageInline'
import Page from './Page'
import QuestionCard from './QuestionCard'
// import PublishModal from './PublishModal'

const Form = () => {
  const {
    addPanel,
    moveQuestion,
    panels,
    thankYouPage,
    welcomePage,
    setActiveQuestionId,
    setSelectionType,
    setThankYouPage,
    setWelcomePage,
  } = useFormStore()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddPageAt, setShowAddPageAt] = useState<number | null>(null)
  const [addPageAnchorRect, setAddPageAnchorRect] = useState<DOMRect | null>(
    null,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    if (panels.length === 0) {
      addPanel()
    }
  }, [panels.length, addPanel])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Find source and destination panels
    let sourcePanelId = ''
    let destPanelId = ''
    let destIndex = -1

    for (const panel of panels) {
      if (panel.fields.some((f) => f.id === activeId)) {
        sourcePanelId = panel.id
      }
      const qIndex = panel.fields.findIndex((f) => f.id === overId)
      if (qIndex !== -1) {
        destPanelId = panel.id
        destIndex = qIndex
      }
    }

    // Is it over a panel container directly?
    if (!destPanelId) {
      const panel = panels.find((p) => p.id === overId)
      if (panel) {
        destPanelId = panel.id
        destIndex = panel.fields.length
      }
    }

    if (sourcePanelId && destPanelId && sourcePanelId !== destPanelId) {
      // CROSS-PANEL MOVE: Update immediately for visual feedback
      moveQuestion(activeId, destPanelId, destIndex)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find source and destination
    let sourcePanelId = ''
    let destPanelId = ''
    let destIndex = -1

    for (const panel of panels) {
      if (panel.fields.some((f) => f.id === activeId)) {
        sourcePanelId = panel.id
      }
      const qIndex = panel.fields.findIndex((f) => f.id === overId)
      if (qIndex !== -1) {
        destPanelId = panel.id
        destIndex = qIndex
      }
    }

    // Check if over a panel container
    if (!destPanelId) {
      const panel = panels.find((p) => p.id === overId)
      if (panel) {
        destPanelId = panel.id
        destIndex = panel.fields.length
      }
    }

    if (sourcePanelId && destPanelId) {
      // Final update (handles both same-panel and cross-panel)
      moveQuestion(activeId, destPanelId, destIndex)
    }
  }

  const handleAddPanel = (
    type: 'blank' | 'welcome' | 'thank_you',
    index: number,
  ) => {
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
        const { activeQuestionId, copiedQuestion, panels, pasteQuestion } =
          useFormStore.getState()
        if (!copiedQuestion) return

        // Find where to paste: after active question on its panel
        let targetPanelId = ''
        let targetIndex = -1

        for (const panel of panels) {
          const qIndex = panel.fields.findIndex(
            (f) => f.id === activeQuestionId,
          )
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

  const activeQuestion = panels
    .flatMap((p) => p.fields)
    .find((f) => f.id === activeId)

  return (
    <div className='w-full max-w-[1200px] mx-auto pb-40 px-4 font-inter'>


      <div className='space-y-8'>
        {/* Welcome Page Slot (Only if enabled) */}
        {welcomePage.enabled && (
          <CanvasSlot enabled={true} title={welcomePage.title} type='welcome' />
        )}

        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        >
          <div className='relative space-y-6'>
            {panels.length > 0 ? (
              panels.map((panel: PanelType, i: number) => (
                <div className='group/page-wrapper relative' key={panel.id}>
                  {/* Insertion trigger before each panel */}
                  <div className='group/add-page pointer-events-none absolute top-[-20px] right-0 left-0 z-[50] flex h-10 items-center justify-center opacity-0 transition-opacity duration-200 group-hover/page-wrapper:opacity-100'>
                    <div className='pointer-events-none absolute h-[1px] w-full bg-accent-primary/40 group-hover/add-page:bg-accent-primary/60' />
                    <button
                      className='pointer-events-auto flex size-8 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg transition-all hover:scale-125'
                      onClick={(e) => {
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect()
                        setAddPageAnchorRect(rect)
                        setShowAddPageAt(i)
                      }}
                    >
                      <Icon height={18} name='lucide:plus' width={18} />
                    </button>
                  </div>

                  <Page panel={panel} panelIndex={i} />

                  {/* Final insertion trigger (Only after last panel) */}
                  {i === panels.length - 1 && (
                    <div className='group/add-page pointer-events-none absolute right-0 bottom-[-24px] left-0 z-[50] flex h-10 items-center justify-center opacity-0 transition-opacity duration-200 group-hover/page-wrapper:opacity-100'>
                      <div className='pointer-events-none absolute h-[1px] w-full bg-accent-primary/40 group-hover/add-page:bg-accent-primary/60' />
                      <button
                        className='pointer-events-auto flex size-8 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg transition-all hover:scale-125'
                        onClick={(e) => {
                          const rect = (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect()
                          setAddPageAnchorRect(rect)
                          setShowAddPageAt(i + 1)
                        }}
                      >
                        <Icon height={18} name='lucide:plus' width={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className='animate-in fade-in zoom-in-95 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-2 bg-white/40 py-20 text-center duration-500'>
                <div className='bg-gray-1 mb-6 flex size-20 items-center justify-center rounded-2xl'>
                  <Icon
                    className='text-gray-4'
                    height={40}
                    name='lucide:layout'
                    width={40}
                  />
                </div>
                <Text
                  className='mb-2 tracking-tight text-gray-13'
                  fw={800}
                  size='xl'
                >
                  No sections yet
                </Text>
                <Text className='text-gray-500 mx-auto mb-8 max-w-xs' size='sm'>
                  Your form needs at least one section to start adding
                  questions. Click the button below to add your first section.
                </Text>
                <UnstyledButton
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setAddPageAnchorRect(rect)
                    setShowAddPageAt(0)
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent-soft/20"
                >
                  <Icon height={18} name='lucide:plus-circle' width={18} />
                  <span>Add First Section</span>
                </UnstyledButton>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeQuestion ? (
              <div className='z-[1000] scale-[1.02] rotate-[2deg] cursor-grabbing rounded-2xl shadow-2xl ring-2 ring-accent-primary/20'>
                <QuestionCard
                  isActive={true}
                  question={activeQuestion}
                  onDelete={() => { }}
                  onSelect={() => { }}
                  onUpdate={() => { }}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Global Add Page Button */}
        <div className='flex justify-center pt-8'>
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
            enabled={true}
            title={thankYouPage.title}
            type='thank_you'
          />
        )}
      </div>

      {showAddPageAt !== null && (
        <AddPageInline
          anchorRect={addPageAnchorRect}
          onClose={() => {
            setShowAddPageAt(null)
            setAddPageAnchorRect(null)
          }}
          onSelect={(type) => handleAddPanel(type, showAddPageAt)}
        />
      )}

      {/* <PublishModal /> */}
    </div>
  )
}

const CanvasSlot = ({
  title,
  type,
}: {
  enabled: boolean
  title: string
  type: 'welcome' | 'thank_you'
}) => {
  const isWelcome = type === 'welcome'
  const {
    selectionType,
    setActiveQuestionId,
    setSelectionType,
    setSidebarOpen,
    setThankYouPage,
    setWelcomePage,
  } = useFormStore()
  const isActive = selectionType === type

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-2xl border bg-white transition-all duration-300',
        isActive
          ? 'z-20 scale-[1.01] border-accent-primary shadow-lg ring-1 shadow-accent-soft/10 ring-accent-primary'
          : 'z-10 border-gray-2 shadow-sm hover:border-gray-3 hover:shadow-md',
      )}
      onClick={() => {
        setSelectionType(type)
        setActiveQuestionId(null)
        setSidebarOpen(true)
      }}
    >
      {/* Visual Indicator for Active */}
      {isActive && (
        <div className='absolute top-0 left-0 h-full w-1.5 rounded-l-2xl bg-accent-primary' />
      )}

      <div className='p-6'>
        <div className='flex items-start justify-between'>
          <div className='flex flex-1 items-start gap-4'>
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
                isActive
                  ? 'bg-accent-primary text-white'
                  : 'bg-gray-1 text-accent-primary',
              )}
            >
              <Icon
                height={20}
                name={isWelcome ? 'lucide:megaphone' : 'lucide:party-popper'}
                width={20}
              />
            </div>

            <div className='min-w-0 flex-1'>
              <div className='mb-1 flex items-center gap-2'>
                <div className='flex items-center gap-1.5'>
                  <Text
                    fw={800}
                    size='10px'
                    className={cn(
                      'tracking-tight uppercase',
                      isActive ? 'text-accent-primary' : 'text-gray-5',
                    )}
                  >
                    {isWelcome ? 'Welcome Screen' : 'Completion Screen'}
                  </Text>
                  {isActive && (
                    <div className='size-1 rounded-full bg-accent-primary' />
                  )}
                </div>
                <div className='rounded-full border border-gray-2 bg-gray-1 px-1.5 py-0.5 text-[8px] font-extrabold tracking-tighter text-gray-4 uppercase'>
                  Fixed Section
                </div>
              </div>

              <Text
                fw={800}
                size='lg'
                className={cn(
                  'mb-1 truncate tracking-tight',
                  isActive ? 'text-gray-13' : 'text-gray-11',
                )}
              >
                {title || (isWelcome ? 'Welcome to our form' : 'Thank you!')}
              </Text>

              <Text
                className='line-clamp-2 leading-relaxed text-gray-10'
                size='xs'
              >
                {isWelcome
                  ? 'This is the first screen your users will see. Customize the title, description, and start button in the settings.'
                  : 'Final screen shown after submission. You can add a custom message or redirect users from the completion settings.'}
              </Text>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center gap-1 transition-opacity',
              !isActive && 'opacity-0 group-hover:opacity-100',
            )}
          >
            <ActionIcon
              className='hover:bg-red-50 text-red-500 transition-all active:scale-95'
              color='red'
              size='sm'
              variant='subtle'
              onClick={(e) => {
                e.stopPropagation()
                if (isWelcome) setWelcomePage({ enabled: false })
                else setThankYouPage({ enabled: false })
                setSelectionType('general')
              }}
            >
              <Icon height={14} name='lucide:trash' width={14} />
            </ActionIcon>
            <ActionIcon
              className='transition-all hover:bg-gray-2 active:scale-95'
              color='gray'
              size='sm'
              variant='subtle'
            >
              <Icon height={14} name='lucide:settings' width={14} />
            </ActionIcon>
          </div>
        </div>
      </div>

      {/* Footer Branding Area */}
      <div
        className={cn(
          'bg-gray-50/50 flex items-center justify-between rounded-b-2xl border-t px-6 py-2',
          isActive ? 'border-accent-primary/20' : 'border-gray-1',
        )}
      >
        <Text
          className='tracking-widest text-gray-4 uppercase'
          fw={700}
          size='9px'
        >
          {isWelcome ? 'Form Entry Point' : 'Form Completion Handler'}
        </Text>
        <Icon
          className='text-gray-3'
          height={10}
          name='lucide:chevron-right'
          width={10}
        />
      </div>
    </div>
  )
}

export default Form
