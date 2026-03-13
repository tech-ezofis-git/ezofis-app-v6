import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon, Divider, Text } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { getField } from '@/helpers/new-field'
import {
  type Panel as PanelType,
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import AddFieldInline from './AddFieldInline'
import QuestionCard from './QuestionCard'

interface Props {
  panel: PanelType
  panelIndex: number
}

const Page = ({ panel, panelIndex }: Props) => {
  const {
    activeQuestionId,
    addQuestion,
    clearLastAddedPanelId,
    deletePanel,
    deleteQuestion,
    isBuilderMode,
    lastAddedPanelId,
    movePanel,
    panels,
    updatePanel,
    updateQuestion,
    setActiveQuestionId,
  } = useFormStore()

  const pageRef = useRef<HTMLDivElement>(null)
  const [showAddFieldAt, setShowAddFieldAt] = useState<number | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Handle auto-scroll when page is added via AI
  useEffect(() => {
    if (lastAddedPanelId === panel.id && pageRef.current) {
      pageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearLastAddedPanelId()
    }
  }, [lastAddedPanelId, panel.id, clearLastAddedPanelId])

  const handleAddField = (type: string, index: number) => {
    const newQuestion = getField(type)
    addQuestion(panel.id, newQuestion as Question, index)
    setShowAddFieldAt(null)
  }

  return (
    <div
      className='group/page relative mb-6 rounded-2xl border border-gray-1 bg-white font-inter shadow-sm transition-all duration-300'
      id={panel.id}
      ref={pageRef}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Page Header - Cleaner Title/Desc only */}
      <div className='flex items-start justify-between gap-4 px-6 pt-4 pb-2 font-inter'>
        <div className='flex-1 space-y-1'>
          <input
            className='w-full bg-transparent text-2xl font-bold tracking-tight text-gray-13 placeholder:text-gray-3 focus:outline-none'
            placeholder='Page Title'
            type='text'
            value={panel.settings.title}
            onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
          />

          <input
            className='w-full bg-transparent text-sm text-gray-5 placeholder:text-gray-3 focus:outline-none'
            placeholder='Add a description for this page...'
            type='text'
            value={panel.settings.description}
            onChange={(e) =>
              updatePanel(panel.id, { description: e.target.value })
            }
          />
        </div>

        <div className='flex items-center gap-1 opacity-100 transition-opacity duration-200 group-hover/page:opacity-100'>
          {/* Move Up */}
          {panelIndex > 0 && (
            <ActionIcon
              className='transition-all hover:bg-gray-1 active:scale-95'
              color='gray'
              size='sm'
              title='Move Up'
              variant='subtle'
              onClick={() => movePanel(panel.id, 'up')}
            >
              <Icon height={15} name='lucide:arrow-up' width={15} />
            </ActionIcon>
          )}

          {/* Move Down */}
          {panelIndex < panels.length - 1 && (
            <ActionIcon
              className='transition-all hover:bg-gray-1 active:scale-95'
              color='gray'
              size='sm'
              title='Move Down'
              variant='subtle'
              onClick={() => movePanel(panel.id, 'down')}
            >
              <Icon height={15} name='lucide:arrow-down' width={15} />
            </ActionIcon>
          )}

          <Divider
            className='h-4 border-gray-2'
            mx={4}
            orientation='vertical'
          />

          {/* Collapse/Expand Toggle */}
          <ActionIcon
            className='transition-all hover:bg-gray-1 active:scale-95'
            color='gray'
            size='sm'
            title={isCollapsed ? 'Expand' : 'Collapse'}
            variant='subtle'
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Icon
              height={15}
              name={isCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'}
              width={15}
            />
          </ActionIcon>

          <ActionIcon
            className='hover:bg-red-50 transition-all focus:ring-0 active:scale-95'
            color='red'
            size='sm'
            variant='subtle'
            onClick={() => deletePanel(panel.id)}
          >
            <Icon height={15} name='lucide:trash' width={15} />
          </ActionIcon>
        </div>
      </div>

      {/* Page Canvas */}
      {!isCollapsed && (
        <div className='relative z-10 px-4 pb-4'>
          <SortableContext
            items={panel.fields.map((q) => q.id)}
            strategy={rectSortingStrategy}
          >
            <div className='flex w-full flex-wrap gap-y-1'>
              {panel.fields.length === 0 && (
                <div className='w-full px-1'>
                  <button
                    className='group/empty flex w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-2 bg-white py-8 text-gray-4 transition-all hover:border-accent-primary hover:bg-accent-soft/5 hover:text-accent-primary'
                    onClick={() => setShowAddFieldAt(0)}
                  >
                    <div className='flex items-center gap-2'>
                      <Icon height={18} name='lucide:plus' width={18} />
                      <Text fw={700} size='sm'>
                        Add your first field
                      </Text>
                    </div>
                  </button>
                </div>
              )}

              {panel.fields.map((q: Question, i: number) => {
                const isHalfWidth = q.settings.general.size === 'col-6'

                return (
                  <div
                    key={q.id}
                    className={cn(
                      'group-item group/field relative px-1 transition-all duration-500',
                      q.settings.general.size === 'col-3'
                        ? 'w-1/4'
                        : q.settings.general.size === 'col-4'
                          ? 'w-1/3'
                          : q.settings.general.size === 'col-6'
                            ? 'w-1/2'
                            : 'w-full',
                    )}
                  >
                    {/* Inline Add Button (Above this field) */}
                    <div className='group/insert pointer-events-auto absolute top-[-10px] left-0 z-[20] flex h-[20px] w-full items-center justify-center opacity-0 transition-all hover:opacity-100'>
                      <div className='mx-2 h-px w-[calc(100%-16px)] bg-accent-soft/50 group-hover/insert:bg-accent-primary/40' />
                      <ActionIcon
                        className='absolute scale-75 shadow-sm transition-all group-hover/insert:scale-105 hover:bg-accent-primary'
                        color='violet'
                        radius='xl'
                        size='sm'
                        variant='filled'
                        onClick={() => setShowAddFieldAt(i)}
                      >
                        <Icon height={14} name='lucide:plus' width={14} />
                      </ActionIcon>
                    </div>
                    <SortableQuestionItem
                      activeQuestionId={activeQuestionId}
                      deleteQuestion={deleteQuestion}
                      isBuilderMode={isBuilderMode}
                      question={q}
                      updateQuestion={updateQuestion}
                      setActiveQuestionId={setActiveQuestionId}
                    />

                    {/* If this is the last item and it's half width, and we have an empty slot next to it */}
                    {i === panel.fields.length - 1 && isHalfWidth && (
                      <div className='pointer-events-none absolute top-0 right-[-100%] z-10 h-full w-full px-1 opacity-0 transition-opacity group-hover/field:opacity-100'>
                        <button
                          className='pointer-events-auto flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-2 bg-white/50 text-gray-4 transition-all hover:border-accent-primary hover:bg-white hover:text-accent-primary'
                          onClick={() => setShowAddFieldAt(i + 1)}
                        >
                          <Icon height={16} name='lucide:plus' width={16} />
                          <Text fw={700} ml={4} size='xs'>
                            Add field
                          </Text>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Standard Add Field at the bottom if no empty slots in grid */}
              {panel.fields.length > 0 && (
                <div
                  className={cn(
                    'mt-1 px-1 transition-all',
                    panel.fields[panel.fields.length - 1]?.settings.general
                      .size === 'col-6'
                      ? 'w-1/2'
                      : 'w-full',
                  )}
                >
                  <button
                    className='flex w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-2 bg-white/50 py-3 text-gray-4 transition-all hover:border-accent-primary hover:bg-white hover:text-accent-primary'
                    onClick={() => setShowAddFieldAt(panel.fields.length)}
                  >
                    <Icon height={16} name='lucide:plus' width={16} />
                    <Text fw={700} ml={4} size='xs'>
                      Add field
                    </Text>
                  </button>
                </div>
              )}
            </div>
          </SortableContext>

          {showAddFieldAt !== null && (
            <div className='fixed inset-0 z-[100]'>
              <AddFieldInline
                onClose={() => setShowAddFieldAt(null)}
                onSelect={(type) => handleAddField(type, showAddFieldAt)}
              />
            </div>
          )}
        </div>
      )}
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
        dragListeners={listeners}
        isActive={activeQuestionId === question.id}
        isBuilderMode={isBuilderMode}
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
