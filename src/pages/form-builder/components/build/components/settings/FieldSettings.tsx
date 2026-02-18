import { SegmentedControl, Switch, Text, TextInput, Select, Textarea, Button, Divider, ActionIcon, Group, Paper } from '@mantine/core'
import { useFormStore, type QuestionWidth, type QuestionType } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import { useEffect, useState } from 'react'

const FieldSettings = () => {
    const { pages, activeQuestionId, updateQuestion } = useFormStore()

    const activeQuestion = pages
        .flatMap(p => p.questions)
        .find(q => q.id === activeQuestionId)

    if (!activeQuestion) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-5 p-8 text-center animate-in fade-in duration-300">
                <div className="size-16 rounded-2xl bg-gray-2 flex items-center justify-center mb-4">
                    <Icon name="tabler:click" width={32} height={32} className="text-gray-5" />
                </div>
                <Text size="sm" fw={600} className="text-gray-9 mb-1">No field selected</Text>
                <Text size="xs" className="text-gray-5 leading-relaxed">
                    Click on any field in the builder to edit its settings and properties.
                </Text>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-surface-primary border border-gray-3 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Settings Header */}
            <div className="px-4 py-3.5 border-b border-gray-2 flex items-center justify-between bg-gray-1/50">
                <div className="flex items-center gap-2">
                    <Icon name="tabler:adjustments-horizontal" width={15} height={15} className="text-accent-primary" />
                    <Text fw={700} size="xs" className="uppercase tracking-wider text-gray-11">Field Settings</Text>
                </div>
                <div className="text-[10px] bg-accent-soft/30 text-accent-primary px-2 py-0.5 rounded-full font-mono font-bold border border-accent-soft/40">
                    {activeQuestion.type.replace(/_/g, ' ')}
                </div>
            </div>

            {/* Scrollable Settings Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* General Settings */}
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

                {/* Layout & Validation */}
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
                            <div>
                                <Text size="sm" fw={500} className="text-gray-12">Required</Text>
                            </div>
                            <Switch
                                checked={activeQuestion.required || false}
                                onChange={(e) => updateQuestion(activeQuestion.id, { required: e.currentTarget.checked })}
                                size="sm"
                                color="violet"
                            />
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-2">
                            <div>
                                <Text size="sm" fw={500} className="text-gray-12">Hidden Field</Text>
                            </div>
                            <Switch
                                checked={activeQuestion.hidden || false}
                                onChange={(e) => updateQuestion(activeQuestion.id, { hidden: e.currentTarget.checked })}
                                size="sm"
                                color="violet"
                            />
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <Text size="sm" fw={500} className="text-gray-12">Read Only</Text>
                                <Text size="xs" className="text-gray-7">User cannot edit this field</Text>
                            </div>
                            <Switch
                                checked={activeQuestion.readOnly || false}
                                onChange={(e) => updateQuestion(activeQuestion.id, { readOnly: e.currentTarget.checked })}
                                size="sm"
                                color="violet"
                            />
                        </div>
                    </div>
                </div>

                {/* Table specific options */}
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
                                        const newColumn = {
                                            id: crypto.randomUUID(),
                                            name: `Column ${(activeQuestion.columns?.length || 0) + 1}`,
                                            type: 'short_text' as QuestionType,
                                            size: 'md' as const
                                        }
                                        updateQuestion(activeQuestion.id, {
                                            columns: [...(activeQuestion.columns || []), newColumn]
                                        })
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
                                                <TextInput
                                                    size="xs"
                                                    placeholder="Column Name"
                                                    value={col.name}
                                                    className="flex-1"
                                                    onChange={(e) => {
                                                        const newCols = [...(activeQuestion.columns || [])]
                                                        newCols[idx] = { ...col, name: e.target.value }
                                                        updateQuestion(activeQuestion.id, { columns: newCols })
                                                    }}
                                                />
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    size="xs"
                                                    className="hover:bg-red-50 transition-all"
                                                    onClick={() => {
                                                        const newCols = (activeQuestion.columns || []).filter(c => c.id !== col.id)
                                                        updateQuestion(activeQuestion.id, { columns: newCols })
                                                    }}
                                                >
                                                    <Icon name="tabler:x" width={12} height={12} />
                                                </ActionIcon>
                                            </Group>
                                            <Group gap="xs" grow>
                                                <Select
                                                    size="xs"
                                                    data={[
                                                        { label: 'Short Text', value: 'short_text' },
                                                        { label: 'Long Text', value: 'long_text' },
                                                        { label: 'Number', value: 'number' },
                                                        { label: 'Date', value: 'date' },
                                                        { label: 'Choices', value: 'choices' },
                                                    ]}
                                                    value={col.type}
                                                    onChange={(val) => {
                                                        const newCols = [...(activeQuestion.columns || [])]
                                                        newCols[idx] = { ...col, type: val as QuestionType }
                                                        updateQuestion(activeQuestion.id, { columns: newCols })
                                                    }}
                                                />
                                                <Select
                                                    size="xs"
                                                    data={[
                                                        { label: 'Small', value: 'sm' },
                                                        { label: 'Medium', value: 'md' },
                                                        { label: 'Large', value: 'lg' },
                                                    ]}
                                                    value={col.size}
                                                    onChange={(val) => {
                                                        const newCols = [...(activeQuestion.columns || [])]
                                                        newCols[idx] = { ...col, size: val as any }
                                                        updateQuestion(activeQuestion.id, { columns: newCols })
                                                    }}
                                                />
                                            </Group>
                                        </div>
                                    </Paper>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Choices / Dropdown options */}
                {(activeQuestion.type === 'choices' || activeQuestion.type === 'dropdown' || activeQuestion.type === 'checkbox') && (
                    <>
                        <Divider className="border-gray-2" />
                        <div className="space-y-3">
                            <Text size="xs" fw={600} className="text-gray-11 uppercase tracking-wider">Options</Text>
                            <div className="p-3 bg-accent-soft/10 text-accent-primary text-xs rounded-lg border border-accent-soft/30">
                                Options editing coming soon.
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Delete Field — Pinned Footer */}
            <div className="p-4 border-t border-gray-2 bg-surface-primary">
                <Button
                    variant="outline"
                    color="red"
                    size="sm"
                    fullWidth
                    leftSection={<Icon name="tabler:trash" width={14} height={14} />}
                    className="border-red-200 text-error-main hover:bg-red-50 active:scale-[0.98] transition-all"
                    onClick={() => {
                        useFormStore.getState().deleteQuestion(activeQuestion.id)
                    }}
                >
                    Delete Field
                </Button>
            </div>
        </div>
    )
}

export default FieldSettings
