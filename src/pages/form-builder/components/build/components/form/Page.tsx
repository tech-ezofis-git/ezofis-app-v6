import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { getField } from '@/helpers/new-field'
import {
  type Panel as PanelType,
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import AddFieldButton from './AddFieldButton'
import AddFieldInline from './AddFieldInline'
import QuestionCard from './QuestionCard'
import SectionHeader from './SectionHeader'

interface Props {
  panel: PanelType
  panelIndex: number
}

const Page = ({ panel, panelIndex }: Props) => {
  const {
    activeQuestionId,
    addQuestion,
    clearLastAddedPanelId,
    deleteQuestion,
    isBuilderMode,
    lastAddedPanelId,
    updateQuestion,
    setActiveQuestionId,
  } = useFormStore()

  const pageRef = useRef<HTMLDivElement>(null)
  const [showAddFieldAt, setShowAddFieldAt] = useState<number | null>(null)
  const [addFieldAnchorRect, setAddFieldAnchorRect] = useState<DOMRect | null>(
    null,
  )
  const [isCollapsed, setIsCollapsed] = useState(false)

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

  const handleAddField = (type: string, index: number) => {
    if (type === 'FULL_NAME') {
      const firstName = getField('SHORT_TEXT')
      firstName.label = 'First Name'
      firstName.settings.general.size = 'col-6'

      const lastName = getField('SHORT_TEXT')
      lastName.label = 'Last Name'
      lastName.settings.general.size = 'col-6'

      addQuestion(panel.id, firstName as Question, index)
      addQuestion(panel.id, lastName as Question, index + 1)
    } else if (type === 'CONTACT_INFO') {
      const name = getField('SHORT_TEXT')
      name.label = 'Full Name'

      const email = getField('EMAIL')
      const phone = getField('PHONE_NUMBER')
      const company = getField('SHORT_TEXT')
      company.label = 'Company'

      addQuestion(panel.id, name as Question, index)
      addQuestion(panel.id, email as Question, index + 1)
      addQuestion(panel.id, phone as Question, index + 2)
      addQuestion(panel.id, company as Question, index + 3)
    } else if (type === 'ADDRESS' || type === 'ADDRESS_INFO') {
      const street = getField('SHORT_TEXT')
      street.label = 'Street Address'
      street.settings.general.size = 'col-12'

      const city = getField('SHORT_TEXT')
      city.label = 'City'
      city.settings.general.size = 'col-6'

      const state = getField('SHORT_TEXT')
      state.label = 'State / Province'
      state.settings.general.size = 'col-6'

      const zip = getField('SHORT_TEXT')
      zip.label = 'Zip / Postal Code'
      zip.settings.general.size = 'col-6'

      const country = getField('COUNTRY_CODE')
      country.settings.general.size = 'col-6'

      addQuestion(panel.id, street as Question, index)
      addQuestion(panel.id, city as Question, index + 1)
      addQuestion(panel.id, state as Question, index + 2)
      addQuestion(panel.id, zip as Question, index + 3)
      addQuestion(panel.id, country as Question, index + 4)
    } else if (type === 'OPINION_SCALE') {
      const rating = getField('RATING') as any
      rating.label = 'How would you rate your experience?'
      rating.settings.specific.iconCount = 10
      addQuestion(panel.id, rating as Question, index)
    } else {
      const newQuestion = getField(type)
      addQuestion(panel.id, newQuestion as Question, index)
    }
    setShowAddFieldAt(null)
    setAddFieldAnchorRect(null)
  }

  return (
    <div
      className='group/page relative mb-8 rounded-2xl border border-gray-3 bg-white font-inter shadow-md transition-all duration-300'
      id={panel.id}
      ref={pageRef}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 1. Section Header */}
      <SectionHeader
        fieldCount={panel.fields.length}
        isCollapsed={isCollapsed}
        panel={panel}
        panelIndex={panelIndex}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* 2. Page Canvas / Field Grid */}
      {!isCollapsed && (
        <div className='relative z-10 p-6 pt-4'>
          <SortableContext
            items={panel.fields.map((q) => q.id)}
            strategy={rectSortingStrategy}
          >
            <div className='grid w-full grid-cols-12 gap-x-4 gap-y-6'>
              {/* Render Fields */}
              {panel.fields.map((q: Question, i: number) => (
                <div
                  key={q.id}
                  className={cn(
                    'group/field relative transition-all duration-500',
                    getColumnSpan(q.settings.general.size),
                  )}
                >
                  {/* Drop Zone Above (Visual Indicator) */}
                  <div className='group/insert pointer-events-none absolute -top-3 left-0 z-20 flex h-6 w-full items-center justify-center opacity-0 transition-all hover:opacity-100'>
                    <div className='mx-4 h-[2px] w-full rounded-full bg-accent-soft shadow-[0_0_8px_rgba(124,92,255,0.4)]' />
                    <ActionIcon
                      className='pointer-events-auto absolute scale-75 shadow-sm transition-all group-hover/insert:scale-100 hover:bg-accent-primary'
                      color='violet'
                      radius='xl'
                      size='sm'
                      variant='filled'
                      onClick={(e) => {
                        const rect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect()
                        setAddFieldAnchorRect(rect)
                        setShowAddFieldAt(i)
                      }}
                    >
                      <Icon height={12} name='lucide:plus' width={12} />
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
                </div>
              ))}
            </div>
          </SortableContext>

          {/* 3. Add Field Button (At the bottom) */}
          <div className='mt-8'>
            <AddFieldButton
              onClick={(e: any) => {
                const rect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect()
                setAddFieldAnchorRect(rect)
                setShowAddFieldAt(panel.fields.length)
              }}
            />
          </div>

          {showAddFieldAt !== null && (
            <AddFieldInline
              anchorRect={addFieldAnchorRect}
              onClose={() => {
                setShowAddFieldAt(null)
                setAddFieldAnchorRect(null)
              }}
              onSelect={(type) => handleAddField(type, showAddFieldAt)}
            />
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
