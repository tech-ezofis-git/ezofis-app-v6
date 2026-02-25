import { SegmentedControl, Switch, Text, TextInput, Select, Textarea, Button, Divider, ActionIcon, Group, Paper, Stack, Tooltip, Box } from '@mantine/core'
import { useFormStore, type QuestionType, generateId, type Question } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import { useEffect, useState, useRef } from 'react'
import cn from '@/utils/cn'

const FieldSettings = () => {
    const panels = useFormStore((state) => state.panels)
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
    const setActiveQuestionId = useFormStore((state) => state.setActiveQuestionId)

    const activeQuestion = panels
        .flatMap(p => p.fields)
        .find(q => q.id === activeQuestionId)

    const isSomethingSelected = selectionType !== 'question' || activeQuestionId !== null

    const [isEditingLabel, setIsEditingLabel] = useState(false)
    const [editedLabel, setEditedLabel] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (activeQuestion) {
            setEditedLabel(activeQuestion.label || '')
        }
    }, [activeQuestion?.id, activeQuestion?.label])

    useEffect(() => {
        if (isEditingLabel && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditingLabel])

    const handleLabelSave = () => {
        if (activeQuestion && editedLabel.trim() !== '') {
            updateQuestion(activeQuestion.id, { label: editedLabel })
        }
        setIsEditingLabel(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLabelSave()
        }
    }

    const allQuestions = panels.flatMap(p => p.fields)
    const currentIndex = activeQuestion ? allQuestions.findIndex(q => q.id === activeQuestion.id) : -1
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < allQuestions.length - 1

    const handlePrev = () => {
        if (hasPrev) setActiveQuestionId(allQuestions[currentIndex - 1].id)
    }

    const handleNext = () => {
        if (hasNext) setActiveQuestionId(allQuestions[currentIndex + 1].id)
    }

    // Deep update helper
    const updateNested = (path: 'general' | 'validation' | 'specific', updates: any) => {
        if (!activeQuestion) return
        updateQuestion(activeQuestion.id, (q: Question) => ({
            ...q,
            settings: {
                ...q.settings,
                [path]: { ...q.settings[path as keyof typeof q.settings], ...updates }
            }
        }))
    }

    // Settings Header
    const SettingsHeader = ({ title, icon, subtitle }: { title: string, icon: string, subtitle?: string, type?: string }) => (
        <div className="px-4 py-3 border-b border-gray-2 flex items-center justify-between bg-white shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {isSomethingSelected && selectionType !== 'question' && (
                    <Tooltip label="Back to Fields">
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => clearSelection()}
                            className="mr-1 hover:bg-gray-2 shrink-0"
                        >
                            <Icon name="lucide:arrow-left" width={14} height={14} />
                        </ActionIcon>
                    </Tooltip>
                )}

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-1 border border-gray-2">
                    <Icon name={icon} width={16} height={16} className="text-gray-11" />
                </div>

                {selectionType === 'question' && activeQuestion ? (
                    isEditingLabel ? (
                        <div className="flex-1 flex items-center gap-1">
                            <input
                                ref={inputRef}
                                type="text"
                                value={editedLabel}
                                onChange={(e) => setEditedLabel(e.target.value)}
                                onBlur={handleLabelSave}
                                onKeyDown={handleKeyDown}
                                className="flex-1 min-w-0 text-xs font-semibold text-gray-13 border border-primary-5 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-5 bg-white"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 min-w-0 flex-1 group/title">
                            <Text
                                fw={700}
                                size="xs"
                                className="text-gray-13 truncate cursor-pointer hover:text-gray-11"
                                onClick={() => setIsEditingLabel(true)}
                            >
                                {activeQuestion.label || 'Untitled Field'}
                            </Text>
                            <Icon
                                name="lucide:pencil"
                                width={12} height={12}
                                className="text-gray-4 opacity-0 group-hover/title:opacity-100 cursor-pointer hover:text-gray-7 transition-opacity"
                                onClick={() => setIsEditingLabel(true)}
                            />
                        </div>
                    )
                ) : (
                    <Text fw={700} size="xs" className="uppercase tracking-widest text-gray-11 truncate">{title}</Text>
                )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
                {selectionType === 'question' && (
                    <>
                        <div className='flex items-center gap-0.5'>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                                disabled={!hasPrev}
                                onClick={handlePrev}
                                className={cn("hover:bg-gray-2", !hasPrev && "opacity-30")}
                            >
                                <Icon name="lucide:chevron-left" width={16} height={16} />
                            </ActionIcon>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                                disabled={!hasNext}
                                onClick={handleNext}
                                className={cn("hover:bg-gray-2", !hasNext && "opacity-30")}
                            >
                                <Icon name="lucide:chevron-right" width={16} height={16} />
                            </ActionIcon>
                        </div>

                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            className="hover:bg-red-50 hover:text-error-main transition-colors mx-0.5"
                            onClick={() => deleteQuestion(activeQuestion!.id)}
                            title="Delete Field"
                        >
                            <Icon name="lucide:trash-2" width={15} height={15} />
                        </ActionIcon>
                    </>
                )}

                <div className="w-px h-4 bg-gray-2 mx-1" />

                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="hover:bg-gray-2 rounded-lg transition-colors"
                >
                    <Icon name="lucide:x" width={16} height={16} />
                </ActionIcon>
            </div>
        </div>
    )

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

    const sizeMap: Record<string, string> = {
        'col-12': 'full',
        'col-6': '1/2',
        'col-4': '1/3',
        'full': 'col-12',
        '1/2': 'col-6',
        '1/3': 'col-4'
    }

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
                        label={<Text size="13px" fw={500} className="text-gray-11 mb-1">Field Label</Text>}
                        value={activeQuestion.label}
                        onChange={(e) => updateQuestion(activeQuestion.id, { label: e.target.value })}
                        placeholder="e.g. What is your name?"
                        size="sm"
                        classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white text-xs' }}
                    />

                    <Textarea
                        label={<Text size="13px" fw={500} className="text-gray-11 mb-1">Description</Text>}
                        value={activeQuestion.settings.general.description}
                        onChange={(e) => updateNested('general', { description: e.target.value })}
                        placeholder="Add extra instructions..."
                        autosize
                        minRows={2}
                        size="sm"
                        classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white text-xs' }}
                    />

                    <TextInput
                        label={<Text size="13px" fw={500} className="text-gray-11 mb-1">Placeholder</Text>}
                        value={activeQuestion.settings.general.placeholder || ''}
                        onChange={(e) => updateNested('general', { placeholder: e.target.value })}
                        placeholder="e.g. Type here..."
                        size="sm"
                        classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white text-xs' }}
                    />
                </div>

                <Divider className="border-gray-2" />

                <div className="space-y-4">
                    <div>
                        <Text size="13px" fw={500} mb="xs" className="text-gray-11">Field Width</Text>
                        <SegmentedControl
                            value={sizeMap[activeQuestion.settings.general.size] || 'full'}
                            onChange={(value) => updateNested('general', { size: sizeMap[value] })}
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
                        <div className="flex items-center justify-between py-2 border-b border-gray-1">
                            <Text size="xs" fw={500} className="text-gray-11">Required</Text>
                            <Switch
                                checked={activeQuestion.settings.validation.fieldRule === 'REQUIRED'}
                                onChange={(e) => updateNested('validation', { fieldRule: e.currentTarget.checked ? 'REQUIRED' : 'NONE' })}
                                size="xs" color="violet" />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-1">
                            <Text size="xs" fw={500} className="text-gray-11">Hidden Field</Text>
                            <Switch
                                checked={activeQuestion.settings.general.hidden || false}
                                onChange={(e) => updateNested('general', { hidden: e.currentTarget.checked })}
                                size="xs" color="violet" />
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <Text size="xs" fw={500} className="text-gray-11">Read Only</Text>
                                <Text size="10px" className="text-gray-6">User cannot edit this field</Text>
                            </div>
                            <Switch
                                checked={activeQuestion.settings.general.readOnly || false}
                                onChange={(e) => updateNested('general', { readOnly: e.currentTarget.checked })}
                                size="xs" color="violet" />
                        </div>
                    </div>
                </div>

                {activeQuestion.type === 'TABLE' && (
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
                                        const newColumn = { id: generateId(), label: `Column ${(activeQuestion.settings.specific.columns?.length || 0) + 1}`, type: 'SHORT_TEXT', size: 'col-6' }
                                        updateNested('specific', { columns: [...(activeQuestion.settings.specific.columns || []), newColumn] })
                                    }}
                                >
                                    <Icon name="tabler:plus" width={14} height={14} />
                                </ActionIcon>
                            </Group>

                            <div className="space-y-2">
                                {(activeQuestion.settings.specific.columns || []).map((col: any, idx: number) => (
                                    <Paper key={col.id} p="xs" withBorder className="bg-gray-1/50 border-gray-3">
                                        <div className="space-y-2">
                                            <Group gap="xs" wrap="nowrap">
                                                <Icon name="tabler:grip-vertical" width={13} height={13} className="text-gray-5 cursor-grab" />
                                                <TextInput size="xs" placeholder="Column Name" value={col.label} className="flex-1" onChange={(e) => {
                                                    const newCols = [...(activeQuestion.settings.specific.columns || [])]
                                                    newCols[idx] = { ...col, label: e.target.value }
                                                    updateNested('specific', { columns: newCols })
                                                }} />
                                                <ActionIcon variant="subtle" color="red" size="xs" className="hover:bg-red-50 transition-all" onClick={() => {
                                                    const newCols = (activeQuestion.settings.specific.columns || []).filter((c: any) => c.id !== col.id)
                                                    updateNested('specific', { columns: newCols })
                                                }}>
                                                    <Icon name="tabler:x" width={12} height={12} />
                                                </ActionIcon>
                                            </Group>
                                            <Group gap="xs" grow>
                                                <Select size="xs" data={[{ label: 'Short Text', value: 'SHORT_TEXT' }, { label: 'Long Text', value: 'LONG_TEXT' }, { label: 'Number', value: 'NUMBER' }, { label: 'Date', value: 'DATE' }, { label: 'Choices', value: 'CHOICES' }]} value={col.type} onChange={(val) => {
                                                    const newCols = [...(activeQuestion.settings.specific.columns || [])]
                                                    newCols[idx] = { ...col, type: val as any }
                                                    updateNested('specific', { columns: newCols })
                                                }} />
                                                <Select size="xs" data={[{ label: 'Small', value: 'col-3' }, { label: 'Medium', value: 'col-6' }, { label: 'Large', value: 'col-12' }]} value={col.size} onChange={(val) => {
                                                    const newCols = [...(activeQuestion.settings.specific.columns || [])]
                                                    newCols[idx] = { ...col, size: val as any }
                                                    updateNested('specific', { columns: newCols })
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

            <div className="p-4 border-t border-gray-2 bg-white shrink-0">
                <Button
                    variant="outline"
                    color="red"
                    size="sm"
                    fullWidth
                    leftSection={<Icon name="lucide:trash-2" width={14} height={14} />}
                    className="border-gray-3 text-red-9 hover:bg-red-50 active:scale-[0.98] transition-all justify-start px-3"
                    onClick={() => deleteQuestion(activeQuestion.id)}
                >
                    Delete Field
                </Button>
            </div>
        </div>
    )
}

export default FieldSettings

