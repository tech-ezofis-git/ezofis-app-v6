import { ActionIcon, Button, Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import QuestionCard from './QuestionCard'
import AddFieldInline from './AddFieldInline'
import { useFormStore, type Question, type Page as PageType, type QuestionType } from '@/pages/form-builder/store/formStore'
import { useState } from 'react'
import cn from '@/utils/cn'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
    page: PageType
    pageIndex: number
}

const Page = ({ page, pageIndex }: Props) => {
    const {
        activeQuestionId,
        setActiveQuestionId,
        updateQuestion,
        deleteQuestion,
        addQuestion,
        deletePage,
        updatePage,
        isBuilderMode
    } = useFormStore()

    const [showAddFieldAt, setShowAddFieldAt] = useState<number | null>(null)

    const handleAddField = (type: QuestionType | 'address_info' | 'contact_info', index: number) => {
        if (type === 'address_info' || type === 'contact_info') {
            useFormStore.getState().addTemplateGroup(page.id, type, index)
            setShowAddFieldAt(null)
            return
        }

        const newQuestion: Question = {
            id: crypto.randomUUID(),
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
            className="bg-surface-primary rounded-2xl border border-gray-3 shadow-sm relative group/page transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault()
                const data = e.dataTransfer.getData('application/x-form-field')
                if (data) {
                    try {
                        const { type } = JSON.parse(data)
                        const cleanType = type.replace('template:', '')
                        handleAddField(cleanType, page.questions.length)
                    } catch (err) {
                        console.error('Failed to parse dropped field:', err)
                    }
                }
            }}
        >
            {/* Page Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-2 flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                    {/* Section Label */}
                    <div className="flex items-center gap-2">
                        <div className="bg-accent-soft/20 text-accent-primary text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-accent-soft/40">
                            Page {pageIndex + 1}
                        </div>
                    </div>

                    {/* Page Title */}
                    <input
                        type="text"
                        value={page.title}
                        onChange={(e) => updatePage(page.id, { title: e.target.value })}
                        placeholder="Page Title"
                        className="w-full bg-transparent text-2xl font-bold text-gray-13 placeholder:text-gray-4 focus:outline-none"
                    />

                    {/* Page Description */}
                    <input
                        type="text"
                        value={page.description}
                        onChange={(e) => updatePage(page.id, { description: e.target.value })}
                        placeholder="Add a description for this page..."
                        className="w-full bg-transparent text-sm text-gray-9 placeholder:text-gray-4 focus:outline-none"
                    />
                </div>

                {/* Page Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover/page:opacity-100 transition-opacity duration-200">
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        className="hover:bg-gray-2 active:scale-90 transition-all"
                        title="Edit page settings"
                    >
                        <Icon name="tabler:pencil" width={15} height={15} />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => deletePage(page.id)}
                        className="hover:bg-red-50 active:scale-90 transition-all"
                        title="Delete page"
                    >
                        <Icon name="tabler:trash" width={15} height={15} />
                    </ActionIcon>
                </div>
            </div>

            {/* Page Canvas */}
            <div className={cn(
                "px-6 pt-5 pb-4 rounded-b-2xl relative transition-all duration-500",
                isBuilderMode ? "bg-gray-1/60" : "bg-transparent"
            )}>
                <SortableContext items={page.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-wrap gap-y-3 relative z-10">
                        {page.questions.length === 0 ? (
                            <div className="w-full py-14 flex flex-col items-center justify-center text-gray-5 border-2 border-dashed border-gray-3 rounded-xl bg-surface-primary/60">
                                <div className="size-12 rounded-full bg-gray-2 flex items-center justify-center mb-3">
                                    <Icon name="tabler:layout-list" width={22} height={22} className="text-gray-6" />
                                </div>
                                <Text size="sm" fw={500} className="text-gray-7 mb-1">This page is empty</Text>
                                <Text size="xs" className="text-gray-5 mb-4">Drag fields here or click below to add your first question</Text>
                                <Button
                                    size="xs"
                                    variant="default"
                                    className="border-gray-3 hover:border-accent-primary hover:text-accent-primary transition-all"
                                    leftSection={<Icon name="tabler:plus" width={13} height={13} />}
                                    onClick={() => setShowAddFieldAt(0)}
                                >
                                    Add first question
                                </Button>
                            </div>
                        ) : (
                            page.questions.map((q: Question, i: number) => (
                                <div
                                    key={q.id}
                                    className={cn(
                                        "transition-all duration-300 px-2",
                                        q.width === '1/3' ? 'w-1/3' : q.width === '1/2' ? 'w-1/2' : 'w-full',
                                        activeQuestionId && activeQuestionId !== q.id ? "opacity-40 blur-[0.5px] scale-[0.98]" : "opacity-100 scale-100"
                                    )}
                                >
                                    <SortableQuestionItem
                                        question={q}
                                        index={i}
                                        activeQuestionId={activeQuestionId}
                                        setActiveQuestionId={setActiveQuestionId}
                                        updateQuestion={updateQuestion}
                                        deleteQuestion={deleteQuestion}
                                        isBuilderMode={isBuilderMode}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </SortableContext>
            </div>

            {/* Add Field / Insert New Field */}
            {isBuilderMode && (
                <div className="px-6 pb-6 pt-2">
                    {showAddFieldAt !== null ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <AddFieldInline
                                onSelect={(type) => handleAddField(type, showAddFieldAt)}
                            />
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddFieldAt(page.questions.length)}
                            className="w-full h-11 flex items-center justify-center gap-2 border-2 border-dashed border-gray-3 rounded-xl text-gray-7 hover:text-accent-primary hover:border-accent-primary hover:bg-accent-soft/5 transition-all duration-200 group/add"
                        >
                            <div className="size-5 rounded-full bg-gray-2 group-hover/add:bg-accent-soft/30 flex items-center justify-center transition-colors">
                                <Icon name="tabler:plus" width={13} height={13} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">Insert New Field Here</span>
                        </button>
                    )}
                </div>
            )}

            {/* End of Section Footer */}
            <div className="px-6 py-2.5 border-t border-dashed border-gray-3 flex items-center justify-center">
                <Text size="10px" fw={600} className="text-gray-5 uppercase tracking-widest">
                    End of Section {pageIndex + 1}.0
                </Text>
            </div>
        </div>
    )
}

const SortableQuestionItem = ({ question, index, activeQuestionId, setActiveQuestionId, updateQuestion, deleteQuestion, isBuilderMode }: any) => {
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
        zIndex: isDragging ? 10 : 1,
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
                index={index + 1}
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
