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
    const isRequired = question.settings.validation.fieldRule === 'REQUIRED'

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
                        {isRequired && (
                            <Group gap={4}>
                                <div className="size-1.5 rounded-full bg-error-main" />
                                <Text size="10px" fw={800} className="text-error-main uppercase tracking-tight">
                                    Required
                                </Text>
                            </Group>
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
                        value={question.label}
                        onChange={(e) => onUpdate({ label: e.target.value })}
                        placeholder="Enter your field label..."
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
    SHORT_TEXT: 'tabler:letter-t',
    LONG_TEXT: 'tabler:square-letter-t',
    EMAIL: 'tabler:mail',
    PHONE_NUMBER: 'tabler:phone',
    SINGLE_CHOICE: 'tabler:circle',
    PASSWORD: 'tabler:lock',
    FILE_UPLOAD: 'tabler:cloud-upload',
    TEXT_BUILDER: 'tabler:type',
    TABLE: 'tabler:table',
    DIVIDER: 'tabler:minus',
    HEADING: 'tabler:heading',
    LABEL: 'tabler:heading',
    DATE: 'tabler:calendar',
    TIME: 'tabler:clock',
    DATE_TIME: 'tabler:calendar-time',
    RATING: 'tabler:star',
    COUNTER: 'tabler:circle-dot',
    CALCULATED: 'tabler:calculator',
    COUNTRY_CODE: 'tabler:globe',
    ADDRESS: 'tabler:home',
}

export default QuestionCard
