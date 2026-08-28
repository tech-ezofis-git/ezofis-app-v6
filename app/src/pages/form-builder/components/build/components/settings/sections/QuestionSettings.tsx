import {
  Button,
  Divider,
  NumberInput,
  SegmentedControl,
  Select,
  Tooltip,
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type {
  LogicRule,
  Question,
  QuestionType,
} from '@/pages/form-builder/store/formStore'
import {
  getRepositoryItemFilterFields,
  getRepositorys,
} from '@/api/v6/folder/folder'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import { classNames as baseInputClassNames } from '@/components/base/inputs/shared/constants'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'
import { generateId, useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import SettingsSection from '../../../../common/SettingsSection'
import FormulaBuilder from './FormulaBuilder'

const TABLE_COLUMN_TYPES: Array<{ label: string; value: QuestionType }> = [
  { label: 'Short Text', value: 'SHORT_TEXT' },
  { label: 'Long Text', value: 'LONG_TEXT' },
  { label: 'Number', value: 'NUMBER' },
  { label: 'Currency', value: 'CURRENCY_AMOUNT' },
  { label: 'Date', value: 'DATE' },
  { label: 'Time', value: 'TIME' },
  { label: 'Date & Time', value: 'DATE_TIME' },
  { label: 'Single Select', value: 'SINGLE_SELECT' },
  { label: 'Multi Select', value: 'MULTI_SELECT' },
  { label: 'Single Choice', value: 'SINGLE_CHOICE' },
  { label: 'Multiple Choice', value: 'MULTIPLE_CHOICE' },
  { label: 'File Upload', value: 'FILE_UPLOAD' },
  { label: 'Image Upload', value: 'IMAGE_UPLOAD' },
  { label: 'Signature', value: 'SIGNATURE' },
  { label: 'Rating', value: 'RATING' },
  { label: 'Yes/No Toggle', value: 'YES_NO_TOGGLE' },
  { label: 'Phone Number', value: 'PHONE_NUMBER' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'URL', value: 'URL' },
  { label: 'Calculated', value: 'CALCULATED' },
  { label: 'Address', value: 'ADDRESS' },
  { label: 'Counter', value: 'COUNTER' },
  { label: 'Opinion Scale', value: 'OPINION_SCALE' },
  { label: 'Score', value: 'SCORE' },
]

interface QuestionSettingsProps {
  activeQuestion: Question
}

const QuestionSettings = ({
  activeQuestion: rawQuestion,
}: QuestionSettingsProps) => {
  const activeQuestion = {
    ...rawQuestion,
    settings: {
      ...rawQuestion.settings,
      general: rawQuestion.settings?.general ?? {},
      logic: rawQuestion.settings?.logic ?? [],
      lookupSettings: rawQuestion.settings?.lookupSettings ?? {},
      specific: rawQuestion.settings?.specific ?? {},
      validation: rawQuestion.settings?.validation ?? {},
    },
  }
  const updateQuestion = useFormStore((state) => state.updateQuestion)
  const panels = useFormStore((state) => state.panels)
  const allQuestions = (panels ?? []).flatMap((p) => p.fields ?? [])

  const currentRepoId = activeQuestion.settings.specific.repositoryId || ''

  const { data: repositories = [] } = useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const res = await getRepositorys()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: repositoryFields = [] } = useQuery({
    enabled: !!currentRepoId,
    queryKey: ['repositoryItemFilterFields', currentRepoId],
    queryFn: async () => {
      if (!currentRepoId) return []
      const res = await getRepositoryItemFilterFields(currentRepoId)
      return res.data?.fields || []
    },
  })

  const [openSetup, setOpenSetup] = useState(true)
  const [openValidation, setOpenValidation] = useState(false)
  const [openAppearance, setOpenAppearance] = useState(false)
  const [openAdvanced, setOpenAdvanced] = useState(false)
  const [openLogic, setOpenLogic] = useState(false)
  const [openLookup, setOpenLookup] = useState(false)
  const [openSpecific, setOpenSpecific] = useState(false)

  const [localLabel, setLocalLabel] = useState(activeQuestion.label || '')
  const [localDesc, setLocalDesc] = useState(
    activeQuestion.settings.general.description || '',
  )
  const [localPlaceholder, setLocalPlaceholder] = useState(
    activeQuestion.settings.general.placeholder || '',
  )
  const [localDefaultValue, setLocalDefaultValue] = useState(
    activeQuestion.settings.specific.defaultValue || '',
  )
  const [idCopied, setIdCopied] = useState(false)
  const [showMoreSetup, setShowMoreSetup] = useState(false)
  const [showSelectAdvanced, setShowSelectAdvanced] = useState(false)
  const [showTableAdvanced, setShowTableAdvanced] = useState(false)

  useEffect(() => {
    setLocalLabel(activeQuestion.label || '')
    setLocalDesc(activeQuestion.settings.general.description || '')
    setLocalPlaceholder(activeQuestion.settings.general.placeholder || '')
    setLocalDefaultValue(activeQuestion.settings.specific.defaultValue || '')
    if (rawQuestion.type === 'CALCULATED') setOpenSpecific(true)
  }, [activeQuestion.id])

  const updateNested = (
    path: 'general' | 'validation' | 'specific' | 'lookupSettings',
    updates: any,
  ) => {
    updateQuestion(activeQuestion.id, (q: Question) => ({
      ...q,
      settings: {
        ...q.settings,
        [path]: { ...(q.settings[path] as any), ...updates },
      },
    }))
  }

  const logicRules = activeQuestion.settings.logic || []
  const logicFieldOptions = allQuestions
    .filter((q) => q?.id && q.id !== activeQuestion.id)
    .map((q) => ({ id: q.id, name: q.label || 'Untitled Field' }))

  const nonFillableFieldTypes = [
    'FILE_UPLOAD',
    'IMAGE_UPLOAD',
    'DIVIDER',
    'LABEL',
    'HEADING',
    'TEXT_BUILDER',
  ]
  const assignOtherControlsOptions = allQuestions
    .filter(
      (q) =>
        q?.id &&
        q.id !== activeQuestion.id &&
        !nonFillableFieldTypes.includes(q.type),
    )
    .map((q) => ({ id: q.id, name: q.label || 'Untitled Field' }))

  const setLogicRules = (rules: LogicRule[]) => {
    updateQuestion(activeQuestion.id, (q: Question) => ({
      ...q,
      settings: { ...q.settings, logic: rules },
    }))
  }

  const addLogicRule = () => {
    const newRule: LogicRule = {
      action: 'SHOW',
      condition: 'IS',
      fieldId: logicFieldOptions[0]?.id || '',
      id: generateId(),
      value: '',
    }
    setLogicRules([...logicRules, newRule])
  }

  const updateLogicRule = (ruleId: string, updates: Partial<LogicRule>) => {
    setLogicRules(
      logicRules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    )
  }

  const removeLogicRule = (ruleId: string) => {
    setLogicRules(logicRules.filter((r) => r.id !== ruleId))
  }

  const logicConditionOptions = [
    { id: 'IS', name: 'is' },
    { id: 'IS_NOT', name: 'is not' },
    { id: 'CONTAINS', name: 'contains' },
    { id: 'NOT_CONTAINS', name: 'does not contain' },
    { id: 'GT', name: 'is greater than' },
    { id: 'LT', name: 'is less than' },
    { id: 'EMPTY', name: 'is empty' },
    { id: 'NOT_EMPTY', name: 'is not empty' },
  ]

  const logicActionOptions = [
    { id: 'SHOW', name: 'Show' },
    { id: 'HIDE', name: 'Hide' },
  ]

  const isShortText = activeQuestion.type === 'SHORT_TEXT'
  const isLongText = activeQuestion.type === 'LONG_TEXT'
  const isNumber =
    activeQuestion.type === 'NUMBER' || activeQuestion.type === 'COUNTER'
  const isCounter = activeQuestion.type === 'COUNTER'
  const isCurrency = activeQuestion.type === 'CURRENCY_AMOUNT'
  const isCalculated = activeQuestion.type === 'CALCULATED'
  const isCountryCode = activeQuestion.type === 'COUNTRY_CODE'
  const isDivider = activeQuestion.type === 'DIVIDER'
  const isPassword = activeQuestion.type === 'PASSWORD'
  const isFileUpload =
    activeQuestion.type === 'FILE_UPLOAD' ||
    activeQuestion.type === 'IMAGE_UPLOAD'
  const isTextBuilder = activeQuestion.type === 'TEXT_BUILDER'
  const isTable =
    activeQuestion.type === 'TABLE' || activeQuestion.type === 'DYNAMIC_TABLE'
  const isRating = activeQuestion.type === 'RATING'
  const isOpinionScale = activeQuestion.type === 'OPINION_SCALE'
  const isSignature = activeQuestion.type === 'SIGNATURE'
  const isMatrix = activeQuestion.type === 'MATRIX'
  const isYesNoToggle = activeQuestion.type === 'YES_NO_TOGGLE'
  const isAddress = activeQuestion.type === 'ADDRESS'
  const isFIB = activeQuestion.type === 'FILL_IN_THE_BLANKS'
  const isFullName = activeQuestion.type === 'FULL_NAME'
  const isDate = activeQuestion.type === 'DATE'
  const isTime = activeQuestion.type === 'TIME'
  const isDateTime = activeQuestion.type === 'DATE_TIME'
  const isSelect = [
    'SINGLE_SELECT',
    'MULTI_SELECT',
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'CURRENCY_AMOUNT',
  ].includes(activeQuestion.type)
  const isChoiceField = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(
    activeQuestion.type,
  )
  const isMulti = ['MULTI_SELECT', 'MULTIPLE_CHOICE'].includes(
    activeQuestion.type,
  )
  const isChoice = isChoiceField

  const optionsPerLineOptions = [
    { id: '0', name: 'Auto (Flex Wrap)' },
    { id: '1', name: 'Vertical (1 Column)' },
    { id: '2', name: '2 Columns' },
    { id: '3', name: '3 Columns' },
    { id: '4', name: '4 Columns' },
    { id: '6', name: '6 Columns' },
  ]

  const validationOptions = isLongText
    ? [
      { id: 'TEXT', name: 'Text (Allows any character)' },
      { id: 'ALPHA', name: 'Alpha (Letters only)' },
      { id: 'ALPHA_SPACES', name: 'Alpha Spaces (Letters & Spaces)' },
      { id: 'ALPHA_DASH', name: 'Alpha Dash (Alphanumeric, - , _)' },
      { id: 'ALPHA_NUMERIC', name: 'Alpha Numeric (Letters & Numbers)' },
    ]
    : isNumber
      ? [
        { id: 'INTEGER', name: 'Integer (Whole numbers)' },
        { id: 'DECIMAL', name: 'Decimal (Allows decimal points)' },
        { id: 'COMMAS', name: 'Commas (Format with commas)' },
        { id: 'BOTH', name: 'Both (Commas & Decimals)' },
      ]
      : [
        { id: 'TEXT', name: 'Text (Allows any character)' },
        { id: 'ALPHA', name: 'Alpha (Letters only)' },
        { id: 'ALPHA_SPACES', name: 'Alpha Spaces (Letters & Spaces)' },
        { id: 'ALPHA_DASH', name: 'Alpha Dash (Alphanumeric, - , _)' },
        { id: 'ALPHA_NUMERIC', name: 'Alpha Numeric (Letters & Numbers)' },
        { id: 'EMAIL', name: 'Email (Valid email format)' },
        { id: 'WEB', name: 'Web (Valid URL format)' },
      ]

  const visibilityOptions = [
    { id: 'NORMAL', name: 'Normal (Editable)' },
    { id: 'READ_ONLY', name: 'Read Only (Visible but locked)' },
    { id: 'HIDDEN', name: 'Disable (Hidden from UI)' },
  ]

  const sizeOptions = [
    { id: 'col-4', name: 'Small (33%)' },
    { id: 'col-6', name: 'Medium (50%)' },
    { id: 'col-12', name: 'Large (100%)' },
  ]

  const rangeOptions = [
    { id: 'CUSTOM', name: 'Custom (Manual Range)' },
    { id: 'MIN_FIXED_MAX_FLEX', name: 'Min Fixed, Max Flexible' },
    { id: 'MIN_FLEX_MAX_FIXED', name: 'Min Flexible, Max Fixed' },
  ]

  const dateDefaultOptions = [
    { id: 'CUSTOM', name: 'Fixed Date (Calendar)' },
    { id: 'TODAY', name: 'Current / Request Date' },
    { id: 'PARENT_FIELD', name: 'Inherit from Parent Field' },
  ]

  const dateLimitOptions = [
    { id: 'NONE', name: 'No Restrictions' },
    { id: 'MIN_DATE', name: 'Minimum Date (Earliest)' },
    { id: 'MAX_DATE', name: 'Maximum Date (Latest)' },
    { id: 'RANGE', name: 'Fixed Date Range' },
  ]

  const timeDefaultOptions = [
    { id: 'CUSTOM', name: 'Fixed Time (Clock)' },
    { id: 'NOW', name: 'Current / Request Time' },
    { id: 'NONE', name: 'None (Start Empty)' },
  ]

  const timeLimitOptions = [
    { id: 'NONE', name: 'No Restrictions' },
    { id: 'MIN_TIME', name: 'Minimum Time (Current)' },
    { id: 'MAX_TIME', name: 'Maximum Time (Current)' },
    { id: 'RANGE', name: 'Select Time Range' },
  ]

  const timeFormatOptions = [
    { label: '12 Hour', value: '12' },
    { label: '24 Hour', value: '24' },
  ]

  const currencyOptionsTypeOptions = [
    { id: 'ALL', name: 'All Currencies (Global List)' },
    { id: 'SPECIFIC', name: 'Specific Currencies (Restricted)' },
  ]

  const optionsTypeOptions = [
    { id: 'CUSTOM', name: 'Custom List (Manual)' },
    { id: 'MASTER_TABLE', name: 'Master Table (Dynamic)' },
    { id: 'REPOSITORY', name: 'Data Repository' },
    { id: 'PREDEFINED', name: 'Predefined Lists' },
  ]

  const separatorOptions = [
    { label: 'Newline', value: 'NEWLINE' },
    { label: 'Comma', value: 'COMMA' },
  ]

  const selectDefaultValueOptions = [
    { id: 'STATIC', name: 'Fixed Option' },
    { id: 'DYNAMIC', name: 'Dynamic (e.g. Current User)' },
    { id: 'NONE', name: 'None' },
  ]

  return (
    <div className='custom-scrollbar content-scrollbar animate-in fade-in flex-1 space-y-1 overflow-y-auto bg-white p-4 duration-500'>
      {/* 1. GENERAL SETUP SECTION */}
      <SettingsSection
        icon='lucide:settings-2'
        isOpen={openSetup}
        title='Field Setup'
        variant='premium'
        onToggle={() => setOpenSetup(!openSetup)}
      >
        <div className='animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300'>
          {/* Primary controls - the ones edited most often */}
          <InputText
            label='Field Label'
            placeholder='e.g. What is your name?'
            value={localLabel}
            onBlur={() =>
              updateQuestion(activeQuestion.id, { label: localLabel })
            }
            onChange={(val: string) => setLocalLabel(val)}
          />

          <Tooltip label={activeQuestion.id} position='top' withArrow>
            <button
              className='flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] font-medium text-gray-6 transition-colors hover:bg-gray-1 hover:text-gray-9'
              type='button'
              onClick={() => {
                navigator.clipboard?.writeText(activeQuestion.id)
                setIdCopied(true)
                setTimeout(() => setIdCopied(false), 1500)
              }}
            >
              <Icon
                height={11}
                name={idCopied ? 'lucide:check' : 'lucide:hash'}
                width={11}
              />
              {idCopied ? 'Copied' : 'Copy field ID'}
            </button>
          </Tooltip>

          {!isCalculated && (
            <InputText
              label='Placeholder'
              value={localPlaceholder}
              placeholder={
                isNumber
                  ? '0'
                  : isDate
                    ? 'YYYY-MM-DD'
                    : isTime
                      ? 'HH:MM'
                      : isDateTime
                        ? 'YYYY-MM-DD HH:MM'
                        : 'e.g. Type here...'
              }
              onBlur={() =>
                updateNested('general', { placeholder: localPlaceholder })
              }
              onChange={(val: string) => setLocalPlaceholder(val)}
            />
          )}

          {!isNumber &&
            !isDate &&
            !isDateTime &&
            !isSelect &&
            !isCalculated && (
              <InputText
                label='Default Value'
                placeholder='No default'
                value={localDefaultValue}
                onBlur={() =>
                  updateNested('specific', { defaultValue: localDefaultValue })
                }
                onChange={(val: string) => setLocalDefaultValue(val)}
              />
            )}

          <div>
            <label className='mb-2 block text-13 font-medium text-gray-11'>
              Field Width
            </label>
            <InputSelect
              placeholder='Select width'
              options={
                isLongText ||
                  isNumber ||
                  isDate ||
                  isTime ||
                  isDateTime ||
                  isSelect
                  ? sizeOptions
                  : [
                    { id: 'col-12', name: '100% Full Width' },
                    { id: 'col-6', name: '50% Half Width' },
                    { id: 'col-4', name: '33% Column' },
                  ]
              }
              value={
                (isLongText ||
                  isNumber ||
                  isDate ||
                  isTime ||
                  isDateTime ||
                  isSelect
                  ? sizeOptions
                  : [
                    { id: 'col-12', name: '100% Full Width' },
                    { id: 'col-6', name: '50% Half Width' },
                    { id: 'col-4', name: '33% Column' },
                  ]
                ).find(
                  (o) => o.id === activeQuestion.settings.general.size,
                ) || { id: 'col-12', name: '100% Full Width' }
              }
              onChange={(val) =>
                val && updateNested('general', { size: val.id })
              }
            />
          </div>

          {/* Secondary controls - collapsed by default */}
          <button
            className='flex w-full items-center justify-between rounded-lg py-1 text-left transition-colors hover:text-accent-primary'
            type='button'
            onClick={() => setShowMoreSetup(!showMoreSetup)}
          >
            <span className='text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
              More Options
            </span>
            <Icon
              height={14}
              name='lucide:chevron-down'
              width={14}
              className={cn(
                'text-gray-5 transition-transform duration-200',
                showMoreSetup && 'rotate-180',
              )}
            />
          </button>

          {showMoreSetup && (
            <div className='animate-in fade-in slide-in-from-top-1 space-y-4 duration-200'>
              {(isLongText ||
                isNumber ||
                isDate ||
                isTime ||
                isDateTime ||
                isSelect) && (
                  <InputText
                    label='Display Label (Internal)'
                    placeholder='Alternative visual name'
                    value={activeQuestion.displayLabel || ''}
                    onChange={(val: string) =>
                      updateQuestion(activeQuestion.id, { displayLabel: val })
                    }
                  />
                )}

              <div className='bg-gray-50/50 flex items-center justify-between rounded-lg border border-gray-1 px-3 py-2'>
                <div className='text-xs font-semibold text-gray-7'>
                  Hide Label
                </div>
                <InputSwitch
                  checked={activeQuestion.settings.general.hideLabel || false}
                  onChange={(checked: boolean) =>
                    updateNested('general', { hideLabel: checked })
                  }
                />
              </div>

              <div>
                <label className='mb-2 block text-13 font-medium text-gray-11'>
                  Help Text / Description
                </label>
                <div className='relative'>
                  <textarea
                    className='min-h-[80px] w-full resize-none rounded-md border border-gray-1 bg-white px-3 py-2 text-13 font-medium text-gray-12 transition-all outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
                    placeholder='Add extra instructions...'
                    value={localDesc}
                    onBlur={() =>
                      updateNested('general', { description: localDesc })
                    }
                    onChange={(e) => setLocalDesc(e.target.value)}
                  />
                </div>
              </div>

              {(isLongText || isNumber || isDate || isTime || isDateTime) && (
                <InputText
                  label='Tooltip (Hover Text)'
                  placeholder='Explanation on hover'
                  value={activeQuestion.settings.general.tooltip || ''}
                  onChange={(val: string) =>
                    updateNested('general', { tooltip: val })
                  }
                />
              )}

              {(isShortText ||
                isLongText ||
                isNumber ||
                isDate ||
                isTime ||
                isDateTime ||
                isSelect) && (
                  <div className='bg-gray-50/50 flex items-center justify-between rounded-lg border border-gray-1 px-3 py-2'>
                    <div>
                      <div className='text-xs font-bold text-gray-13'>
                        Answer Status Indicator
                      </div>
                      <div className='text-[10px] text-gray-9'>
                        Track progress for this field
                      </div>
                    </div>
                    <InputSwitch
                      checked={
                        activeQuestion.settings.specific.showStatusIndicator ||
                        false
                      }
                      onChange={(checked) =>
                        updateNested('specific', {
                          showStatusIndicator: checked,
                        })
                      }
                    />
                  </div>
                )}

              <Divider className='border-gray-1' />

              {(isLongText ||
                isNumber ||
                isDate ||
                isTime ||
                isDateTime ||
                isSelect) && (
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Visibility State
                    </label>
                    <InputSelect
                      options={visibilityOptions}
                      placeholder='Normal, Read Only...'
                      value={
                        visibilityOptions.find(
                          (o) =>
                            o.id === activeQuestion.settings.general.visibility,
                        ) || visibilityOptions[0]
                      }
                      onChange={(val) =>
                        val && updateNested('general', { visibility: val.id })
                      }
                    />
                  </div>
                )}

              {!isLongText &&
                !isNumber &&
                !isDate &&
                !isTime &&
                !isDateTime &&
                !isSelect && (
                  <div className='grid grid-cols-2 gap-2'>
                    <div className='bg-gray-50/30 flex flex-col gap-2 rounded-xl border border-gray-1 p-3'>
                      <div className='text-xs font-bold text-gray-13'>
                        Read Only
                      </div>
                      <InputSwitch
                        checked={
                          activeQuestion.settings.general.readOnly || false
                        }
                        onChange={(checked) =>
                          updateNested('general', { readOnly: checked })
                        }
                      />
                    </div>
                    <div className='bg-gray-50/30 flex flex-col gap-2 rounded-xl border border-gray-1 p-3'>
                      <div className='text-xs font-bold text-gray-13'>
                        Hidden Field
                      </div>
                      <InputSwitch
                        checked={
                          activeQuestion.settings.general.hidden || false
                        }
                        onChange={(checked) =>
                          updateNested('general', { hidden: checked })
                        }
                      />
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </SettingsSection>

      {/* 2. SPECIFIC SETTINGS */}
      {(isNumber ||
        isDate ||
        isTime ||
        isDateTime ||
        isSelect ||
        isCurrency ||
        isCalculated ||
        isCountryCode ||
        isTextBuilder ||
        isTable ||
        isRating ||
        isOpinionScale ||
        isSignature ||
        isMatrix ||
        isYesNoToggle ||
        isAddress ||
        isFIB ||
        isFullName ||
        isFileUpload ||
        isPassword) && (
          <SettingsSection
            isOpen={openSpecific}
            variant='premium'
            icon={
              isDate
                ? 'lucide:calendar'
                : isTime
                  ? 'lucide:clock'
                  : isDateTime
                    ? 'lucide:calendar-clock'
                    : isSelect
                      ? 'lucide:list-todo'
                      : isCurrency
                        ? 'lucide:banknote'
                        : isCalculated
                          ? 'lucide:calculator'
                          : isCountryCode
                            ? 'lucide:globe'
                            : 'lucide:sliders'
            }
            title={
              isDate
                ? 'Date Config'
                : isTime
                  ? 'Time Config'
                  : isDateTime
                    ? 'Date & Time Config'
                    : isSelect && !isCurrency
                      ? 'Select Config'
                      : isCurrency
                        ? 'Currency Config'
                        : isCalculated
                          ? 'Formula Builder'
                          : isCountryCode
                            ? 'Country Config'
                            : 'Field Configuration'
            }
            onToggle={() => setOpenSpecific(!openSpecific)}
          >
            <div className='animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300'>
              {isCountryCode && (
                <div className='space-y-4'>
                  <InputText
                    label='Default Dialing Prefix'
                    placeholder='e.g. +971'
                    value={
                      activeQuestion.settings.specific.defaultCountryCode || ''
                    }
                    onChange={(val: string) =>
                      updateNested('specific', { defaultCountryCode: val })
                    }
                  />
                  <div className='flex items-center justify-between px-1 py-2'>
                    <div>
                      <div className='text-xs font-bold text-gray-13'>
                        Enable Search
                      </div>
                      <div className='text-[10px] text-gray-6'>
                        Allow users to search by name/code
                      </div>
                    </div>
                    <InputSwitch
                      checked={
                        activeQuestion.settings.specific
                          .countryCodeSearchEnabled ?? true
                      }
                      onChange={(checked) =>
                        updateNested('specific', {
                          countryCodeSearchEnabled: checked,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {isCalculated && (
                <FormulaBuilder
                  activeQuestion={activeQuestion}
                  fields={allQuestions}
                  onChange={(formulaTokens) =>
                    updateNested('specific', { formulaTokens })
                  }
                />
              )}

              {isCurrency && (
                <div className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Currency Options Type
                    </label>
                    <InputSelect
                      options={currencyOptionsTypeOptions}
                      placeholder='Select mode'
                      value={
                        currencyOptionsTypeOptions.find(
                          (o) =>
                            o.id ===
                            activeQuestion.settings.specific.currencyOptionsType,
                        ) || currencyOptionsTypeOptions[0]
                      }
                      onChange={(val) =>
                        val &&
                        updateNested('specific', { currencyOptionsType: val.id })
                      }
                    />
                  </div>

                  {activeQuestion.settings.specific.currencyOptionsType ===
                    'SPECIFIC' && (
                      <div className='animate-in fade-in slide-in-from-top-1 space-y-2'>
                        <label className='block text-13 font-medium text-gray-11'>
                          Restricted List
                        </label>
                        <InputText
                          placeholder='e.g. USD, EUR, GBP (Comma separated)'
                          value={(
                            activeQuestion.settings.specific.specificCurrencies ||
                            []
                          ).join(', ')}
                          onChange={(val: string) =>
                            updateNested('specific', {
                              specificCurrencies: val
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                    )}

                  <Divider className='border-dashed border-gray-1' />

                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Currency Parent Field
                    </label>
                    <InputSelect
                      placeholder='Inherit currency from...'
                      value={null}
                      options={[
                        { id: 'none', name: 'No Link' },
                        ...panels
                          .flatMap((p: any) => p.fields)
                          .filter(
                            (f: any) =>
                              f.id !== activeQuestion.id &&
                              f.type === 'CURRENCY_AMOUNT',
                          )
                          .map((f: any) => ({ id: f.id, name: f.label })),
                      ]}
                      onChange={(val) =>
                        val &&
                        updateNested('specific', {
                          currencyParentFieldId: val.id,
                        })
                      }
                    />
                    <div className='mt-1 text-[10px] text-gray-6 italic'>
                      Automatically match units with the parent field.
                    </div>
                  </div>
                </div>
              )}

              {isSelect && !isCurrency && (
                <div className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Options Source
                    </label>
                    <InputSelect
                      options={optionsTypeOptions}
                      placeholder='Select source type'
                      value={
                        optionsTypeOptions.find(
                          (o) =>
                            o.id === activeQuestion.settings.specific.optionsType,
                        ) || optionsTypeOptions[0]
                      }
                      onChange={(val) =>
                        val && updateNested('specific', { optionsType: val.id })
                      }
                    />
                  </div>

                  {(activeQuestion.settings.specific.optionsType ===
                    'MASTER_TABLE' ||
                    activeQuestion.settings.specific.optionsType ===
                    'PREDEFINED') && (
                      <div className='bg-amber-500/5 border-amber-500/20 text-amber-700 rounded-lg border p-3 text-xs font-medium'>
                        Master Table and Predefined sources require a backend
                        endpoint — coming soon.
                      </div>
                    )}

                  {activeQuestion.settings.specific.optionsType ===
                    'REPOSITORY' && (
                      <div className='bg-primary-subtle/5 border-primary-subtle/10 space-y-3 rounded-lg border p-3'>
                        <label className='block text-[11px] font-bold text-primary-9 uppercase'>
                          Repository Source Builder
                        </label>
                        <div className='space-y-3'>
                          <div>
                            <label className='mb-1 block text-xs font-medium text-gray-11'>
                              Repository
                            </label>
                            <InputSelect
                              placeholder='Select Repository'
                              options={repositories.map((r: any) => ({
                                id: r.id,
                                name: r.name || r.title || r.id,
                              }))}
                              value={
                                repositories
                                  .map((r: any) => ({
                                    id: r.id,
                                    name: r.name || r.title || r.id,
                                  }))
                                  .find(
                                    (r: any) =>
                                      r.id ===
                                      activeQuestion.settings.specific.repositoryId,
                                  ) || null
                              }
                              onChange={(val) => {
                                updateNested('specific', {
                                  repositoryField: '',
                                  repositoryId: val?.id || '',
                                })
                              }}
                            />
                          </div>
                          <div>
                            <label className='mb-1 block text-xs font-medium text-gray-11'>
                              Column / Field
                            </label>
                            <InputSelect
                              placeholder='Select Column'
                              options={repositoryFields.map((f: any) => ({
                                id: f.sqlColumnName || f.name,
                                name: f.name || f.sqlColumnName,
                              }))}
                              value={
                                repositoryFields
                                  .map((f: any) => ({
                                    id: f.sqlColumnName || f.name,
                                    name: f.name || f.sqlColumnName,
                                  }))
                                  .find(
                                    (f: any) =>
                                      f.id ===
                                      activeQuestion.settings.specific
                                        .repositoryField,
                                  ) || null
                              }
                              onChange={(val) => {
                                updateNested('specific', {
                                  repositoryField: val?.id || '',
                                })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  {(activeQuestion.settings.specific.optionsType === 'CUSTOM' ||
                    !activeQuestion.settings.specific.optionsType) && (
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <label className='block text-13 font-medium text-gray-11'>
                            Manual Options entry
                          </label>
                          <SegmentedControl
                            data={separatorOptions}
                            size='xs'
                            value={
                              activeQuestion.settings.specific
                                .separateOptionsUsing || 'NEWLINE'
                            }
                            onChange={(v) =>
                              updateNested('specific', { separateOptionsUsing: v })
                            }
                          />
                        </div>
                        <textarea
                          className='min-h-[100px] w-full resize-none rounded-md border border-gray-1 bg-white px-3 py-2 text-13 font-medium text-gray-12 transition-all outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
                          placeholder={
                            activeQuestion.settings.specific
                              .separateOptionsUsing === 'COMMA'
                              ? 'Option 1, Option 2, Option 3...'
                              : 'Option 1\nOption 2\nOption 3...'
                          }
                          value={
                            activeQuestion.settings.specific.customOptions || ''
                          }
                          onChange={(e) =>
                            updateNested('specific', {
                              customOptions: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                  <button
                    className='flex w-full items-center justify-between rounded-lg py-1 text-left transition-colors hover:text-accent-primary'
                    type='button'
                    onClick={() => setShowSelectAdvanced(!showSelectAdvanced)}
                  >
                    <span className='text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
                      Advanced Options
                    </span>
                    <Icon
                      height={14}
                      name='lucide:chevron-down'
                      width={14}
                      className={cn(
                        'text-gray-5 transition-transform duration-200',
                        showSelectAdvanced && 'rotate-180',
                      )}
                    />
                  </button>

                  {showSelectAdvanced && (
                    <>
                      {isMulti && (
                        <div className='bg-gray-50/50 space-y-4 rounded-xl border border-gray-1 p-3'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <div className='text-xs font-bold text-gray-8'>
                                Bulk Actions
                              </div>
                              <div className='text-[10px] text-gray-6'>
                                Select All / Unselect All
                              </div>
                            </div>
                            <InputSwitch
                              checked={
                                activeQuestion.settings.specific
                                  .bulkActionsEnabled || false
                              }
                              onChange={(checked) =>
                                updateNested('specific', {
                                  bulkActionsEnabled: checked,
                                })
                              }
                            />
                          </div>

                          {['MULTI_SELECT', 'MULTIPLE_CHOICE'].includes(
                            activeQuestion.type,
                          ) &&
                            (activeQuestion.settings.specific.optionsType ===
                              'CUSTOM' ||
                              !activeQuestion.settings.specific.optionsType) && (
                              <>
                                <Divider className='border-dashed border-gray-1' />

                                <div className='space-y-3'>
                                  <div className='flex items-center justify-between'>
                                    <div>
                                      <div className='text-xs font-bold text-gray-13'>
                                        Allow Custom Entries
                                      </div>
                                      <div className='text-[10px] text-gray-6'>
                                        Users can type in new options
                                      </div>
                                    </div>
                                    <InputSwitch
                                      checked={
                                        activeQuestion.settings.specific
                                          .allowCustomEntries || false
                                      }
                                      onChange={(checked) =>
                                        updateNested('specific', {
                                          allowCustomEntries: checked,
                                        })
                                      }
                                    />
                                  </div>

                                  {activeQuestion.settings.specific
                                    .allowCustomEntries && (
                                      <div className='animate-in fade-in slide-in-from-top-1 space-y-2 duration-200'>
                                        <label className='block text-[10px] font-bold tracking-wider text-gray-8 uppercase'>
                                          Entry Validation
                                        </label>
                                        <InputSelect
                                          options={validationOptions}
                                          placeholder='Format for custom entry'
                                          value={
                                            validationOptions.find(
                                              (o) =>
                                                o.id ===
                                                activeQuestion.settings.validation
                                                  .contentRule,
                                            ) || validationOptions[0]
                                          }
                                          onChange={(val) =>
                                            val &&
                                            updateNested('validation', {
                                              contentRule: val.id,
                                            })
                                          }
                                        />
                                      </div>
                                    )}
                                </div>
                              </>
                            )}
                        </div>
                      )}

                      {isChoice && (
                        <div className='bg-secondary-subtle/10 border-secondary-subtle/20 space-y-4 rounded-xl border p-3'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <div className='text-xs font-bold text-gray-13'>
                                Show Options Wrapper
                              </div>
                              <div className='text-[10px] text-gray-6'>
                                Add border and padding to group
                              </div>
                            </div>
                            <InputSwitch
                              checked={
                                activeQuestion.settings.specific
                                  .showOptionsWrapper || false
                              }
                              onChange={(checked) =>
                                updateNested('specific', {
                                  showOptionsWrapper: checked,
                                })
                              }
                            />
                          </div>

                          {activeQuestion.type === 'SINGLE_CHOICE' && (
                            <>
                              <Divider className='border-dashed border-gray-1' />
                              <div className='flex items-center justify-between'>
                                <div>
                                  <div className='text-xs font-bold text-gray-13'>
                                    QR Code Value Scan
                                  </div>
                                  <div className='text-[10px] text-gray-6'>
                                    Display barcode/QR scan button beside label
                                  </div>
                                </div>
                                <InputSwitch
                                  checked={
                                    activeQuestion.settings.specific
                                      .qrCodeEnabled || false
                                  }
                                  onChange={(checked) =>
                                    updateNested('specific', {
                                      qrCodeEnabled: checked,
                                    })
                                  }
                                />
                              </div>
                            </>
                          )}

                          <Divider className='border-dashed border-gray-1' />

                          <div className='space-y-2'>
                            <label className='block text-13 font-medium text-gray-11'>
                              Options Layout
                            </label>
                            <InputSelect
                              options={optionsPerLineOptions}
                              placeholder='Items per row'
                              value={
                                optionsPerLineOptions.find(
                                  (o) =>
                                    Number(o.id) ===
                                    (activeQuestion.settings.specific
                                      .optionsPerLine ?? 3),
                                ) || optionsPerLineOptions[3]
                              }
                              onChange={(val) =>
                                val &&
                                updateNested('specific', {
                                  optionsPerLine: Number(val.id),
                                })
                              }
                            />
                            <div className='text-[10px] text-gray-6 italic'>
                              Control layout grid (0 = Auto Flex, 1 = Vertical
                              List).
                            </div>
                          </div>
                        </div>
                      )}

                      <Divider className='border-dashed border-gray-1' />

                      <div>
                        <label className='mb-2 block text-13 font-medium text-gray-11'>
                          Cascading Filter (Parent)
                        </label>
                        <InputSelect
                          placeholder='Filter by another field'
                          value={null}
                          options={[
                            { id: 'none', name: 'No Filter' },
                            ...panels
                              .flatMap((p: any) => p.fields)
                              .filter(
                                (f: any) =>
                                  f.id !== activeQuestion.id &&
                                  ['SINGLE_SELECT', 'SINGLE_CHOICE'].includes(
                                    f.type,
                                  ),
                              )
                              .map((f: any) => ({ id: f.id, name: f.label })),
                          ]}
                          onChange={(val) =>
                            val &&
                            updateNested('specific', { parentFieldId: val.id })
                          }
                        />
                        <div className='mt-1 text-[10px] text-gray-6 italic'>
                          Options will change based on parent selection.
                        </div>
                      </div>

                      <div>
                        <label className='mb-2 block text-13 font-medium text-gray-11'>
                          Default Selection Mode
                        </label>
                        <InputSelect
                          options={selectDefaultValueOptions}
                          placeholder='Initial value mode'
                          value={
                            selectDefaultValueOptions.find(
                              (o) =>
                                o.id ===
                                activeQuestion.settings.specific.defaultValueType,
                            ) || selectDefaultValueOptions[2]
                          }
                          onChange={(val) =>
                            val &&
                            updateNested('specific', { defaultValueType: val.id })
                          }
                        />
                      </div>

                      {activeQuestion.settings.specific.defaultValueType ===
                        'STATIC' && (
                          <div className='animate-in fade-in slide-in-from-top-1 space-y-3 duration-200'>
                            {isCurrency ? (
                              <div className='grid grid-cols-2 gap-2'>
                                <InputText
                                  label='Default Currency'
                                  placeholder='USD'
                                  value={
                                    (
                                      activeQuestion.settings.specific
                                        .defaultValue as any
                                    )?.currency || ''
                                  }
                                  onChange={(val: string) =>
                                    updateNested('specific', {
                                      defaultValue: {
                                        ...((activeQuestion.settings.specific
                                          .defaultValue as any) || {}),
                                        currency: val.toUpperCase(),
                                      },
                                    })
                                  }
                                />
                                <NumberInput
                                  label='Default Amount'
                                  placeholder='0.00'
                                  value={
                                    (
                                      activeQuestion.settings.specific
                                        .defaultValue as any
                                    )?.amount || undefined
                                  }
                                  onChange={(val) =>
                                    updateNested('specific', {
                                      defaultValue: {
                                        ...((activeQuestion.settings.specific
                                          .defaultValue as any) || {}),
                                        amount: val,
                                      },
                                    })
                                  }
                                />
                              </div>
                            ) : (
                              <InputText
                                value={localDefaultValue}
                                label={
                                  isMulti
                                    ? 'Static Default Values (Comma separated)'
                                    : 'Static Default Value'
                                }
                                placeholder={
                                  isMulti ? 'Option A, Option B' : 'Option A'
                                }
                                onBlur={() =>
                                  updateNested('specific', {
                                    defaultValue: localDefaultValue,
                                  })
                                }
                                onChange={(val: string) =>
                                  setLocalDefaultValue(val)
                                }
                              />
                            )}
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}

              {isNumber && (
                <div className='space-y-4'>
                  <div className='bg-gray-50/50 space-y-3 rounded-xl border border-gray-1 p-3'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='text-xs font-bold text-gray-13'>
                          Enforce Integer
                        </div>
                        <div className='text-[10px] text-gray-6'>
                          Discard decimals
                        </div>
                      </div>
                      <InputSwitch
                        checked={
                          activeQuestion.settings.specific.isInteger ||
                          (isCounter ? true : false)
                        }
                        onChange={(checked) =>
                          updateNested('specific', { isInteger: checked })
                        }
                      />
                    </div>

                    {isCounter && (
                      <>
                        <Divider className='border-dashed border-gray-1' />
                        <div className='flex items-center justify-between'>
                          <div>
                            <div className='text-xs font-bold text-gray-13'>
                              Prevent Negative
                            </div>
                            <div className='text-[10px] text-gray-6'>
                              Safety check for 0
                            </div>
                          </div>
                          <InputSwitch
                            checked={
                              activeQuestion.settings.specific.preventNegative ||
                              true
                            }
                            onChange={(checked) =>
                              updateNested('specific', {
                                preventNegative: checked,
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className='bg-primary-subtle/10 border-primary-subtle/20 space-y-3 rounded-lg border p-3'>
                    <div className='flex items-center justify-between'>
                      <div className='text-xs font-bold text-primary-9'>
                        Auto-Generate Number
                      </div>
                      <InputSwitch
                        checked={
                          activeQuestion.settings.specific.autoGenerateValue
                            ?.enabled || false
                        }
                        onChange={(checked) =>
                          updateNested('specific', {
                            autoGenerateValue: {
                              ...(activeQuestion.settings.specific
                                .autoGenerateValue || { prefix: '', suffix: '' }),
                              enabled: checked,
                            },
                          })
                        }
                      />
                    </div>
                    {activeQuestion.settings.specific.autoGenerateValue
                      ?.enabled ? (
                      <div className='mt-2 grid grid-cols-2 gap-2'>
                        <InputText
                          label='Prefix'
                          placeholder='e.g. INV-'
                          value={
                            activeQuestion.settings.specific.autoGenerateValue
                              ?.prefix || ''
                          }
                          onChange={(v) =>
                            updateNested('specific', {
                              autoGenerateValue: {
                                ...activeQuestion.settings.specific
                                  .autoGenerateValue,
                                prefix: v,
                              },
                            })
                          }
                        />
                        <InputText
                          label='Suffix'
                          placeholder='e.g. -2024'
                          value={
                            activeQuestion.settings.specific.autoGenerateValue
                              ?.suffix || ''
                          }
                          onChange={(v) =>
                            updateNested('specific', {
                              autoGenerateValue: {
                                ...activeQuestion.settings.specific
                                  .autoGenerateValue,
                                suffix: v,
                              },
                            })
                          }
                        />
                      </div>
                    ) : (
                      <NumberInput
                        label='Default Value'
                        placeholder='Enter starting value'
                        size='xs'
                        value={
                          activeQuestion.settings.specific.customDefaultValue ||
                          undefined
                        }
                        onChange={(v) =>
                          updateNested('specific', { customDefaultValue: v })
                        }
                      />
                    )}
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <InputText
                      label='Prefix Label'
                      placeholder='e.g. $'
                      value={activeQuestion.settings.specific.prefixLabel || ''}
                      onChange={(val: string) =>
                        updateNested('specific', { prefixLabel: val })
                      }
                    />
                    <InputText
                      label='Suffix Label'
                      placeholder='e.g. kg'
                      value={activeQuestion.settings.specific.suffixLabel || ''}
                      onChange={(val: string) =>
                        updateNested('specific', { suffixLabel: val })
                      }
                    />
                  </div>
                </div>
              )}

              {(isDate || isDateTime) && (
                <div className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Default Value Mode
                    </label>
                    <InputSelect
                      options={dateDefaultOptions}
                      placeholder='Select mode'
                      value={
                        dateDefaultOptions.find(
                          (o) =>
                            o.id ===
                            activeQuestion.settings.specific.dateDefaultValueType,
                        ) || dateDefaultOptions[0]
                      }
                      onChange={(val) =>
                        val &&
                        updateNested('specific', { dateDefaultValueType: val.id })
                      }
                    />
                  </div>

                  {activeQuestion.settings.specific.dateDefaultValueType ===
                    'CUSTOM' && (
                      <div className='bg-gray-50 rounded-lg border border-gray-1 p-3'>
                        <label className='mb-2 block text-[11px] font-bold text-gray-8 uppercase'>
                          {isDateTime
                            ? 'Pick Fixed Date & Time'
                            : 'Pick Fixed Date'}
                        </label>
                        <input
                          className='w-full rounded border border-gray-1 bg-white px-2 py-1 text-sm outline-none focus:border-primary-8'
                          type={isDateTime ? 'datetime-local' : 'date'}
                          value={
                            activeQuestion.settings.specific.defaultValue || ''
                          }
                          onChange={(e) =>
                            updateNested('specific', {
                              defaultValue: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                  {activeQuestion.settings.specific.dateDefaultValueType ===
                    'PARENT_FIELD' && (
                      <div className='bg-primary-subtle/5 border-primary-subtle/10 space-y-3 rounded-lg border p-3'>
                        <label className='block text-[11px] font-bold text-primary-9 uppercase'>
                          Parent Date Link
                        </label>
                        <InputSelect
                          placeholder='Select source field'
                          value={null}
                          options={[
                            { id: '1', name: 'Field: Request Date' },
                            { id: '2', name: 'Field: Submission Date' },
                          ]}
                          onChange={() => { }}
                        />
                        <div className='flex items-center gap-2'>
                          <NumberInput
                            className='flex-1'
                            label='Days Offset'
                            placeholder='0'
                            size='xs'
                            value={
                              activeQuestion.settings.specific.parentDateOffset || 0
                            }
                            onChange={(v) =>
                              updateNested('specific', { parentDateOffset: v })
                            }
                          />
                          <div className='mt-5 text-xs text-gray-6 italic'>
                            (+ For Future, - For Past)
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {isTime && (
                <div className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Default Value Mode
                    </label>
                    <InputSelect
                      options={timeDefaultOptions}
                      placeholder='Select mode'
                      value={
                        timeDefaultOptions.find(
                          (o) =>
                            o.id ===
                            activeQuestion.settings.specific.timeDefaultValueType,
                        ) || timeDefaultOptions[0]
                      }
                      onChange={(val) =>
                        val &&
                        updateNested('specific', { timeDefaultValueType: val.id })
                      }
                    />
                  </div>

                  {activeQuestion.settings.specific.timeDefaultValueType ===
                    'CUSTOM' && (
                      <div className='bg-gray-50 rounded-lg border border-gray-1 p-3'>
                        <label className='mb-2 block text-[11px] font-bold text-gray-8 uppercase'>
                          Pick Fixed Time
                        </label>
                        <input
                          className='w-full rounded border border-gray-1 bg-white px-2 py-1 text-sm outline-none focus:border-primary-8'
                          type='time'
                          value={
                            activeQuestion.settings.specific.defaultValue || ''
                          }
                          onChange={(e) =>
                            updateNested('specific', {
                              defaultValue: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                </div>
              )}

              {isFileUpload && (
                <div className='space-y-4'>
                  <InputSwitch
                    checked={activeQuestion.settings.specific.allowMultipleFiles}
                    label='Allow Multiple Files'
                    onChange={(v) =>
                      updateNested('specific', { allowMultipleFiles: v })
                    }
                  />
                  <InputSwitch
                    label='Enable QR Upload'
                    checked={
                      activeQuestion.settings.specific.qrCodeEnabled !== false
                    }
                    onChange={(v) =>
                      updateNested('specific', { qrCodeEnabled: v })
                    }
                  />
                  <InputSwitch
                    checked={activeQuestion.settings.specific.fileInStageOnly}
                    label='File in Stage Only'
                    onChange={(v) =>
                      updateNested('specific', { fileInStageOnly: v })
                    }
                  />
                </div>
              )}

              {isTextBuilder && (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Default Content
                    </label>
                    <div className='overflow-hidden rounded-lg border bg-white'>
                      <div className='bg-gray-50 flex items-center gap-1 border-b border-gray-1 p-1'>
                        <Icon
                          className='rounded p-1 text-gray-4 hover:bg-white'
                          height={14}
                          name='lucide:bold'
                          width={14}
                        />
                        <Icon
                          className='rounded p-1 text-gray-4 hover:bg-white'
                          height={14}
                          name='lucide:italic'
                          width={14}
                        />
                        <div className='mx-1 h-3 w-px bg-gray-2' />
                        <Icon
                          className='rounded p-1 text-gray-4 hover:bg-white'
                          height={14}
                          name='lucide:list'
                          width={14}
                        />
                        <div className='bg-blue-50 text-blue-700 hover:bg-blue-100 ml-auto flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-colors'>
                          <Icon height={10} name='lucide:plus' width={10} />
                          Insert Field
                        </div>
                      </div>
                      <textarea
                        className='min-h-[120px] w-full resize-none p-3 text-sm outline-none'
                        placeholder='Configure your template here...'
                        value={
                          activeQuestion.settings.specific.defaultValue || ''
                        }
                        onChange={(e) =>
                          updateNested('specific', {
                            defaultValue: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {isTable &&
                (() => {
                  const tableColumns =
                    activeQuestion.settings.specific.tableColumns || []

                  const handleAddTableColumn = () => {
                    const newColNumber = tableColumns.length + 1
                    updateNested('specific', {
                      tableColumns: [
                        ...tableColumns,
                        {
                          id: generateId(),
                          name: `Column ${newColNumber}`,
                          size: 'MEDIUM',
                          type: 'SHORT_TEXT',
                        },
                      ],
                    })
                  }

                  const handleUpdateTableColumn = (
                    colId: string,
                    patch: Partial<{
                      name: string
                      size: 'SMALL' | 'MEDIUM' | 'LARGE'
                      type: QuestionType
                    }>,
                  ) => {
                    updateNested('specific', {
                      tableColumns: tableColumns.map((c) =>
                        c.id === colId ? { ...c, ...patch } : c,
                      ),
                    })
                  }

                  const handleDeleteTableColumn = (colId: string) => {
                    if (tableColumns.length <= 1) return
                    updateNested('specific', {
                      tableColumns: tableColumns.filter((c) => c.id !== colId),
                    })
                  }

                  const handleReorderTableColumns = (newOrderIds: string[]) => {
                    const reordered = newOrderIds
                      .map((id) => tableColumns.find((c) => c.id === id))
                      .filter(Boolean) as typeof tableColumns
                    updateNested('specific', { tableColumns: reordered })
                  }

                  return (
                    <div className='space-y-6'>
                      {/* Columns Builder */}
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <label className='block text-13 font-bold text-gray-12'>
                            Table Columns
                          </label>
                          <button
                            className='flex cursor-pointer items-center gap-1 rounded border border-accent-soft/20 bg-accent-soft/10 px-2 py-0.5 text-[10px] font-bold text-accent-primary transition-colors hover:bg-accent-soft/20'
                            type='button'
                            onClick={handleAddTableColumn}
                          >
                            <Icon height={10} name='lucide:plus' width={10} />
                            Add Column
                          </button>
                        </div>

                        {tableColumns.length === 0 ? (
                          <div className='rounded-lg border border-dashed border-gray-2 p-4 text-center text-xs text-gray-8'>
                            No columns yet. Click "Add Column" to configure
                            columns.
                          </div>
                        ) : (
                          <SortableContainer
                            items={tableColumns.map((c) => c.id)}
                            onItemsChange={handleReorderTableColumns}
                          >
                            <div className='space-y-2'>
                              {tableColumns.map((col) => (
                                <SortableItem
                                  className='items-stretch'
                                  handlerPosition='before'
                                  id={col.id}
                                  key={col.id}
                                >
                                  <div className='group/col bg-gray-50/80 flex-1 space-y-2 rounded-lg border border-gray-2 p-2.5 transition-colors hover:border-gray-3'>
                                    <div className='flex items-center justify-between gap-2'>
                                      <input
                                        className='flex-1 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs font-bold text-gray-12 transition-colors hover:border-gray-3 hover:bg-white focus:border-accent-primary focus:bg-white focus:outline-none'
                                        placeholder='Column name...'
                                        type='text'
                                        value={col.name}
                                        onChange={(e) =>
                                          handleUpdateTableColumn(col.id, {
                                            name: e.target.value,
                                          })
                                        }
                                      />
                                      <div className='flex shrink-0 items-center gap-0.5'>
                                        <IconButton
                                          color='gray'
                                          icon='lucide:settings'
                                          size='xs'
                                          variant='ghost'
                                        />
                                        <IconButton
                                          color='red'
                                          disabled={tableColumns.length <= 1}
                                          icon='lucide:trash-2'
                                          size='xs'
                                          variant='ghost'
                                          onClick={() =>
                                            handleDeleteTableColumn(col.id)
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                      <div className='flex-1'>
                                        <Select
                                          data={TABLE_COLUMN_TYPES}
                                          size='xs'
                                          value={col.type || 'SHORT_TEXT'}
                                          classNames={{
                                            input:
                                              'h-7 border-gray-3 bg-white text-xs font-medium text-gray-12',
                                          }}
                                          onChange={(val) =>
                                            val &&
                                            handleUpdateTableColumn(col.id, {
                                              type: val as QuestionType,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className='w-28 shrink-0'>
                                        <SegmentedControl
                                          size='xs'
                                          value={col.size || 'MEDIUM'}
                                          fullWidth
                                          data={[
                                            { label: 'S', value: 'SMALL' },
                                            { label: 'M', value: 'MEDIUM' },
                                            { label: 'L', value: 'LARGE' },
                                          ]}
                                          onChange={(val) =>
                                            handleUpdateTableColumn(col.id, {
                                              size: val as any,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </SortableItem>
                              ))}
                            </div>
                          </SortableContainer>
                        )}
                      </div>

                      <Divider className='border-dashed border-gray-1' />

                      <button
                        className='flex w-full items-center justify-between rounded-lg py-1 text-left transition-colors hover:text-accent-primary'
                        type='button'
                        onClick={() => setShowTableAdvanced(!showTableAdvanced)}
                      >
                        <span className='text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
                          Row & Export Options
                        </span>
                        <Icon
                          height={14}
                          name='lucide:chevron-down'
                          width={14}
                          className={cn(
                            'text-gray-5 transition-transform duration-200',
                            showTableAdvanced && 'rotate-180',
                          )}
                        />
                      </button>

                      {showTableAdvanced && (
                        <>
                          {/* Row Management */}
                          <div className='space-y-4'>
                            <div className='space-y-2'>
                              <label className='block text-13 font-medium text-gray-11'>
                                Table Entry Type
                              </label>
                              <SegmentedControl
                                className='bg-gray-50'
                                size='xs'
                                fullWidth
                                data={[
                                  { label: 'On Demand', value: 'ON_DEMAND' },
                                  { label: 'Fixed Rows', value: 'FIXED' },
                                ]}
                                value={
                                  activeQuestion.settings.specific.rowsType ||
                                  'ON_DEMAND'
                                }
                                onChange={(v) =>
                                  updateNested('specific', { rowsType: v })
                                }
                              />
                            </div>

                            {activeQuestion.settings.specific.rowsType ===
                              'FIXED' && (
                                <NumberInput
                                  label='Fixed Row Count'
                                  max={100}
                                  min={1}
                                  size='xs'
                                  value={
                                    activeQuestion.settings.specific
                                      .fixedRowCount || 5
                                  }
                                  onChange={(v) =>
                                    updateNested('specific', { fixedRowCount: v })
                                  }
                                />
                              )}

                            <InputSelect
                              label='Row Selection'
                              options={[
                                { id: 'NONE', name: 'None' },
                                { id: 'SINGLE', name: 'Single Row' },
                                { id: 'MULTIPLE', name: 'Multiple Rows' },
                              ]}
                              value={{
                                id:
                                  activeQuestion.settings.specific.rowSelection ||
                                  'NONE',
                                name:
                                  activeQuestion.settings.specific
                                    .rowSelection === 'MULTIPLE'
                                    ? 'Multiple Rows'
                                    : activeQuestion.settings.specific
                                      .rowSelection === 'SINGLE'
                                      ? 'Single Row'
                                      : 'None',
                              }}
                              onChange={(v) =>
                                v &&
                                updateNested('specific', { rowSelection: v.id })
                              }
                            />
                          </div>

                          <Divider className='border-dashed border-gray-1' />

                          {/* Bulk Actions & View */}
                          <div className='space-y-3'>
                            <InputSwitch
                              label='Enable Import/Export'
                              checked={
                                activeQuestion.settings.specific
                                  .importExportEnabled || false
                              }
                              onChange={(v) =>
                                updateNested('specific', {
                                  importExportEnabled: v,
                                })
                              }
                            />
                            <InputSwitch
                              label='Show Summary Totals'
                              checked={
                                activeQuestion.settings.specific.showSummaryRow ||
                                false
                              }
                              onChange={(v) =>
                                updateNested('specific', { showSummaryRow: v })
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}

              {isRating && (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Icon Type
                    </label>
                    <SegmentedControl
                      className='bg-gray-50 drop-shadow-sm'
                      size='xs'
                      value={activeQuestion.settings.specific.iconType || 'STAR'}
                      fullWidth
                      data={[
                        { label: 'Star', value: 'STAR' },
                        { label: 'Heart', value: 'HEART' },
                        { label: 'Smiley', value: 'SMILEY' },
                      ]}
                      onChange={(v) => updateNested('specific', { iconType: v })}
                    />
                  </div>
                  <NumberInput
                    label='Icon Count'
                    max={10}
                    min={3}
                    size='xs'
                    value={activeQuestion.settings.specific.iconCount || 5}
                    onChange={(v) => updateNested('specific', { iconCount: v })}
                  />
                  <InputSwitch
                    label='Allow Half Rating'
                    checked={
                      activeQuestion.settings.specific.allowHalfRating || false
                    }
                    onChange={(v) =>
                      updateNested('specific', { allowHalfRating: v })
                    }
                  />
                </div>
              )}

              {isOpinionScale && (
                <div className='space-y-4'>
                  <div className='grid grid-cols-3 gap-2'>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                        Min Label
                      </label>
                      <input
                        className='bg-gray-50 w-full rounded border border-gray-1 px-2 py-1 text-xs transition-all outline-none focus:border-accent-primary'
                        type='text'
                        value={
                          activeQuestion.settings.specific.opinionLabels?.min ||
                          'Not Likely'
                        }
                        onChange={(e: any) =>
                          updateNested('specific', {
                            opinionLabels: {
                              ...activeQuestion.settings.specific.opinionLabels,
                              min: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                        Mid Label
                      </label>
                      <input
                        className='bg-gray-50 w-full rounded border border-gray-1 px-2 py-1 text-xs transition-all outline-none focus:border-accent-primary'
                        type='text'
                        value={
                          activeQuestion.settings.specific.opinionLabels?.mid ||
                          ''
                        }
                        onChange={(e: any) =>
                          updateNested('specific', {
                            opinionLabels: {
                              ...activeQuestion.settings.specific.opinionLabels,
                              mid: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                        Max Label
                      </label>
                      <input
                        className='bg-gray-50 w-full rounded border border-gray-1 px-2 py-1 text-xs transition-all outline-none focus:border-accent-primary'
                        type='text'
                        value={
                          activeQuestion.settings.specific.opinionLabels?.max ||
                          'Extremely Likely'
                        }
                        onChange={(e: any) =>
                          updateNested('specific', {
                            opinionLabels: {
                              ...activeQuestion.settings.specific.opinionLabels,
                              max: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Scale Range
                    </label>
                    <SegmentedControl
                      className='bg-gray-50 drop-shadow-sm'
                      size='xs'
                      fullWidth
                      data={[
                        { label: '0 to 5', value: '5' },
                        { label: '0 to 10', value: '10' },
                      ]}
                      value={(
                        activeQuestion.settings.specific.maxLevel || 10
                      ).toString()}
                      onChange={(v) =>
                        updateNested('specific', { maxLevel: parseInt(v) })
                      }
                    />
                  </div>
                </div>
              )}

              {isSignature && (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Pen Color
                    </label>
                    <div className='flex items-center gap-3 p-1'>
                      {['#000000', '#0000FF', '#FF0000'].map((color) => (
                        <div
                          key={color}
                          style={{ backgroundColor: color }}
                          className={cn(
                            'h-8 w-8 cursor-pointer rounded-full border-2 transition-all hover:scale-105',
                            activeQuestion.settings.specific.signaturePenColor ===
                              color
                              ? 'scale-110 border-accent-primary shadow-md'
                              : 'border-white shadow-sm',
                          )}
                          onClick={() =>
                            updateNested('specific', { signaturePenColor: color })
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <InputSwitch
                    label='Allow Multiple Signatures'
                    checked={
                      activeQuestion.settings.specific.allowMultipleSignatures ||
                      false
                    }
                    onChange={(v) =>
                      updateNested('specific', { allowMultipleSignatures: v })
                    }
                  />
                </div>
              )}

              {isMatrix && (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Matrix Columns (One per line)
                    </label>
                    <textarea
                      className='min-h-[80px] w-full resize-none rounded-lg border border-gray-1 p-3 text-sm transition-all outline-none focus:border-accent-primary'
                      placeholder='Column 1\nColumn 2'
                      value={
                        activeQuestion.settings.specific.matrixColumns?.join(
                          '\n',
                        ) || ''
                      }
                      onChange={(e) =>
                        updateNested('specific', {
                          matrixColumns: e.target.value
                            .split('\n')
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Matrix Rows (One per line)
                    </label>
                    <textarea
                      className='min-h-[80px] w-full resize-none rounded-lg border border-gray-1 p-3 text-sm transition-all outline-none focus:border-accent-primary'
                      placeholder='Row 1\nRow 2'
                      value={
                        activeQuestion.settings.specific.matrixRows?.join('\n') ||
                        ''
                      }
                      onChange={(e) =>
                        updateNested('specific', {
                          matrixRows: e.target.value.split('\n').filter(Boolean),
                        })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Selection Type
                    </label>
                    <InputSelect
                      options={[
                        { id: 'SINGLE', name: 'Single Selection (Radio)' },
                        { id: 'MULTIPLE', name: 'Multiple Selection (Checkbox)' },
                      ]}
                      value={{
                        id:
                          activeQuestion.settings.specific.matrixSelectionType ||
                          'SINGLE',
                        name:
                          activeQuestion.settings.specific.matrixSelectionType ===
                            'MULTIPLE'
                            ? 'Multiple Selection (Checkbox)'
                            : 'Single Selection (Radio)',
                      }}
                      onChange={(v) =>
                        v &&
                        updateNested('specific', { matrixSelectionType: v.id })
                      }
                    />
                  </div>
                </div>
              )}

              {isYesNoToggle && (
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-3'>
                    <InputText
                      label='Yes Label'
                      placeholder='Yes'
                      value={activeQuestion.settings.specific.yesLabel || ''}
                      onChange={(val: string) =>
                        updateNested('specific', { yesLabel: val })
                      }
                    />
                    <InputText
                      label='No Label'
                      placeholder='No'
                      value={activeQuestion.settings.specific.noLabel || ''}
                      onChange={(val: string) =>
                        updateNested('specific', { noLabel: val })
                      }
                    />
                  </div>
                  <InputSwitch
                    label='Show icons (Check/Cross)'
                    checked={
                      activeQuestion.settings.specific.showYesNoIcons !== false
                    }
                    onChange={(v) =>
                      updateNested('specific', { showYesNoIcons: v })
                    }
                  />
                </div>
              )}

              {isFullName && (
                <div className='space-y-4'>
                  <div className='bg-gray-50 space-y-3 rounded-xl border border-gray-1 p-3'>
                    <div className='text-xs font-bold tracking-wider text-gray-8 uppercase'>
                      Field Options
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <InputSwitch
                        label='First Name Required'
                        checked={
                          activeQuestion.settings.specific.requireFirst !== false
                        }
                        onChange={(v) =>
                          updateNested('specific', { requireFirst: v })
                        }
                      />
                      <InputSwitch
                        label='Last Name Required'
                        checked={
                          activeQuestion.settings.specific.requireLast !== false
                        }
                        onChange={(v) =>
                          updateNested('specific', { requireLast: v })
                        }
                      />
                      <InputSwitch
                        label='Show Middle Name'
                        checked={
                          activeQuestion.settings.specific.showMiddle || false
                        }
                        onChange={(v) =>
                          updateNested('specific', { showMiddle: v })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {isFIB && (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Blanks Mapping (e.g. {1})
                    </label>
                    <textarea
                      className='min-h-[100px] w-full resize-none rounded-lg border border-gray-1 p-3 font-mono text-sm transition-all outline-none focus:border-accent-primary'
                      placeholder='{1}: field_id_1\n{2}: field_id_2'
                      value={activeQuestion.settings.specific.fibMapping || ''}
                      onChange={(e) =>
                        updateNested('specific', { fibMapping: e.target.value })
                      }
                    />
                    <div className='text-[10px] text-gray-6'>
                      Map bracketed numbers to other form fields for dynamic
                      substitution.
                    </div>
                  </div>
                </div>
              )}

              {isAddress && (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <label className='block text-13 font-medium text-gray-11'>
                      Address Mode
                    </label>
                    <InputSelect
                      options={[
                        { id: 'INTERNATIONAL', name: 'International (Freeform)' },
                        { id: 'SPECIFIC', name: 'Specific Country Format' },
                      ]}
                      value={{
                        id:
                          activeQuestion.settings.specific.addressMode ||
                          'INTERNATIONAL',
                        name:
                          activeQuestion.settings.specific.addressMode ===
                            'SPECIFIC'
                            ? 'Specific Country Format'
                            : 'International (Freeform)',
                      }}
                      onChange={(v) =>
                        v && updateNested('specific', { addressMode: v.id })
                      }
                    />
                  </div>
                  <div className='bg-gray-50 space-y-3 rounded-xl border border-gray-1 p-3'>
                    <div className='text-xs font-bold tracking-wider text-gray-8 uppercase'>
                      Required Fields
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <InputSwitch checked={true} label='Street' disabled />
                      <InputSwitch checked={true} label='City' disabled />
                      <InputSwitch
                        label='State'
                        checked={
                          activeQuestion.settings.specific.requireState !== false
                        }
                        onChange={(v) =>
                          updateNested('specific', { requireState: v })
                        }
                      />
                      <InputSwitch
                        label='Postal Code'
                        checked={
                          activeQuestion.settings.specific.requirePostalCode !==
                          false
                        }
                        onChange={(v) =>
                          updateNested('specific', { requirePostalCode: v })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        )}

      {/* 3. VALIDATION SECTION */}
      {!isDivider &&
        (isShortText ||
          isLongText ||
          isNumber ||
          isDate ||
          isTime ||
          isDateTime ||
          isSelect ||
          isCurrency ||
          isCalculated ||
          isCountryCode ||
          isFileUpload ||
          isPassword ||
          isTable ||
          isRating ||
          isOpinionScale ||
          isSignature ||
          isMatrix ||
          isYesNoToggle ||
          isAddress ||
          isFIB ||
          isFullName) && (
          <SettingsSection
            icon='lucide:shield-check'
            isOpen={openValidation}
            title='Validation Rules'
            variant='premium'
            onToggle={() => setOpenValidation(!openValidation)}
          >
            <div className='animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300'>
              <div className='space-y-3 rounded-lg border border-accent-soft/10 bg-accent-soft/5 p-2'>
                <div className='flex items-center justify-between'>
                  <div>
                    <div className='text-xs font-bold text-gray-8'>
                      Mandatory
                    </div>
                    <div className='text-[10px] text-gray-6'>
                      Field cannot be empty
                    </div>
                  </div>
                  <InputSwitch
                    checked={
                      activeQuestion.settings.validation.fieldRule ===
                      'REQUIRED'
                    }
                    onChange={(checked) =>
                      updateNested('validation', {
                        fieldRule: checked ? 'REQUIRED' : 'OPTIONAL',
                      })
                    }
                  />
                </div>

                {activeQuestion.type === 'MULTIPLE_CHOICE' &&
                  activeQuestion.settings.validation.fieldRule ===
                  'REQUIRED' && (
                    <>
                      <Divider className='border-dashed border-gray-1' />
                      <div className='space-y-2'>
                        <label className='block text-[11px] font-bold text-gray-8 uppercase'>
                          Requirement Mode
                        </label>
                        <SegmentedControl
                          size='xs'
                          fullWidth
                          data={[
                            { label: 'At least one (ANY)', value: 'ANY' },
                            { label: 'All required (ALL)', value: 'ALL' },
                          ]}
                          value={
                            activeQuestion.settings.validation
                              .requiredValidation || 'ANY'
                          }
                          onChange={(v) =>
                            updateNested('validation', {
                              requiredValidation: v as 'ANY' | 'ALL',
                            })
                          }
                        />
                        <div className='text-[10px] text-gray-6 italic'>
                          {activeQuestion.settings.validation
                            .requiredValidation === 'ALL'
                            ? 'User must check all options to proceed (e.g. compliance checklists).'
                            : 'User must check at least one option to proceed.'}
                        </div>
                      </div>
                    </>
                  )}

                {isCurrency && (
                  <>
                    <Divider className='border-dashed border-gray-1' />
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='text-xs font-bold text-gray-8'>
                          Require Currency Unit
                        </div>
                        <div className='text-[10px] text-gray-6'>
                          Both currency and amount are needed
                        </div>
                      </div>
                      <InputSwitch
                        checked={
                          activeQuestion.settings.validation
                            .requireCurrencyUnit || false
                        }
                        onChange={(checked) =>
                          updateNested('validation', {
                            requireCurrencyUnit: checked,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {isCalculated && (
                  <>
                    <Divider className='border-dashed border-gray-1' />
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='text-xs font-bold text-gray-8'>
                          Live Formula
                        </div>
                        <div className='text-[10px] text-gray-6'>
                          Recalculate when source fields change
                        </div>
                      </div>
                      <InputSwitch
                        checked={
                          activeQuestion.settings.validation
                            .isCalculationEnabled !== false
                        }
                        onChange={(checked) =>
                          updateNested('validation', {
                            isCalculationEnabled: checked,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              {(isShortText ||
                isLongText ||
                isNumber ||
                isTime ||
                isDateTime) && (
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      {isNumber
                        ? 'Number Format'
                        : isTime || isDateTime
                          ? 'Time Format'
                          : 'Validation Type'}
                    </label>
                    <InputSelect
                      options={
                        isTime || isDateTime
                          ? timeFormatOptions.map((o) => ({
                            id: o.value,
                            name: o.label,
                          }))
                          : validationOptions
                      }
                      placeholder={
                        isNumber
                          ? 'Select numeric format'
                          : isTime || isDateTime
                            ? 'Select display format'
                            : 'e.g. Email, Alpha...'
                      }
                      value={
                        isTime || isDateTime
                          ? timeFormatOptions.find(
                            (o) =>
                              o.value ===
                              activeQuestion.settings.validation.timeFormat,
                          )
                            ? {
                              id: activeQuestion.settings.validation
                                .timeFormat!,
                              name: timeFormatOptions.find(
                                (o) =>
                                  o.value ===
                                  activeQuestion.settings.validation.timeFormat,
                              )!.label,
                            }
                            : { id: '12', name: '12 Hour' }
                          : validationOptions.find(
                            (o) =>
                              o.id ===
                              activeQuestion.settings.validation.contentRule,
                          ) || validationOptions[0]
                      }
                      onChange={(val) =>
                        val &&
                        updateNested(
                          'validation',
                          isTime || isDateTime
                            ? { timeFormat: val.id }
                            : { contentRule: val.id },
                        )
                      }
                    />
                  </div>
                )}

              {isNumber &&
                (activeQuestion.settings.validation.contentRule === 'DECIMAL' ||
                  activeQuestion.settings.validation.contentRule ===
                  'BOTH') && (
                  <NumberInput
                    label='Decimal Digits'
                    max={10}
                    min={0}
                    size='xs'
                    value={
                      activeQuestion.settings.validation.decimalDigits || 0
                    }
                    onChange={(v) =>
                      updateNested('validation', { decimalDigits: v })
                    }
                  />
                )}
              {(isDate || isDateTime) && (
                <div className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Date Limits
                    </label>
                    <InputSelect
                      options={dateLimitOptions}
                      value={
                        dateLimitOptions.find(
                          (o) =>
                            o.id ===
                            activeQuestion.settings.validation.dateLimitType,
                        ) || dateLimitOptions[0]
                      }
                      onChange={(val) =>
                        val &&
                        updateNested('validation', { dateLimitType: val.id })
                      }
                    />
                  </div>

                  {activeQuestion.settings.validation.dateLimitType ===
                    'MIN_DATE' && (
                      <div className='grid grid-cols-2 items-end gap-3'>
                        <NumberInput
                          label='Years from Current'
                          placeholder='0'
                          size='xs'
                          value={
                            activeQuestion.settings.validation.minDateOffset || 0
                          }
                          onChange={(v) =>
                            updateNested('validation', { minDateOffset: v })
                          }
                        />
                        <div className='pb-2 text-[10px] text-gray-6 italic'>
                          Current date is default min.
                        </div>
                      </div>
                    )}

                  {activeQuestion.settings.validation.dateLimitType ===
                    'MAX_DATE' && (
                      <div className='grid grid-cols-2 items-end gap-3'>
                        <NumberInput
                          label='Years from Current'
                          placeholder='0'
                          size='xs'
                          value={
                            activeQuestion.settings.validation.maxDateOffset || 0
                          }
                          onChange={(v) =>
                            updateNested('validation', { maxDateOffset: v })
                          }
                        />
                        <div className='pb-2 text-[10px] text-gray-6 italic'>
                          Current date is default max.
                        </div>
                      </div>
                    )}

                  {activeQuestion.settings.validation.dateLimitType ===
                    'RANGE' && (
                      <div className='bg-gray-50 grid grid-cols-2 gap-2 rounded-lg border border-gray-1 p-3'>
                        <div>
                          <label className='mb-1 block text-[10px] font-bold text-gray-8 uppercase'>
                            Start Date
                          </label>
                          <input
                            className='w-full rounded border p-1 text-xs'
                            type='date'
                            value={
                              activeQuestion.settings.validation.fixedStartDate ||
                              ''
                            }
                            onChange={(e) =>
                              updateNested('validation', {
                                fixedStartDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className='mb-1 block text-[10px] font-bold text-gray-8 uppercase'>
                            End Date
                          </label>
                          <input
                            className='w-full rounded border p-1 text-xs'
                            type='date'
                            value={
                              activeQuestion.settings.validation.fixedEndDate ||
                              ''
                            }
                            onChange={(e) =>
                              updateNested('validation', {
                                fixedEndDate: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                </div>
              )}

              {isTime && (
                <div className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Time Limits
                    </label>
                    <InputSelect
                      options={timeLimitOptions}
                      value={
                        timeLimitOptions.find(
                          (o) =>
                            o.id ===
                            activeQuestion.settings.validation.timeLimitType,
                        ) || timeLimitOptions[0]
                      }
                      onChange={(val) =>
                        val &&
                        updateNested('validation', { timeLimitType: val.id })
                      }
                    />
                  </div>

                  {activeQuestion.settings.validation.timeLimitType ===
                    'MIN_TIME' && (
                      <div className='grid grid-cols-2 items-end gap-3'>
                        <NumberInput
                          label='Hours from Current'
                          placeholder='0'
                          size='xs'
                          value={
                            activeQuestion.settings.validation.minTimeOffset || 0
                          }
                          onChange={(v) =>
                            updateNested('validation', { minTimeOffset: v })
                          }
                        />
                        <div className='pb-2 text-[10px] text-gray-6 italic'>
                          Current time is default min.
                        </div>
                      </div>
                    )}

                  {activeQuestion.settings.validation.timeLimitType ===
                    'MAX_TIME' && (
                      <div className='grid grid-cols-2 items-end gap-3'>
                        <NumberInput
                          label='Hours from Current'
                          placeholder='0'
                          size='xs'
                          value={
                            activeQuestion.settings.validation.maxTimeOffset || 0
                          }
                          onChange={(v) =>
                            updateNested('validation', { maxTimeOffset: v })
                          }
                        />
                        <div className='pb-2 text-[10px] text-gray-6 italic'>
                          Current time is default max.
                        </div>
                      </div>
                    )}

                  {activeQuestion.settings.validation.timeLimitType ===
                    'RANGE' && (
                      <div className='bg-gray-50 grid grid-cols-2 gap-2 rounded-lg border border-gray-1 p-3'>
                        <div>
                          <label className='mb-1 block text-[10px] font-bold text-gray-8 uppercase'>
                            Start Time
                          </label>
                          <input
                            className='w-full rounded border p-1 text-xs'
                            type='time'
                            value={
                              activeQuestion.settings.validation.fixedStartTime ||
                              ''
                            }
                            onChange={(e) =>
                              updateNested('validation', {
                                fixedStartTime: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className='mb-1 block text-[10px] font-bold text-gray-8 uppercase'>
                            End Time
                          </label>
                          <input
                            className='w-full rounded border p-1 text-xs'
                            type='time'
                            value={
                              activeQuestion.settings.validation.fixedEndTime ||
                              ''
                            }
                            onChange={(e) =>
                              updateNested('validation', {
                                fixedEndTime: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                </div>
              )}

              {isNumber && !isDate ? (
                <div className='space-y-3'>
                  <div>
                    <label className='mb-2 block text-13 font-medium text-gray-11'>
                      Value Range Mode
                    </label>
                    <InputSelect
                      options={rangeOptions}
                      value={
                        rangeOptions.find(
                          (o) =>
                            o.id ===
                            activeQuestion.settings.validation.rangeType,
                        ) || rangeOptions[0]
                      }
                      onChange={(val) =>
                        val && updateNested('validation', { rangeType: val.id })
                      }
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <NumberInput
                      label='Minimum'
                      size='xs'
                      disabled={
                        activeQuestion.settings.validation.rangeType ===
                        'MIN_FLEX_MAX_FIXED'
                      }
                      placeholder={
                        activeQuestion.settings.validation.rangeType ===
                          'MIN_FLEX_MAX_FIXED'
                          ? 'Flexible'
                          : '0'
                      }
                      value={
                        Number(activeQuestion.settings.validation.minimum) ||
                        undefined
                      }
                      onChange={(v) =>
                        updateNested('validation', { minimum: v })
                      }
                    />
                    <NumberInput
                      label='Maximum'
                      size='xs'
                      disabled={
                        activeQuestion.settings.validation.rangeType ===
                        'MIN_FIXED_MAX_FLEX'
                      }
                      placeholder={
                        activeQuestion.settings.validation.rangeType ===
                          'MIN_FIXED_MAX_FLEX'
                          ? 'Flexible'
                          : '100'
                      }
                      value={
                        Number(activeQuestion.settings.validation.maximum) ||
                        undefined
                      }
                      onChange={(v) =>
                        updateNested('validation', { maximum: v })
                      }
                    />
                  </div>
                </div>
              ) : isNumber || isCurrency ? (
                <div className='grid grid-cols-2 gap-3'>
                  <NumberInput
                    label='Min Value'
                    placeholder='0'
                    size='xs'
                    value={
                      Number(activeQuestion.settings.validation.minimum) ||
                      undefined
                    }
                    onChange={(v) => updateNested('validation', { minimum: v })}
                  />
                  <NumberInput
                    label='Max Value'
                    placeholder='1000000'
                    size='xs'
                    value={
                      Number(activeQuestion.settings.validation.maximum) ||
                      undefined
                    }
                    onChange={(v) => updateNested('validation', { maximum: v })}
                  />
                  {isCurrency && (
                    <div className='col-span-2'>
                      <NumberInput
                        description='Number of decimal places (e.g. 2 for 0.00)'
                        label='Decimal Precision'
                        max={4}
                        min={0}
                        size='xs'
                        value={
                          activeQuestion.settings.specific.decimalPrecision || 2
                        }
                        onChange={(v) =>
                          updateNested('specific', { decimalPrecision: v })
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                (isShortText ||
                  isLongText ||
                  isNumber ||
                  isTime ||
                  isCountryCode ||
                  isPassword ||
                  isTextBuilder) && (
                  <div className='grid grid-cols-2 gap-3'>
                    <NumberInput
                      placeholder={isPassword ? '8' : '0'}
                      size='xs'
                      label={
                        isCountryCode
                          ? 'Min Code Length'
                          : isMulti
                            ? 'Min Selections'
                            : 'Min Length'
                      }
                      value={
                        Number(activeQuestion.settings.validation.minimum) ||
                        undefined
                      }
                      onChange={(v) =>
                        updateNested('validation', { minimum: v })
                      }
                    />
                    <NumberInput
                      size='xs'
                      label={
                        isCountryCode
                          ? 'Max Code Length'
                          : isMulti
                            ? 'Max Selections'
                            : 'Max Length'
                      }
                      placeholder={
                        isPassword
                          ? '16'
                          : isCountryCode
                            ? '5'
                            : isMulti
                              ? '10'
                              : '2000'
                      }
                      value={
                        Number(activeQuestion.settings.validation.maximum) ||
                        undefined
                      }
                      onChange={(v) =>
                        updateNested('validation', { maximum: v })
                      }
                    />
                  </div>
                )
              )}

              {isFileUpload && (
                <div className='space-y-4'>
                  <div className='space-y-1.5'>
                    <div className='text-xs font-bold text-gray-8'>
                      Allowed File Types
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {['pdf', 'jpg', 'png', 'docx', 'xlsx'].map((ext) => (
                        <div
                          key={ext}
                          className={cn(
                            'cursor-pointer rounded border px-2 py-1 text-[10px] font-bold uppercase transition-colors',
                            (
                              activeQuestion.settings.validation
                                .allowedFileTypes || []
                            ).includes(ext)
                              ? 'border-accent-primary bg-accent-soft text-accent-primary'
                              : 'hover:bg-gray-50 border-gray-2 bg-white text-gray-8 hover:border-accent-primary/40',
                          )}
                          onClick={() => {
                            const current =
                              activeQuestion.settings.validation
                                .allowedFileTypes || []
                            const next = current.includes(ext)
                              ? current.filter((t) => t !== ext)
                              : [...current, ext]
                            updateNested('validation', {
                              allowedFileTypes: next,
                            })
                          }}
                        >
                          {ext}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='grid grid-cols-2 items-start gap-3'>
                    <NumberInput
                      label='Max File Size (MB)'
                      placeholder='5'
                      classNames={{
                        input: baseInputClassNames.input,
                        label: baseInputClassNames.label,
                      }}
                      value={
                        Number(
                          activeQuestion.settings.validation.maxFileSize,
                        ) || undefined
                      }
                      onChange={(v) =>
                        updateNested('validation', { maxFileSize: v })
                      }
                    />
                    <InputSelect
                      label='Expiry Field'
                      placeholder='Select Date Field'
                      options={allQuestions
                        .filter(
                          (q) =>
                            q.type === 'DATE' && q.id !== activeQuestion.id,
                        )
                        .map((q) => ({ id: q.id, name: q.label }))}
                      value={
                        activeQuestion.settings.validation.expiryFieldId
                          ? {
                            id: activeQuestion.settings.validation
                              .expiryFieldId,
                            name:
                              allQuestions.find(
                                (q) =>
                                  q.id ===
                                  activeQuestion.settings.validation
                                    .expiryFieldId,
                              )?.label || 'Selected Field',
                          }
                          : null
                      }
                      onChange={(v) =>
                        updateNested('validation', {
                          expiryFieldId: v?.id || null,
                        })
                      }
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <InputSelectMultiple
                      // description='Fields to auto-fill from this document via AI OCR. OCR only runs on upload when at least one field is assigned.'
                      label='Auto-fill from Document'
                      options={assignOtherControlsOptions}
                      placeholder='Select fields to auto-fill from OCR'
                      clearable
                      searchable
                      value={assignOtherControlsOptions.filter((o) =>
                        (
                          activeQuestion.settings.validation
                            .assignOtherControls || []
                        ).includes(o.id),
                      )}
                      onChange={(vals) =>
                        updateNested('validation', {
                          assignOtherControls: vals.map((v) => v.id),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        )}

      {/* 4. DATA LOOKUP SECTION */}
      {!isDivider &&
        (isLongText ||
          isNumber ||
          isDate ||
          isTime ||
          isDateTime ||
          isSelect) && (
          <SettingsSection
            icon='lucide:database'
            isOpen={openLookup}
            title='Data Lookup (Integration)'
            variant='premium'
            onToggle={() => setOpenLookup(!openLookup)}
          >
            <div className='animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300'>
              <div>
                <label className='mb-2 block text-13 font-medium text-gray-11'>
                  Connection Type
                </label>
                <InputSelect
                  placeholder='Select protocol'
                  options={[
                    { id: 'GOOGLE_SHEETS', name: 'Google Sheets API' },
                    { id: 'SQL', name: 'Internal SQL Database' },
                    { id: 'API', name: 'RESTful API' },
                    { id: 'ORACLE', name: 'Oracle DB' },
                  ]}
                  value={
                    [
                      { id: 'GOOGLE_SHEETS', name: 'Google Sheets API' },
                      { id: 'SQL', name: 'Internal SQL Database' },
                      { id: 'API', name: 'RESTful API' },
                      { id: 'ORACLE', name: 'Oracle DB' },
                    ].find(
                      (o) =>
                        o.id ===
                        activeQuestion.settings.lookupSettings?.connectionType,
                    ) || null
                  }
                  onChange={(val) =>
                    val &&
                    updateNested('lookupSettings', { connectionType: val.id })
                  }
                />
              </div>

              <div>
                <label className='mb-2 block text-13 font-medium text-gray-11'>
                  Lookup Connection
                </label>
                <InputSelect
                  placeholder='Select source connection'
                  options={[
                    { id: '1', name: 'Main Prod Cluster' },
                    { id: '2', name: 'Staging Sheet v2' },
                  ]}
                  value={
                    [
                      { id: '1', name: 'Main Prod Cluster' },
                      { id: '2', name: 'Staging Sheet v2' },
                    ].find(
                      (o) =>
                        o.id ===
                        String(
                          activeQuestion.settings.lookupSettings?.connectionId,
                        ),
                    ) || null
                  }
                  onChange={(val) =>
                    val &&
                    updateNested('lookupSettings', {
                      connectionId: Number(val.id),
                    })
                  }
                />
              </div>

              <InputText
                label='Hub Name / Collection'
                placeholder='e.g. users_collection'
                value={activeQuestion.settings.lookupSettings?.hubName || ''}
                onChange={(val: string) =>
                  updateNested('lookupSettings', { hubName: val })
                }
              />

              {(isNumber || isDate || isTime || isDateTime || isSelect) && (
                <InputText
                  label={
                    isDate || isDateTime
                      ? 'Target Column (Date)'
                      : isTime
                        ? 'Target Column (Time)'
                        : isSelect
                          ? 'Selector Data Source'
                          : 'Target Column (Number)'
                  }
                  placeholder={
                    isDate || isDateTime
                      ? 'e.g. birth_date'
                      : isTime
                        ? 'e.g. checkin_time'
                        : isSelect
                          ? 'e.g. items_list'
                          : 'e.g. age, quantity...'
                  }
                  value={
                    activeQuestion.settings.lookupSettings?.columnName || ''
                  }
                  onChange={(val: string) =>
                    updateNested('lookupSettings', { columnName: val })
                  }
                />
              )}
            </div>
          </SettingsSection>
        )}

      {/* 5. APPEARANCE & STYLING */}
      {!isLongText && (
        <SettingsSection
          icon='lucide:palette'
          isOpen={openAppearance}
          title='Appearance & Icons'
          variant='premium'
          onToggle={() => setOpenAppearance(!openAppearance)}
        >
          <div className='animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300'>
            <div className='grid grid-cols-2 gap-3'>
              <InputText
                label='Prefix Icon'
                placeholder='lucide:user'
                value={activeQuestion.settings.specific.prefixIcon || ''}
                leftSection={
                  activeQuestion.settings.specific.prefixIcon ? (
                    <Icon
                      height={14}
                      name={activeQuestion.settings.specific.prefixIcon}
                      width={14}
                    />
                  ) : null
                }
                onChange={(val: string) =>
                  updateNested('specific', { prefixIcon: val })
                }
              />
              <InputText
                label='Suffix Icon'
                placeholder='lucide:info'
                value={activeQuestion.settings.specific.suffixIcon || ''}
                rightSection={
                  activeQuestion.settings.specific.suffixIcon ? (
                    <Icon
                      height={14}
                      name={activeQuestion.settings.specific.suffixIcon}
                      width={14}
                    />
                  ) : null
                }
                onChange={(val: string) =>
                  updateNested('specific', { suffixIcon: val })
                }
              />
            </div>

            {!isNumber && !isDate && !isDateTime && !isSelect && (
              <InputText
                label='Input Mask'
                placeholder='e.g. (###) ###-####'
                value={activeQuestion.settings.specific.inputMask || ''}
                onChange={(val: string) =>
                  updateNested('specific', { inputMask: val })
                }
              />
            )}

            <div>
              <label className='mb-2 block text-13 font-medium text-gray-11'>
                Visual Style
              </label>
              <SegmentedControl
                className='bg-gray-50 w-full border border-gray-1'
                size='xs'
                value={activeQuestion.settings.specific.variant || 'default'}
                data={[
                  { label: 'Outlined', value: 'default' },
                  { label: 'Filled', value: 'filled' },
                  { label: 'Minimal', value: 'unstyled' },
                ]}
                onChange={(v) => updateNested('specific', { variant: v })}
              />
            </div>

            {isDivider && (
              <div className='space-y-4 pt-2'>
                <Divider className='border-gray-1' />
                <div>
                  <label className='mb-2 block text-13 font-medium tracking-tight text-gray-11 uppercase'>
                    Divider Style
                  </label>
                  <SegmentedControl
                    className='bg-gray-50 border border-gray-1'
                    size='xs'
                    fullWidth
                    data={[
                      { label: 'Solid', value: 'SOLID' },
                      { label: 'Dashed', value: 'DASHED' },
                      { label: 'Dotted', value: 'DOTTED' },
                      { label: 'Double', value: 'DOUBLE' },
                    ]}
                    value={
                      activeQuestion.settings.specific.dividerType || 'SOLID'
                    }
                    onChange={(val) =>
                      updateNested('specific', { dividerType: val })
                    }
                  />
                </div>
              </div>
            )}

            {!isDivider && !isCalculated && (
              <div className='flex items-center justify-between px-1 py-2'>
                <div>
                  <div className='text-xs font-bold text-gray-13'>
                    Read Only
                  </div>
                  <div className='text-[10px] text-gray-6'>
                    User cannot edit this field
                  </div>
                </div>
                <InputSwitch
                  checked={activeQuestion.settings.general.readOnly || false}
                  onChange={(checked) =>
                    updateNested('general', { readOnly: checked })
                  }
                />
              </div>
            )}
          </div>
        </SettingsSection>
      )}

      {/* 6. ADVANCED SECTION */}
      <SettingsSection
        icon='lucide:zap'
        isOpen={openAdvanced}
        title='Developer & Advanced'
        variant='premium'
        onToggle={() => setOpenAdvanced(!openAdvanced)}
      >
        <div className='animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-300'>
          <div className='bg-gray-50 rounded-lg border border-gray-1 p-3'>
            <div className='mb-1 text-xs font-bold tracking-wider text-gray-11 uppercase'>
              Field ID / Key
            </div>
            <div className='font-mono text-xs break-all text-gray-6'>
              {activeQuestion.id}
            </div>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between py-1'>
              <div className='text-xs font-semibold text-gray-11'>
                Pre-fill from URL
              </div>
              <InputSwitch
                checked={
                  activeQuestion.settings.specific.prefillFromUrl || false
                }
                onChange={(checked) =>
                  updateNested('specific', { prefillFromUrl: checked })
                }
              />
            </div>

            <div className='flex items-center justify-between py-1'>
              <div className='text-xs font-semibold text-gray-11'>
                Unique Value Check
              </div>
              <InputSwitch
                checked={activeQuestion.settings.specific.uniqueCheck || false}
                onChange={(checked) =>
                  updateNested('specific', { uniqueCheck: checked })
                }
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* 7. LOGIC SECTION */}
      {!isShortText && !isDate && !isTime && !isDateTime && (
        <SettingsSection
          icon='lucide:split'
          isOpen={openLogic}
          title='Field Logic'
          variant='premium'
          onToggle={() => setOpenLogic(!openLogic)}
        >
          <div className='animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-300'>
            {logicRules.length === 0 ? (
              <div className='bg-gray-50/50 rounded-xl border border-gray-2 p-4 text-center'>
                <div className='mb-1 text-sm font-semibold text-gray-9'>
                  Visibility Logic
                </div>
                <div className='mb-3 text-[11px] text-gray-5'>
                  Set rules to show or hide this field based on other responses.
                </div>
                {logicFieldOptions.length === 0 ? (
                  <div className='text-[11px] text-gray-5 italic'>
                    Add another field to this form to create a rule.
                  </div>
                ) : (
                  <Button
                    color='primary'
                    size='xs'
                    variant='subtle'
                    leftSection={
                      <Icon height={12} name='lucide:plus' width={12} />
                    }
                    onClick={addLogicRule}
                  >
                    Add Rule
                  </Button>
                )}
              </div>
            ) : (
              <div className='space-y-2.5'>
                {logicRules.map((rule, idx) => {
                  const needsValue = !['EMPTY', 'NOT_EMPTY'].includes(
                    rule.condition,
                  )
                  return (
                    <div
                      className='space-y-2 rounded-xl border border-gray-1 bg-white p-3 shadow-sm'
                      key={rule.id}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                          {idx === 0 ? 'If' : 'And if'}
                        </span>
                        <button
                          className='hover:text-red-500 text-gray-4 transition-colors'
                          title='Remove rule'
                          onClick={() => removeLogicRule(rule.id)}
                        >
                          <Icon height={13} name='lucide:x' width={13} />
                        </button>
                      </div>

                      <InputSelect
                        options={logicFieldOptions}
                        placeholder='Select a field'
                        value={
                          logicFieldOptions.find(
                            (o) => o.id === rule.fieldId,
                          ) || null
                        }
                        onChange={(val) =>
                          val &&
                          updateLogicRule(rule.id, { fieldId: String(val.id) })
                        }
                      />

                      <div
                        className={cn(
                          'grid gap-2',
                          needsValue ? 'grid-cols-2' : 'grid-cols-1',
                        )}
                      >
                        <InputSelect
                          options={logicConditionOptions}
                          value={
                            logicConditionOptions.find(
                              (o) => o.id === rule.condition,
                            ) || logicConditionOptions[0]
                          }
                          onChange={(val) =>
                            val &&
                            updateLogicRule(rule.id, {
                              condition: val.id as LogicRule['condition'],
                            })
                          }
                        />
                        {needsValue && (
                          <InputText
                            placeholder='Value'
                            value={rule.value ?? ''}
                            onChange={(val: string) =>
                              updateLogicRule(rule.id, { value: val })
                            }
                          />
                        )}
                      </div>

                      <div className='flex items-center gap-2 border-t border-dashed border-gray-1 pt-2'>
                        <span className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                          Then
                        </span>
                        <div className='w-28'>
                          <InputSelect
                            options={logicActionOptions}
                            value={
                              logicActionOptions.find(
                                (o) => o.id === rule.action,
                              ) || logicActionOptions[0]
                            }
                            onChange={(val) =>
                              val &&
                              updateLogicRule(rule.id, {
                                action: val.id as LogicRule['action'],
                              })
                            }
                          />
                        </div>
                        <span className='text-[11px] text-gray-6'>
                          this field
                        </span>
                      </div>
                    </div>
                  )
                })}

                <Button
                  className='w-full border border-dashed border-gray-2 bg-white'
                  color='gray'
                  disabled={logicRules.length >= logicFieldOptions.length}
                  size='xs'
                  variant='subtle'
                  fullWidth
                  leftSection={
                    <Icon height={12} name='lucide:plus' width={12} />
                  }
                  onClick={addLogicRule}
                >
                  Add Another Rule
                </Button>
              </div>
            )}
          </div>
        </SettingsSection>
      )}
    </div>
  )
}

export default QuestionSettings
