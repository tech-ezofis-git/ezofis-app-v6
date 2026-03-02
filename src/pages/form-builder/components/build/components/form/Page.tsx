import { ActionIcon, Button, Text, Divider } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import QuestionCard from './QuestionCard'
import AddFieldInline from './AddFieldInline'
import { useFormStore, type Question, type Panel as PanelType, type QuestionType } from '@/pages/form-builder/store/formStore'
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
        deletePanel,
        updatePanel,
        movePanel,
        panels,
        isBuilderMode,
        lastAddedPanelId,
        clearLastAddedPanelId
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
            ref={pageRef}
            id={panel.id}
            className="bg-white rounded-2xl border border-gray-1 shadow-sm relative group/page transition-all duration-300 font-inter mb-6"
            onDragOver={(e) => e.preventDefault()}
        >
            {/* Page Header - Cleaner Title/Desc only */}
            <div className="px-6 pt-4 pb-2 flex items-start justify-between gap-4 font-inter">
                <div className="flex-1 space-y-1">
                    <input
                        type="text"
                        value={panel.settings.title}
                        onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                        placeholder="Page Title"
                        className="w-full bg-transparent text-2xl font-bold text-gray-13 placeholder:text-gray-3 focus:outline-none tracking-tight"
                    />

                    <input
                        type="text"
                        value={panel.settings.description}
                        onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
                        placeholder="Add a description for this page..."
                        className="w-full bg-transparent text-sm text-gray-5 placeholder:text-gray-3 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-1 opacity-100 group-hover/page:opacity-100 transition-opacity duration-200">
                    {/* Move Up */}
                    {panelIndex > 0 && (
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => movePanel(panel.id, 'up')}
                            className="hover:bg-gray-1 active:scale-95 transition-all"
                            title="Move Up"
                        >
                            <Icon name="lucide:arrow-up" width={15} height={15} />
                        </ActionIcon>
                    )}

                    {/* Move Down */}
                    {panelIndex < panels.length - 1 && (
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => movePanel(panel.id, 'down')}
                            className="hover:bg-gray-1 active:scale-95 transition-all"
                            title="Move Down"
                        >
                            <Icon name="lucide:arrow-down" width={15} height={15} />
                        </ActionIcon>
                    )}

                    <Divider orientation="vertical" mx={4} className="h-4 border-gray-2" />

                    {/* Collapse/Expand Toggle */}
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hover:bg-gray-1 active:scale-95 transition-all"
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        <Icon name={isCollapsed ? "lucide:chevron-down" : "lucide:chevron-up"} width={15} height={15} />
                    </ActionIcon>

                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => deletePanel(panel.id)}
                        className="hover:bg-red-50 focus:ring-0 active:scale-95 transition-all"
                    >
                        <Icon name="lucide:trash" width={15} height={15} />
                    </ActionIcon>
                </div>
            </div>

            {/* Page Canvas */}
            {!isCollapsed && (
                <div className="relative z-10 px-4 pb-4">
                    <SortableContext items={panel.fields.map(q => q.id)} strategy={rectSortingStrategy}>
                        <div className="flex flex-wrap gap-y-1 w-full">
                            {panel.fields.length === 0 && (
                                <div className="w-full px-1">
                                    <button
                                        onClick={() => setShowAddFieldAt(0)}
                                        className="w-full py-8 flex items-center justify-center border-2 border-dashed border-gray-2 rounded-xl bg-white hover:border-accent-primary hover:bg-accent-soft/5 transition-all text-gray-4 hover:text-accent-primary group/empty"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon name="lucide:plus" width={18} height={18} />
                                            <Text size="sm" fw={700}>Add your first field</Text>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {panel.fields.map((q: Question, i: number) => {
                                const isHalfWidth = q.settings.general.size === 'col-6'
                                const isNextHalfWidth = panel.fields[i + 1]?.settings.general.size === 'col-6'
                                const isLastInRow = !isHalfWidth || (isHalfWidth && (!isNextHalfWidth || i === panel.fields.length - 1))

                                return (
                                    <div
                                        key={q.id}
                                        className={cn(
                                            "transition-all duration-500 px-1 relative group-item group/field",
                                            q.settings.general.size === 'col-3' ? 'w-1/4' : q.settings.general.size === 'col-4' ? 'w-1/3' : q.settings.general.size === 'col-6' ? 'w-1/2' : 'w-full'
                                        )}
                                    >
                                        {/* Inline Add Button (Above this field) */}
                                        <div className="absolute top-[-10px] left-0 w-full h-[20px] z-[20] flex items-center justify-center opacity-0 hover:opacity-100 group/insert transition-all pointer-events-auto">
                                            <div className="w-[calc(100%-16px)] h-px bg-accent-soft/50 group-hover/insert:bg-accent-primary/40 mx-2" />
                                            <ActionIcon
                                                size="sm"
                                                radius="xl"
                                                color="violet"
                                                variant="filled"
                                                className="absolute shadow-sm scale-75 group-hover/insert:scale-105 transition-all hover:bg-accent-primary"
                                                onClick={() => setShowAddFieldAt(i)}
                                            >
                                                <Icon name="lucide:plus" width={14} height={14} />
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

                                        {/* If this is the last item and it's half width, and we have an empty slot next to it */}
                                        {i === panel.fields.length - 1 && isHalfWidth && (
                                            <div className="absolute right-[-100%] top-0 w-full px-1 h-full z-10 pointer-events-none opacity-0 group-hover/field:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setShowAddFieldAt(i + 1)}
                                                    className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-2 rounded-xl bg-white/50 hover:bg-white hover:border-accent-primary transition-all text-gray-4 hover:text-accent-primary pointer-events-auto"
                                                >
                                                    <Icon name="lucide:plus" width={16} height={16} />
                                                    <Text size="xs" fw={700} ml={4}>Add field</Text>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Standard Add Field at the bottom if no empty slots in grid */}
                            {panel.fields.length > 0 && (
                                <div className={cn(
                                    "px-1 transition-all mt-1",
                                    (panel.fields[panel.fields.length - 1]?.settings.general.size === 'col-6') ? 'w-1/2' : 'w-full'
                                )}>
                                    <button
                                        onClick={() => setShowAddFieldAt(panel.fields.length)}
                                        className="w-full py-3 flex items-center justify-center border-2 border-dashed border-gray-2 rounded-xl bg-white/50 hover:bg-white hover:border-accent-primary transition-all text-gray-4 hover:text-accent-primary"
                                    >
                                        <Icon name="lucide:plus" width={16} height={16} />
                                        <Text size="xs" fw={700} ml={4}>Add field</Text>
                                    </button>
                                </div>
                            )}
                        </div>
                    </SortableContext>

                    {showAddFieldAt !== null && (
                        <div className="fixed inset-0 z-[100]">
                            <AddFieldInline
                                onSelect={(type) => handleAddField(type, showAddFieldAt)}
                                onClose={() => setShowAddFieldAt(null)}
                            />
                        </div>
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
