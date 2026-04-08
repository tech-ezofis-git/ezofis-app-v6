import { ActionIcon, Tooltip } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import QuestionCard from './QuestionCard'
import SectionHeader from './SectionHeader'
import AddFieldButton from './AddFieldButton'
import { useFormStore, type Question, type Panel as PanelType } from '@/pages/form-builder/store/formStore'
import SlashCommand from './SlashCommand'
import { useRef, useEffect } from 'react'
import cn from '@/utils/cn'
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  panel: PanelType
  panelIndex: number
}

const Page = ({ panel }: Props) => {
  const {
    activeQuestionId,
    deleteQuestion,
    isBuilderMode,
    lastAddedPanelId,
    updatePanel,
    duplicatePanel,
    deletePanel,
    setSidebarView,
    setAddFieldPosition,
    setLeftSidebarCollapsed,
    clearLastAddedPanelId,
    updateQuestion,
    setActiveQuestionId,
  } = useFormStore()

  const pageRef = useRef<HTMLDivElement>(null)
  const isLocked = panel.settings.isLocked || false
  const isCollapsed = false // Force expanded or get from store if needed

  // Mapping for field widths to 12-column grid spans
  const getColumnSpan = (size: string) => {
    switch (size) {
      case 'col-6':
        return 'col-span-12 md:col-span-6'
      case 'col-4':
        return 'col-span-12 md:col-span-4'
      case 'col-3':
        return 'col-span-12 md:col-span-3'
      default:
        return 'col-span-12'
    }
  }

  // Handle auto-scroll when page is added via AI
  useEffect(() => {
    if (lastAddedPanelId === panel.id && pageRef.current) {
      pageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearLastAddedPanelId()
    }
  }, [lastAddedPanelId, panel.id, clearLastAddedPanelId])

  const triggerAddFieldSidebar = (index: number) => {
    setSidebarView('fields')
    setAddFieldPosition({ panelId: panel.id, index })
    setLeftSidebarCollapsed(false)
  }

  return (
    <div
      className='group/page relative mb-6 rounded-2xl border border-gray-3 bg-white font-inter shadow-md transition-all duration-300'
      id={panel.id}
      ref={pageRef}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 0. Floating Canva Actions */}
      <div className="absolute -top-10 right-0 flex items-center gap-2 z-20 transition-all">
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/70 backdrop-blur-md rounded-xl border border-gray-2/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] group-hover/page:opacity-100 opacity-0 md:opacity-100 transition-all duration-300">
          <Tooltip label={isLocked ? "Unlock Page" : "Lock Page"} position="top" withArrow>
            <ActionIcon
              variant="subtle"
              color={isLocked ? "violet" : "gray"}
              size="md"
              onClick={() => updatePanel(panel.id, { isLocked: !isLocked })}
              className={cn(
                "rounded-lg active:scale-95 transition-all w-8 h-8",
                isLocked ? "text-accent-primary bg-accent-soft/30 font-bold" : "text-gray-12 hover:bg-gray-1"
              )}
            >
              <Icon name={isLocked ? "lucide:lock" : "lucide:lock-open"} width={16} height={16} className={isLocked ? "animate-in zoom-in-75" : ""} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Duplicate Page" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={() => duplicatePanel(panel.id)}
              disabled={isLocked}
              className="text-gray-12 hover:bg-gray-1 rounded-lg active:scale-95 transition-all w-8 h-8 disabled:opacity-30"
            >
              <Icon name="lucide:copy" width={16} height={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Page Actions" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              className="text-gray-12 hover:bg-gray-1 rounded-lg active:scale-95 transition-all w-8 h-8"
            >
              <Icon name="lucide:upload" width={16} height={16} />
            </ActionIcon>
          </Tooltip>

          <div className="w-px h-4 bg-gray-2/50 mx-0.5" />

          <Tooltip label="Delete Section" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              onClick={() => deletePanel(panel.id)}
              disabled={isLocked}
              className="text-red-500 hover:bg-red-50 rounded-lg active:scale-95 transition-all w-8 h-8 disabled:opacity-30"
            >
              <Icon name="lucide:trash-2" width={16} height={16} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      <div className="bg-white mt-2 rounded-2xl border border-gray-2 shadow-sm relative transition-all duration-300">
        {/* 1. Section Header */}
        <SectionHeader
          panel={panel}
          fieldCount={panel.fields.length}
          isCollapsed={isCollapsed}
          isLocked={isLocked}
          onToggleCollapse={() => { }} // User can't toggle yet if I force isCollapsed false, but prop is required
        />

        {/* 2. Page Canvas / Field Grid */}
        {!isCollapsed && (
          <div className="relative z-10 p-5 pt-2">
            <SortableContext items={panel.fields.map(q => q.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-12 gap-x-4 gap-y-5 w-full">
                {/* Render Fields */}
                {panel.fields.map((q: Question, i: number) => (
                  <div
                    key={q.id}
                    className={cn(
                      "transition-all duration-500 relative group/field",
                      getColumnSpan(q.settings.general.size)
                    )}
                  >
                    {/* Drop Zone Above */}
                    <div className="absolute -top-2.5 left-0 w-full h-5 z-20 flex items-center justify-center opacity-0 hover:opacity-100 group/insert transition-all pointer-events-none">
                      <div className="w-full h-[1.5px] bg-accent-soft shadow-[0_0_8px_rgba(124,92,255,0.4)] mx-4 rounded-full" />
                      <ActionIcon
                        size="xs"
                        radius="xl"
                        color="violet"
                        variant="filled"
                        className="absolute shadow-sm scale-75 group-hover/insert:scale-100 transition-all hover:bg-accent-primary pointer-events-auto"
                        onClick={() => triggerAddFieldSidebar(i)}
                        title="Insert Field Here"
                      >
                        <Icon name="lucide:plus" width={10} height={10} />
                      </ActionIcon>
                    </div>

                    <SortableQuestionItem
                      question={q}
                      activeQuestionId={activeQuestionId}
                      setActiveQuestionId={setActiveQuestionId}
                      updateQuestion={updateQuestion}
                      deleteQuestion={deleteQuestion}
                      isBuilderMode={isBuilderMode}
                      isLocked={isLocked}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>

            {/* 3. Slash Command & Add Field Button */}
            {!isLocked && (
              <div className="mt-6 flex flex-col gap-4">
                <SlashCommand
                  panelId={panel.id}
                  index={panel.fields.length}
                />

                <AddFieldButton
                  onClick={() => triggerAddFieldSidebar(panel.fields.length)}
                />
              </div>
            )}

            {isLocked && (
              <div className="mt-6 flex items-center justify-center py-4 border border-dashed border-gray-2 rounded-xl bg-gray-50/50">
                <div className="flex items-center gap-2 text-gray-4 font-medium text-13">
                  <Icon name="lucide:lock" width={14} height={14} />
                  <span>Section is locked</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const SortableQuestionItem = ({
  activeQuestionId,
  deleteQuestion,
  isBuilderMode,
  question,
  updateQuestion,
  setActiveQuestionId,
  isLocked,
}: any) => {
  const {
    attributes,
    isDragging,
    listeners,
    transform,
    transition,
    setNodeRef,
  } = useSortable({ id: question.id })

  const style = {
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
  }

  return (
    <div
      className='relative w-full transition-all duration-300'
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <QuestionCard
        dragListeners={isLocked ? undefined : listeners}
        isActive={activeQuestionId === question.id}
        isBuilderMode={isBuilderMode}
        isLocked={isLocked}
        question={question}
        onDelete={() => deleteQuestion(question.id)}
        onSelect={() => {
          setActiveQuestionId(question.id)
          useFormStore.getState().setSelectionType('question')
          useFormStore.getState().setSidebarOpen(true)
        }}
        onUpdate={(updates: Partial<Question>) =>
          updateQuestion(question.id, updates)
        }
      />
    </div>
  )
}

export default Page
