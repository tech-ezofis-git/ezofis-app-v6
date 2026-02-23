import { ActionIcon, Button, Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import QuestionCard from './QuestionCard'
import AddFieldInline from './AddFieldInline'
import { useFormStore, type Question, type Page as PageType, type QuestionType } from '@/pages/form-builder/store/formStore'
import { useState, useRef, useEffect } from 'react'
import cn from '@/utils/cn'
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
    page: PageType
    pageIndex: number
}

const generateId = () => {
    try {
        return crypto.randomUUID()
    } catch (e) {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
}

const Page = ({ page, pageIndex }: Props) => {
    const {
        activeQuestionId,
        setActiveQuestionId,
        updateQuestion,
        deleteQuestion,
        addQuestion,
        addTemplateGroup,
        deletePage,
        updatePage,
        isBuilderMode,
        lastAddedPageId,
        clearLastAddedPageId
    } = useFormStore()

    const pageRef = useRef<HTMLDivElement>(null)
    const [showAddFieldAt, setShowAddFieldAt] = useState<number | null>(null)

    // Handle auto-scroll when page is added via AI
    useEffect(() => {
        if (lastAddedPageId === page.id && pageRef.current) {
            pageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
            clearLastAddedPageId()
        }
    }, [lastAddedPageId, page.id, clearLastAddedPageId])

    const handleAddField = (type: QuestionType | 'address_info' | 'contact_info', index: number) => {
        if (type === 'address_info' || type === 'contact_info') {
            addTemplateGroup(page.id, type, index)
            setShowAddFieldAt(null)
            return
        }

        const newQuestion: Question = {
            id: generateId(),
            title: "",
            description: "",
            type: type as QuestionType,
            width: 'full'
        }
        addQuestion(page.id, newQuestion, index)
        setShowAddFieldAt(null)
    }

    return (
        <div
            ref={pageRef}
            id={page.id}
            className="bg-surface-primary rounded-2xl border border-gray-3 shadow-sm relative group/page transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500 font-inter"
            onDragOver={(e) => e.preventDefault()}
        >
            {/* Page Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-2 flex items-start justify-between gap-4 font-inter">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="bg-gray-1 text-gray-11 text-[10px] font-bold px-2 py-0.5 rounded-md border border-gray-2 uppercase tracking-widest shrink-0">
                            Page {pageIndex + 1}
                        </div>
                    </div>

                    <input
                        type="text"
                        value={page.title}
                        onChange={(e) => updatePage(page.id, { title: e.target.value })}
                        placeholder="Page Title"
                        className="w-full bg-transparent text-xl font-bold text-gray-13 placeholder:text-gray-4 focus:outline-none"
                    />

                    <input
                        type="text"
                        value={page.description}
                        onChange={(e) => updatePage(page.id, { description: e.target.value })}
                        placeholder="Add a description for this page..."
                        className="w-full bg-transparent text-[13px] text-gray-9 placeholder:text-gray-4 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover/page:opacity-100 transition-opacity duration-200">
                    <ActionIcon variant="subtle" color="gray" size="sm" className="hover:bg-gray-2 focus:ring-0 active:scale-95 transition-all">
                        <Icon name="lucide:pencil" width={15} height={15} />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => deletePage(page.id)}
                        className="hover:bg-red-50 focus:ring-0 active:scale-95 transition-all"
                    >
                        <Icon name="lucide:trash" width={15} height={15} />
                    </ActionIcon>
                </div>
            </div>

            {/* Page Canvas */}
            <div className={cn(
                "px-6 pt-5 pb-8 rounded-b-2xl relative transition-all duration-500",
                isBuilderMode ? "bg-gray-1/60" : "bg-transparent"
            )}>
                <SortableContext items={page.questions.map(q => q.id)} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-y-3 relative z-10 w-full">
                        {page.questions.length === 0 && (
                            <div className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-2 rounded-xl bg-white animate-in fade-in duration-500">
                                <div className="size-10 rounded-lg bg-gray-50 flex items-center justify-center mb-3">
                                    <Icon name="lucide:layout-list" width={20} height={20} className="text-gray-4" />
                                </div>
                                <Text size="sm" fw={700} className="text-gray-13 mb-1">Emply Page</Text>
                                <Text size="xs" className="text-gray-5 mb-5 px-6 text-center">Start adding fields to this page to build your form content.</Text>
                                <Button
                                    size="xs"
                                    bg="accent-primary"
                                    className="hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-accent-soft/20 font-bold px-4"
                                    leftSection={<Icon name="lucide:plus" width={14} height={14} />}
                                    onClick={() => setShowAddFieldAt(0)}
                                >
                                    Add Question
                                </Button>
                            </div>
                        )}

                        {/* Inline Selector at start */}
                        {showAddFieldAt === 0 && (
                            <div className="w-full px-2 mb-4 animate-in slide-in-from-top-1 duration-200">
                                <AddFieldInline
                                    onSelect={(type) => handleAddField(type, 0)}
                                    onClose={() => setShowAddFieldAt(null)}
                                />
                            </div>
                        )}

                        {page.questions.length > 0 && page.questions.map((q: Question, i: number) => (
                            <div
                                key={q.id}
                                className={cn(
                                    "transition-all duration-500 px-2 relative group-item group/field",
                                    q.width === '1/3' ? 'w-1/3' : q.width === '1/2' ? 'w-1/2' : 'w-full'
                                )}
                            >
                                {/* Insert Hook (Top) */}
                                <div className="absolute top-[-10px] left-0 right-0 h-5 z-[50] flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <div className="w-full h-[1px] bg-gray-13/10 absolute pointer-events-none" />
                                    <button
                                        onClick={() => setShowAddFieldAt(i)}
                                        className="size-6 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-lg hover:scale-125 transition-all pointer-events-auto"
                                    >
                                        <Icon name="lucide:plus" width={14} height={14} />
                                    </button>
                                </div>

                                <SortableQuestionItem
                                    question={q}
                                    activeQuestionId={activeQuestionId}
                                    setActiveQuestionId={setActiveQuestionId}
                                    updateQuestion={updateQuestion}
                                    deleteQuestion={deleteQuestion}
                                    isBuilderMode={isBuilderMode}
                                />

                                {/* Insert Hook (Bottom - Only for last) OR Inline Selector below */}
                                {showAddFieldAt === i + 1 ? (
                                    <div className="w-full mt-4 mb-4 animate-in slide-in-from-top-1 duration-200 z-50">
                                        <AddFieldInline
                                            onSelect={(type) => handleAddField(type, i + 1)}
                                            onClose={() => setShowAddFieldAt(null)}
                                        />
                                    </div>
                                ) : (
                                    i === page.questions.length - 1 && (
                                        <div className="absolute bottom-[-10px] left-0 right-0 h-5 z-[50] flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity duration-200 pointer-events-none">
                                            <div className="w-full h-[1px] bg-gray-13/10 absolute pointer-events-none" />
                                            <button
                                                onClick={() => setShowAddFieldAt(i + 1)}
                                                className="size-6 rounded-full bg-accent-primary text-white flex items-center justify-center shadow-lg hover:scale-125 transition-all pointer-events-auto"
                                            >
                                                <Icon name="lucide:plus" width={14} height={14} />
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                </SortableContext>
            </div>

            {/* Page Footer */}
            <div className="px-6 pb-6 pt-4 flex flex-col items-center">
                {!page.questions.length && <div className="h-4" />}
                <div className="w-full h-[1px] bg-gray-3 border-dashed border-t mb-4" />
                <Text size="10px" fw={600} className="text-gray-5 uppercase tracking-widest font-inter">
                    End of Section {pageIndex + 1}.0
                </Text>
            </div>
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
                onSelect={() => setActiveQuestionId(question.id)}
                onUpdate={(updates) => updateQuestion(question.id, updates)}
                onDelete={() => deleteQuestion(question.id)}
                isBuilderMode={isBuilderMode}
                dragListeners={listeners}
            />
        </div>
    )
}

export default Page
