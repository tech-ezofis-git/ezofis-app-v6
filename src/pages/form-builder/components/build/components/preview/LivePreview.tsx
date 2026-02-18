import { Button, TextInput, SegmentedControl, Text, Divider } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore, type Question, type Page } from '@/pages/form-builder/store/formStore'
import { useState, useEffect } from 'react'
import cn from '@/utils/cn'

type ViewMode = 'typeform' | 'grid' | 'full'

const LivePreview = () => {
    const {
        pages,
        isPreviewOpen,
        setIsPreviewOpen
    } = useFormStore()

    const [viewMode, setViewMode] = useState<ViewMode>('typeform')
    const [currentIndex, setCurrentIndex] = useState(0) // For Typeform (Question Index) & Grid (Page Index)
    const [isCompleted, setIsCompleted] = useState(false)

    // Flatten all questions for Typeform mode
    const allQuestions = pages.flatMap(p => p.questions)
    const totalQuestions = allQuestions.length
    const totalPages = pages.length

    // Reset state when opening
    useEffect(() => {
        if (isPreviewOpen) {
            setCurrentIndex(0)
            setIsCompleted(false)
        }
    }, [isPreviewOpen])

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsPreviewOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setIsPreviewOpen])

    if (!isPreviewOpen) return null

    // Handlers
    const handleNext = () => {
        if (viewMode === 'typeform') {
            if (currentIndex < totalQuestions - 1) {
                setCurrentIndex(prev => prev + 1)
            } else {
                setIsCompleted(true)
            }
        } else if (viewMode === 'grid') {
            if (currentIndex < totalPages - 1) {
                setCurrentIndex(prev => prev + 1)
            } else {
                setIsCompleted(true)
            }
        } else {
            setIsCompleted(true)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    // Progress Calculation
    let progress = 0
    if (viewMode === 'typeform') {
        progress = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0
    } else if (viewMode === 'grid') {
        progress = totalPages > 0 ? Math.round(((currentIndex + 1) / totalPages) * 100) : 0
    } else {
        progress = 100
    }

    return (
        <div className="fixed inset-0 z-[200] bg-surface-primary flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="h-14 border-b border-gray-2 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-accent-primary/10 text-accent-primary p-1.5 rounded-md">
                            <Icon name="tabler:eye" width={18} height={18} />
                        </div>
                        <span className="font-bold text-gray-9">Form Preview</span>
                    </div>

                    <div className="h-6 w-px bg-gray-2 mx-2" />

                    <SegmentedControl
                        value={viewMode}
                        onChange={(v) => {
                            setViewMode(v as ViewMode)
                            setCurrentIndex(0)
                            setIsCompleted(false)
                        }}
                        data={[
                            { label: 'One at a time', value: 'typeform' },
                            { label: 'Page by Page', value: 'grid' },
                            { label: 'All Questions', value: 'full' },
                        ]}
                        size="xs"
                        radius="md"
                        classNames={{
                            root: 'bg-gray-1 p-1 border-0',
                            indicator: 'bg-white shadow-sm',
                            label: 'px-3 font-medium text-xs'
                        }}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-5 flex items-center gap-1 hidden sm:flex">
                        <Icon name="tabler:device-desktop" width={16} height={16} />
                        Desktop
                    </span>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        onClick={() => setIsPreviewOpen(false)}
                        leftSection={<Icon name="tabler:x" width={16} height={16} />}
                    >
                        Close
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-8">

                {isCompleted ? (
                    <CompletionScreen onClose={() => setIsPreviewOpen(false)} />
                ) : (
                    <div className="w-full max-w-2xl bg-white shadow-xl rounded-xl overflow-hidden flex flex-col min-h-[500px] max-h-full transition-all duration-300">
                        {/* Progress Bar (Only for stepped views) */}
                        {viewMode !== 'full' && (
                            <div className="h-1 w-full bg-gray-1">
                                <div
                                    className="h-full bg-accent-primary transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-12">
                            {viewMode === 'typeform' && (
                                <TypeformView
                                    question={allQuestions[currentIndex]}
                                    index={currentIndex}
                                />
                            )}
                            {viewMode === 'grid' && (
                                <PageView
                                    page={pages[currentIndex]}
                                    pageIndex={currentIndex}
                                />
                            )}
                            {viewMode === 'full' && (
                                <FullFormView pages={pages} />
                            )}
                        </div>

                        {/* Footer / Navigation */}
                        <div className="p-6 border-t border-gray-1 bg-gray-50 flex justify-between items-center shrink-0">
                            <div className="text-xs text-gray-4 font-bold uppercase tracking-wider">
                                Powered by Antigravity
                            </div>

                            <div className="flex gap-2">
                                {viewMode !== 'full' && (
                                    <Button
                                        variant="default"
                                        onClick={handlePrev}
                                        disabled={currentIndex === 0}
                                        size="sm"
                                    >
                                        Previous
                                    </Button>
                                )}
                                <Button
                                    variant="filled"
                                    color="dark"
                                    onClick={handleNext}
                                    size="sm"
                                    rightSection={<Icon name={viewMode === 'full' ? "tabler:check" : "tabler:chevron-right"} width={16} height={16} />}
                                >
                                    {viewMode === 'full'
                                        ? 'Submit Form'
                                        : (viewMode === 'typeform' && currentIndex === totalQuestions - 1) || (viewMode === 'grid' && currentIndex === totalPages - 1)
                                            ? 'Submit'
                                            : 'Next'
                                    }
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Sub-Components ---

const CompletionScreen = ({ onClose }: { onClose: () => void }) => (
    <div className="w-full max-w-lg bg-white shadow-xl rounded-xl p-12 text-center animate-in zoom-in-95 fade-in duration-300">
        <div className="size-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="tabler:check" width={40} height={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-9 mb-2">Thank You!</h2>
        <p className="text-gray-5 mb-8">Your form has been successfully submitted.</p>
        <Button variant="outline" color="gray" onClick={onClose}>
            Back to Builder
        </Button>
    </div>
)

const TypeformView = ({ question, index }: { question: Question, index: number }) => {
    if (!question) return <EmptyState />

    return (
        <div className="flex flex-col justify-center min-h-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500 key={question.id}">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-9 mb-2 leading-tight">
                    <span className="text-accent-primary text-xl mr-2">{index + 1}.</span>
                    {question.title || "Untitled Question"}
                </h2>
                {question.description && (
                    <p className="text-gray-5 text-lg">{question.description}</p>
                )}
            </div>

            <div className="mb-6">
                {renderPreviewInput(question)}
            </div>

            {question.required && (
                <div className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase tracking-wider">
                    <Icon name="tabler:asterisk" width={10} height={10} />
                    Required
                </div>
            )}
        </div>
    )
}

const PageView = ({ page, pageIndex }: { page: Page, pageIndex: number }) => {
    if (!page || page.questions.length === 0) return <EmptyState />

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 key={page.id}">
            <div className="border-b border-gray-1 pb-4 mb-4">
                <Text size="sm" fw={700} className="text-gray-4 uppercase tracking-wider">Page {pageIndex + 1}</Text>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {page.questions.map((q) => (
                    <div
                        key={q.id}
                        className={cn(
                            "col-span-12",
                            q.width === '1/2' && "md:col-span-6",
                            q.width === '1/3' && "md:col-span-4"
                        )}
                    >
                        <div className="mb-2">
                            <label className="block text-sm font-bold text-gray-9 mb-1">
                                {q.title || "Untitled Question"}
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {q.description && <p className="text-xs text-gray-5 mb-2">{q.description}</p>}
                        </div>
                        {renderPreviewInput(q, 'sm')}
                    </div>
                ))}
            </div>
        </div>
    )
}

const FullFormView = ({ pages }: { pages: Page[] }) => {
    const allQuestions = pages.flatMap(p => p.questions)
    if (allQuestions.length === 0) return <EmptyState />

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            {pages.map((page, i) => (
                <div key={page.id} className="space-y-6">
                    {pages.length > 1 && (
                        <div className="border-b border-gray-1 pb-2">
                            <Text size="sm" fw={700} className="text-gray-4 uppercase tracking-wider">Page {i + 1}</Text>
                        </div>
                    )}
                    <div className="grid grid-cols-12 gap-6">
                        {page.questions.map((q) => (
                            <div
                                key={q.id}
                                className={cn(
                                    "col-span-12",
                                    q.width === '1/2' && "md:col-span-6",
                                    q.width === '1/3' && "md:col-span-4"
                                )}
                            >
                                <div className="mb-2">
                                    <label className="block text-sm font-bold text-gray-9 mb-1">
                                        {q.title || "Untitled Question"}
                                        {q.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {q.description && <p className="text-xs text-gray-5 mb-2">{q.description}</p>}
                                </div>
                                {renderPreviewInput(q, 'sm')}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

const EmptyState = () => (
    <div className="text-center text-gray-5 py-20">
        <Icon name="tabler:clipboard-x" width={48} height={48} className="mx-auto mb-4 opacity-50" />
        <Text>No questions to display.</Text>
    </div>
)

const renderPreviewInput = (question: Question, size: 'lg' | 'sm' = 'lg') => {
    const isSmall = size === 'sm'
    switch (question.type) {
        case 'label':
            return (
                <div className={cn("text-gray-9 font-medium", isSmall ? "text-sm" : "text-xl")}>
                    {question.title || "Label Text"}
                </div>
            )
        case 'divider':
            return <Divider className="my-4" />
        case 'text_builder':
            return (
                <div className={cn(
                    "w-full border border-gray-2 rounded-lg bg-white overflow-hidden",
                    isSmall ? "min-h-[100px]" : "min-h-[200px]"
                )}>
                    <div className="bg-gray-50 border-b border-gray-2 p-2 flex gap-2">
                        <Icon name="tabler:bold" width={16} height={16} className="text-gray-4" />
                        <Icon name="tabler:italic" width={16} height={16} className="text-gray-4" />
                        <Icon name="tabler:list" width={16} height={16} className="text-gray-4" />
                    </div>
                    <div className="p-4 text-gray-4 italic">Rich text editor placeholder...</div>
                </div>
            )
        case 'file_upload':
            return (
                <div className={cn(
                    "w-full border-2 border-dashed border-gray-2 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer",
                    isSmall ? "p-4" : "p-10"
                )}>
                    <Icon name="tabler:upload" width={isSmall ? 24 : 40} height={isSmall ? 24 : 40} className="text-gray-4 mb-2" />
                    <Text size={isSmall ? "xs" : "sm"} fw={500} className="text-gray-6">Click to upload or drag and drop</Text>
                    <Text size="xs" className="text-gray-4 mt-1 text-center">Any file up to 10MB</Text>
                </div>
            )
        case 'time':
            return (
                <div className={cn(
                    "flex items-center gap-3 border border-gray-2 rounded-lg text-gray-5 bg-white",
                    isSmall ? "p-2 text-sm" : "p-3 text-lg"
                )}>
                    <Icon name="tabler:clock" width={isSmall ? 16 : 20} height={isSmall ? 16 : 20} />
                    <span>HH : MM AM/PM</span>
                </div>
            )
        case 'table':
            const columns = question.columns || [
                { id: '1', name: 'Column 1', type: 'short_text', size: 'md' },
                { id: '2', name: 'Column 2', type: 'short_text', size: 'md' },
                { id: '3', name: 'Column 3', type: 'short_text', size: 'md' }
            ]
            return (
                <div className="border border-gray-2 rounded-lg overflow-x-auto bg-white">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-2">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.id} className={cn(
                                        "p-3 font-bold text-gray-7 whitespace-nowrap",
                                        col.size === 'sm' && "w-[100px]",
                                        col.size === 'md' && "w-[200px]",
                                        col.size === 'lg' && "w-[300px]"
                                    )}>
                                        {col.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2].map(i => (
                                <tr key={i} className="border-b border-gray-1 last:border-0">
                                    {columns.map(col => (
                                        <td key={col.id} className="p-3">
                                            <TextInput variant="unstyled" placeholder="..." size="xs" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        case 'short_text':
        case 'email':
        case 'phone':
        case 'number':
        case 'currency':
        case 'address':
        case 'full_name':
            return (
                <TextInput
                    placeholder={question.placeholder || "Type your answer here..."}
                    variant={isSmall ? "default" : "unstyled"}
                    size={isSmall ? "sm" : "xl"}
                    classNames={{
                        input: isSmall
                            ? 'bg-white'
                            : 'border-b-2 border-gray-2 focus:border-accent-primary transition-colors px-0 rounded-none text-2xl font-light py-2'
                    }}
                />
            )
        case 'long_text':
            return (
                <textarea
                    placeholder={question.placeholder || "Type your answer here..."}
                    className={cn(
                        "w-full outline-none transition-colors resize-none",
                        isSmall
                            ? "bg-white border border-gray-3 rounded-md p-2 text-sm min-h-[80px] focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                            : "bg-transparent border-b-2 border-gray-2 focus:border-accent-primary text-xl font-light py-2 min-h-[100px]"
                    )}
                />
            )
        case 'date':
            return (
                <div className={cn(
                    "inline-flex items-center gap-3 border border-gray-2 rounded-lg text-gray-5 hover:border-accent-primary/50 transition-colors cursor-pointer bg-white",
                    isSmall ? "p-2 text-sm" : "p-3 text-lg"
                )}>
                    <Icon name="tabler:calendar" width={isSmall ? 16 : 20} height={isSmall ? 16 : 20} />
                    <span>MM / DD / YYYY</span>
                </div>
            )
        case 'rating':
            return (
                <div className="flex gap-2 sm:gap-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} className={cn(
                            "rounded bg-gray-1 border border-gray-3 hover:border-accent-primary hover:bg-accent-primary hover:text-white transition-all font-bold text-gray-7 flex items-center justify-center",
                            isSmall ? "size-8 text-sm" : "size-12 text-lg"
                        )}>
                            {s}
                        </button>
                    ))}
                </div>
            )
        case 'choices':
        case 'checkbox':
        case 'dropdown':
            return (
                <div className="space-y-2">
                    {['Option A', 'Option B', 'Option C'].map((opt, i) => (
                        <div key={i} className={cn(
                            "flex items-center gap-3 border border-gray-2 rounded-lg hover:bg-accent-soft/5 hover:border-accent-primary/30 transition-all cursor-pointer bg-white",
                            isSmall ? "p-2 text-sm" : "p-3"
                        )}>
                            <div className={cn(
                                "border border-gray-3 flex items-center justify-center",
                                question.type === 'choices' ? 'rounded-full' : 'rounded-md',
                                isSmall ? "size-4" : "size-5"
                            )}>
                            </div>
                            <span className={cn("text-gray-7", isSmall ? "text-sm" : "text-lg")}>{opt}</span>
                        </div>
                    ))}
                </div>
            )
        default:
            return (
                <TextInput
                    placeholder={question.placeholder || "Type your answer here..."}
                    variant={isSmall ? "default" : "unstyled"}
                    size={isSmall ? "sm" : "xl"}
                    classNames={{
                        input: isSmall
                            ? 'bg-white'
                            : 'border-b-2 border-gray-2 focus:border-accent-primary transition-colors px-0 rounded-none text-2xl font-light py-2'
                    }}
                />
            )
    }
}

export default LivePreview
