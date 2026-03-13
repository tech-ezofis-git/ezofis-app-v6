import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import type { FormType, Question } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import { generateId, useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

const FIELD_ICONS: Record<string, string> = {
  ADDRESS: 'lucide:map-pin',
  ADDRESS_INFO: 'lucide:home',
  CALCULATED: 'lucide:calculator',
  CONTACT_INFO: 'lucide:contact',
  COUNTER: 'tabler:circle-dot',
  COUNTRY_CODE: 'lucide:globe',
  CURRENCY_AMOUNT: 'lucide:dollar-sign',
  DATE: 'lucide:calendar',
  DATE_TIME: 'lucide:calendar-clock',
  DIVIDER: 'lucide:minus',
  DYNAMIC_TABLE: 'lucide:table-2',
  EMAIL: 'lucide:mail',
  FILE_UPLOAD: 'lucide:file-up',
  FULL_NAME: 'lucide:user',
  HEADING: 'lucide:heading',
  LABEL: 'lucide:type',
  LONG_TEXT: 'mdi:form-textarea',
  MATRIX: 'lucide:grid-3x3',
  MULTI_SELECT: 'lucide:list-checks',
  MULTIPLE_CHOICE: 'lucide:square-check',
  NUMBER: 'tabler:number-123',
  PASSWORD: 'lucide:lock',
  PHONE_NUMBER: 'lucide:phone',
  RATING: 'lucide:star',
  SHORT_TEXT: 'mdi:form-textbox',
  SINGLE_CHOICE: 'mdi:radiobox-marked',
  SINGLE_SELECT: 'lucide:list-todo',
  TABLE: 'lucide:table',
  TEXT_BUILDER: 'lucide:pilcrow',
  TIME: 'lucide:clock',
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

  const activeQuestion = panels
    .flatMap((p) => p.fields)
    .find((q) => q.id === activeQuestionId)

  const isSomethingSelected =
    selectionType !== 'question' || activeQuestionId !== null

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

  const allQuestions = panels.flatMap((p) => p.fields)
  const currentIndex = activeQuestion
    ? allQuestions.findIndex((q) => q.id === activeQuestion.id)
    : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allQuestions.length - 1

  const handlePrev = () => {
    if (hasPrev) setActiveQuestionId(allQuestions[currentIndex - 1].id)
  }

  const handleNext = () => {
    if (hasNext) setActiveQuestionId(allQuestions[currentIndex + 1].id)
  }

  // Deep update helper
  const updateNested = (
    path: 'general' | 'validation' | 'specific',
    updates: any,
  ) => {
    if (!activeQuestion) return
    updateQuestion(activeQuestion.id, (q: Question) => ({
      ...q,
      settings: {
        ...q.settings,
        [path]: { ...q.settings[path as keyof typeof q.settings], ...updates },
      },
    }))
  }

  // Memoized Header Props
  const headerProps = {
    activeQuestion,
    clearSelection,
    deleteQuestion,
    handleKeyDown,
    handleLabelSave,
    handleNext,
    handlePrev,
    hasNext,
    hasPrev,
    headerLabel,
    inputRef,
    isEditingLabel,
    isSomethingSelected,
    selectionType,
    setHeaderLabel,
    setIsEditingLabel,
    setSidebarOpen,
  }

  // 2. General Settings View
  if (selectionType === 'general') {
    const FORM_TYPES: {
      desc: string
      icon: string
      label: string
      value: FormType
    }[] = [
      {
        desc: 'For business processes & automation',
        icon: 'tabler:git-branch',
        label: 'Workflow',
        value: 'WORKFLOW',
      },
      {
        desc: 'For surveys & reviews',
        icon: 'tabler:message-star',
        label: 'Master',
        value: 'MASTER',
      },
    ]

    return (
      <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white font-inter shadow-xl transition-all duration-300'>
        <SettingsHeader
          headerProps={headerProps}
          icon='tabler:settings'
          title='General Settings'
        />
        <div className='custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5'>
          {/* Basic Info */}
          <Stack gap='lg'>
            <div className='space-y-4'>
              <TextInput
                maxLength={50}
                placeholder='e.g. Employee Feedback'
                size='sm'
                value={name}
                classNames={{
                  input:
                    'h-10 rounded-xl border-gray-2 bg-gray-1 font-medium transition-all focus:border-accent-primary',
                }}
                label={
                  <Text
                    className='mb-1.5 flex items-center gap-2 tracking-wider text-gray-11 uppercase'
                    fw={800}
                    size='xs'
                  >
                    <Icon height={14} name='lucide:type' width={14} /> Form Name
                  </Text>
                }
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                minRows={3}
                placeholder='What is this form for?'
                size='sm'
                value={description}
                autosize
                classNames={{
                  input:
                    'rounded-xl border-gray-2 bg-gray-1 font-medium transition-all focus:border-accent-primary',
                }}
                label={
                  <Text
                    className='mb-1.5 flex items-center gap-2 tracking-wider text-gray-11 uppercase'
                    fw={800}
                    size='xs'
                  >
                    <Icon height={14} name='lucide:text-quote' width={14} />{' '}
                    Description
                  </Text>
                }
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </Stack>

          <Divider className='border-gray-2' />

          {/* Form Type Cards */}
          <div className='space-y-3'>
            <Text
              className='flex items-center gap-2 tracking-wider text-gray-11 uppercase'
              fw={800}
              size='xs'
            >
              <Icon height={14} name='lucide:layers' width={14} /> Form Type
            </Text>
            <div className='grid grid-cols-2 gap-3'>
              {FORM_TYPES.map((t) => {
                const active = formType === t.value
                return (
                  <UnstyledButton
                    key={t.value}
                    className={cn(
                      'group flex h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                      active
                        ? 'border-accent-primary bg-accent-soft/5 shadow-sm ring-2 ring-accent-soft/10'
                        : 'border-gray-5 bg-transparent hover:bg-gray-1',
                    )}
                    onClick={() => setFormType(t.value)}
                  >
                    <div
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg transition-transform group-hover:scale-11',
                        active
                          ? 'bg-accent-primary text-white shadow-md shadow-accent-soft/3'
                          : 'border border-gray-4 bg-white text-gray-8',
                      )}
                    >
                      <Icon height={18} name={t.icon} width={18} />
                    </div>
                    <div className='px-1'>
                      <Text
                        fw={800}
                        size='xs'
                        className={cn(
                          'mb-1 leading-none tracking-tight uppercase',
                          active ? 'text-gray-9' : 'text-gray-9',
                        )}
                      >
                        {t.label}
                      </Text>
                      <Text
                        className='leading-tight text-gray-5 italic opacity-8'
                        fw={600}
                        size='9px'
                      >
                        {t.desc}
                      </Text>
                    </div>
                  </UnstyledButton>
                )
              })}
            </div>
          </div>

          <Divider className='border-gray-2' />

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

          <Box className='bg-gray-50 rounded-2xl border border-gray-2 p-4'>
            <Group gap='xs' mb={8}>
              <Icon
                className='text-accent-primary'
                height={14}
                name='lucide:sparkles'
                width={14}
              />
              <Text
                className='tracking-wider text-gray-11 uppercase'
                fw={800}
                size='11px'
              >
                Quick Note
              </Text>
            </Group>
            <Text
              className='leading-relaxed font-medium text-gray-6'
              size='10px'
            >
              These settings apply to the entire form experience. You can also
              customize Welcome and Thank You pages in their respective screens.
            </Text>
          </Box>
        </div>
      </div>
    )
  }

  // 3. Welcome Page Settings
  if (selectionType === 'welcome') {
    return (
      <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white font-inter shadow-xl transition-all duration-300'>
        <SettingsHeader
          headerProps={headerProps}
          icon='lucide:megaphone'
          title='Welcome Screen'
        />
        <div className='flex-1 space-y-5 overflow-y-auto p-4'>
          <Stack gap='xl'>
            <div className='flex items-center justify-between px-1 py-1'>
              <Text
                className='tracking-wider text-gray-11 uppercase'
                fw={700}
                size='sm'
              >
                Enable Welcome Page
              </Text>
              <Switch
                checked={welcomePage.enabled}
                color='violet'
                onChange={(e) =>
                  setWelcomePage({ enabled: e.currentTarget.checked })
                }
              />
            </div>
            <Divider className='border-gray-2' />
            <TextInput
              label='Welcome Title'
              placeholder='Welcome to our form'
              size='sm'
              value={welcomePage.title}
              onChange={(e) => setWelcomePage({ title: e.target.value })}
            />
            <Textarea
              label='Description'
              minRows={2}
              placeholder='Add a welcoming subtext...'
              size='sm'
              value={welcomePage.description}
              autosize
              onChange={(e) => setWelcomePage({ description: e.target.value })}
            />
            <TextInput
              label='Button Text'
              placeholder='Start'
              size='sm'
              value={welcomePage.buttonText}
              onChange={(e) => setWelcomePage({ buttonText: e.target.value })}
            />
          </Stack>
        </div>
      </div>
    )
  }

  // 4. Thank You Page Settings
  if (selectionType === 'thank_you') {
    return (
      <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white font-inter shadow-xl transition-all duration-300'>
        <SettingsHeader
          headerProps={headerProps}
          icon='lucide:party-popper'
          title='Completion Screen'
        />
        <div className='flex-1 space-y-5 overflow-y-auto p-4'>
          <Stack gap='xl'>
            <div className='flex items-center justify-between px-1 py-1'>
              <Text
                className='tracking-wider text-gray-11 uppercase'
                fw={700}
                size='sm'
              >
                Enable Thank You Page
              </Text>
              <Switch
                checked={thankYouPage.enabled}
                color='violet'
                onChange={(e) =>
                  setThankYouPage({ enabled: e.currentTarget.checked })
                }
              />
            </div>
            <Divider className='border-gray-2' />
            <TextInput
              label='Thank You Title'
              placeholder='Thank you!'
              size='sm'
              value={thankYouPage.title}
              onChange={(e) => setThankYouPage({ title: e.target.value })}
            />
            <Textarea
              label='Completion Message'
              minRows={2}
              placeholder='Your submission has been received...'
              size='sm'
              value={thankYouPage.description}
              autosize
              onChange={(e) => setThankYouPage({ description: e.target.value })}
            />
          </Stack>
        </div>
      </div>
    )
  }

  // Default Fallback
  if (!activeQuestion) return null

  const sizeMap: Record<string, string> = {
    '1/2': 'col-6',
    '1/3': 'col-4',
    'col-4': '1/3',
    'col-6': '1/2',
    'col-12': 'full',
    'full': 'col-12',
  }

  return (
    <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white font-inter shadow-xl transition-all duration-300'>
      <SettingsHeader
        headerProps={headerProps}
        icon='tabler:adjustments-horizontal'
        title='Field Settings'
      />

      <div className='custom-scrollbar flex-1 space-y-5 overflow-y-auto p-4'>
        <div className='space-y-4'>
          <TextInput
            placeholder='e.g. What is your name?'
            size='sm'
            value={localLabel}
            classNames={{
              input: 'border-gray-2 bg-gray-1 text-xs focus:bg-white',
            }}
            label={
              <Text className='mb-1 text-gray-11' fw={500} size='13px'>
                Field Label
              </Text>
            }
            onBlur={() =>
              updateQuestion(activeQuestion.id, { label: localLabel })
            }
            onChange={(e) => setLocalLabel(e.target.value)}
          />

          <Textarea
            minRows={2}
            placeholder='Add extra instructions...'
            size='sm'
            value={localDesc}
            autosize
            classNames={{
              input: 'border-gray-2 bg-gray-1 text-xs focus:bg-white',
            }}
            label={
              <Text className='mb-1 text-gray-11' fw={500} size='13px'>
                Description
              </Text>
            }
            onBlur={() => updateNested('general', { description: localDesc })}
            onChange={(e) => setLocalDesc(e.target.value)}
          />

          <TextInput
            placeholder='e.g. Type here...'
            size='sm'
            value={localPlaceholder}
            classNames={{
              input: 'border-gray-2 bg-gray-1 text-xs focus:bg-white',
            }}
            label={
              <Text className='mb-1 text-gray-11' fw={500} size='13px'>
                Placeholder
              </Text>
            }
            onBlur={() =>
              updateNested('general', { placeholder: localPlaceholder })
            }
            onChange={(e) => setLocalPlaceholder(e.target.value)}
          />
        </div>

        <Divider className='border-gray-2' />

        <div className='space-y-4'>
          <div>
            <Text className='text-gray-11' fw={500} mb='xs' size='13px'>
              Field Width
            </Text>
            <SegmentedControl
              size='xs'
              value={sizeMap[activeQuestion.settings.general.size] || 'full'}
              fullWidth
              data={[
                { label: 'Full', value: 'full' },
                { label: '1/2', value: '1/2' },
                { label: '1/3', value: '1/3' },
              ]}
              onChange={(value) =>
                updateNested('general', { size: sizeMap[value] })
              }
            />
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between border-b border-gray-1 py-2'>
              <Text className='text-gray-11' fw={500} size='xs'>
                Required
              </Text>
              <Switch
                color='violet'
                size='xs'
                checked={
                  activeQuestion.settings.validation.fieldRule === 'REQUIRED'
                }
                onChange={(e) =>
                  updateNested('validation', {
                    fieldRule: e.currentTarget.checked ? 'REQUIRED' : 'NONE',
                  })
                }
              />
            </div>

            <div className='flex items-center justify-between border-b border-gray-1 py-2'>
              <Text className='text-gray-11' fw={500} size='xs'>
                Hidden Field
              </Text>
              <Switch
                checked={activeQuestion.settings.general.hidden || false}
                color='violet'
                size='xs'
                onChange={(e) =>
                  updateNested('general', { hidden: e.currentTarget.checked })
                }
              />
            </div>

            <div className='flex items-center justify-between py-2'>
              <div>
                <Text className='text-gray-11' fw={500} size='xs'>
                  Read Only
                </Text>
                <Text className='text-gray-6' size='10px'>
                  User cannot edit this field
                </Text>
              </div>
              <Switch
                checked={activeQuestion.settings.general.readOnly || false}
                color='violet'
                size='xs'
                onChange={(e) =>
                  updateNested('general', { readOnly: e.currentTarget.checked })
                }
              />
            </div>
          </div>
        </div>

        {activeQuestion.type === 'TABLE' && (
          <>
            <Divider className='border-gray-2' />
            <div className='space-y-4'>
              <Group justify='space-between'>
                <Text
                  className='tracking-wider text-gray-11 uppercase'
                  fw={600}
                  size='xs'
                >
                  Columns
                </Text>
                <ActionIcon
                  className='transition-all hover:bg-gray-2'
                  size='sm'
                  variant='subtle'
                  onClick={() => {
                    const newColumn = {
                      id: generateId(),
                      label: `Column ${(activeQuestion.settings.specific.columns?.length || 0) + 1} `,
                      size: 'col-6',
                      type: 'SHORT_TEXT',
                    }
                    updateNested('specific', {
                      columns: [
                        ...(activeQuestion.settings.specific.columns || []),
                        newColumn,
                      ],
                    })
                  }}
                >
                  <Icon height={14} name='tabler:plus' width={14} />
                </ActionIcon>
              </Group>

              <div className='space-y-2'>
                {(activeQuestion.settings.specific.columns || []).map(
                  (col: any, idx: number) => (
                    <Paper
                      className='border-gray-3 bg-gray-1/50'
                      key={col.id}
                      p='xs'
                      withBorder
                    >
                      <div className='space-y-2'>
                        <Group gap='xs' wrap='nowrap'>
                          <Icon
                            className='cursor-grab text-gray-5'
                            height={13}
                            name='tabler:grip-vertical'
                            width={13}
                          />
                          <TextInput
                            className='flex-1'
                            placeholder='Column Name'
                            size='xs'
                            value={col.label}
                            onChange={(e) => {
                              const newCols = [
                                ...(activeQuestion.settings.specific.columns ||
                                  []),
                              ]
                              newCols[idx] = { ...col, label: e.target.value }
                              updateNested('specific', { columns: newCols })
                            }}
                          />
                          <ActionIcon
                            className='hover:bg-red-50 transition-all'
                            color='red'
                            size='xs'
                            variant='subtle'
                            onClick={() => {
                              const newCols = (
                                activeQuestion.settings.specific.columns || []
                              ).filter((c: any) => c.id !== col.id)
                              updateNested('specific', { columns: newCols })
                            }}
                          >
                            <Icon height={12} name='tabler:x' width={12} />
                          </ActionIcon>
                        </Group>
                        <Group gap='xs' grow>
                          <Select
                            size='xs'
                            value={col.type}
                            data={[
                              { label: 'Short Text', value: 'SHORT_TEXT' },
                              { label: 'Long Text', value: 'LONG_TEXT' },
                              { label: 'Number', value: 'NUMBER' },
                              { label: 'Date', value: 'DATE' },
                              { label: 'Choices', value: 'CHOICES' },
                            ]}
                            onChange={(val) => {
                              const newCols = [
                                ...(activeQuestion.settings.specific.columns ||
                                  []),
                              ]
                              newCols[idx] = { ...col, type: val as any }
                              updateNested('specific', { columns: newCols })
                            }}
                          />
                          <Select
                            size='xs'
                            value={col.size}
                            data={[
                              { label: 'Small', value: 'col-3' },
                              { label: 'Medium', value: 'col-6' },
                              { label: 'Large', value: 'col-12' },
                            ]}
                            onChange={(val) => {
                              const newCols = [
                                ...(activeQuestion.settings.specific.columns ||
                                  []),
                              ]
                              newCols[idx] = { ...col, size: val as any }
                              updateNested('specific', { columns: newCols })
                            }}
                          />
                        </Group>
                      </div>
                    </Paper>
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className='shrink-0 border-t border-gray-2 bg-white p-4'>
        <Button
          className='hover:bg-red-50 justify-start border-gray-3 px-3 text-red-9 transition-all active:scale-[0.98]'
          color='red'
          leftSection={<Icon height={14} name='lucide:trash-2' width={14} />}
          size='sm'
          variant='outline'
          fullWidth
          onClick={() => deleteQuestion(activeQuestion.id)}
        >
          Delete Field
        </Button>
      </div>
    </div>
  )
}

const SettingsHeader = ({
  headerProps,
  icon,
  title,
}: {
  headerProps: any
  icon: string
  title: string
}) => {
  const {
    activeQuestion,
    clearSelection,
    deleteQuestion,
    handleKeyDown,
    handleLabelSave,
    handleNext,
    handlePrev,
    hasNext,
    hasPrev,
    headerLabel,
    inputRef,
    isEditingLabel,
    isSomethingSelected,
    selectionType,
    setHeaderLabel,
    setIsEditingLabel,
    setSidebarOpen,
  } = headerProps

  const headerIcon =
    selectionType === 'question' && activeQuestion
      ? FIELD_ICONS[activeQuestion.type] || 'lucide:settings-2'
      : icon

  return (
    <div className='flex shrink-0 items-center justify-between gap-2 border-b border-gray-2 bg-white px-4 py-3'>
      <div className='flex min-w-0 flex-1 items-center gap-2'>
        {isSomethingSelected && selectionType !== 'question' && (
          <Tooltip label='Back to Fields'>
            <ActionIcon
              className='mr-1 shrink-0 hover:bg-gray-2'
              color='gray'
              size='sm'
              variant='subtle'
              onClick={() => clearSelection()}
            >
              <Icon
                className='text-gray-10'
                height={14}
                name='lucide:arrow-left'
                width={14}
              />
            </ActionIcon>
          </Tooltip>
        )}

        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent-soft/20 bg-accent-soft/10'>
          <Icon
            className='text-accent-primary'
            height={16}
            name={headerIcon}
            width={16}
          />
        </div>

        {selectionType === 'question' && activeQuestion ? (
          isEditingLabel ? (
            <div className='flex flex-1 items-center gap-1'>
              <input
                className='min-w-0 flex-1 rounded border border-primary-5 bg-white px-1.5 py-1 text-xs font-semibold text-gray-13 focus:ring-1 focus:ring-primary-5 focus:outline-none'
                ref={inputRef}
                type='text'
                value={headerLabel}
                onBlur={handleLabelSave}
                onChange={(e) => setHeaderLabel(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : (
            <div className='group/title flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
              <Tooltip
                label={activeQuestion.label || 'Untitled Field'}
                openDelay={400}
                position='top-start'
                withArrow
                withinPortal
                disabled={
                  !activeQuestion.label || activeQuestion.label.length < 15
                }
              >
                <div className='inline-grid max-w-[140px] min-w-0 items-center'>
                  <span className='invisible h-0 overflow-hidden px-0 font-bold tracking-tight whitespace-pre text-[xs]'>
                    {activeQuestion.label || 'Untitled Field'}
                  </span>
                  <h2
                    className='cursor-pointer truncate text-15/5 font-semibold text-gray-13 hover:text-gray-11'
                    style={{ gridArea: '1/1/2/2' }}
                    onClick={() => setIsEditingLabel(true)}
                  >
                    {activeQuestion.label || 'Untitled Field'}
                  </h2>
                </div>
              </Tooltip>

              <Badge
                className='h-4 shrink-0 border-gray-3 px-1 py-0 text-[9px] tracking-tighter uppercase'
                color='gray'
                radius='xs'
                size='xs'
                variant='outline'
              >
                {activeQuestion.type.replace(/_/g, ' ')}
              </Badge>

              <ActionIcon
                className='cursor-pointer text-gray-4 opacity-0 transition-opacity group-hover/title:opacity-100 hover:text-gray-7'
                color='gray'
                size='xs'
                variant='subtle'
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditingLabel(true)
                }}
              >
                <Icon height={12} name='lucide:pencil' width={12} />
              </ActionIcon>
            </div>
          )
        ) : (
          <h2 className='truncate text-15/5 font-semibold text-gray-13 capitalize'>
            {title}
          </h2>
        )}
      </div>

      <div className='flex shrink-0 items-center gap-0.5'>
        {selectionType === 'question' && (
          <>
            <div className='flex items-center gap-0.5'>
              {hasPrev && (
                <ActionIcon
                  className='hover:bg-gray-2'
                  color='gray'
                  size='sm'
                  variant='subtle'
                  onClick={handlePrev}
                >
                  <Icon height={16} name='lucide:chevron-left' width={16} />
                </ActionIcon>
              )}
              {hasNext && (
                <ActionIcon
                  className='hover:bg-gray-2'
                  color='gray'
                  size='sm'
                  variant='subtle'
                  onClick={handleNext}
                >
                  <Icon height={16} name='lucide:chevron-right' width={16} />
                </ActionIcon>
              )}
            </div>

            <ActionIcon
              className='hover:bg-red-50 mx-0.5 transition-colors hover:text-error-main'
              color='gray'
              size='sm'
              title='Delete Field'
              variant='subtle'
              onClick={() => deleteQuestion(activeQuestion!.id)}
            >
              <Icon height={15} name='lucide:trash-2' width={15} />
            </ActionIcon>
          </>
        )}

        <div className='mx-1 h-4 w-px bg-gray-2' />

        <ActionIcon
          className='rounded-lg transition-colors hover:bg-gray-2'
          color='gray'
          size='sm'
          variant='subtle'
          onClick={() => setSidebarOpen(false)}
        >
          <Icon height={16} name='lucide:x' width={16} />
        </ActionIcon>
      </div>
    </div>
  )
}

export default FieldSettings
