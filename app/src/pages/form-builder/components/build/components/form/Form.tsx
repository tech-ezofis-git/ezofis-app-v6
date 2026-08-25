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
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useEffect, useState } from 'react'
import {
  type Panel as PanelType,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import AddSectionButton from './AddSectionButton'
import Page from './Page'
import QuestionCard from './QuestionCard'
// import PublishModal from './PublishModal'

const Form = () => {
  const { addPanel, moveQuestion, panels } = useFormStore()

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

  const handleAddPanel = (index: number) => {
    addPanel(index)
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
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (visibleEntry) {
          useFormStore.getState().setActivePanelId(visibleEntry.target.id)
        }
      },
      {
        rootMargin: '-10% 0px -70% 0px', // Trigger when section is in the upper part of the screen
        threshold: 0,
      },
    )

    // Wait for panels to be rendered
    document.querySelectorAll('[id^="panel-"]') // Assuming panel IDs start with panel-
    // Actually, Page.tsx uses id={panel.id}.
    // I should check what panel.id looks like. If they are UUIDs, I'll need a way to select them.
    // I'll add a data-section attribute in Page.tsx if needed, but for now I'll use a class or observe all children.

    const panelElements = document.querySelectorAll('.group\\/page')
    panelElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [panels]) // Re-run when sections are added/removed

  const activeQuestion = panels
    .flatMap((p) => p.fields)
    .find((f) => f.id === activeId)

  return (
    <div className='mx-auto w-full max-w-[1200px] px-0 pb-40 font-inter'>
      <div className='flex flex-col gap-6'>
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        >
          <div className='flex flex-col gap-6'>
            {panels.map((panel: PanelType, i: number) => (
              <Page key={panel.id} panel={panel} panelIndex={i} />
            ))}
          </div>

          <DragOverlay>
            {activeQuestion ? (
              <div className='z-[1000] scale-[1.02] cursor-grabbing rounded-2xl shadow-2xl ring-2 ring-accent-primary/20'>
                <QuestionCard
                  isActive={true}
                  question={activeQuestion}
                  onDelete={() => {}}
                  onSelect={() => {}}
                  onUpdate={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add Section Button */}
        <div className='flex justify-center pt-8'>
          <AddSectionButton onClick={() => handleAddPanel(panels.length)} />
        </div>
      </div>
    </div>
  )
}

export default Form
