import { SegmentedControl, Switch, Text, TextInput, Select, Textarea, Button, Divider, ActionIcon, Group, Paper, Stack, Tooltip, Box, Badge, UnstyledButton, Collapse } from '@mantine/core'
import { useFormStore, generateId, type Question } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import { useEffect, useState, useRef } from 'react'
import cn from '@/utils/cn'

const FIELD_ICONS: Record<string, string> = {
    SHORT_TEXT: 'mdi:form-textbox',
    LONG_TEXT: 'mdi:form-textarea',
    NUMBER: 'tabler:number-123',
    DATE: 'lucide:calendar',
    TIME: 'lucide:clock',
    DATE_TIME: 'lucide:calendar-clock',
    SINGLE_SELECT: 'lucide:list-todo',
    MULTI_SELECT: 'lucide:list-checks',
    SINGLE_CHOICE: 'mdi:radiobox-marked',
    MULTIPLE_CHOICE: 'lucide:square-check',
    HEADING: 'lucide:heading',
    LABEL: 'lucide:type',
    TEXT_BUILDER: 'lucide:pilcrow',
    DIVIDER: 'lucide:minus',
    RATING: 'lucide:star',
    FILE_UPLOAD: 'lucide:file-up',
    TABLE: 'lucide:table',
    DYNAMIC_TABLE: 'lucide:table-2',
    MATRIX: 'lucide:grid-3x3',
    EMAIL: 'lucide:mail',
    PASSWORD: 'lucide:lock',
    ADDRESS: 'lucide:map-pin',
    FULL_NAME: 'lucide:user',
    PHONE_NUMBER: 'lucide:phone',
    CURRENCY_AMOUNT: 'lucide:dollar-sign',
    COUNTER: 'tabler:circle-dot',
    CALCULATED: 'lucide:calculator',
    COUNTRY_CODE: 'lucide:globe',
    CONTACT_INFO: 'lucide:contact',
    ADDRESS_INFO: 'lucide:home',
    OPINION_SCALE: 'lucide:bar-chart',
}

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
    const formType = useFormStore((state) => state.formType)
    const setFormType = useFormStore((state) => state.setFormType)
    const layout = useFormStore((state) => state.layout)
    const setLayout = useFormStore((state) => state.setLayout)
    const coordinator = useFormStore((state) => state.coordinator)
    const setCoordinator = useFormStore((state) => state.setCoordinator)

    const activeQuestion = panels
        .flatMap(p => p.fields)
        .find(q => q.id === activeQuestionId)

    const isSomethingSelected = selectionType !== 'question' || activeQuestionId !== null

    const [isEditingLabel, setIsEditingLabel] = useState(false)
    const [headerLabel, setHeaderLabel] = useState('')
    const [localLabel, setLocalLabel] = useState('')
    const [localDesc, setLocalDesc] = useState('')
    const [localPlaceholder, setLocalPlaceholder] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (activeQuestion) {
            setHeaderLabel(activeQuestion.label || '')
            setLocalLabel(activeQuestion.label || '')
            setLocalDesc(activeQuestion.settings.general.description || '')
            setLocalPlaceholder(activeQuestion.settings.general.placeholder || '')
        }
    }, [activeQuestion?.id]) // Only reset when changing fields

    useEffect(() => {
        if (isEditingLabel && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditingLabel])

    const handleLabelSave = () => {
        if (activeQuestion && headerLabel.trim() !== '') {
            updateQuestion(activeQuestion.id, { label: headerLabel })
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
    const updateNested = (path: any, updates: any) => {
        if (!activeQuestion) return
        updateQuestion(activeQuestion.id, {
            settings: {
                ...activeQuestion.settings,
                [path]: {
                    ... (activeQuestion.settings as any)[path],
                    ...updates
                }
            }
        })
    }

    // Memoized Header Props
    const headerProps = {
        activeQuestion,
        selectionType,
        isSomethingSelected,
        isEditingLabel,
        headerLabel,
        setHeaderLabel,
        setIsEditingLabel,
        handleLabelSave,
        handleKeyDown,
        inputRef,
        hasPrev,
        hasNext,
        handlePrev,
        handleNext,
        clearSelection,
        deleteQuestion,
        setSidebarOpen
    }

    // 2. General Settings View
    if (selectionType === 'general') {
        const FORM_TYPES = [
            { value: 'WORKFLOW', label: 'Workflow', icon: 'tabler:git-branch', desc: 'For business processes & automation' },
            { value: 'FEEDBACK', label: 'Feedback', icon: 'tabler:message-star', desc: 'For surveys & reviews' },
        ]



        return (
            <div className="flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-in slide-in-from-right duration-300 font-inter">
                <SettingsHeader title="General Settings" icon="tabler:settings" headerProps={headerProps} />
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {/* Basic Info */}
                    <Stack gap="lg">
                        <div className="space-y-4">
                            <TextInput
                                label={<Text size="xs" fw={800} className="text-gray-11 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                    <Icon name="lucide:type" width={14} height={14} /> Form Name
                                </Text>}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Employee Feedback"
                                size="sm"
                                classNames={{ input: 'bg-gray-1 border-gray-2 focus:border-accent-primary transition-all rounded-xl h-10 font-medium' }}
                                maxLength={50}
                            />
                            <Textarea
                                label={<Text size="xs" fw={800} className="text-gray-11 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                    <Icon name="lucide:text-quote" width={14} height={14} /> Description
                                </Text>}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this form for?"
                                autosize
                                minRows={3}
                                size="sm"
                                classNames={{ input: 'bg-gray-1 border-gray-2 focus:border-accent-primary transition-all rounded-xl font-medium' }}
                            />
                        </div>
                    </Stack>

                    <Divider className="border-gray-2" />

                    {/* Form Type Cards */}
                    <div className='space-y-3'>
                        <Text size="xs" fw={800} className="text-gray-11 uppercase tracking-wider flex items-center gap-2">
                            <Icon name="lucide:layers" width={14} height={14} /> Form Type
                        </Text>
                        <div className="grid grid-cols-2 gap-3">
                            {FORM_TYPES.map((t) => {
                                const active = formType === t.value
                                return (
                                    <UnstyledButton
                                        key={t.value}
                                        onClick={() => setFormType(t.value as any)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group gap-2 text-center h-[120px]",
                                            active
                                                ? "border-accent-primary bg-accent-soft/5 shadow-sm ring-2 ring-accent-soft/10"
                                                : "border-gray-5 bg-transparent hover:bg-gray-1"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-11",
                                            active ? "bg-accent-primary text-white shadow-md shadow-accent-soft/3" : "bg-white text-gray-8 border border-gray-4"
                                        )}>
                                            <Icon name={t.icon} width={18} height={18} />
                                        </div>
                                        <div className="px-1">
                                            <Text size="xs" fw={800} className={cn("uppercase tracking-tight leading-none mb-1", active ? "text-gray-9" : "text-gray-9")}>{t.label}</Text>
                                            <Text size="9px" fw={600} className="text-gray-5 leading-tight opacity-8 italic">{t.desc}</Text>
                                        </div>
                                    </UnstyledButton>
                                )
                            })}
                        </div>
                    </div>

                    <Divider className="border-gray-2" />

                    {/* Coordinator & Layout */}
                    {/* <div className="space-y-6">
                        <Select
                            label={<Text size="xs" fw={800} className="text-gray-11 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Icon name="lucide:user-cog" width={14} height={14} /> Coordinator
                            </Text>}
                            placeholder="Select primary contact"
                            data={['Admin', 'Manager', 'HR', 'IT']}
                            value={coordinator}
                            onChange={(val) => setCoordinator(val || '')}
                            size="sm"
                            classNames={{ input: 'bg-gray-1 border-gray-2 focus:bg-white rounded-xl font-medium' }}
                        />

                        <div className='space-y-3'>
                            <Text size="xs" fw={800} className="text-gray-11 uppercase tracking-wider flex items-center gap-2">
                                <Icon name="lucide:monitor" width={14} height={14} /> Presentation
                            </Text>
                            <SegmentedControl
                                value={layout}
                                onChange={(val) => setLayout(val as any)}
                                fullWidth
                                size="xs"
                                radius="lg"
                                data={LAYOUT_OPTIONS.map(lo => ({
                                    label: (
                                        <Group gap={4} wrap="nowrap" justify="center" p={2}>
                                            <Icon name={lo.icon} width={13} height={13} />
                                            <Text size="10px" fw={700}>{lo.label}</Text>
                                        </Group>
                                    ),
                                    value: lo.value
                                }))}
                                classNames={{
                                    root: 'bg-gray-1 p-1',
                                    control: 'border-none',
                                    indicator: 'bg-white shadow-sm'
                                }}
                            />
                        </div>
                    </div> */}

                    <Box className="p-4 bg-gray-50 rounded-2xl border border-gray-2">
                        <Group gap="xs" mb={8}>
                            <Icon name="lucide:sparkles" width={14} height={14} className="text-accent-primary" />
                            <Text size="11px" fw={800} className="text-gray-11 uppercase tracking-wider">Quick Note</Text>
                        </Group>
                        <Text size="10px" className="text-gray-6 font-medium leading-relaxed">
                            These settings apply to the entire form experience. You can also customize Welcome and Thank You pages in their respective screens.
                        </Text>
                    </Box>
                </div>
            </div>
        )
    }


    // 3. Welcome Page Settings
    if (selectionType === 'welcome') {
        return (
            <div className="flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-in slide-in-from-right duration-300 font-inter">
                <SettingsHeader title="Welcome Screen" icon="lucide:megaphone" headerProps={headerProps} />
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
            <div className="flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-in slide-in-from-right duration-300 font-inter">
                <SettingsHeader title="Completion Screen" icon="lucide:party-popper" headerProps={headerProps} />
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
        <div className="flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-in slide-in-from-right duration-300 font-inter">
            <SettingsHeader
                title="Field Settings"
                icon="tabler:adjustments-horizontal"
                headerProps={headerProps}
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
                {/* 1. GENERAL SECTION */}
                <CollapsibleSection
                    title="General"
                    icon="lucide:settings-2"
                    accentColor="bg-purple-9"
                    iconColor="text-purple-9"
                    defaultOpen={true}
                >
                    {/* A. Identity */}
                    <Stack gap="sm">
                        <TextInput
                            label={<Text size="xs" fw={700} className="text-gray-9 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                <Icon name="lucide:type" width={14} height={14} /> Field Name
                            </Text>}
                            value={activeQuestion.label}
                            onChange={(e) => updateQuestion(activeQuestion.id, { label: e.target.value })}
                            placeholder="Enter field label..."
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                        />

                        <div className="flex items-center justify-between py-1 px-1">
                            <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Hide Label</Text>
                            <Switch
                                checked={activeQuestion.settings.general.hideLabel || false}
                                onChange={(e) => updateNested('general', { hideLabel: e.currentTarget.checked })}
                                size="xs" color="violet" />
                        </div>
                    </Stack>

                    <Divider className="border-gray-1 dotted" />

                    {/* B. Layout & Visibility */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5 px-0.5">Field Width</Text>
                            <SegmentedControl
                                value={activeQuestion.settings.general.size || 'col-12'}
                                onChange={(val) => updateNested('general', { size: val })}
                                size="xs"
                                radius="md"
                                fullWidth
                                data={[
                                    { label: 'Full', value: 'col-12' },
                                    { label: '1/2', value: 'col-6' },
                                    { label: '1/3', value: 'col-4' }
                                ]}
                                classNames={{ root: 'bg-gray-1 p-1', indicator: 'bg-white shadow-sm' }}
                            />
                        </div>

                        <Select
                            label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Visibility</Text>}
                            value={activeQuestion.settings.general.visibility || 'NORMAL'}
                            onChange={(val) => updateNested('general', { visibility: val })}
                            data={[{ label: 'Normal', value: 'NORMAL' }, { label: 'Read Only', value: 'READ_ONLY' }, { label: 'Hidden', value: 'HIDDEN' }]}
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                        />
                    </div>

                    <Divider className="border-gray-1 dotted" />

                    {/* C. Assets */}
                    <div className="space-y-4">
                        <TextInput
                            label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Placeholder</Text>}
                            value={activeQuestion.settings.general.placeholder || ''}
                            onChange={(e) => updateNested('general', { placeholder: e.target.value })}
                            placeholder="Ghost text..."
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                        />
                        <TextInput
                            label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Tooltip</Text>}
                            value={activeQuestion.settings.general.tooltip || ''}
                            onChange={(e) => updateNested('general', { tooltip: e.target.value })}
                            placeholder="Help text on hover..."
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                        />
                        {activeQuestion.type === 'DIVIDER' && (
                            <Select
                                label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Divider Style</Text>}
                                value={activeQuestion.settings.specific.dividerStyle || 'SOLID'}
                                onChange={(val) => updateNested('specific', { dividerStyle: val })}
                                data={[{ label: 'Solid', value: 'SOLID' }, { label: 'Dashed', value: 'DASHED' }, { label: 'Dotted', value: 'DOTTED' }]}
                                size="sm"
                                classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                            />
                        )}
                    </div>
                </CollapsibleSection>

                {/* 2. CONFIGURATION SECTION */}
                <CollapsibleSection
                    title="Configuration"
                    icon="lucide:settings"
                    accentColor="bg-indigo-9"
                    iconColor="text-indigo-9"
                >
                    {/* A. Choice Options */}
                    {['SINGLE_SELECT', 'MULTI_SELECT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(activeQuestion.type) && (
                        <Stack gap="md">
                            <div className="space-y-2">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Options Source</Text>
                                <SegmentedControl
                                    value={activeQuestion.settings.specific.optionsSource || 'CUSTOM'}
                                    onChange={(val) => updateNested('specific', { optionsSource: val })}
                                    size="xs"
                                    radius="md"
                                    fullWidth
                                    data={[{ label: 'Custom', value: 'CUSTOM' }, { label: 'Lookup', value: 'LOOKUP' }]}
                                    classNames={{ root: 'bg-gray-1 p-1', indicator: 'bg-white shadow-sm' }}
                                />
                            </div>
                            {activeQuestion.settings.specific.optionsSource === 'LOOKUP' ? (
                                <Select
                                    label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Master Data</Text>}
                                    placeholder="Select source..."
                                    data={['Countries', 'Departments', 'Employees']}
                                    size="sm"
                                    classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                                />
                            ) : (
                                <div className="space-y-2">
                                    <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Manage Options</Text>
                                    <div className="p-3 bg-gray-50 border border-gray-2 rounded-xl text-center">
                                        <Text size="xs" className="text-gray-6 italic">Dynamic option editor placeholder</Text>
                                    </div>
                                </div>
                            )}
                        </Stack>
                    )}

                    {/* B. Data Automation */}
                    <Stack gap="md">
                        <TextInput
                            label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Default Value</Text>}
                            value={activeQuestion.settings.specific.defaultValue || ''}
                            onChange={(e) => updateNested('specific', { defaultValue: e.target.value })}
                            placeholder="Static value..."
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                        />
                        <div className="flex items-center justify-between py-1 px-1">
                            <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Auto-Generate Value</Text>
                            <Switch
                                checked={activeQuestion.settings.specific.autoGenerateValue?.enabled || false}
                                onChange={(e) => updateNested('specific', { autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, enabled: e.currentTarget.checked } })}
                                size="xs" color="violet" />
                        </div>
                        {activeQuestion.settings.specific.autoGenerateValue?.enabled && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-2 rounded-xl animate-in slide-in-from-top-2">
                                <TextInput
                                    label="Prefix"
                                    value={activeQuestion.settings.specific.autoGenerateValue.prefix || ''}
                                    onChange={(e) => updateNested('specific', { autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, prefix: e.target.value } })}
                                    size="xs"
                                />
                                <Select
                                    label="Suffix"
                                    value={activeQuestion.settings.specific.autoGenerateValue.suffix || 'ID'}
                                    onChange={(val) => updateNested('specific', { autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, suffix: val } })}
                                    data={[
                                        { label: 'Date Time', value: 'DATE_TIME' },
                                        { label: 'Unique ID', value: 'ID' },
                                    ]}
                                    size="xs"
                                />
                            </div>
                        )}
                    </Stack>

                    {/* C. Rating */}
                    {(activeQuestion.type === 'RATING' || activeQuestion.type === 'OPINION_SCALE') && (
                        <Stack gap="sm">
                            <Select
                                label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Icon Type</Text>}
                                value={activeQuestion.settings.specific.iconType || 'STAR'}
                                onChange={(val) => updateNested('specific', { iconType: val })}
                                data={[{ label: 'Star', value: 'STAR' }, { label: 'Heart', value: 'HEART' }]}
                                size="sm"
                                classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                            />
                            <Select
                                label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Icon Count</Text>}
                                value={String(activeQuestion.settings.specific.iconCount || (activeQuestion.type === 'OPINION_SCALE' ? 10 : 5))}
                                onChange={(val) => updateNested('specific', { iconCount: Number(val) })}
                                data={[
                                    { label: '5 Icons', value: '5' },
                                    { label: '10 Icons', value: '10' },
                                    { label: '11 Icons', value: '11' }
                                ]}
                                size="sm"
                                classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                            />
                            <div className="flex items-center justify-between py-1">
                                <Text size="xs" fw={600} className="text-gray-11 uppercase tracking-wider">Allow Half Rating</Text>
                                <Switch
                                    checked={activeQuestion.settings.specific.allowHalfRating || false}
                                    onChange={(e) => updateNested('specific', { allowHalfRating: e.currentTarget.checked })}
                                    size="xs" color="violet" />
                            </div>
                        </Stack>
                    )}

                    {/* D. File Upload */}
                    {activeQuestion.type === 'FILE_UPLOAD' && (
                        <Stack gap="sm">
                            <div className="flex items-center justify-between py-1 border-b border-gray-1">
                                <Text size="xs" fw={600} className="text-gray-11 uppercase tracking-wider">Allow Multiple Files</Text>
                                <Switch
                                    checked={activeQuestion.settings.specific.allowMultipleFiles || false}
                                    onChange={(e) => updateNested('specific', { allowMultipleFiles: e.currentTarget.checked })}
                                    size="xs" color="violet" />
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <Text size="xs" fw={600} className="text-gray-11 uppercase tracking-wider">Allow Multiple Signatures</Text>
                                <Switch
                                    checked={activeQuestion.settings.specific.allowMultipleSignatures || false}
                                    onChange={(e) => updateNested('specific', { allowMultipleSignatures: e.currentTarget.checked })}
                                    size="xs" color="violet" />
                            </div>
                        </Stack>
                    )}

                    {/* E. Table / Matrix */}
                    {['TABLE', 'MATRIX'].includes(activeQuestion.type) && (
                        <Stack gap="sm">
                            <Select
                                label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Rows Type</Text>}
                                value={activeQuestion.settings.specific.tableRowsType || 'ON_DEMAND'}
                                onChange={(val) => updateNested('specific', { tableRowsType: val })}
                                data={[{ label: 'Fixed Rows', value: 'FIXED' }, { label: 'On Demand', value: 'ON_DEMAND' }]}
                                size="sm"
                                classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                            />
                            {activeQuestion.type === 'TABLE' && (
                                <div className="space-y-4">
                                    <Group justify="space-between">
                                        <Text size="xs" fw={800} className="text-gray-11 uppercase tracking-wider">Columns</Text>
                                        <Button
                                            variant="light"
                                            size="compact-xs"
                                            leftSection={<Icon name="tabler:plus" width={12} height={12} />}
                                            onClick={() => {
                                                const newColumn = { id: generateId(), label: `Column ${(activeQuestion.settings.specific.tableColumns?.length || 0) + 1} `, type: 'SHORT_TEXT', size: 'col-6' }
                                                updateNested('specific', { tableColumns: [...(activeQuestion.settings.specific.tableColumns || []), newColumn] })
                                            }}
                                        >
                                            Add Column
                                        </Button>
                                    </Group>
                                    <div className="space-y-2">
                                        {(activeQuestion.settings.specific.tableColumns || []).map((col: any, idx: number) => (
                                            <Paper key={col.id} p="xs" withBorder className="bg-white border-gray-2 rounded-xl shadow-sm">
                                                <Stack gap="xs">
                                                    <Group gap="xs" wrap="nowrap">
                                                        <TextInput size="xs" className="flex-1" value={col.label} onChange={(e) => {
                                                            const newCols = [...(activeQuestion.settings.specific.tableColumns || [])]
                                                            newCols[idx] = { ...col, label: e.target.value }
                                                            updateNested('specific', { tableColumns: newCols })
                                                        }} />
                                                        <ActionIcon variant="subtle" color="red" size="xs" onClick={() => {
                                                            const newCols = activeQuestion.settings.specific.tableColumns?.filter((c: any) => c.id !== col.id)
                                                            updateNested('specific', { tableColumns: newCols })
                                                        }}>
                                                            <Icon name="tabler:x" width={12} height={12} />
                                                        </ActionIcon>
                                                    </Group>
                                                    <Select
                                                        size="xs"
                                                        data={[{ label: 'Short Text', value: 'SHORT_TEXT' }, { label: 'Number', value: 'NUMBER' }, { label: 'Checkbox', value: 'BOOLEAN' }]}
                                                        value={col.type}
                                                        onChange={(val) => {
                                                            const newCols = [...(activeQuestion.settings.specific.tableColumns || [])]
                                                            newCols[idx] = { ...col, type: val }
                                                            updateNested('specific', { tableColumns: newCols })
                                                        }}
                                                    />
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activeQuestion.type === 'MATRIX' && (
                                <Stack gap="sm">
                                    <Textarea
                                        label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Row Labels</Text>}
                                        description="Enter one label per line"
                                        value={activeQuestion.settings.specific.matrixRowLabels?.join('\n') || ''}
                                        onChange={(e) => updateNested('specific', { matrixRowLabels: e.target.value.split('\n') })}
                                        size="sm"
                                        classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                                    />
                                    <Textarea
                                        label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Column Labels</Text>}
                                        description="Enter one label per line"
                                        value={activeQuestion.settings.specific.matrixColumnLabels?.join('\n') || ''}
                                        onChange={(e) => updateNested('specific', { matrixColumnLabels: e.target.value.split('\n') })}
                                        size="sm"
                                        classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    )}
                </CollapsibleSection>

                <CollapsibleSection
                    title="Rules"
                    icon="lucide:shield-check"
                    accentColor="bg-cyan-9"
                    iconColor="text-cyan-9"
                >
                    <Stack gap="md">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1 px-0.5">
                                <Icon name="lucide:alert-circle" width={14} height={14} className="text-red-9" />
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Field Rule</Text>
                            </div>
                            <SegmentedControl
                                size="xs"
                                value={activeQuestion.settings.validation.fieldRule || 'OPTIONAL'}
                                onChange={(val) => updateNested('validation', { fieldRule: val })}
                                data={[{ label: 'Optional', value: 'OPTIONAL' }, { label: 'Required', value: 'REQUIRED' }]}
                                classNames={{ root: 'bg-gray-1', indicator: 'bg-white shadow-sm' }}
                            />
                        </div>

                        <Select
                            label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Content Type</Text>}
                            value={activeQuestion.settings.validation.contentRule || ''}
                            onChange={(val) => updateNested('validation', { contentRule: val })}
                            data={[
                                { label: 'No Restriction', value: '' },
                                { label: 'Text Only', value: 'TEXT' },
                                { label: 'Numeric Only', value: 'DECIMAL' },
                                { label: 'Email', value: 'EMAIL' },
                                { label: 'Phone', value: 'PHONE' },
                                { label: 'Alphanumeric', value: 'ALPHANUMERIC' },
                            ]}
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                        />

                        <Group grow gap="sm">
                            <TextInput
                                label={<Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider mb-1">Min Length/Value</Text>}
                                value={activeQuestion.settings.validation.minimum || ''}
                                onChange={(e) => updateNested('validation', { minimum: e.target.value })}
                                size="xs"
                                classNames={{ input: 'bg-white border-gray-2 rounded-md' }}
                            />
                            <TextInput
                                label={<Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider mb-1">Max Length/Value</Text>}
                                value={activeQuestion.settings.validation.maximum || ''}
                                onChange={(e) => updateNested('validation', { maximum: e.target.value })}
                                size="xs"
                                classNames={{ input: 'bg-white border-gray-2 rounded-md' }}
                            />
                        </Group>

                        {activeQuestion.type === 'FILE_UPLOAD' && (
                            <Stack gap="sm" className="p-3 bg-gray-50 border border-gray-2 rounded-xl">
                                <TextInput
                                    label={<Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider mb-1">Allowed Extensions</Text>}
                                    placeholder="pdf, docx, jpg"
                                    value={activeQuestion.settings.validation.allowedFileTypes?.join(', ') || ''}
                                    onChange={(e) => updateNested('validation', { allowedFileTypes: e.target.value.split(',').map(s => s.trim()) })}
                                    size="xs"
                                />
                                <TextInput
                                    label={<Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider mb-1">Max Size (MB)</Text>}
                                    value={activeQuestion.settings.validation.maxFileSize || ''}
                                    onChange={(e) => updateNested('validation', { maxFileSize: Number(e.target.value) })}
                                    size="xs"
                                />
                            </Stack>
                        )}

                        {activeQuestion.type === 'DATE' && (
                            <Select
                                label={<Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider mb-1">Date Range</Text>}
                                value={activeQuestion.settings.validation.dateRange || 'CUSTOM'}
                                onChange={(val) => updateNested('validation', { dateRange: val })}
                                data={[{ label: 'Past Only', value: 'PAST' }, { label: 'Future Only', value: 'FUTURE' }, { label: 'Custom', value: 'CUSTOM' }]}
                                size="xs"
                                classNames={{ input: 'bg-white border-gray-2 rounded-md' }}
                            />
                        )}

                        <TextInput
                            label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5 mt-2">Correct Answer</Text>}
                            value={activeQuestion.settings.validation.correctAnswer || ''}
                            onChange={(e) => updateNested('validation', { correctAnswer: e.target.value })}
                            placeholder="Identify target answer..."
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                        />
                    </Stack>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Automation"
                    icon="lucide:sparkles"
                    accentColor="bg-orange-9"
                    iconColor="text-orange-9"
                >
                    <Stack gap="md">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-0.5">
                                <Icon name="lucide:database" width={14} height={14} className="text-blue-6" />
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Master Data Link</Text>
                            </div>
                            <Select
                                size="sm"
                                label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Master Form ID</Text>}
                                placeholder="Select source..."
                                value={String(activeQuestion.settings?.aiSettings?.formControlValidate?.masterFormId || '')}
                                onChange={(val) => updateNested('aiSettings', {
                                    formControlValidate: {
                                        ...(activeQuestion.settings?.aiSettings?.formControlValidate || {}),
                                        masterFormId: Number(val)
                                    }
                                })}
                                data={['101', '202', '303']}
                                classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                            />
                        </div>

                        <Divider className="border-gray-1 dotted" />

                        <div className="space-y-4">
                            <Text size="11px" fw={800} className="text-accent-primary uppercase tracking-widest flex items-center gap-2">
                                <Icon name="lucide:sparkles" width={14} height={14} /> AI Validation
                            </Text>

                            <div className="flex items-center justify-between py-1 px-1">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Enable Data Extraction</Text>
                                <Switch
                                    size="xs" color="violet"
                                    checked={activeQuestion.settings?.aiSettings?.fileValidation?.enableExtraction || false}
                                    onChange={(e) => updateNested('aiSettings', {
                                        fileValidation: {
                                            ...(activeQuestion.settings?.aiSettings?.fileValidation || {}),
                                            enableExtraction: e.currentTarget.checked
                                        }
                                    })}
                                />
                            </div>

                            <Textarea
                                size="sm"
                                label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5">Extraction Rules</Text>}
                                placeholder="Define AI extraction rules..."
                                value={activeQuestion.settings?.aiSettings?.fileValidation?.extractionRules || ''}
                                onChange={(e) => updateNested('aiSettings', {
                                    fileValidation: {
                                        ...(activeQuestion.settings?.aiSettings?.fileValidation || {}),
                                        extractionRules: e.target.value
                                    }
                                })}
                                minRows={2}
                                classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                            />

                            <div className="flex items-center justify-between py-1 px-1">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Enable Image Classification</Text>
                                <Switch
                                    size="xs" color="violet"
                                    checked={activeQuestion.settings?.aiSettings?.fileValidation?.enableClassification || false}
                                    onChange={(e) => updateNested('aiSettings', {
                                        fileValidation: {
                                            ...(activeQuestion.settings?.aiSettings?.fileValidation || {}),
                                            enableClassification: e.currentTarget.checked
                                        }
                                    })}
                                />
                            </div>
                        </div>
                    </Stack>
                </CollapsibleSection>
            </div>

            <div className="p-4 border-t border-gray-2 bg-white shrink-0">
                <Button
                    variant="outline"
                    color="red"
                    size="sm"
                    fullWidth
                    leftSection={<Icon name="lucide:trash-2" width={14} height={14} />}
                    className="border-gray-3 text-red-9 hover:bg-red-50 active:scale-[0.98] transition-all justify-start px-3 h-10 rounded-xl"
                    onClick={() => deleteQuestion(activeQuestion.id)}
                >
                    Delete Field
                </Button>
            </div>
        </div>
    )
}

const CollapsibleSection = ({ title, icon, accentColor, iconColor, children, defaultOpen = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    return (
        <div className={cn("flex flex-col gap-1", isOpen && "mb-2.5")}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer select-none flex items-center justify-between group p-2 -mx-2 rounded-xl hover:bg-[#f0f2f5] active:scale-[0.99] transition-all duration-300"
            >
                <div className="flex items-center gap-2">
                    <span className={cn("inline-block w-1 h-5 rounded transition-transform group-hover:scale-y-110", accentColor)} />
                    <Icon name={icon} className={cn("h-5 w-5 animate-in zoom-in-50 duration-500", iconColor)} />
                    <span className="font-medium text-13 text-gray-13 group-hover:text-purple-600 transition-colors duration-300">{title}</span>
                </div>
                <div className="text-gray-8 group-hover:text-purple-600 transition-all duration-300">
                    <Icon
                        name="lucide:chevron-down"
                        className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")}
                    />
                </div>
            </div>
            <Collapse in={isOpen}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-2 p-3.5 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {children}
                </div>
            </Collapse>
        </div>
    )
}

const SettingsHeader = ({ title, icon, headerProps }: { title: string, icon: string, headerProps: any }) => {
    const {
        activeQuestion, selectionType, isSomethingSelected,
        isEditingLabel, headerLabel, setHeaderLabel,
        setIsEditingLabel, handleLabelSave, handleKeyDown,
        inputRef, hasPrev, hasNext, handlePrev, handleNext,
        clearSelection, deleteQuestion, setSidebarOpen
    } = headerProps

    const headerIcon = selectionType === 'question' && activeQuestion
        ? (FIELD_ICONS[activeQuestion.type] || 'lucide:settings-2')
        : icon

    return (
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
                            <Icon name="lucide:arrow-left" width={14} height={14} className="text-gray-10" />
                        </ActionIcon>
                    </Tooltip>
                )}

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft/10 border border-accent-soft/20">
                    <Icon name={headerIcon} width={16} height={16} className="text-accent-primary" />
                </div>

                {selectionType === 'question' && activeQuestion ? (
                    isEditingLabel ? (
                        <div className="flex-1 flex items-center gap-1">
                            <input
                                ref={inputRef}
                                type="text"
                                value={headerLabel}
                                onChange={(e) => setHeaderLabel(e.target.value)}
                                onBlur={handleLabelSave}
                                onKeyDown={handleKeyDown}
                                className="flex-1 min-w-0 text-xs font-semibold text-gray-13 border border-primary-5 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-5 bg-white"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 min-w-0 flex-1 group/title overflow-hidden">
                            <Tooltip
                                label={activeQuestion.label || 'Untitled Field'}
                                position="top-start"
                                withArrow
                                disabled={!activeQuestion.label || activeQuestion.label.length < 15}
                                openDelay={400}
                                withinPortal
                            >
                                <div className="inline-grid items-center min-w-0 max-w-[140px]">
                                    <span className="invisible whitespace-pre text-[xs] font-bold tracking-tight h-0 overflow-hidden px-0">
                                        {activeQuestion.label || 'Untitled Field'}
                                    </span>
                                    <h2
                                        className="text-15/5 font-semibold text-gray-13 truncate cursor-pointer hover:text-gray-11"
                                        style={{ gridArea: '1/1/2/2' }}
                                        onClick={() => setIsEditingLabel(true)}
                                    >
                                        {activeQuestion.label || 'Untitled Field'}
                                    </h2>
                                </div>
                            </Tooltip>

                            <Badge
                                size="xs"
                                variant="outline"
                                color="gray"
                                radius="xs"
                                className="border-gray-3 text-[9px] px-1 py-0 h-4 uppercase tracking-tighter shrink-0"
                            >
                                {activeQuestion.type.replace(/_/g, ' ')}
                            </Badge>

                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="xs"
                                className="text-gray-4 opacity-0 group-hover/title:opacity-100 cursor-pointer hover:text-gray-7 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); setIsEditingLabel(true); }}
                            >
                                <Icon name="lucide:pencil" width={12} height={12} />
                            </ActionIcon>
                        </div>
                    )
                ) : (
                    <h2 className='text-15/5 font-semibold text-gray-13 truncate capitalize'>{title}</h2>
                )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
                {selectionType === 'question' && (
                    <>
                        <div className='flex items-center gap-0.5'>
                            {hasPrev && (
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={handlePrev}
                                    className="hover:bg-gray-2"
                                >
                                    <Icon name="lucide:chevron-left" width={16} height={16} />
                                </ActionIcon>
                            )}
                            {hasNext && (
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={handleNext}
                                    className="hover:bg-gray-2"
                                >
                                    <Icon name="lucide:chevron-right" width={16} height={16} />
                                </ActionIcon>
                            )}
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
}

export default FieldSettings

