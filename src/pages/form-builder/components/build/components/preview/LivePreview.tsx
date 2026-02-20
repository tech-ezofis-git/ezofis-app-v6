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
        setIsPreviewOpen,
        welcomePage,
        showWelcomePage,
        thankYouPage,
        showThankYouPage
    } = useFormStore()

    const [viewMode, setViewMode] = useState<ViewMode>('typeform')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const [showWelcome, setShowWelcome] = useState(false)

    // Flatten all questions for Typeform mode
    const allQuestions = pages.flatMap(p => p.questions)
    const totalQuestions = allQuestions.length
    const totalPages = pages.length

    // Reset state when opening
    useEffect(() => {
        if (isPreviewOpen) {
            setCurrentIndex(0)
            setIsCompleted(false)
            setShowWelcome(showWelcomePage)
        }
    }, [isPreviewOpen, showWelcomePage])

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
        if (showWelcome) {
            setShowWelcome(false)
            return
        }

        if (viewMode === 'typeform') {
            if (currentIndex < totalQuestions - 1) {
                setCurrentIndex(prev => prev + 1)
            } else if (showThankYouPage) {
                setIsCompleted(true)
            } else {
                setIsPreviewOpen(false)
            }
        } else if (viewMode === 'grid') {
            if (currentIndex < totalPages - 1) {
                setCurrentIndex(prev => prev + 1)
            } else if (showThankYouPage) {
                setIsCompleted(true)
            } else {
                setIsPreviewOpen(false)
            }
        } else {
            if (showThankYouPage) {
                setIsCompleted(true)
            } else {
                setIsPreviewOpen(false)
            }
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        } else if (showWelcomePage && !showWelcome) {
            setShowWelcome(true)
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
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in duration-500 font-inter">
            {/* Header */}
            <div className="h-16 border-b border-gray-2 flex items-center justify-between px-6 bg-white shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-accent-soft/30 text-accent-primary size-9 rounded-xl flex items-center justify-center">
                            <Icon name="tabler:eye" width={20} height={20} />
                        </div>
                        <span className="font-extrabold text-gray-13 tracking-tight text-lg">Preview</span>
                    </div>

                    <div className="h-6 w-px bg-gray-2 mx-2" />

                    <SegmentedControl
                        value={viewMode}
                        onChange={(v) => {
                            setViewMode(v as ViewMode)
                            setCurrentIndex(0)
                            setIsCompleted(false)
                            setShowWelcome(showWelcomePage)
                        }}
                        data={[
                            { label: 'One at a time', value: 'typeform' },
                            { label: 'Page by Page', value: 'grid' },
                            { label: 'All Questions', value: 'full' },
                        ]}
                        size="xs"
                        radius="xl"
                        classNames={{
                            root: 'bg-gray-1 p-1 border border-gray-2',
                            indicator: 'bg-white shadow-sm',
                            label: 'px-6 font-bold text-[10px] uppercase tracking-wider'
                        }}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-2 border border-gray-3">
                        <Icon name="tabler:device-desktop" width={14} height={14} className="text-gray-9" />
                        <Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider">Live Preview</Text>
                    </div>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => setIsPreviewOpen(false)}
                        className="hover:bg-gray-1 rounded-xl h-10 px-4"
                        leftSection={<Icon name="tabler:x" width={18} height={18} />}
                    >
                        Exit
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative bg-white flex flex-col items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden flex flex-col h-full max-h-[850px] transition-all duration-300 border border-gray-2 relative">

                    {/* Progress Bar */}
                    {!showWelcome && !isCompleted && viewMode !== 'full' && (
                        <div className="h-1.5 w-full bg-gray-1 absolute top-0 left-0 z-10">
                            <div
                                className="h-full bg-accent-primary transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(var(--accent-primary-rgb),0.5)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
                        {showWelcome ? (
                            <WelcomeScreen
                                page={welcomePage}
                                onStart={handleNext}
                            />
                        ) : isCompleted ? (
                            <CompletionScreen
                                page={thankYouPage}
                                onClose={() => setIsPreviewOpen(false)}
                            />
                        ) : (
                            <div className="flex-1 p-10 sm:p-14">
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
                        )}
                    </div>

                    {/* Footer / Navigation */}
                    <div className="px-8 py-6 border-t border-gray-1 bg-white flex justify-between items-center shrink-0 z-20">
                        <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity cursor-default group">
                            <div className="size-6 bg-accent-soft/30 rounded-lg flex items-center justify-center group-hover:bg-accent-soft/50 transition-colors">
                                <Icon name="lucide:zap" width={14} height={14} className="text-accent-primary group-hover:scale-110 transition-transform" />
                            </div>
                            <Text size="10px" fw={800} className="text-gray-11 uppercase tracking-[0.2em]">
                                Powered By <span className="text-gray-13 border-b border-gray-3 pb-0.5">EZOFIS</span>
                            </Text>
                        </div>

                        {!isCompleted && (
                            <div className="flex gap-4">
                                {(showWelcome || (viewMode !== 'full' && currentIndex > 0) || (!showWelcome && showWelcomePage)) && (
                                    <Button
                                        variant="subtle"
                                        color="gray"
                                        onClick={handlePrev}
                                        disabled={showWelcome}
                                        size="md"
                                        className="rounded-2xl font-bold px-6 h-11"
                                    >
                                        {showWelcome ? '' : 'Back'}
                                    </Button>
                                )}
                                <Button
                                    variant="filled"
                                    bg="accent-primary"
                                    onClick={handleNext}
                                    size="md"
                                    className="rounded-2xl font-black px-8 h-11 shadow-lg shadow-accent-soft/50 hover:opacity-90 active:scale-95 transition-all text-white"
                                    rightSection={<Icon name={isCompleted || (viewMode === 'full') ? "tabler:check" : "tabler:arrow-right"} width={18} height={18} />}
                                >
                                    {showWelcome ? welcomePage.buttonText : (viewMode === 'full' ? 'Submit' : (currentIndex === totalQuestions - 1 || (viewMode === 'grid' && currentIndex === totalPages - 1) ? 'Submit' : 'Next'))}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Sub-Components ---

const WelcomeScreen = ({ page, onStart }: { page: any, onStart: () => void }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="size-28 bg-accent-soft/30 text-accent-primary rounded-[2.5rem] flex items-center justify-center mb-10 rotate-3 shadow-sm border border-accent-soft/60">
            <Icon name="lucide:megaphone" className='size-12'/>
        </div>
        <h1 className="text-5xl font-black text-gray-13 mb-6 tracking-tight leading-tight">
            {page.title}
        </h1>
        <p className="text-xl text-gray-11 max-w-lg mx-auto mb-12 leading-relaxed font-medium">
            {page.description}
        </p>
        <Button
            size="xl"
            bg="accent-primary"
            onClick={onStart}
            className="rounded-2xl px-12 h-16 text-xl font-black shadow-xl shadow-accent-soft/60 hover:scale-[1.02] active:scale-95 transition-all text-white"
        >
            {page.buttonText}
        </Button>
    </div>
)

const CompletionScreen = ({ page, onClose }: { page: any, onClose: () => void }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="size-28 bg-green-10/5 text-green-6 rounded-full flex items-center justify-center mb-10 shadow-sm border border-green-200 animate-bounce-slow">
            <Icon name="tabler:circle-check" className='size-12' />
        </div>
        <h2 className="text-5xl font-black text-gray-13 mb-6 tracking-tight">
            {page.title}
        </h2>
        <p className="text-xl text-gray-11 max-w-md mx-auto mb-12 leading-relaxed font-medium">
            {page.description}
        </p>
        <div className="flex flex-col gap-4">
            <Button
                variant="outline"
                color="gray"
                size="lg"
                onClick={onClose}
                className="rounded-2xl border-2 border-gray-3 px-10 font-bold hover:bg-gray-1 transition-all h-14"
            >
                Close Preview
            </Button>
        </div>
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
