import { Box, SimpleGrid, Text, Group, Paper, TextInput } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import type { QuestionType } from '@/pages/form-builder/store/formStore'

interface FieldType {
    type: QuestionType
    label: string
    icon: string
}

const FIELD_GROUPS = [
    {
        title: 'POPULAR',
        fields: [
            { type: 'short_text', label: 'Short Text', icon: 'tabler:letter-t' },
            { type: 'email', label: 'Email', icon: 'tabler:mail' },
            { type: 'phone', label: 'Phone', icon: 'tabler:phone' },
            { type: 'choices', label: 'Multiple Choice', icon: 'tabler:circle' },
        ] as FieldType[]
    },
    {
        title: 'HIGHLIGHTS',
        fields: [
            { type: 'dropdown', label: 'Dropdown', icon: 'tabler:chevron-down' },
            { type: 'checkbox', label: 'Checkbox', icon: 'tabler:check' },
            { type: 'date', label: 'Date', icon: 'tabler:calendar' },
            { type: 'rating', label: 'Rating', icon: 'tabler:star' },
        ] as FieldType[]
    },
    {
        title: 'MORE FIELDS',
        fields: [
            { type: 'long_text', label: 'Long Text', icon: 'tabler:align-left' },
            { type: 'number', label: 'Number', icon: 'tabler:hash' },
        ] as FieldType[]
    }
]

interface Props {
    onSelect: (type: QuestionType) => void
}

const AddFieldInline = ({ onSelect }: Props) => {
    return (
        <Paper
            shadow="md"
            radius="md"
            p="0"
            className="border border-gray-2 bg-surface-primary animate-in slide-in-from-top-4 fade-in duration-300 overflow-hidden"
        >
            <Box className="p-3 bg-surface-secondary border-b border-gray-2">
                <TextInput
                    placeholder="Search for fields..."
                    leftSection={<Icon name="tabler:search" width={14} height={14} />}
                    size="xs"
                    variant="unstyled"
                    className="bg-surface-primary px-3 rounded-md ring-1 ring-gray-2 focus-within:ring-accent-primary transition-all"
                />
            </Box>

            <Box className="p-4">
                <SimpleGrid cols={3} spacing="md" verticalSpacing="md">
                    {FIELD_GROUPS.map((group) => (
                        <Box key={group.title}>
                            <Text size="9px" fw={800} className="text-gray-9 tracking-widest mb-2 opacity-50">
                                {group.title}
                            </Text>
                            <div className="space-y-0.5">
                                {group.fields.map((field) => (
                                    <Group
                                        key={field.type}
                                        gap="xs"
                                        className="p-1.5 rounded-md hover:bg-accent-soft/50 hover:text-accent-primary cursor-pointer transition-all group"
                                        onClick={() => onSelect(field.type)}
                                    >
                                        <Icon name={field.icon} width={16} height={16} className="text-gray-7 group-hover:text-accent-primary" />
                                        <Text size="xs" fw={500}>{field.label}</Text>
                                    </Group>
                                ))}
                            </div>
                        </Box>
                    ))}
                </SimpleGrid>
            </Box>
        </Paper>
    )
}

export default AddFieldInline
