import { useState } from 'react'
import { Box, SimpleGrid, Text, Group, Paper, TextInput } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import type { QuestionType } from '@/pages/form-builder/store/formStore'

interface FieldType {
    type: QuestionType | 'address_info' | 'contact_info'
    label: string
    icon: string
}

const FIELD_GROUPS = [
    {
        title: 'TEMPLATES',
        fields: [
            { type: 'contact_info', label: 'Contact Info', icon: 'tabler:contact' },
            { type: 'address_info', label: 'Address Info', icon: 'tabler:home' },
        ] as FieldType[]
    },
    {
        title: 'POPULAR',
        fields: [
            { type: 'short_text', label: 'Short Text', icon: 'tabler:letter-t' },
            { type: 'long_text', label: 'Long Text', icon: 'tabler:square-letter-t' },
            { type: 'email', label: 'Email', icon: 'tabler:mail' },
            { type: 'phone', label: 'Phone', icon: 'tabler:phone' },
            { type: 'choices', label: 'Multiple Choice', icon: 'tabler:circle' },
            { type: 'password', label: 'Password', icon: 'tabler:lock' },
        ] as FieldType[]
    },
    {
        title: 'ADVANCED',
        fields: [
            { type: 'counter', label: 'Counter', icon: 'tabler:circle-dot' },
            { type: 'calculated', label: 'Calculated', icon: 'tabler:calculator' },
            { type: 'table', label: 'Table', icon: 'tabler:table' },
            { type: 'country_code', label: 'Country', icon: 'tabler:globe' },
            { type: 'file_upload', label: 'File Upload', icon: 'tabler:upload' },
            { type: 'text_builder', label: 'Text Builder', icon: 'tabler:type' },
        ] as FieldType[]
    },
    {
        title: 'DATE & TIME',
        fields: [
            { type: 'date', label: 'Date', icon: 'tabler:calendar' },
            { type: 'time', label: 'Time', icon: 'tabler:clock' },
            { type: 'date_time', label: 'Date & Time', icon: 'tabler:calendar-time' },
        ] as FieldType[]
    },
    {
        title: 'DISPLAY',
        fields: [
            { type: 'label', label: 'Label', icon: 'tabler:heading' },
            { type: 'divider', label: 'Divider', icon: 'tabler:minus' },
        ] as FieldType[]
    }
]

interface Props {
    onSelect: (type: QuestionType | 'address_info' | 'contact_info') => void
}

const AddFieldInline = ({ onSelect }: Props) => {
    const [search, setSearch] = useState('')

    const filteredGroups = FIELD_GROUPS.map(group => ({
        ...group,
        fields: group.fields.filter(field =>
            field.label.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(group => group.fields.length > 0)

    return (
        <Paper
            shadow="xl"
            radius="lg"
            p="0"
            className="border border-gray-2 bg-white animate-in slide-in-from-top-4 fade-in duration-300 overflow-hidden min-w-[550px] shadow-2xl"
        >
            <Box className="p-4 bg-gray-50/50 border-b border-gray-1">
                <TextInput
                    placeholder="Search for fields..."
                    leftSection={<Icon name="tabler:search" width={18} height={18} className="text-accent-primary" />}
                    size="md"
                    variant="unstyled"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-white px-4 rounded-xl ring-2 ring-gray-1 focus-within:ring-accent-primary transition-all shadow-sm"
                    autoFocus
                />
            </Box>

            <Box className="p-6 max-h-[500px] overflow-y-auto">
                <SimpleGrid cols={3} spacing="xl" verticalSpacing="xl">
                    {filteredGroups.map((group) => (
                        <Box key={group.title}>
                            <Text size="10px" fw={900} className="text-gray-13 tracking-[0.2em] mb-4 uppercase">
                                {group.title}
                            </Text>
                            <div className="space-y-1">
                                {group.fields.map((field) => (
                                    <Group
                                        key={field.type}
                                        gap="sm"
                                        className="p-2 rounded-lg hover:bg-accent-soft/10 hover:text-accent-primary cursor-pointer transition-all group overflow-hidden"
                                        onClick={() => onSelect(field.type)}
                                    >
                                        <div className="size-8 rounded-lg bg-gray-50 group-hover:bg-accent-soft/20 flex items-center justify-center transition-colors">
                                            <Icon name={field.icon} width={18} height={18} className="text-gray-7 group-hover:text-accent-primary" />
                                        </div>
                                        <Text size="xs" fw={600} className="truncate">{field.label}</Text>
                                    </Group>
                                ))}
                            </div>
                        </Box>
                    ))}
                </SimpleGrid>
                {filteredGroups.length === 0 && (
                    <Box className="py-12 text-center text-gray-4">
                        <Icon name="tabler:search-off" width={40} height={40} className="mx-auto mb-4 opacity-20" />
                        <Text size="sm">No fields found matching "{search}"</Text>
                    </Box>
                )}
            </Box>
        </Paper>
    )
}

export default AddFieldInline
