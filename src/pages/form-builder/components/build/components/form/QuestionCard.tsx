import { Card, TextInput, ActionIcon, Group, Text, Box } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore, type Question } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

interface Props {
    question: Question
    index: number
    isActive: boolean
    onSelect: () => void
    onUpdate: (updates: Partial<Question>) => void
    onDelete: () => void
}

const QuestionCard = ({ question, index, isActive, onSelect, onUpdate, onDelete }: Props) => {
    return (
        <Card
            onClick={onSelect}
            padding="md"
            radius="md"
            className={cn(
                "group relative border-2 transition-all duration-300 cursor-pointer overflow-visible",
                isActive ? "border-accent-primary bg-surface-primary shadow-md ring-4 ring-accent-soft/5" : "border-gray-2 bg-surface-primary hover:border-gray-3 hover:shadow-sm"
            )}
        >
            <Group justify="space-between" mb="xs">
                <Group gap="xs">
                    <Text size="xs" fw={700} className="text-gray-9 w-6">
                        {index}.
                    </Text>
                    <Text size="10px" fw={700} className="text-gray-7 uppercase tracking-widest">
                        {question.type.replace('_', ' ')}
                    </Text>
                    {question.required && (
                        <Text size="10px" fw={700} className="text-red-500 uppercase tracking-widest">
                            * Required
                        </Text>
                    )}
                    {(question.aiRiskScore !== undefined) && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100">
                            <Icon name="tabler:alert-triangle" className="text-orange-500 w-3 h-3" />
                            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">
                                Risk: {question.aiRiskScore}%
                            </span>
                        </div>
                    )}
                </Group>

                <Group gap="xs" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                        <Icon name="tabler:trash" width={14} height={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="gray" size="sm">
                        <Icon name="tabler:dots-vertical" width={14} height={14} />
                    </ActionIcon>
                </Group>
            </Group>

            <Box className="space-y-3">
                <TextInput
                    value={question.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="Enter your question title..."
                    variant="unstyled"
                    classNames={{
                        input: 'text-16 font-bold text-gray-13 placeholder:text-gray-4 p-0 min-h-0'
                    }}
                />

                <Box>
                    <TextInput
                        value={question.description}
                        onChange={(e) => onUpdate({ description: e.target.value })}
                        placeholder="Add a description (optional)..."
                        variant="unstyled"
                        classNames={{
                            input: 'text-12 text-gray-11 p-0 min-h-0'
                        }}
                    />
                </Box>

                <Box className="relative">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-1/30 border border-gray-2">
                        <Icon name="tabler:message" width={16} height={16} className="text-gray-5" />
                        <Text size="xs" className="text-gray-7">Answer area ({question.type.replace('_', ' ')})</Text>
                    </div>

                    <ActionIcon
                        variant="filled"
                        bg="accent-primary"
                        className="absolute right-2 top-1/2 -translate-y-1/2 shadow-sm hover:opacity-90 active:scale-90 transition-all z-10"
                        size="sm"
                    >
                        <Icon name="tabler:sparkles" width={14} height={14} />
                    </ActionIcon>
                </Box>
            </Box>
        </Card>
    )
}

export default QuestionCard
