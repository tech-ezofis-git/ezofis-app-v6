import { Card, TextInput, ActionIcon, Group, Text, Box } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { type Question, useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

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


            {/* Card Inner Padding */}
            <div className="p-3 px-4 flex flex-col gap-2">
                {/* Header Row */}
                <Group justify="space-between">
                    <Group gap="xs">
                        {/* Drag Handle */}
                        <div
                            className={cn(
                                "flex items-center justify-center size-6 rounded hover:bg-gray-1 transition-colors cursor-grab active:cursor-grabbing",
                                isActive ? "text-accent-primary" : "text-gray-4 group-hover:text-gray-9"
                            )}
                            {...dragListeners}
                        >
                            <Icon name="tabler:grip-vertical" width={16} height={16} />
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
                            <Text size="10px" fw={800} className={cn(
                                "uppercase tracking-tight",
                                isActive ? "text-accent-primary" : "text-gray-9"
                            )}>
                                {question.type.replace(/_/g, ' ')}
                            </Text>
                        </div>

                        {/* Required Badge */}
                        {question.required && (
                            <Group gap={4}>
                                <div className="size-1.5 rounded-full bg-error-main" />
                                <Text size="10px" fw={800} className="text-error-main uppercase tracking-tight">
                                    Required
                                </Text>
                            </Group>
                        )}

                        {/* AI Risk Score */}
                        {(question.aiRiskScore !== undefined) && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100">
                                <Icon name="tabler:alert-triangle" className="text-orange-500 w-3 h-3" />
                                <span className="text-[10px] font-extrabold text-orange-700 uppercase tracking-tight">
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
                        {/* AI Icon Badge (Relocated) */}
                        <div className={cn(
                            "flex items-center justify-center size-6 rounded-full border transition-colors",
                            isActive
                                ? "bg-accent-soft border-accent-primary/30 text-accent-primary"
                                : "bg-gray-2 border-gray-3 text-gray-4"
                        )}>
                            <Icon name="tabler:sparkles" width={12} height={12} />
                        </div>

                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            className="hover:bg-gray-2 active:scale-90 transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                const { setCopiedQuestion, duplicateQuestion } = useFormStore.getState();
                                setCopiedQuestion(question);
                                duplicateQuestion(question.id);
                            }}
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
                            input: 'text-gray-13 font-semibold text-sm p-0 min-h-0 placeholder:text-gray-4 tracking-tight'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Box>
            </div>

        </Card>
    )
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
