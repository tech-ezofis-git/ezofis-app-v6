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
import { ActionIcon } from '@mantine/core'
import { useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  type Panel as PanelType,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import AddSectionButton from './AddSectionButton'
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

  // Scrollspy: Highlighting sidebar based on canvas scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is currently most prominent
        const visibleEntry = entries.find(entry => entry.isIntersecting)
        if (visibleEntry) {
          useFormStore.getState().setActivePanelId(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-10% 0px -70% 0px', // Trigger when section is in the upper part of the screen
        threshold: 0
      }
    )

    // Wait for panels to be rendered
    const sections = document.querySelectorAll('[id^="panel-"]') // Assuming panel IDs start with panel-
    // Actually, Page.tsx uses id={panel.id}. 
    // I should check what panel.id looks like. If they are UUIDs, I'll need a way to select them.
    // I'll add a data-section attribute in Page.tsx if needed, but for now I'll use a class or observe all children.
    
    const panelElements = document.querySelectorAll('.group\\/page')
    panelElements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [panels]) // Re-run when sections are added/removed

  const activeQuestion = panels
    .flatMap((p) => p.fields)
    .find((f) => f.id === activeId)

  return (
    <div className='w-full max-w-[1200px] mx-auto pb-40 px-0 font-inter'>
      <div className='flex flex-col gap-10'>
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
          <div className='flex flex-col gap-10'>
            {panels.map((panel: PanelType, i: number) => (
              <Page key={panel.id} panel={panel} panelIndex={i} />
            ))}
          </div>

          <DragOverlay>
            {activeQuestion ? (
              <div className='z-[1000] scale-[1.02] rotate-[2deg] cursor-grabbing rounded-2xl shadow-2xl ring-2 ring-accent-primary/20'>
                <QuestionCard
                  isActive={true}
                  onDelete={() => { }}
                  onSelect={() => { }}
                  onUpdate={() => { }}
                  question={activeQuestion}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Canva-style Add Section Button */}
        <div className="flex justify-center pt-8">
          <AddSectionButton
            onClick={() => handleAddPanel('blank', panels.length)}
            onSelectTemplate={(type) => handleAddPanel(type, panels.length)}
          />
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
                  <div
                    className={cn(
                      'text-[10px] font-extrabold tracking-tight uppercase',
                      isActive ? 'text-accent-primary' : 'text-gray-5',
                    )}
                  >
                    {isWelcome ? 'Welcome Screen' : 'Completion Screen'}
                  </div>
                  {isActive && (
                    <div className='size-1 rounded-full bg-accent-primary' />
                  )}
                </div>
                <div className='rounded-full border border-gray-2 bg-gray-1 px-1.5 py-0.5 text-[8px] font-extrabold tracking-tighter text-gray-4 uppercase'>
                  Fixed Section
                </div>
              </div>

              <div
                className={cn(
                  'mb-1 truncate text-lg font-extrabold tracking-tight',
                  isActive ? 'text-gray-13' : 'text-gray-11',
                )}
              >
                {title || (isWelcome ? 'Welcome to our form' : 'Thank you!')}
              </div>

              <div
                className='line-clamp-2 text-xs leading-relaxed text-gray-10'
              >
                {isWelcome
                  ? 'This is the first screen your users will see. Customize the title, description, and start button in the settings.'
                  : 'Final screen shown after submission. You can add a custom message or redirect users from the completion settings.'}
              </div>
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
        <div
          className='text-[9px] font-bold tracking-widest text-gray-4 uppercase'
        >
          {isWelcome ? 'Form Entry Point' : 'Form Completion Handler'}
        </div>
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
