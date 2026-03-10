import { ActionIcon } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import QuestionCard from './QuestionCard'
import AddFieldInline from './AddFieldInline'
import SectionHeader from './SectionHeader'
import AddFieldButton from './AddFieldButton'
import { useFormStore, type Question, type Panel as PanelType } from '@/pages/form-builder/store/formStore'
import { useState, useRef, useEffect } from 'react'
import cn from '@/utils/cn'
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getField } from '@/helpers/new-field'

interface Props {
    panel: PanelType
    panelIndex: number
}

const Page = ({ panel, panelIndex }: Props) => {
    const {
        activeQuestionId,
        setActiveQuestionId,
        updateQuestion,
        deleteQuestion,
        addQuestion,
        isBuilderMode,
        lastAddedPanelId,
        clearLastAddedPanelId
    } = useFormStore()

    const pageRef = useRef<HTMLDivElement>(null)
    const [showAddFieldAt, setShowAddFieldAt] = useState<number | null>(null)
    const [addFieldAnchorRect, setAddFieldAnchorRect] = useState<DOMRect | null>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Mapping for field widths to 12-column grid spans
    const getColumnSpan = (size: string) => {
        switch (size) {
            case 'col-6': return 'col-span-12 md:col-span-6'
            case 'col-4': return 'col-span-12 md:col-span-4'
            case 'col-3': return 'col-span-12 md:col-span-3'
            default: return 'col-span-12'
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
            ref={pageRef}
            id={panel.id}
            className="bg-white rounded-2xl border border-gray-3 shadow-md relative group/page transition-all duration-300 font-inter mb-8"
            onDragOver={(e) => e.preventDefault()}
        >
            {/* 1. Section Header */}
            <SectionHeader
                panel={panel}
                panelIndex={panelIndex}
                fieldCount={panel.fields.length}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            {/* 2. Page Canvas / Field Grid */}
            {!isCollapsed && (
                <div className="relative z-10 p-6 pt-4">
                    <SortableContext items={panel.fields.map(q => q.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-12 gap-x-4 gap-y-6 w-full">
                            {/* Render Fields */}
                            {panel.fields.map((q: Question, i: number) => (
                                <div
                                    key={q.id}
                                    className={cn(
                                        "transition-all duration-500 relative group/field",
                                        getColumnSpan(q.settings.general.size)
                                    )}
                                >
                                    {/* Drop Zone Above (Visual Indicator) */}
                                    <div className="absolute -top-3 left-0 w-full h-6 z-20 flex items-center justify-center opacity-0 hover:opacity-100 group/insert transition-all pointer-events-none">
                                        <div className="w-full h-[2px] bg-accent-soft shadow-[0_0_8px_rgba(124,92,255,0.4)] mx-4 rounded-full" />
                                        <ActionIcon
                                            size="sm"
                                            radius="xl"
                                            color="violet"
                                            variant="filled"
                                            className="absolute shadow-sm scale-75 group-hover/insert:scale-100 transition-all hover:bg-accent-primary pointer-events-auto"
                                            onClick={(e) => {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                                setAddFieldAnchorRect(rect)
                                                setShowAddFieldAt(i)
                                            }}
                                        >
                                            <Icon name="lucide:plus" width={12} height={12} />
                                        </ActionIcon>
                                    </div>

                                    <SortableQuestionItem
                                        question={q}
                                        activeQuestionId={activeQuestionId}
                                        setActiveQuestionId={setActiveQuestionId}
                                        updateQuestion={updateQuestion}
                                        deleteQuestion={deleteQuestion}
                                        isBuilderMode={isBuilderMode}
                                    />
                                </div>
                            ))}
                        </div>
                    </SortableContext>

                    {/* 3. Add Field Button (At the bottom) */}
                    <div className="mt-8">
                        <AddFieldButton
                            onClick={(e: any) => {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setAddFieldAnchorRect(rect)
                                setShowAddFieldAt(panel.fields.length)
                            }}
                        />
                    </div>

                    {showAddFieldAt !== null && (
                        <AddFieldInline
                            onSelect={(type) => handleAddField(type, showAddFieldAt)}
                            onClose={() => {
                                setShowAddFieldAt(null)
                                setAddFieldAnchorRect(null)
                            }}
                            anchorRect={addFieldAnchorRect}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

const SortableQuestionItem = ({ question, activeQuestionId, setActiveQuestionId, updateQuestion, deleteQuestion, isBuilderMode }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: question.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative transition-all duration-300 w-full"
            {...attributes}
        >
            <QuestionCard
                question={question}
                isActive={activeQuestionId === question.id}
                onSelect={() => {
                    setActiveQuestionId(question.id)
                    useFormStore.getState().setSelectionType('question')
                    useFormStore.getState().setSidebarOpen(true)
                }}
                onUpdate={(updates: Partial<Question>) => updateQuestion(question.id, updates)}
                onDelete={() => deleteQuestion(question.id)}
                isBuilderMode={isBuilderMode}
                dragListeners={listeners}
            />
        </div>
    )
}

export default Page
