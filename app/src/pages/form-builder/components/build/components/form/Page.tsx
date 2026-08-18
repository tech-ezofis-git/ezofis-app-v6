import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon, Tooltip } from '@mantine/core'
import { useEffect, useRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  type Panel as PanelType,
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import AddFieldButton from './AddFieldButton'
import QuestionCard from './QuestionCard'
import SectionHeader from './SectionHeader'
import SlashCommand from './SlashCommand'

interface Props {
  panel: PanelType
  panelIndex: number
}

const Page = ({ panel, panelIndex }: Props) => {
  const {
    activeQuestionId,
    addPanel,
    clearLastAddedPanelId,
    deletePanel,
    deleteQuestion,
    duplicatePanel,
    isBuilderMode,
    lastAddedPanelId,
    movePanel,
    panels,
    updatePanel,
    updateQuestion,
    setActiveQuestionId,
    setAddFieldPosition,
    setLeftSidebarCollapsed,
    setSidebarView,
  } = useFormStore()

  const pageRef = useRef<HTMLDivElement>(null)
  const isLocked = panel?.settings?.isLocked || false
  const isCollapsed = panel?.settings?.isCollapsed || false

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
    setAddFieldPosition({ index, panelId: panel.id })
    setLeftSidebarCollapsed(false)
  }

  return (
    <div
      className='group/page relative rounded-2xl border border-gray-3 bg-white font-inter shadow-md transition-all duration-300 focus-within:z-30'
      id={panel.id}
      ref={pageRef}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 0. Floating Canva Actions */}
      <div className='absolute -top-10 right-0 z-20 flex items-center gap-2 transition-all'>
        <div className='flex items-center gap-1.5 rounded-xl border border-gray-2/20 bg-white/70 px-2 py-1.5 opacity-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md transition-all duration-300 group-hover/page:opacity-100'>
          {/* Section Reordering */}
          <div className='flex items-center gap-0.5'>
            <Tooltip label='Move Section Up' position='top' withArrow>
              <ActionIcon
                className='h-8 w-8 rounded-lg text-gray-12 transition-all hover:bg-primary-3/50 hover:text-primary-9 active:scale-95 disabled:opacity-30'
                color='gray'
                disabled={panelIndex === 0}
                size='md'
                variant='subtle'
                onClick={() => movePanel(panel.id, 'up')}
              >
                <Icon height={16} name='lucide:arrow-up' width={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label='Move Section Down' position='top' withArrow>
              <ActionIcon
                className='h-8 w-8 rounded-lg text-gray-12 transition-all hover:bg-primary-3/50 hover:text-primary-9 active:scale-95 disabled:opacity-30'
                color='gray'
                disabled={panelIndex === panels.length - 1}
                size='md'
                variant='subtle'
                onClick={() => movePanel(panel.id, 'down')}
              >
                <Icon height={16} name='lucide:arrow-down' width={16} />
              </ActionIcon>
            </Tooltip>
          </div>

          <div className='mx-0.5 h-4 w-px bg-gray-2/50' />

          <Tooltip
            position='top'
            withArrow
            label={
              isLocked
                ? 'Unlock section for editing in the builder'
                : 'Lock section from edits in the builder (fields stay editable by end users)'
            }
          >
            <ActionIcon
              color={isLocked ? 'violet' : 'gray'}
              size='md'
              variant='subtle'
              className={cn(
                'h-8 w-8 rounded-lg transition-all active:scale-95',
                isLocked
                  ? 'bg-accent-soft/30 font-bold text-accent-primary'
                  : 'text-gray-12 hover:bg-primary-3/50 hover:text-primary-9',
              )}
              onClick={() => updatePanel(panel.id, { isLocked: !isLocked })}
            >
              <Icon
                className={isLocked ? 'animate-in zoom-in-75' : ''}
                height={16}
                name={isLocked ? 'lucide:lock' : 'lucide:lock-open'}
                width={16}
              />
            </ActionIcon>
          </Tooltip>

          <Tooltip label='Duplicate Page' position='top' withArrow>
            <ActionIcon
              className='h-8 w-8 rounded-lg text-gray-12 transition-all hover:bg-gray-1 active:scale-95 disabled:opacity-30'
              color='gray'
              disabled={isLocked}
              size='md'
              variant='subtle'
              onClick={() => duplicatePanel(panel.id)}
            >
              <Icon height={16} name='lucide:copy' width={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label='Add Section Below' position='top' withArrow>
            <ActionIcon
              className='h-8 w-8 rounded-lg text-gray-12 transition-all hover:bg-gray-1 active:scale-95'
              color='gray'
              size='md'
              variant='subtle'
              onClick={() => addPanel(panelIndex + 1)}
            >
              <Icon height={16} name='lucide:plus-square' width={16} />
            </ActionIcon>
          </Tooltip>

          <div className='mx-0.5 h-4 w-px bg-gray-2/50' />

          <Tooltip label='Delete Section' position='top' withArrow>
            <ActionIcon
              className='text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg transition-all active:scale-95 disabled:opacity-30'
              color='red'
              disabled={isLocked}
              size='md'
              variant='subtle'
              onClick={() => deletePanel(panel.id)}
            >
              <Icon height={16} name='lucide:trash-2' width={16} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      <div className='relative mt-2 rounded-2xl border border-gray-2 bg-white shadow-sm transition-all duration-300'>
        {/* 1. Section Header */}
        <SectionHeader
          fieldCount={panel.fields.length}
          isCollapsed={isCollapsed}
          isLocked={isLocked}
          panel={panel}
          onToggleCollapse={() =>
            updatePanel(panel.id, { isCollapsed: !isCollapsed })
          }
        />

        {/* 2. Page Canvas / Field Grid */}
        {!isCollapsed && (
          <div className='relative z-10 p-5 pt-2'>
            <SortableContext
              items={panel.fields.map((q) => q.id)}
              strategy={rectSortingStrategy}
            >
              <div className='grid w-full grid-cols-12 gap-x-4 gap-y-3'>
                {/* Render Fields */}
                {panel.fields.map((q: Question, i: number) => (
                  <div
                    key={q.id}
                    className={cn(
                      'group/field relative transition-all duration-500',
                      getColumnSpan(q.settings.general.size),
                    )}
                  >
                    {/* Drop Zone Above */}
                    <div className='group/insert pointer-events-none absolute -top-2.5 left-0 z-20 flex h-5 w-full items-center justify-center opacity-0 transition-all hover:opacity-100'>
                      <div className='mx-4 h-[1.5px] w-full rounded-full bg-accent-soft shadow-[0_0_8px_rgba(124,92,255,0.4)]' />
                      <ActionIcon
                        className='pointer-events-auto absolute scale-75 shadow-sm transition-all group-hover/insert:scale-100 hover:bg-accent-primary'
                        color='violet'
                        radius='xl'
                        size='xs'
                        title='Insert Field Here'
                        variant='filled'
                        onClick={() => triggerAddFieldSidebar(i)}
                      >
                        <Icon height={10} name='lucide:plus' width={10} />
                      </ActionIcon>
                    </div>

                    <SortableQuestionItem
                      activeQuestionId={activeQuestionId}
                      deleteQuestion={deleteQuestion}
                      isBuilderMode={isBuilderMode}
                      isLocked={isLocked}
                      question={q}
                      updateQuestion={updateQuestion}
                      setActiveQuestionId={setActiveQuestionId}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>

            {/* 3. Slash Command & Add Field Button */}
            {!isLocked && (
              <div className='mt-4 flex flex-col gap-2.5'>
                <SlashCommand index={panel.fields.length} panelId={panel.id} />

                <AddFieldButton
                  onClick={() => triggerAddFieldSidebar(panel.fields.length)}
                />
              </div>
            )}

            {isLocked && (
              <div className='bg-gray-50/50 mt-4 flex items-center justify-center rounded-xl border border-dashed border-gray-2 py-4'>
                <div className='flex items-center gap-2 text-13 font-medium text-gray-4'>
                  <Icon height={14} name='lucide:lock' width={14} />
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
  isLocked,
  question,
  updateQuestion,
  setActiveQuestionId,
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
