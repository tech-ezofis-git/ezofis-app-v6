import { Card, TextInput, ActionIcon, Group, Text, Box, Divider } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { type Question } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

interface Props {
    question: Question
    index: number
    isActive: boolean
    onSelect: () => void
    onUpdate: (updates: Partial<Question>) => void
    onDelete: () => void
    isBuilderMode?: boolean
    dragListeners?: any
}

const QuestionCard = ({ question, index, isActive, onSelect, onUpdate, onDelete, isBuilderMode = true, dragListeners }: Props) => {
    return (
        <Card
            onClick={onSelect}
            className={cn(
                "group relative border transition-all duration-200 cursor-pointer overflow-visible animate-in fade-in zoom-in-[0.98] duration-500 bg-surface-primary",
                isActive
                    ? "border-2 border-accent-primary bg-accent-soft/30 z-10 shadow-md shadow-accent-soft/20"
                    : "border-gray-3 hover:border-gray-5 hover:shadow-sm"
            )}
            style={{
                padding: 0,
                borderRadius: '10px',
                marginBottom: '12px'
            }}
        >
            {/* Indicator Rail */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 rounded-l-[10px]",
                isActive ? "bg-accent-primary scale-y-100" : "bg-gray-3 group-hover:bg-gray-5"
            )} />

            {/* Persistent Drag Handle */}
            {isBuilderMode && (
                <div
                    className={cn(
                        "absolute left-[-26px] top-1/2 -translate-y-1/2 transition-all duration-300",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                    )}
                    {...dragListeners}
                >
                    <Icon name="tabler:grip-vertical" width={18} height={18} className="text-gray-7 cursor-grab active:cursor-grabbing" />
                </div>
            )}

            {/* Card Inner Padding */}
            <div className="p-5">
                {/* Header Row */}
                <Group justify="space-between" mb={10}>
                    <Group gap="xs">
                        {/* Field Index Badge */}
                        <div className={cn(
                            "flex items-center justify-center size-6 rounded-full border text-[10px] font-extrabold transition-colors",
                            isActive
                                ? "bg-accent-soft border-accent-primary/30 text-accent-primary"
                                : "bg-gray-2 border-gray-3 text-gray-9"
                        )}>
                            {index}
                        </div>

                        {/* Field Type Badge */}
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors",
                            isActive ? "bg-accent-soft/60" : "bg-gray-2"
                        )}>
                            <Icon
                                name={TYPE_ICONS[question.type] || 'tabler:circle-dot'}
                                width={11} height={11}
                                className={isActive ? "text-accent-primary" : "text-gray-9"}
                            />
                            <Text size="10px" fw={700} className={cn(
                                "uppercase tracking-wider",
                                isActive ? "text-accent-primary" : "text-gray-9"
                            )}>
                                {question.type.replace(/_/g, ' ')}
                            </Text>
                        </div>

                        {/* Required Badge */}
                        {question.required && (
                            <Group gap={4}>
                                <div className="size-1.5 rounded-full bg-error-main" />
                                <Text size="10px" fw={700} className="text-error-main uppercase tracking-widest">
                                    Required
                                </Text>
                            </Group>
                        )}

                        {/* AI Risk Score */}
                        {(question.aiRiskScore !== undefined) && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100">
                                <Icon name="tabler:alert-triangle" className="text-orange-500 w-3 h-3" />
                                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
                                    Risk: {question.aiRiskScore}%
                                </span>
                            </div>
                        )}
                    </Group>

                    {/* Action Buttons (visible on hover / active) */}
                    <Group gap="xs" className={cn(
                        "transition-opacity duration-200",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            className="hover:bg-gray-2 active:scale-90 transition-all"
                            onClick={(e) => { e.stopPropagation() }}
                            title="Duplicate field"
                        >
                            <Icon name="tabler:copy" width={13} height={13} />
                        </ActionIcon>
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            className="hover:bg-red-50 active:scale-90 transition-all"
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            title="Delete field"
                        >
                            <Icon name="tabler:trash" width={13} height={13} />
                        </ActionIcon>
                    </Group>
                </Group>

                {/* Question Title */}
                <Box>
                    <TextInput
                        value={question.title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        placeholder="Enter your question title..."
                        variant="unstyled"
                        classNames={{
                            input: 'text-gray-13 font-semibold text-base p-0 min-h-0 mb-2 placeholder:text-gray-5'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />

                    <Box mb={14}>
                        <TextInput
                            value={question.description}
                            onChange={(e) => onUpdate({ description: e.target.value })}
                            placeholder="Add a description (optional)..."
                            variant="unstyled"
                            classNames={{
                                input: 'text-gray-9 text-[13px] p-0 min-h-0 placeholder:text-gray-4'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Edit field settings hint */}
                        {isBuilderMode && (
                            <div className={cn(
                                "mt-2 transition-all duration-300",
                                isActive ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden"
                            )}>
                                <Text size="10px" className="text-accent-primary/60 italic font-bold uppercase tracking-wider">
                                    Click to edit field settings
                                </Text>
                            </div>
                        )}
                    </Box>

                    {/* Field Preview */}
                    <Box>
                        {renderBuilderPreview(question)}
                    </Box>
                </Box>
            </div>

            {/* Floating Width Controls (Pill Style) */}
            <div className={cn(
                "absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 transition-all duration-200 ease-out",
                isActive || "group-hover:opacity-100 group-hover:translate-y-0",
                !isActive && "opacity-0 translate-y-1 pointer-events-none group-hover:pointer-events-auto"
            )}>
                <div className="flex items-center gap-1 p-1 bg-surface-primary rounded-full shadow-lg border border-gray-3">
                    <WidthButton
                        label="1/3"
                        active={question.width === '1/3'}
                        onClick={(e) => { e.stopPropagation(); onUpdate({ width: '1/3' }) }}
                    />
                    <WidthButton
                        label="1/2"
                        active={question.width === '1/2'}
                        onClick={(e) => { e.stopPropagation(); onUpdate({ width: '1/2' }) }}
                    />
                    <WidthButton
                        label="1/1"
                        active={!question.width || question.width === 'full'}
                        onClick={(e) => { e.stopPropagation(); onUpdate({ width: 'full' }) }}
                    />
                </div>
            </div>
        </Card>
    )
}

const WidthButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: (e: any) => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-8 h-6 text-[10px] font-bold rounded-full transition-all flex items-center justify-center",
            active
                ? "bg-accent-primary text-white shadow-sm"
                : "text-gray-7 hover:bg-gray-2 hover:text-gray-11"
        )}
    >
        {label}
    </button>
)

const renderBuilderPreview = (question: Question) => {
    const type = question.type

    switch (type) {
        case 'divider':
            return <Divider className="my-2" />

        case 'label':
            return (
                <div className="py-2 border-b border-dashed border-gray-3">
                    <Text size="sm" className="text-gray-5 italic">Label text will appear here...</Text>
                </div>
            )

        case 'table':
            const cols = question.columns || []
            return (
                <div className="border border-gray-3 rounded-lg overflow-hidden bg-gray-1/30">
                    <div className="flex border-b border-gray-3 bg-gray-2/50">
                        {cols.length > 0 ? cols.map(c => (
                            <div key={c.id} className="flex-1 p-2 text-[10px] font-bold text-gray-9 border-r border-gray-3 last:border-0 truncate">
                                {c.name}
                            </div>
                        )) : (
                            <div className="flex-1 p-2 text-[10px] font-bold text-gray-5">No columns defined</div>
                        )}
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center gap-2 opacity-50">
                        <Icon name="tabler:table" width={24} height={24} className="text-gray-5" />
                        <Text size="10px" className="text-gray-7">Table input area</Text>
                    </div>
                </div>
            )

        case 'file_upload':
            return (
                <div className="p-6 border-2 border-dashed border-gray-3 rounded-xl bg-gray-1/50 flex flex-col items-center gap-2 transition-colors hover:border-accent-primary/40 hover:bg-accent-soft/10">
                    <div className="size-10 rounded-full bg-accent-soft/30 flex items-center justify-center">
                        <Icon name="tabler:cloud-upload" width={22} height={22} className="text-accent-primary/70" />
                    </div>
                    <Text size="xs" className="text-gray-9">
                        Drop files here or{' '}
                        <span className="text-accent-primary font-semibold underline underline-offset-2 cursor-pointer">
                            browse filesystem
                        </span>
                    </Text>
                    <Text size="10px" className="text-gray-7 uppercase tracking-wider font-medium">
                        Max 50MB · PDF, JPG, PNG
                    </Text>
                </div>
            )

        case 'text_builder':
            return (
                <div className="border border-gray-3 rounded-lg overflow-hidden bg-surface-primary">
                    <div className="bg-gray-2 border-b border-gray-3 p-1.5 flex gap-2">
                        <div className="size-4 rounded bg-gray-4" />
                        <div className="size-4 rounded bg-gray-4" />
                        <div className="size-4 rounded bg-gray-4" />
                    </div>
                    <div className="p-3 text-[11px] text-gray-5 italic">Rich text content area...</div>
                </div>
            )

        default:
            return (
                <div className="relative">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-2/50 border border-gray-3">
                        <Icon name="tabler:message" width={15} height={15} className="text-gray-7" />
                        <Text size="xs" className="text-gray-9">Answer area ({question.type.replace(/_/g, ' ')})</Text>
                    </div>

                    <ActionIcon
                        variant="filled"
                        bg="accent-primary"
                        className="absolute right-2 top-1/2 -translate-y-1/2 shadow-sm hover:opacity-90 active:scale-90 transition-all z-10"
                        size="sm"
                    >
                        <Icon name="tabler:sparkles" width={13} height={13} />
                    </ActionIcon>
                </div>
            )
    }
}

const TYPE_ICONS: Record<string, string> = {
    short_text: 'tabler:letter-t',
    long_text: 'tabler:square-letter-t',
    email: 'tabler:mail',
    phone: 'tabler:phone',
    choices: 'tabler:circle',
    password: 'tabler:lock',
    file_upload: 'tabler:cloud-upload',
    text_builder: 'tabler:type',
    table: 'tabler:table',
    divider: 'tabler:minus',
    label: 'tabler:heading',
    date: 'tabler:calendar',
    time: 'tabler:clock',
    date_time: 'tabler:calendar-time',
    rating: 'tabler:star',
    counter: 'tabler:circle-dot',
    calculated: 'tabler:calculator',
    country_code: 'tabler:globe',
    address: 'tabler:home',
}

export default QuestionCard
