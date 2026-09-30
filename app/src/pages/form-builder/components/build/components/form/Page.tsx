import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon, Tooltip } from '@mantine/core'
import { memo, useEffect, useRef } from 'react'
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
      className='group/page relative rounded-xl border border-gray-3 bg-white font-inter shadow-md transition-all duration-200 focus-within:z-30 hover:shadow-lg'
      id={panel.id}
      ref={pageRef}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 0. Floating Canva Actions */}
      <div className='absolute -top-9 right-0 z-20 flex items-center gap-2 transition-all'>
        <div className='flex items-center gap-1 rounded-lg border border-gray-3 bg-white/90 px-1.5 py-1 opacity-0 shadow-xs backdrop-blur-md transition-all duration-200 group-hover/page:opacity-100'>
          {/* Section Reordering */}
          <div className='flex items-center gap-0.5'>
            {panelIndex > 0 && (
              <Tooltip label='Move Section Up' position='top' withArrow>
                <ActionIcon
                  className='h-7 w-7 rounded-md text-gray-12 transition-all hover:bg-primary-3 hover:text-primary-9 active:scale-95'
                  color='gray'
                  size='sm'
                  variant='subtle'
                  onClick={() => movePanel(panel.id, 'up')}
                >
                  <Icon height={14} name='lucide:arrow-up' width={14} />
                </ActionIcon>
              </Tooltip>
            )}
            {panelIndex < panels.length - 1 && (
              <Tooltip label='Move Section Down' position='top' withArrow>
                <ActionIcon
                  className='h-7 w-7 rounded-md text-gray-12 transition-all hover:bg-primary-3 hover:text-primary-9 active:scale-95'
                  color='gray'
                  size='sm'
                  variant='subtle'
                  onClick={() => movePanel(panel.id, 'down')}
                >
                  <Icon height={14} name='lucide:arrow-down' width={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>

          <div className='mx-0.5 h-3.5 w-px bg-gray-3' />

          <Tooltip
            position='top'
            withArrow
            label={
              isLocked
                ? 'Unlock section for editing in the builder'
                : 'Lock section from edits in the builder'
            }
          >
            <ActionIcon
              color={isLocked ? 'violet' : 'gray'}
              size='sm'
              variant='subtle'
              className={cn(
                'h-7 w-7 rounded-md transition-all active:scale-95',
                isLocked
                  ? 'bg-purple-3 font-bold text-purple-11'
                  : 'text-gray-12 hover:bg-primary-3 hover:text-primary-9',
              )}
              onClick={() => updatePanel(panel.id, { isLocked: !isLocked })}
            >
              <Icon
                height={14}
                name={isLocked ? 'lucide:lock' : 'lucide:lock-open'}
                width={14}
              />
            </ActionIcon>
          </Tooltip>

          <Tooltip label='Duplicate Section' position='top' withArrow>
            <ActionIcon
              className='h-7 w-7 rounded-md text-gray-12 transition-all hover:bg-gray-2 active:scale-95'
              color='gray'
              disabled={isLocked}
              size='sm'
              variant='subtle'
              onClick={() => duplicatePanel(panel.id)}
            >
              <Icon height={14} name='lucide:copy' width={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label='Add Section Below' position='top' withArrow>
            <ActionIcon
              className='h-7 w-7 rounded-md text-gray-12 transition-all hover:bg-gray-2 active:scale-95'
              color='gray'
              size='sm'
              variant='subtle'
              onClick={() => addPanel(panelIndex + 1)}
            >
              <Icon height={14} name='lucide:plus-square' width={14} />
            </ActionIcon>
          </Tooltip>

          <div className='mx-0.5 h-3.5 w-px bg-gray-3' />

          <Tooltip label='Delete Section' position='top' withArrow>
            <ActionIcon
              className='h-7 w-7 rounded-md text-red-11 transition-all hover:bg-red-3 active:scale-95'
              color='red'
              disabled={isLocked}
              size='sm'
              variant='subtle'
              onClick={() => deletePanel(panel.id)}
            >
              <Icon height={14} name='lucide:trash-2' width={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      {/* Single Clean Container (No double border) */}
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
        <div className='relative z-10 p-4 pt-1'>
          <SortableContext
            items={panel.fields.map((q) => q.id)}
            strategy={rectSortingStrategy}
          >
            <div className='grid w-full grid-cols-12 gap-x-3 gap-y-2.5'>
              {/* Render Fields */}
              {panel.fields.map((q: Question, i: number) => (
                <div
                  key={q.id}
                  className={cn(
                    'group/field relative',
                    getColumnSpan(q.settings.general.size),
                  )}
                >
                  {/* Drop Zone Above */}
                  <div className='group/insert pointer-events-none absolute -top-2 left-0 z-20 flex h-4 w-full items-center justify-center opacity-0 transition-all hover:opacity-100'>
                    <div className='mx-4 h-[1.5px] w-full rounded-full bg-primary-9 shadow-xs' />
                    <ActionIcon
                      className='pointer-events-auto absolute scale-75 shadow-xs transition-all group-hover/insert:scale-100 hover:bg-primary-9'
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

          {/* 3. Add Field Button */}
          {!isLocked && (
            <div className='mt-3 flex flex-col gap-2'>
              <AddFieldButton
                onClick={() => triggerAddFieldSidebar(panel.fields.length)}
              />
            </div>
          )}

          {isLocked && (
            <div className='mt-3 flex items-center justify-center rounded-lg border border-dashed border-gray-3 bg-gray-2/60 py-3'>
              <div className='flex items-center gap-2 text-xs font-medium text-gray-10'>
                <Icon height={14} name='lucide:lock' width={14} />
                <span>Section is locked</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SortableQuestionItem = memo(
  ({
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
      transform: CSS.Translate.toString(transform),
      transition,
      zIndex: isDragging ? 50 : undefined,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative w-full',
          isDragging &&
            'rounded-xl border-2 border-dashed border-primary-5 bg-primary-3/20 opacity-40',
        )}
        {...attributes}
      >
        <div className={cn(isDragging && 'pointer-events-none invisible')}>
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
      </div>
    )
  },
)

export default Page
