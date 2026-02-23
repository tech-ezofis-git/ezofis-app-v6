import { SegmentedControl, Switch, Text, TextInput, Select, Textarea, Button, Divider, ActionIcon, Group, Paper, Stack, Tooltip, Box } from '@mantine/core'
import { useFormStore, type QuestionWidth, type QuestionType, generateId } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
// import { useEffect, useState } from 'react'
// import cn from '@/utils/cn'
// import Fields from '../field-list/Fields'

const FieldSettings = () => {
    const pages = useFormStore((state) => state.pages)
    const activeQuestionId = useFormStore((state) => state.activeQuestionId)
    const updateQuestion = useFormStore((state) => state.updateQuestion)
    const deleteQuestion = useFormStore((state) => state.deleteQuestion)
    const selectionType = useFormStore((state) => state.selectionType)
    const clearSelection = useFormStore((state) => state.clearSelection)
    const name = useFormStore((state) => state.name)
    const setName = useFormStore((state) => state.setName)
    const description = useFormStore((state) => state.description)
    const setDescription = useFormStore((state) => state.setDescription)
    const welcomePage = useFormStore((state) => state.welcomePage)
    const setWelcomePage = useFormStore((state) => state.setWelcomePage)
    const thankYouPage = useFormStore((state) => state.thankYouPage)
    const setThankYouPage = useFormStore((state) => state.setThankYouPage)
    const setSidebarOpen = useFormStore((state) => state.setSidebarOpen)

    const activeQuestion = pages
        .flatMap(p => p.questions)
        .find(q => q.id === activeQuestionId)

    const isSomethingSelected = selectionType !== 'question' || activeQuestionId !== null

    // Helper for Settings Header
    const SettingsHeader = ({ title, icon, subtitle }: { title: string, icon: string, subtitle?: string, type?: string }) => (
        <div className="px-4 py-3.5 border-b border-gray-2 flex items-center justify-between bg-gray-1/50 shrink-0">
            <div className="flex items-center gap-2">
                {isSomethingSelected ? (
                    <Tooltip label="Back to Fields">
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => clearSelection()}
                            className="mr-1 hover:bg-gray-2"
                        >
                            <Icon name="lucide:arrow-left" width={14} height={14} />
                        </ActionIcon>
                    </Tooltip>
                ) : (
                    <Icon name={icon} width={15} height={15} className="text-accent-primary" />
                )}
                {isSomethingSelected && <Icon name={icon} width={15} height={15} className="text-accent-primary" />}
                <Text fw={700} size="xs" className="uppercase tracking-wider text-gray-11">{title}</Text>
            </div>
            <div className="flex items-center gap-2">
                {subtitle && (
                    <div className="text-[10px] bg-accent-soft/30 text-accent-primary px-2 py-0.5 rounded-full font-mono font-bold border border-accent-soft/40 uppercase tracking-tighter">
                        {subtitle}
                    </div>
                )}
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="md"
                    onClick={() => setSidebarOpen(false)}
                    className="hover:bg-gray-2 rounded-lg transition-colors"
                >
                    <Icon name="lucide:x" width={16} height={16} />
                </ActionIcon>
            </div>
        </div>
    )

    // Field Library is removed as per requirements.
    // Defaulting to General Settings if nothing else is specific.

    // 2. General Settings View (Form Name & Description only)
    if (selectionType === 'general') {
        return (
            <div className="h-full w-[400px] flex flex-col bg-surface-primary animate-in slide-in-from-right duration-300 font-inter">
                <SettingsHeader title="General Settings" icon="tabler:settings" subtitle="Core" />
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    <Stack gap="sm">
                        <TextInput
                            label={<Text size="xs" fw={700} className="text-gray-12 mb-1">Global Form Name</Text>}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Employee Feedback 2024"
                            size="sm"
                            classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white text-xs' }}
                        />
                        <Textarea
                            label={<Text size="xs" fw={700} className="text-gray-12 mb-1">Detailed Description</Text>}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide context for respondents..."
                            autosize
                            minRows={3}
                            size="sm"
                            classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white text-xs' }}
                        />
                    </Stack>

                    <Box className="p-4 bg-accent-soft/5 rounded-xl border border-accent-soft/20">
                        <Group gap="xs" mb={4}>
                            <Icon name="lucide:info" width={14} height={14} className="text-accent-primary" />
                            <Text size="11px" fw={800} className="text-accent-primary uppercase tracking-wider">Builder Note</Text>
                        </Group>
                        <Text size="10px" className="text-gray-6 font-medium leading-relaxed">
                            These settings define the primary appearance and metadata of your form.
                            Changes here will reflect in the public link and social sharing.
                        </Text>
                    </Box>
                </div>
            </div>
        )
    }

    // 3. Welcome Page Settings
    if (selectionType === 'welcome') {
        return (
            <div className="h-full w-[400px] flex flex-col bg-surface-primary animate-in slide-in-from-right duration-300">
                <SettingsHeader title="Welcome Screen" icon="lucide:megaphone" subtitle="Header" />
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    <Stack gap="xl">
                        <div className="flex items-center justify-between py-1 px-1">
                            <Text size="sm" fw={700} className="text-gray-11 uppercase tracking-wider">Enable Welcome Page</Text>
                            <Switch
                                checked={welcomePage.enabled}
                                onChange={(e) => setWelcomePage({ enabled: e.currentTarget.checked })}
                                color="violet"
                            />
                        </div>
                        <Divider className="border-gray-2" />
                        <TextInput
                            label="Welcome Title"
                            value={welcomePage.title}
                            onChange={(e) => setWelcomePage({ title: e.target.value })}
                            placeholder="Welcome to our form"
                            size="sm"
                        />
                        <Textarea
                            label="Description"
                            value={welcomePage.description}
                            onChange={(e) => setWelcomePage({ description: e.target.value })}
                            placeholder="Add a welcoming subtext..."
                            autosize
                            minRows={2}
                            size="sm"
                        />
                        <TextInput
                            label="Button Text"
                            value={welcomePage.buttonText}
                            onChange={(e) => setWelcomePage({ buttonText: e.target.value })}
                            placeholder="Start"
                            size="sm"
                        />
                    </Stack>
                </div>
            </div>
        )
    }

    // 4. Thank You Page Settings
    if (selectionType === 'thank_you') {
        return (
            <div className="h-full w-[400px] flex flex-col bg-surface-primary animate-in slide-in-from-right duration-300">
                <SettingsHeader title="Completion Screen" icon="lucide:party-popper" subtitle="Footer" />
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    <Stack gap="xl">
                        <div className="flex items-center justify-between py-1 px-1">
                            <Text size="sm" fw={700} className="text-gray-11 uppercase tracking-wider">Enable Thank You Page</Text>
                            <Switch
                                checked={thankYouPage.enabled}
                                onChange={(e) => setThankYouPage({ enabled: e.currentTarget.checked })}
                                color="violet"
                            />
                        </div>
                        <Divider className="border-gray-2" />
                        <TextInput
                            label="Thank You Title"
                            value={thankYouPage.title}
                            onChange={(e) => setThankYouPage({ title: e.target.value })}
                            placeholder="Thank you!"
                            size="sm"
                        />
                        <Textarea
                            label="Completion Message"
                            value={thankYouPage.description}
                            onChange={(e) => setThankYouPage({ description: e.target.value })}
                            placeholder="Your submission has been received..."
                            autosize
                            minRows={2}
                            size="sm"
                        />
                    </Stack>
                </div>
            </div>
        )
    }

    // Default Fallback
    if (!activeQuestion) return null

    return (
        <div className="h-full w-[400px] flex flex-col bg-surface-primary animate-in slide-in-from-right duration-300">
            <SettingsHeader
                title="Field Settings"
                icon="tabler:adjustments-horizontal"
                subtitle={activeQuestion.type.replace(/_/g, ' ')}
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                <div className="space-y-4">
                    <TextInput
                        label="Label"
                        value={activeQuestion.title}
                        onChange={(e) => updateQuestion(activeQuestion.id, { title: e.target.value })}
                        placeholder="e.g. What is your name?"
                        size="sm"
                    />

                    <Textarea
                        label="Description"
                        value={activeQuestion.description}
                        onChange={(e) => updateQuestion(activeQuestion.id, { description: e.target.value })}
                        placeholder="Add extra instructions..."
                        autosize
                        minRows={2}
                        size="sm"
                    />

                    <TextInput
                        label="Placeholder"
                        value={activeQuestion.placeholder || ''}
                        onChange={(e) => updateQuestion(activeQuestion.id, { placeholder: e.target.value })}
                        placeholder="e.g. Type here..."
                        size="sm"
                    />
                </div>

                <Divider className="border-gray-2" />

                <div className="space-y-4">
                    <div>
                        <Text size="xs" fw={600} mb="xs" className="text-gray-11 uppercase tracking-wider">Width</Text>
                        <SegmentedControl
                            value={activeQuestion.width || 'full'}
                            onChange={(value) => updateQuestion(activeQuestion.id, { width: value as QuestionWidth })}
                            fullWidth
                            size="xs"
                            data={[
                                { label: 'Full', value: 'full' },
                                { label: '1/2', value: '1/2' },
                                { label: '1/3', value: '1/3' },
                            ]}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-gray-2">
                            <Text size="sm" fw={500} className="text-gray-12">Required</Text>
                            <Switch checked={activeQuestion.required || false} onChange={(e) => updateQuestion(activeQuestion.id, { required: e.currentTarget.checked })} size="sm" color="violet" />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-2">
                            <Text size="sm" fw={500} className="text-gray-12">Hidden Field</Text>
                            <Switch checked={activeQuestion.hidden || false} onChange={(e) => updateQuestion(activeQuestion.id, { hidden: e.currentTarget.checked })} size="sm" color="violet" />
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <Text size="sm" fw={500} className="text-gray-12">Read Only</Text>
                                <Text size="xs" className="text-gray-7">User cannot edit this field</Text>
                            </div>
                            <Switch checked={activeQuestion.readOnly || false} onChange={(e) => updateQuestion(activeQuestion.id, { readOnly: e.currentTarget.checked })} size="sm" color="violet" />
                        </div>
                    </div>
                </div>

                {activeQuestion.type === 'table' && (
                    <>
                        <Divider className="border-gray-2" />
                        <div className="space-y-4">
                            <Group justify="space-between">
                                <Text size="xs" fw={600} className="text-gray-11 uppercase tracking-wider">Columns</Text>
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    className="hover:bg-gray-2 transition-all"
                                    onClick={() => {
                                        const newColumn = { id: generateId(), name: `Column ${(activeQuestion.columns?.length || 0) + 1}`, type: 'short_text' as QuestionType, size: 'md' as const }
                                        updateQuestion(activeQuestion.id, { columns: [...(activeQuestion.columns || []), newColumn] })
                                    }}
                                >
                                    <Icon name="tabler:plus" width={14} height={14} />
                                </ActionIcon>
                            </Group>

                            <div className="space-y-2">
                                {(activeQuestion.columns || []).map((col, idx) => (
                                    <Paper key={col.id} p="xs" withBorder className="bg-gray-1/50 border-gray-3">
                                        <div className="space-y-2">
                                            <Group gap="xs" wrap="nowrap">
                                                <Icon name="tabler:grip-vertical" width={13} height={13} className="text-gray-5 cursor-grab" />
                                                <TextInput size="xs" placeholder="Column Name" value={col.name} className="flex-1" onChange={(e) => {
                                                    const newCols = [...(activeQuestion.columns || [])]
                                                    newCols[idx] = { ...col, name: e.target.value }
                                                    updateQuestion(activeQuestion.id, { columns: newCols })
                                                }} />
                                                <ActionIcon variant="subtle" color="red" size="xs" className="hover:bg-red-50 transition-all" onClick={() => {
                                                    const newCols = (activeQuestion.columns || []).filter(c => c.id !== col.id)
                                                    updateQuestion(activeQuestion.id, { columns: newCols })
                                                }}>
                                                    <Icon name="tabler:x" width={12} height={12} />
                                                </ActionIcon>
                                            </Group>
                                            <Group gap="xs" grow>
                                                <Select size="xs" data={[{ label: 'Short Text', value: 'short_text' }, { label: 'Long Text', value: 'long_text' }, { label: 'Number', value: 'number' }, { label: 'Date', value: 'date' }, { label: 'Choices', value: 'choices' }]} value={col.type} onChange={(val) => {
                                                    const newCols = [...(activeQuestion.columns || [])]
                                                    newCols[idx] = { ...col, type: val as QuestionType }
                                                    updateQuestion(activeQuestion.id, { columns: newCols })
                                                }} />
                                                <Select size="xs" data={[{ label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }]} value={col.size} onChange={(val) => {
                                                    const newCols = [...(activeQuestion.columns || [])]
                                                    newCols[idx] = { ...col, size: val as any }
                                                    updateQuestion(activeQuestion.id, { columns: newCols })
                                                }} />
                                            </Group>
                                        </div>
                                    </Paper>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="p-4 border-t border-gray-2 bg-surface-primary shrink-0">
                <Button
                    variant="outline"
                    color="red"
                    size="sm"
                    fullWidth
                    leftSection={<Icon name="tabler:trash" width={14} height={14} />}
                    className="border-red-200 text-error-main hover:bg-red-50 active:scale-[0.98] transition-all"
                    onClick={() => deleteQuestion(activeQuestion.id)}
                >
                    Delete Field
                </Button>
            </div>
        </div>
    )
}

export default FieldSettings

