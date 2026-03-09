import { Switch, Text, TextInput, Select, Textarea, Button, Divider, ActionIcon, Group, Paper, Stack, Tooltip, Box, Badge, UnstyledButton, NumberInput } from '@mantine/core'
import { useFormStore, generateId, type Question } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'

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
    SCORE: 'lucide:hash',
    IMAGE_UPLOAD: 'lucide:image',
    CONSENT: 'lucide:shield-check',
    SIGNATURE: 'lucide:pen-tool',
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

    // Phase 4 State
    const responseLimit = useFormStore((state) => state.responseLimit)
    const setResponseLimit = useFormStore((state) => state.setResponseLimit)
    const scheduleStart = useFormStore((state) => state.scheduleStart)
    const scheduleEnd = useFormStore((state) => state.scheduleEnd)
    const setSchedule = useFormStore((state) => state.setSchedule)
    const conversationalMode = useFormStore((state) => state.conversationalMode)
    const setConversationalMode = useFormStore((state) => state.setConversationalMode)

    const activeQuestion = panels
        .flatMap(p => p.fields)
        .find(q => q.id === activeQuestionId)

    const isSomethingSelected = selectionType !== 'question' || activeQuestionId !== null

    const [isEditingLabel, setIsEditingLabel] = useState(false)
    const [headerLabel, setHeaderLabel] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (activeQuestion) {
            setHeaderLabel(activeQuestion.label || '')
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
        const FORM_TYPES: { value: FormType, label: string, icon: string, desc: string }[] = [
            { value: 'WORKFLOW', label: 'Workflow', icon: 'tabler:git-branch', desc: 'For business processes & automation' },
            { value: 'MASTER', label: 'Master', icon: 'tabler:message-star', desc: 'For surveys & reviews' },
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
                                        onClick={() => setFormType(t.value)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group gap-2 text-center h-[120px]",
                                            active
                                                ? "border-accent-primary shadow-lg bg-white ring-1 ring-accent-primary scale-[1.01]"
                                                : "border-gray-3 hover:border-accent-soft hover:shadow-md hover:-translate-y-1 active:scale-95"
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

                    <Divider className="border-gray-2" />

                    {/* Phase 4: Management */}
                    <div className="space-y-6 pb-4">
                        <div className='space-y-3'>
                            <Text size="xs" fw={800} className="text-gray-11 uppercase tracking-wider flex items-center gap-2">
                                <Icon name="lucide:clock" width={14} height={14} /> Availability & Limits
                            </Text>

                            <Stack gap="sm">
                                <NumberInput
                                    label="Response Limit"
                                    description="Max total submissions allowed"
                                    placeholder="No limit"
                                    value={responseLimit}
                                    onChange={(val) => setResponseLimit(Number(val) || undefined)}
                                    size="sm"
                                    classNames={{ input: 'bg-gray-1 border-gray-2 rounded-xl focus:bg-white' }}
                                />

                                <Group grow gap="xs">
                                    <TextInput
                                        label="Start Date"
                                        type="date"
                                        value={scheduleStart}
                                        onChange={(e) => setSchedule(e.target.value, scheduleEnd)}
                                        size="xs"
                                        classNames={{ input: 'bg-gray-1 border-gray-2 rounded-lg' }}
                                    />
                                    <TextInput
                                        label="End Date"
                                        type="date"
                                        value={scheduleEnd}
                                        onChange={(e) => setSchedule(scheduleStart, e.target.value)}
                                        size="xs"
                                        classNames={{ input: 'bg-gray-1 border-gray-2 rounded-lg' }}
                                    />
                                </Group>
                            </Stack>
                        </div>

                        <Divider className="border-gray-1 border-dashed" />

                        <div className="flex items-center justify-between py-1 px-1">
                            <div>
                                <Text size="xs" fw={800} className="text-gray-9 uppercase tracking-wider mb-0.5">Conversational Mode</Text>
                                <Text size="10px" className="text-gray-5 italic">One question at a time (Typeform style)</Text>
                            </div>
                            <Switch
                                checked={conversationalMode}
                                onChange={(e) => setConversationalMode(e.currentTarget.checked)}
                                size="sm" color="violet"
                            />
                        </div>
                    </div>
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
                        <Divider className="border-gray-1 border-dashed" />
                        <TextInput
                            label="Redirect URL"
                            description="Send users to another site after submit"
                            value={thankYouPage.redirectUrl || ''}
                            onChange={(e) => setThankYouPage({ redirectUrl: e.target.value })}
                            placeholder="https://your-site.com/success"
                            size="sm"
                            classNames={{ input: 'bg-white border-gray-2 rounded-xl focus:border-accent-primary transition-all' }}
                        />
                    </Stack>
                </div>
            </div>
        )
    }

    // Default Fallback
    if (!activeQuestion) return null


    return (
        <div className="flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-in slide-in-from-right duration-300 font-inter">
            <SettingsHeader
                title="Field Settings"
                icon="tabler:adjustments-horizontal"
                headerProps={headerProps}
            />

            <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar space-y-2">
                <SectionWrapper
                    title="Question Settings"
                    icon="lucide:settings-2"
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
                            <InputSwitch
                                checked={activeQuestion.settings.general.hideLabel || false}
                                onChange={(checked) => updateNested('general', { hideLabel: checked })}
                            />
                        </div>
                    </Stack>

                    <Divider className="border-gray-1 dotted" />

                    {/* B. Layout & Visibility */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5 px-0.5">Field Width</Text>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Full', value: 'col-12', icon: 'lucide:layout' },
                                    { label: '1/2', value: 'col-6', icon: 'lucide:columns' },
                                    { label: '1/3', value: 'col-4', icon: 'lucide:grid' }
                                ].map((w) => (
                                    <InputRadioCard
                                        key={w.value}
                                        label={w.label}
                                        icon={w.icon}
                                        checked={(activeQuestion.settings.general.size || 'col-12') === w.value}
                                        onClick={() => updateNested('general', { size: w.value })}
                                        size="sm"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Visibility</Text>
                            <InputSelect
                                options={[
                                    { id: 1, name: 'Normal', value: 'NORMAL' },
                                    { id: 2, name: 'Read Only', value: 'READ_ONLY' },
                                    { id: 3, name: 'Hidden', value: 'HIDDEN' }
                                ]}
                                value={{
                                    id: 0,
                                    name: (activeQuestion.settings.general.visibility || 'Normal').toLowerCase().replace('_', ' '),
                                    value: activeQuestion.settings.general.visibility || 'NORMAL'
                                }}
                                onChange={(val: any) => updateNested('general', { visibility: val?.value })}
                            />
                        </div>
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
                            <div className="space-y-1.5">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Divider Style</Text>
                                <InputSelect
                                    options={[
                                        { id: 1, name: 'Solid', value: 'SOLID' },
                                        { id: 2, name: 'Dashed', value: 'DASHED' },
                                        { id: 3, name: 'Dotted', value: 'DOTTED' }
                                    ]}
                                    value={{
                                        id: 0,
                                        name: (activeQuestion.settings.specific.dividerStyle || 'Solid').toLowerCase(),
                                        value: activeQuestion.settings.specific.dividerStyle || 'SOLID'
                                    } as any}
                                    onChange={(val: any) => updateNested('specific', { dividerStyle: val.value })}
                                />
                            </div>
                        )}
                    </div>
                </SectionWrapper>

                <SectionWrapper
                    title="Configuration"
                    icon="lucide:settings"
                >
                    {/* A. Choice Options */}
                    {['SINGLE_SELECT', 'MULTI_SELECT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'CONSENT'].includes(activeQuestion.type) && (
                        <Stack gap="md">
                            <div className="space-y-2">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Options Source</Text>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Custom', value: 'CUSTOM', icon: 'lucide:list-plus' },
                                        { label: 'Lookup', value: 'LOOKUP', icon: 'lucide:search' }
                                    ].map((s) => (
                                        <InputRadioCard
                                            key={s.value}
                                            label={s.label}
                                            icon={s.icon}
                                            checked={(activeQuestion.settings.specific.optionsSource || 'CUSTOM') === s.value}
                                            onClick={() => updateNested('specific', { optionsSource: s.value })}
                                            size="sm"
                                        />
                                    ))}
                                </div>
                            </div>
                            {activeQuestion.settings.specific.optionsSource === 'LOOKUP' ? (
                                <div className="space-y-1.5">
                                    <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Master Data</Text>
                                    <InputSelect
                                        options={[
                                            { id: 1, name: 'Countries', value: 'Countries' },
                                            { id: 2, name: 'Departments', value: 'Departments' },
                                            { id: 3, name: 'Employees', value: 'Employees' }
                                        ]}
                                        value={{ id: 0, name: activeQuestion.settings.specific.lookupMaster || 'Select source...', value: activeQuestion.settings.specific.lookupMaster || '' }}
                                        onChange={(val: any) => updateNested('specific', { lookupMaster: val?.value })}
                                    />
                                </div>
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

                    {/* B. Data Automation / Calculations */}
                    <Stack gap="md">
                        {activeQuestion.type === 'CALCULATED' ? (
                            <div className="space-y-2">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Formula</Text>
                                <Textarea
                                    value={activeQuestion.settings.specific.defaultValue || ''}
                                    onChange={(e) => updateNested('specific', { defaultValue: e.target.value })}
                                    placeholder="e.g. {f1} + {f2} * 10"
                                    minRows={2}
                                    classNames={{ input: 'bg-white border-gray-2 rounded-xl font-mono text-xs' }}
                                />
                                <Box className="p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                                    <Text size="10px" className="text-blue-7 flex items-center gap-1">
                                        <Icon name="lucide:info" width={10} height={10} />
                                        Use {'{field_id}'} or {'{slug}'} for variables.
                                    </Text>
                                </Box>
                            </div>
                        ) : (
                            <TextInput
                                label={<Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5 px-0.5">Default Value</Text>}
                                value={activeQuestion.settings.specific.defaultValue || ''}
                                onChange={(e) => updateNested('specific', { defaultValue: e.target.value })}
                                placeholder="Static value..."
                                size="sm"
                                classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                            />
                        )}

                        {activeQuestion.type !== 'CALCULATED' && (
                            <div className="flex items-center justify-between py-1 px-1">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Auto-Generate Value</Text>
                                <InputSwitch
                                    checked={activeQuestion.settings.specific.autoGenerateValue?.enabled || false}
                                    onChange={(checked) => updateNested('specific', { autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, enabled: checked } })}
                                />
                            </div>
                        )}
                        {activeQuestion.settings.specific.autoGenerateValue?.enabled && activeQuestion.type !== 'CALCULATED' && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-2 rounded-xl animate-in slide-in-from-top-2">
                                <TextInput
                                    label="Prefix"
                                    value={activeQuestion.settings.specific.autoGenerateValue.prefix || ''}
                                    onChange={(e) => updateNested('specific', { autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, prefix: e.target.value } })}
                                    size="xs"
                                />
                                <div className="space-y-1.5">
                                    <Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider ml-1">Suffix</Text>
                                    <InputSelect
                                        options={[
                                            { id: 1, name: 'Date Time', value: 'DATE_TIME' },
                                            { id: 2, name: 'Unique ID', value: 'ID' }
                                        ]}
                                        value={{
                                            id: 0,
                                            name: (activeQuestion.settings.specific.autoGenerateValue.suffix || 'ID').replace('_', ' '),
                                            value: activeQuestion.settings.specific.autoGenerateValue.suffix || 'ID'
                                        }}
                                        onChange={(val: any) => updateNested('specific', { autoGenerateValue: { ...activeQuestion.settings.specific.autoGenerateValue, suffix: val?.value } })}
                                    />
                                </div>
                            </div>
                        )}
                    </Stack>

                    {/* C. Rating / Score */}
                    {['RATING', 'OPINION_SCALE', 'SCORE'].includes(activeQuestion.type) && (
                        <Stack gap="sm">
                            <div className="space-y-1.5">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Icon Type</Text>
                                <InputSelect
                                    options={[
                                        { id: 1, name: 'Star', value: 'STAR' },
                                        { id: 2, name: 'Heart', value: 'HEART' }
                                    ]}
                                    value={{ id: 0, name: activeQuestion.settings.specific.iconType || 'Star', value: activeQuestion.settings.specific.iconType || 'STAR' } as any}
                                    onChange={(val: any) => updateNested('specific', { iconType: val.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider px-0.5">Icon Count</Text>
                                <InputSelect
                                    options={[
                                        { id: 1, name: '5 Icons', value: '5' },
                                        { id: 2, name: '10 Icons', value: '10' },
                                        { id: 3, name: '11 Icons', value: '11' }
                                    ]}
                                    value={{
                                        id: 0,
                                        name: (activeQuestion.settings.specific.iconCount || (activeQuestion.type === 'OPINION_SCALE' ? 10 : 5)) + ' Icons',
                                        value: String(activeQuestion.settings.specific.iconCount || (activeQuestion.type === 'OPINION_SCALE' ? 10 : 5))
                                    } as any}
                                    onChange={(val: any) => updateNested('specific', { iconCount: Number(val.value) })}
                                />
                            </div>
                            <div className="flex items-center justify-between py-1 px-1">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Allow Half Rating</Text>
                                <InputSwitch
                                    checked={activeQuestion.settings.specific.allowHalfRating || false}
                                    onChange={(checked) => updateNested('specific', { allowHalfRating: checked })}
                                />
                            </div>
                        </Stack>
                    )}

                    {/* D. File / Image Upload */}
                    {['FILE_UPLOAD', 'IMAGE_UPLOAD', 'SIGNATURE'].includes(activeQuestion.type) && (
                        <Stack gap="sm">
                            <div className="flex items-center justify-between py-1 px-1 border-b border-gray-1">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Allow Multiple Files</Text>
                                <InputSwitch
                                    checked={activeQuestion.settings.specific.allowMultipleFiles || false}
                                    onChange={(checked) => updateNested('specific', { allowMultipleFiles: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between py-1 px-1">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Allow Multiple Signatures</Text>
                                <InputSwitch
                                    checked={activeQuestion.settings.specific.allowMultipleSignatures || false}
                                    onChange={(checked) => updateNested('specific', { allowMultipleSignatures: checked })}
                                />
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
                </SectionWrapper>

                <SectionWrapper
                    title="Rules"
                    icon="lucide:shield-check"
                >
                    <Stack gap="md">
                        <div className="space-y-2">
                            <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5 px-0.5">Field Rule</Text>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Optional', value: 'OPTIONAL', icon: 'lucide:circle' },
                                    { label: 'Required', value: 'REQUIRED', icon: 'lucide:circle-alert' }
                                ].map((r) => (
                                    <InputRadioCard
                                        key={r.value}
                                        label={r.label}
                                        icon={r.icon}
                                        checked={(activeQuestion.settings.validation.fieldRule || 'OPTIONAL') === r.value}
                                        onClick={() => updateNested('validation', { fieldRule: r.value })}
                                        size="sm"
                                    />
                                ))}
                            </div>
                        </div>


                        <div className="space-y-2">
                            <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider mb-1.5 ml-0.5">Content Type</Text>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Text', value: 'TEXT', icon: 'lucide:type' },
                                    { label: 'Numeric', value: 'DECIMAL', icon: 'lucide:binary' },
                                    { label: 'Email', value: 'EMAIL', icon: 'lucide:mail' },
                                    { label: 'Phone', value: 'PHONE', icon: 'lucide:phone' },
                                    { label: 'Alpha', value: 'ALPHANUMERIC', icon: 'lucide:case-sensitive' },
                                    { label: 'None', value: '', icon: 'lucide:ban' },
                                ].map((opt) => {
                                    const active = (activeQuestion.settings.validation.contentRule || '') === opt.value
                                    return (
                                        <UnstyledButton
                                            key={opt.value}
                                            onClick={() => updateNested('validation', { contentRule: opt.value })}
                                            className={cn(
                                                "flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left group",
                                                active ? "border-accent-primary bg-accent-soft/10 shadow-sm" : "border-gray-2 bg-white hover:bg-gray-50 hover:border-gray-3"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center size-7 rounded-lg border transition-all",
                                                active ? "bg-accent-primary text-white border-accent-primary" : "bg-gray-1 text-gray-9 border-gray-2 group-hover:border-gray-4"
                                            )}>
                                                <Icon name={opt.icon} width={13} height={13} />
                                            </div>
                                            <Text className={cn("text-12 font-semibold tracking-tight transition-colors", active ? "text-accent-primary" : "text-gray-12")}>{opt.label}</Text>
                                        </UnstyledButton>
                                    )
                                })}
                            </div>
                        </div>

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

                        {['FILE_UPLOAD', 'IMAGE_UPLOAD'].includes(activeQuestion.type) && (
                            <Stack gap="sm" className="p-3 bg-gray-50 border border-gray-2 rounded-xl">
                                <TextInput
                                    label={<Text size="10px" fw={700} className="text-gray-11 uppercase tracking-wider mb-1">Allowed Extensions</Text>}
                                    placeholder="pdf, docx, jpg"
                                    value={activeQuestion.settings.validation.allowedFileTypes?.join(', ') || ''}
                                    onChange={(e) => updateNested('validation', { allowedFileTypes: e.target.value.split(',').map(s => s.trim()) })}
                                    size="xs"
                                    disabled={activeQuestion.type === 'IMAGE_UPLOAD'} // Locked for image upload
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
                </SectionWrapper>

                <SectionWrapper
                    title="Automation"
                    icon="lucide:sparkles"
                >
                    <Stack gap="md">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-0.5">
                                <Icon name="lucide:database" width={14} height={14} className="text-blue-6" />
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Master Data Link</Text>
                            </div>
                            <div className="flex gap-2 p-1 bg-gray-1 rounded-xl border border-gray-2 overflow-x-auto no-scrollbar">
                                {['101', '202', '303'].map((id) => {
                                    const active = String(activeQuestion.settings?.aiSettings?.formControlValidate?.masterFormId || '') === id
                                    return (
                                        <UnstyledButton
                                            key={id}
                                            onClick={() => updateNested('aiSettings', {
                                                formControlValidate: {
                                                    ...(activeQuestion.settings?.aiSettings?.formControlValidate || {}),
                                                    masterFormId: Number(id)
                                                }
                                            })}
                                            className={cn(
                                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                                active ? "bg-white text-accent-primary shadow-sm" : "text-gray-5 hover:text-gray-9"
                                            )}
                                        >
                                            {id}
                                        </UnstyledButton>
                                    )
                                })}
                            </div>
                        </div>

                        <Divider className="border-gray-1 dotted" />

                        <div className="space-y-4">
                            <Text size="11px" fw={800} className="text-accent-primary uppercase tracking-widest flex items-center gap-2">
                                <Icon name="lucide:sparkles" width={14} height={14} /> AI Validation
                            </Text>

                            <div className="flex items-center justify-between py-1 px-1">
                                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Enable Data Extraction</Text>
                                <InputSwitch
                                    checked={activeQuestion.settings?.aiSettings?.fileValidation?.enableExtraction || false}
                                    onChange={(checked) => updateNested('aiSettings', {
                                        fileValidation: {
                                            ...(activeQuestion.settings?.aiSettings?.fileValidation || {}),
                                            enableExtraction: checked
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
                                <InputSwitch
                                    checked={activeQuestion.settings?.aiSettings?.fileValidation?.enableClassification || false}
                                    onChange={(checked) => updateNested('aiSettings', {
                                        fileValidation: {
                                            ...(activeQuestion.settings?.aiSettings?.fileValidation || {}),
                                            enableClassification: checked
                                        }
                                    })}
                                />
                            </div>

                        </div>
                    </Stack>
                </SectionWrapper>

                {/* 4. LOGIC SECTION */}
                <SectionWrapper
                    title="Logic & Visibility"
                    icon="lucide:git-branch"
                >
                    <LogicBuilder
                        activeQuestion={activeQuestion}
                        allQuestions={allQuestions}
                        updateQuestion={updateQuestion}
                    />
                </SectionWrapper>
            </div>

            <div className="p-4 border-t border-gray-1 bg-white shrink-0">
                <Button
                    variant="outline"
                    color="red"
                    size="sm"
                    fullWidth
                    leftSection={<Icon name="lucide:trash-2" width={14} height={14} />}
                    className="border-gray-2 text-red-11 hover:bg-red-50 hover:border-red-2 active:scale-[0.98] transition-all justify-center h-10 rounded-xl font-semibold"
                    onClick={() => deleteQuestion(activeQuestion.id)}
                >
                    Delete Field
                </Button>
            </div>
        </div>
    )
}

const SectionWrapper = ({ title, icon, children }: any) => {
    return (
        <div className="flex flex-col gap-1 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 last:mb-0">
            <div className="select-none flex items-center justify-between py-1 mb-1 rounded-xl group transition-all duration-300">
                <div className="flex items-center gap-2.5">
                    <div className="w-1 h-5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(var(--accent-primary-rgb),0.4)]" />
                    <div className="flex items-center justify-center size-7 rounded-lg bg-accent-soft/10 text-accent-primary">
                        <Icon name={icon} className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-13 text-gray-13 tracking-tight uppercase tracking-wider">{title}</span>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-1 p-4 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                {children}
            </div>
        </div>
    )
}


const SettingsHeader = ({ title, icon, headerProps }: { title: string, icon: string, headerProps: any }) => {
    const {
        activeQuestion, selectionType, isSomethingSelected,
        isEditingLabel, headerLabel, setHeaderLabel,
        setIsEditingLabel, handleLabelSave, handleKeyDown,
        inputRef, hasPrev, hasNext, handlePrev, handleNext,
        clearSelection, setSidebarOpen
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
                                className="flex-1 min-w-0 text-[13px] font-semibold text-gray-13 border border-accent-primary rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-accent-primary bg-white transition-all"
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
                                <h2
                                    className="text-[14px] font-semibold text-gray-13 truncate cursor-pointer hover:text-accent-primary transition-colors"
                                    onClick={() => setIsEditingLabel(true)}
                                >
                                    {activeQuestion.label || 'Untitled Field'}
                                </h2>
                            </Tooltip>

                            <Badge
                                size="xs"
                                variant="outline"
                                color="gray"
                                radius="xs"
                                className="border-gray-3 text-[9px] px-1 py-0 h-4 uppercase tracking-tighter shrink-0 font-bold"
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
                                <Icon name="lucide:pencil" width={11} height={11} />
                            </ActionIcon>
                        </div>
                    )
                ) : (
                    <h2 className='text-[14px] font-semibold text-gray-13 truncate capitalize'>{title}</h2>
                )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
                {selectionType === 'question' && (
                    <div className='flex items-center gap-0.5'>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={handlePrev}
                            disabled={!hasPrev}
                            className={cn("transition-colors", hasPrev ? "hover:bg-gray-2 text-gray-8" : "text-gray-3")}
                        >
                            <Icon name="lucide:chevron-left" width={14} height={14} />
                        </ActionIcon>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={handleNext}
                            disabled={!hasNext}
                            className={cn("transition-colors", hasNext ? "hover:bg-gray-2 text-gray-8" : "text-gray-3")}
                        >
                            <Icon name="lucide:chevron-right" width={14} height={14} />
                        </ActionIcon>
                    </div>
                )}

                <div className="w-px h-4 bg-gray-2 mx-1" />

                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="hover:bg-gray-2 rounded-lg transition-colors text-gray-8"
                >
                    <Icon name="lucide:x" width={15} height={15} />
                </ActionIcon>
            </div>
        </div>
    )
}


const LogicBuilder = ({ activeQuestion, allQuestions, updateQuestion }: { activeQuestion: Question, allQuestions: Question[], updateQuestion: any }) => {
    const rules = activeQuestion.settings.logic || []

    // Other fields that can be used as conditions
    const availableFields = allQuestions.filter(q => q.id !== activeQuestion.id)

    const addRule = () => {
        const newRule: any = {
            id: generateId(),
            fieldId: availableFields[0]?.id || '',
            condition: 'IS',
            value: '',
            action: 'SHOW'
        }
        updateQuestion(activeQuestion.id, {
            settings: {
                ...activeQuestion.settings,
                logic: [...rules, newRule]
            }
        })
    }

    const removeRule = (id: string) => {
        updateQuestion(activeQuestion.id, {
            settings: {
                ...activeQuestion.settings,
                logic: rules.filter((r: any) => r.id !== id)
            }
        })
    }

    const updateRule = (id: string, updates: any) => {
        updateQuestion(activeQuestion.id, {
            settings: {
                ...activeQuestion.settings,
                logic: rules.map((r: any) => r.id === id ? { ...r, ...updates } : r)
            }
        })
    }

    return (
        <Stack gap="md">
            <div className="flex items-center justify-between">
                <Text size="xs" fw={700} className="text-gray-11 uppercase tracking-wider">Visibility Rules</Text>
                <Button
                    variant="subtle"
                    size="compact-xs"
                    onClick={addRule}
                    leftSection={<Icon name="lucide:plus" width={12} height={12} />}
                >
                    Add Rule
                </Button>
            </div>

            {rules.length === 0 ? (
                <Box className="p-3 bg-gray-50 rounded-xl border border-gray-1 text-center">
                    <Text size="xs" className="text-gray-6 italic">This field is always visible.</Text>
                </Box>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule: any) => (
                        <Paper key={rule.id} p="xs" withBorder className="bg-gray-50/50 border-gray-2 rounded-xl">
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="10px" fw={800} className="text-accent-primary uppercase">IF</Text>
                                    <ActionIcon variant="subtle" color="red" size="xs" onClick={() => removeRule(rule.id)}>
                                        <Icon name="lucide:x" width={12} height={12} />
                                    </ActionIcon>
                                </Group>

                                <div className="space-y-1">
                                    <Text size="10px" fw={700} className="text-gray-5 uppercase px-1">Field</Text>
                                    <div className="flex flex-wrap gap-1">
                                        {availableFields.map(f => {
                                            const active = rule.fieldId === f.id
                                            return (
                                                <UnstyledButton
                                                    key={f.id}
                                                    onClick={() => updateRule(rule.id, { fieldId: f.id })}
                                                    className={cn(
                                                        "px-2 py-1 rounded-lg text-[10px] font-bold transition-all border",
                                                        active ? "bg-accent-soft text-accent-primary border-accent-soft" : "bg-white text-gray-7 border-gray-2 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {f.label || 'Untitled'}
                                                </UnstyledButton>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Text size="10px" fw={700} className="text-gray-5 uppercase px-1">Condition</Text>
                                    <div className="flex flex-wrap gap-1">
                                        {[
                                            { label: 'is', value: 'IS' },
                                            { label: 'is not', value: 'IS_NOT' },
                                            { label: 'contains', value: 'CONTAINS' },
                                            { label: 'empty', value: 'EMPTY' }
                                        ].map(opt => {
                                            const active = rule.condition === opt.value
                                            return (
                                                <UnstyledButton
                                                    key={opt.value}
                                                    onClick={() => updateRule(rule.id, { condition: opt.value })}
                                                    className={cn(
                                                        "px-2 py-1 rounded-lg text-[10px] font-bold transition-all border",
                                                        active ? "bg-accent-soft text-accent-primary border-accent-soft" : "bg-white text-gray-7 border-gray-2 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {opt.label}
                                                </UnstyledButton>
                                            )
                                        })}
                                    </div>
                                </div>

                                <TextInput
                                    size="xs"
                                    placeholder="Value"
                                    value={rule.value}
                                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                    disabled={rule.condition === 'EMPTY' || rule.condition === 'NOT_EMPTY'}
                                    classNames={{ input: 'bg-white border-gray-2 rounded-xl' }}
                                />

                                <div className="flex items-center gap-2 mt-1">
                                    <Text size="10px" fw={800} className="text-accent-primary uppercase">THEN</Text>
                                    <div className="flex bg-gray-1 p-0.5 rounded-lg border border-gray-2">
                                        {['SHOW', 'HIDE'].map(action => {
                                            const active = rule.action === action
                                            return (
                                                <UnstyledButton
                                                    key={action}
                                                    onClick={() => updateRule(rule.id, { action })}
                                                    className={cn(
                                                        "px-3 py-1 rounded-md text-[9px] font-bold transition-all",
                                                        active ? "bg-white text-accent-primary shadow-sm" : "text-gray-5"
                                                    )}
                                                >
                                                    {action}
                                                </UnstyledButton>
                                            )
                                        })}
                                    </div>
                                </div>
                            </Stack>
                        </Paper>
                    ))}
                </div>
            )}

            <Divider className="border-gray-1" />

            <div className="flex items-center justify-between">
                <div>
                    <Text size="xs" fw={700} className="text-gray-11">Allow Answer Piping</Text>
                    <Text size="10px" className="text-gray-5">Use this field in other labels via {'{id}'}</Text>
                </div>
                <InputSwitch
                    checked={activeQuestion.settings.pipingEnabled}
                    onChange={(checked) => updateQuestion(activeQuestion.id, {
                        settings: {
                            ...activeQuestion.settings,
                            pipingEnabled: checked
                        }
                    })}
                />
            </div>
        </Stack>
    )
}

export default FieldSettings

