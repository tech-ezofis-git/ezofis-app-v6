import { Card, TextInput, ActionIcon, Tooltip, Divider } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { type Question, useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import { useState, useRef, useLayoutEffect, useEffect } from 'react'

interface Props {
    question: Question
    isActive: boolean
    onSelect: () => void
    onUpdate: (updates: Partial<Question>) => void
    onDelete: () => void
    isBuilderMode?: boolean
    dragListeners?: any
}

const QuestionCard = ({ question, isActive, onSelect, onUpdate, onDelete, dragListeners }: Props) => {
    const isRequired = question.settings.validation.fieldRule === 'REQUIRED'
    const isNarrow = question.settings.general.size === 'col-4'

    // Truncation detection
    const [isTruncated, setIsTruncated] = useState(false)
    const labelRef = useRef<HTMLInputElement>(null)

    const checkTruncation = () => {
        if (labelRef.current) {
            const { scrollWidth, clientWidth } = labelRef.current
            setIsTruncated(scrollWidth > clientWidth)
        }
    }

    useLayoutEffect(() => {
        checkTruncation()
    }, [question.label, question.settings.general.size])

    // Re-check on window resize
    useEffect(() => {
        window.addEventListener('resize', checkTruncation)
        return () => window.removeEventListener('resize', checkTruncation)
    }, [])

    return (
        <Card
            onClick={onSelect}
            className={cn(
                "group relative border transition-all duration-300 cursor-pointer overflow-visible bg-white",
                "animate-in fade-in zoom-in-[0.98] duration-500",
                isActive
                    ? "border-accent-primary shadow-lg bg-white ring-1 ring-accent-primary"
                    : "border-gray-3 hover:border-accent-soft hover:shadow-md hover:-translate-y-0.5"
            )}
            style={{
                padding: 0,
                borderRadius: '12px'
            }}
        >
            <div className="flex items-center justify-between gap-3 py-3 px-4 h-14">
                {/* Left Side: Drag, Icon, Label, Badge */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* 1. Drag Handle */}
                    <div
                        className={cn(
                            "flex items-center justify-center h-7 rounded-lg hover:bg-gray-1 cursor-grab active:cursor-grabbing shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                            isActive
                                ? "w-7 opacity-100 text-accent-primary"
                                : "w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 text-gray-4 hover:text-gray-8"
                        )}
                        {...dragListeners}
                    >
                        <div className="flex items-center justify-center w-7 shrink-0">
                            <Icon name="tabler:grip-vertical" width={18} height={18} />
                        </div>
                    </div>

                    {/* 2. Field Icon & Badge */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={cn(
                            "flex items-center justify-center size-8 rounded-lg shrink-0 transition-colors shadow-sm border",
                            isActive ? "bg-accent-soft text-accent-primary border-accent-soft" : "bg-gray-1 text-gray-8 border-gray-2"
                        )}>
                            <Icon
                                name={TYPE_ICONS[question.type] || 'tabler:circle-dot'}
                                width={16} height={16}
                            />
                        </div>

                        {/* 3. Label (Editable TextInput) */}
                        <div className="flex flex-col min-w-0 flex-1">
                            <Tooltip
                                label={question.label}
                                position="top-start"
                                withArrow
                                disabled={!isTruncated}
                                multiline
                                w={250}
                                transitionProps={{ transition: 'pop', duration: 200 }}
                            >
                                <div className="w-full">
                                    <TextInput
                                        ref={labelRef}
                                        value={question.label}
                                        onChange={(e) => {
                                            onUpdate({ label: e.target.value })
                                        }}
                                        placeholder="Field label..."
                                        variant="unstyled"
                                        classNames={{
                                            input: cn(
                                                "text-sm font-bold p-0 min-h-0 placeholder:text-gray-3 tracking-tight truncate h-auto",
                                                isActive ? "text-accent-primary" : "text-gray-13"
                                            )
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* Right Side Actions: Hover for Duplicate/Delete, Permanent for Required at far right */}
                <div className="flex items-center transition-all shrink-0">
                    {/* Secondary Actions (Hover Only) */}
                    <div className={cn(
                        "flex items-center transition-all duration-500 ease-out",
                        "opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 pointer-events-none group-hover:pointer-events-auto"
                    )}>
                        {isNarrow ? (
                            <div className="flex items-center group/more pointer-events-auto">
                                <div className="flex items-center gap-1 overflow-hidden transition-all duration-300 w-0 group-hover/more:w-[72px] opacity-0 group-hover/more:opacity-100 translate-x-2 group-hover/more:translate-x-0">
                                    {/* Duplicate */}
                                    <Tooltip label="Duplicate" position="top" withArrow transitionProps={{ transition: 'pop', duration: 200 }}>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="md"
                                            className="hover:bg-gray-1 rounded-lg transition-all active:scale-95 shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                const { setCopiedQuestion, duplicateQuestion } = useFormStore.getState()
                                                setCopiedQuestion(question)
                                                duplicateQuestion(question.id)
                                            }}
                                        >
                                            <Icon name="tabler:copy" width={14} height={14} className="text-gray-8" />
                                        </ActionIcon>
                                    </Tooltip>

                                    {/* Delete */}
                                    <Tooltip label="Delete" position="top" withArrow transitionProps={{ transition: 'pop', duration: 200 }}>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            size="md"
                                            className="hover:bg-red-50 rounded-lg transition-all active:scale-95 text-red-11 shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDelete()
                                            }}
                                        >
                                            <Icon name="tabler:trash" width={14} height={14} />
                                        </ActionIcon>
                                    </Tooltip>
                                </div>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="md"
                                    className="hover:bg-gray-1 rounded-lg transition-all active:scale-95 shrink-0"
                                >
                                    <Icon name="tabler:dots-vertical" width={16} height={16} className="text-gray-8" />
                                </ActionIcon>
                            </div>
                        ) : (
                            <>
                                {/* Duplicate */}
                                <Tooltip label="Duplicate" position="top" withArrow transitionProps={{ transition: 'pop', duration: 200 }}>
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size="md"
                                        className="hover:bg-gray-1 rounded-lg transition-all active:scale-95 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const { setCopiedQuestion, duplicateQuestion } = useFormStore.getState()
                                            setCopiedQuestion(question)
                                            duplicateQuestion(question.id)
                                        }}
                                    >
                                        <Icon name="tabler:copy" width={14} height={14} className="text-gray-8" />
                                    </ActionIcon>
                                </Tooltip>

                                {/* Delete */}
                                <Tooltip label="Delete" position="top" withArrow transitionProps={{ transition: 'pop', duration: 200 }}>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        size="md"
                                        className="hover:bg-red-50 rounded-lg transition-all active:scale-95 text-red-11 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete()
                                        }}
                                    >
                                        <Icon name="tabler:trash" width={14} height={14} />
                                    </ActionIcon>
                                </Tooltip>
                            </>
                        )}

                        <Divider orientation="vertical" className="h-4 border-gray-2" mx={2} />
                    </div>

                    {/* Required Indicator/Toggle (Permanent if isRequired, at the very end) */}
                    <div className={cn(
                        "transition-all duration-300 z-10",
                        isRequired || isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-95"
                    )}>
                        <Tooltip label={isRequired ? "Required" : "Mark as Required"} position="top" withArrow transitionProps={{ transition: 'pop', duration: 200 }}>
                            <ActionIcon
                                variant="subtle"
                                color={isRequired ? "red" : "gray"}
                                size="md"
                                className={cn(
                                    "rounded-lg transition-all active:scale-95",
                                    isRequired ? "bg-red-50 text-red-500" : "hover:bg-gray-1"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onUpdate({ settings: { ...question.settings, validation: { ...question.settings.validation, fieldRule: isRequired ? 'OPTIONAL' : 'REQUIRED' } } })
                                }}
                            >
                                <Icon name={isRequired ? "tabler:circle-check-filled" : "tabler:circle-dot"} width={16} height={16} />
                            </ActionIcon>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Bottom Width Toolbar (Hover Only) */}
            <div className="absolute -bottom-[18px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 pointer-events-none group-hover:pointer-events-auto">
                <div className="flex items-center gap-1 bg-white border border-gray-2 shadow-2xl rounded-full p-1 border-b-2 border-b-accent-primary animate-in slide-in-from-top-4">
                    {[
                        { label: '1/3', value: 'col-4' },
                        { label: '1/2', value: 'col-6' },
                        { label: 'Full', value: 'col-12' },
                    ].map((w) => (
                        <button
                            key={w.value}
                            onClick={(e) => {
                                e.stopPropagation()
                                onUpdate({ settings: { ...question.settings, general: { ...question.settings.general, size: w.value as any } } })
                            }}
                            className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black transition-all uppercase tracking-tighter",
                                question.settings.general.size === w.value
                                    ? "bg-accent-primary text-white shadow-md shadow-accent-soft/20"
                                    : "text-gray-5 hover:bg-gray-1"
                            )}
                        >
                            {w.label}
                        </button>
                    ))}
                </div>
            </div>
        </Card>
    )
}

const TYPE_ICONS: Record<string, string> = {
    SHORT_TEXT: 'mdi:form-textbox',
    LONG_TEXT: 'mdi:form-textarea',
    EMAIL: 'lucide:mail',
    PHONE_NUMBER: 'lucide:phone',
    SINGLE_CHOICE: 'mdi:radiobox-marked',
    MULTIPLE_CHOICE: 'lucide:square-check',
    SINGLE_SELECT: 'lucide:list-todo',
    MULTI_SELECT: 'lucide:list-todo',
    PASSWORD: 'lucide:lock',
    FILE_UPLOAD: 'lucide:file-up',
    TEXT_BUILDER: 'lucide:text',
    TABLE: 'lucide:table',
    DIVIDER: 'lucide:minus',
    HEADING: 'lucide:heading',
    LABEL: 'lucide:heading',
    DATE: 'lucide:calendar',
    TIME: 'lucide:clock',
    DATE_TIME: 'lucide:calendar-time',
    RATING: 'lucide:star',
    COUNTER: 'tabler:number-123',
    CALCULATED: 'tabler:calculator',
    COUNTRY_CODE: 'lucide:globe',
    ADDRESS: 'lucide:home',
}

export default QuestionCard
