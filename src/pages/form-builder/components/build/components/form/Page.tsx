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
        const newQuestion = getField(type)
        addQuestion(panel.id, newQuestion as Question, index)
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
