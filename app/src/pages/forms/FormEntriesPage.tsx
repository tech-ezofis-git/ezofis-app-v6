import { useLingui } from '@lingui/react/macro'
import { Divider, Rating, Skeleton, Stack, Tooltip } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Question } from '@/pages/form-builder/store/formStore'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import userApi from '@/api/user'
import { getRepositoryItemFacets } from '@/api/v6/folder/folder'
import { getUsers } from '@/api/v6/user'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
// DataTable and pagination imports
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import Modal from '@/components/base/Modal'
import Pagination from '@/components/base/pagination/Pagination'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import CalculatedFieldInput from '@/pages/form-builder/components/common/CalculatedFieldInput'
import { applyCalculatedFields } from '@/pages/form-builder/helpers/formula'
import { evaluateFormRules } from '@/pages/form-builder/helpers/ruleEngine'
import { executeSearchFieldSync } from '@/pages/form-builder/helpers/searchFieldSync'
import PoSetupFlowPage from '@/pages/requests/components/request/components/newrequest/poFlow/PoSetupFlowPage'
import {
  extractScalarStrings,
  facetsToFieldOptions,
  fetchMasterFormColumnOptions,
  getConfiguredFieldOptions,
  getDependentChildFieldIds,
  getDropdownFacetSource,
  getFieldOptions,
  getMasterFormInfo,
  withExtraFieldOptions,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { getSettingsReturnPath } from '@/pages/settings/helpers/settingsNavigation'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import {
  matchesCategoryFilterValue,
  matchesDateRangeValue,
} from '@/utils/filterUtils'
import GenericFormImportModal from './components/GenericFormImportModal'

const FormEntriesChoiceInput = ({
  field,
  isMultiple,
  allFields = [],
  formModel = {},
  val,
  onChange,
}: {
  field: Question
  isMultiple?: boolean
  allFields?: Question[]
  formModel?: Record<string, any>
  val?: any
  onChange: (value: any) => void
}) => {
  const optionsType = String(
    field.settings?.specific?.optionsType || 'CUSTOM',
  ).toUpperCase()
  const masterInfo = getMasterFormInfo(field)

  const parentField = useMemo(() => {
    if (!masterInfo.masterFormParentColumn) return null
    const target = masterInfo.masterFormParentColumn.trim().toLowerCase()
    return allFields.find(
      (f: any) =>
        f.id === masterInfo.masterFormParentColumn ||
        f.settings?.specific?.masterFormColumn ===
        masterInfo.masterFormParentColumn ||
        (f.label && f.label.trim().toLowerCase() === target),
    )
  }, [allFields, masterInfo.masterFormParentColumn])

  const parentValue = parentField
    ? formModel?.[parentField.id]
    : masterInfo.masterFormParentColumn && formModel
      ? formModel[masterInfo.masterFormParentColumn]
      : undefined

  const parentMasterColumn = parentField
    ? getMasterFormInfo(parentField).masterFormColumn ||
    parentField.label ||
    parentField.id
    : masterInfo.masterFormParentColumn

  const { data: userFieldOptions = [] } = useQuery({
    enabled: optionsType === 'USER_LIST',
    queryKey: ['formEntriesChoiceUserList'],
    queryFn: async () => {
      const res = await getUsers()
      return res.data.map((user) => ({ id: user.email, name: user.email }))
    },
  })

  const { data: masterFieldOptions = [] } = useQuery({
    enabled: masterInfo.enabled,
    queryKey: [
      'formEntriesChoiceMasterOptions',
      masterInfo.masterFormId,
      masterInfo.masterFormColumn,
      parentValue,
      parentMasterColumn,
      masterInfo.showAllData,
    ],
    queryFn: () =>
      fetchMasterFormColumnOptions(
        masterInfo.masterFormId,
        masterInfo.masterFormColumn,
        parentValue,
        parentMasterColumn,
        masterInfo.showAllData,
      ),
  })

  const rawOptions = withExtraFieldOptions(
    withExtraFieldOptions(
      optionsType === 'DYNAMIC'
        ? getFieldOptions(field)
        : getConfiguredFieldOptions(field),
      userFieldOptions,
    ),
    masterFieldOptions,
  )

  const opts =
    rawOptions.length > 0
      ? rawOptions.map((o) => o.name)
      : ['Option 1', 'Option 2', 'Option 3']

  useEffect(() => {
    if (rawOptions.length === 1) {
      const singleOpt = rawOptions[0].name || String(rawOptions[0].id)
      if (isMultiple) {
        const selectedList = Array.isArray(val)
          ? val
          : val
            ? String(val).split(',')
            : []
        if (selectedList.length === 0) {
          onChange(singleOpt)
        }
      } else {
        if (val === undefined || val === null || val === '') {
          onChange(singleOpt)
        }
      }
    }
  }, [rawOptions, val, isMultiple, onChange])

  if (isMultiple) {
    const selectedList = Array.isArray(val)
      ? val
      : val
        ? String(val).split(',')
        : []

    const toggleOpt = (opt: string) => {
      const next = selectedList.includes(opt)
        ? selectedList.filter((x: string) => x !== opt)
        : [...selectedList, opt]
      onChange(next.join(','))
    }

    return (
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
        {opts.map((opt: string) => {
          const isSelected = selectedList.includes(opt)
          return (
            <button
              key={opt}
              type='button'
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all hover:bg-gray-1 active:scale-[0.99]',
                isSelected
                  ? 'border-accent-primary bg-accent-soft/10 font-bold text-accent-primary'
                  : 'border-gray-2 bg-surface text-gray-12',
              )}
              onClick={() => toggleOpt(opt)}
            >
              <div className='flex size-4 shrink-0 items-center justify-center rounded border border-gray-3'>
                {isSelected && (
                  <Icon
                    className='size-3 text-accent-primary'
                    name='lucide:check'
                  />
                )}
              </div>
              <span className='text-xs'>{opt}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
      {opts.map((opt: string) => {
        const isSelected = val === opt
        return (
          <button
            key={opt}
            type='button'
            className={cn(
              'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all hover:bg-gray-1 active:scale-[0.99]',
              isSelected
                ? 'border-accent-primary bg-accent-soft/10 font-bold text-accent-primary'
                : 'border-gray-2 bg-surface text-gray-12',
            )}
            onClick={() => onChange(opt)}
          >
            <div className='flex size-4 shrink-0 items-center justify-center rounded-full border border-gray-3'>
              {isSelected && (
                <div className='size-2 rounded-full bg-accent-primary' />
              )}
            </div>
            <span className='text-xs'>{opt}</span>
          </button>
        )
      })}
    </div>
  )
}

const FormEntriesSelectInput = ({
  field,
  fieldDistinctOptions = [],
  allFields = [],
  formModel = {},
  val,
  onChange,
}: {
  field: Question
  fieldDistinctOptions?: Option[]
  allFields?: Question[]
  formModel?: Record<string, any>
  val?: any
  onChange: (value: any) => void
}) => {
  const optionsType = String(
    field.settings?.specific?.optionsType || 'CUSTOM',
  ).toUpperCase()
  const facetSource = getDropdownFacetSource(field)
  const masterInfo = getMasterFormInfo(field)

  const parentField = useMemo(() => {
    if (!masterInfo.masterFormParentColumn) return null
    const target = masterInfo.masterFormParentColumn.trim().toLowerCase()
    return allFields.find(
      (f: any) =>
        f.id === masterInfo.masterFormParentColumn ||
        f.settings?.specific?.masterFormColumn ===
        masterInfo.masterFormParentColumn ||
        (f.label && f.label.trim().toLowerCase() === target),
    )
  }, [allFields, masterInfo.masterFormParentColumn])

  const parentValue = parentField
    ? formModel?.[parentField.id]
    : masterInfo.masterFormParentColumn && formModel
      ? formModel[masterInfo.masterFormParentColumn]
      : undefined

  const parentMasterColumn = parentField
    ? getMasterFormInfo(parentField).masterFormColumn ||
    parentField.label ||
    parentField.id
    : masterInfo.masterFormParentColumn

  const repoParentField = useMemo(() => {
    if (!facetSource.repositoryFieldParent) return null
    const target = facetSource.repositoryFieldParent.trim().toLowerCase()
    return allFields.find(
      (f: any) =>
        f.id === facetSource.repositoryFieldParent ||
        f.settings?.specific?.repositoryField ===
        facetSource.repositoryFieldParent ||
        f.settings?.specific?.masterFormColumn ===
        facetSource.repositoryFieldParent ||
        (f.label && f.label.trim().toLowerCase() === target),
    )
  }, [allFields, facetSource.repositoryFieldParent])

  const repoParentFieldName = repoParentField
    ? repoParentField.settings?.specific?.repositoryField ||
    repoParentField.label ||
    repoParentField.id
    : facetSource.repositoryFieldParent || ''

  const repoParentRawValue = repoParentField
    ? formModel?.[repoParentField.id]
    : facetSource.repositoryFieldParent && formModel
      ? formModel[facetSource.repositoryFieldParent]
      : undefined

  const repoParentValue = extractScalarStrings(repoParentRawValue)[0] || ''

  const hasRepoParentFilter = Boolean(facetSource.repositoryFieldParent)
  const isRepoFacetEnabled =
    facetSource.enabled && (!hasRepoParentFilter || Boolean(repoParentValue))

  const { data: uniqueFieldOptions = [] } = useQuery({
    enabled: isRepoFacetEnabled,
    queryKey: [
      'formEntriesFacets',
      facetSource.repositoryId,
      facetSource.fieldName,
      repoParentFieldName,
      repoParentValue,
    ],
    queryFn: async () => {
      const scopeFilters: Record<string, string> = {}
      if (repoParentFieldName && repoParentValue) {
        scopeFilters[repoParentFieldName] = repoParentValue
      }
      const res = await getRepositoryItemFacets({
        fieldName: facetSource.fieldName,
        limit: 1000,
        repositoryId: facetSource.repositoryId,
        scopeFilters:
          Object.keys(scopeFilters).length > 0 ? scopeFilters : undefined,
      })
      return facetsToFieldOptions(res.data, {
        splitArrayValues: field.type === 'MULTI_SELECT',
      })
    },
  })

  const { data: userFieldOptions = [] } = useQuery({
    enabled: optionsType === 'USER_LIST',
    queryKey: ['formEntriesUserList'],
    queryFn: async () => {
      const res = await getUsers()
      return res.data.map((user) => ({ id: user.email, name: user.email }))
    },
  })

  const { data: masterFieldOptions = [] } = useQuery({
    enabled: masterInfo.enabled,
    queryKey: [
      'formEntriesMasterOptions',
      masterInfo.masterFormId,
      masterInfo.masterFormColumn,
      parentValue,
      parentMasterColumn,
      masterInfo.showAllData,
    ],
    queryFn: () =>
      fetchMasterFormColumnOptions(
        masterInfo.masterFormId,
        masterInfo.masterFormColumn,
        parentValue,
        parentMasterColumn,
        masterInfo.showAllData,
      ),
  })

  const normalizedDistinctOptions = fieldDistinctOptions.map((o) => ({
    id: String(o.id),
    name: o.name,
  }))

  const selectOptions = withExtraFieldOptions(
    withExtraFieldOptions(
      withExtraFieldOptions(
        withExtraFieldOptions(
          optionsType === 'DYNAMIC'
            ? getFieldOptions(field)
            : getConfiguredFieldOptions(field),
          uniqueFieldOptions,
        ),
        userFieldOptions,
      ),
      masterFieldOptions,
    ),
    normalizedDistinctOptions,
  )

  const isMulti = field.type === 'MULTI_SELECT'

  useEffect(() => {
    if (selectOptions.length === 1) {
      const singleOpt = selectOptions[0]
      const singleVal = String(singleOpt.id ?? singleOpt.name)
      if (isMulti) {
        const selectedValues = val
          ? String(val)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
          : []
        if (selectedValues.length === 0) {
          onChange(singleVal)
        }
      } else {
        if (val === undefined || val === null || val === '') {
          onChange(singleVal)
        }
      }
    }
  }, [selectOptions, val, isMulti, onChange])

  if (isMulti) {
    const selectedValues = val
      ? String(val)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      : []
    const selectedOpts = selectedValues.map((v) => ({ id: v, name: v }))

    return (
      <InputSelectMultiple
        options={withExtraFieldOptions(selectOptions, selectedOpts)}
        value={selectedOpts}
        creatable
        searchable
        placeholder={
          field.settings?.general?.placeholder || 'Select options...'
        }
        onChange={(vals: Option[]) =>
          onChange(vals.map((v) => String(v.id ?? v.value ?? v.name)).join(','))
        }
      />
    )
  }

  const selectedOpt = val ? { id: String(val), name: String(val) } : null

  return (
    <InputSelect
      placeholder={field.settings?.general?.placeholder || 'Select an option'}
      value={selectedOpt}
      creatable
      searchable
      options={withExtraFieldOptions(
        selectOptions,
        selectedOpt ? [selectedOpt] : [],
      )}
      onChange={(opt) =>
        onChange(opt ? String(opt.id ?? opt.value ?? opt.name) : '')
      }
    />
  )
}

const FormEntriesSearchableInput = ({
  field,
  val,
  formId,
  editValues,
  onUpdateModel,
  children,
}: {
  field: Question
  val: any
  formId?: string
  editValues: Record<string, any>
  onUpdateModel: (patch: Record<string, any>) => void
  children: React.ReactNode
}) => {
  const [isSearching, setIsSearching] = useState(false)
  const isSearchField = field?.settings?.specific?.isSearchField === 'YES'

  if (!isSearchField) return <>{children}</>

  const handleSearch = () => {
    executeSearchFieldSync({
      field,
      searchValue: val,
      currentFormId: formId,
      formModel: editValues,
      onUpdateModel,
      onSearchingStateChange: setIsSearching,
    })
  }

  return (
    <div className='relative flex items-center w-full gap-2'>
      <div
        className='flex-1 min-w-0'
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
          }
        }}
      >
        {children}
      </div>
      <Tooltip label='Search & Auto-Sync Fields' withArrow>
        <button
          type='button'
          disabled={isSearching}
          className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent-soft bg-accent-soft text-accent-primary hover:bg-accent-primary hover:text-white transition-all disabled:opacity-50'
          onClick={handleSearch}
        >
          {isSearching ? (
            <Icon className='size-4 animate-spin' name='lucide:loader-2' />
          ) : (
            <Icon className='size-4' name='lucide:search' />
          )}
        </button>
      </Tooltip>
    </div>
  )
}

// Helper to generate dynamic mock values based on field schema
const generateDummyEntries = (fields: Question[], count: number = 6) => {
  const sampleUsers = [
    'seth@ezofis.com',
    'alex@ezofis.com',
    'sarah@ezofis.com',
    'david@ezofis.com',
    'lisa@ezofis.com',
    'emily@ezofis.com',
  ]

  const activeFields =
    fields.length > 0
      ? fields
      : [
        { id: 'f1', label: 'Initial Value', type: 'SHORT_TEXT' } as Question,
        { id: 'f2', label: 'Status', type: 'SHORT_TEXT' } as Question,
      ]

  return Array.from({ length: count }).map((_, idx) => {
    const entryId = `Entry #${idx + 1}`
    const values: Record<string, any> = {}

    activeFields.forEach((field) => {
      const type = (field.type || 'SHORT_TEXT').toUpperCase()
      const label = (field.label || '').toLowerCase()

      if (type === 'CALCULATED') {
        return
      } else if (type === 'EMAIL' || label.includes('email')) {
        values[field.id] = `respondent${idx + 1}@ezofis.com`
      } else if (
        type === 'PHONE_NUMBER' ||
        label.includes('phone') ||
        label.includes('mobile')
      ) {
        values[field.id] = `+1 555-010${idx + 1}`
      } else if (type === 'DATE' || label.includes('date')) {
        values[field.id] = `2026-06-0${idx + 1}`
      } else if (type === 'TIME' || label.includes('time')) {
        values[field.id] = `10:3${idx} AM`
      } else if (
        type === 'NUMBER' ||
        type === 'COUNTER' ||
        label.includes('age') ||
        label.includes('qty')
      ) {
        values[field.id] = Math.floor(Math.random() * 80) + 20
      } else if (
        type === 'CURRENCY_AMOUNT' ||
        label.includes('amount') ||
        label.includes('price')
      ) {
        values[field.id] = `$${(Math.random() * 400 + 100).toFixed(2)}`
      } else if (type === 'YES_NO_TOGGLE' || type === 'CONSENT') {
        values[field.id] = idx % 2 === 0 ? 'Yes' : 'No'
      } else if (type === 'RATING') {
        values[field.id] = '⭐'.repeat((idx % 3) + 3)
      } else {
        // Fallbacks for generic inputs
        if (label.includes('name')) {
          const names = [
            'Emma Watson',
            'James Smith',
            'Sophia Jones',
            'Michael Brown',
            'Olivia Taylor',
            'David Miller',
          ]
          values[field.id] = names[idx % names.length]
        } else if (label.includes('company')) {
          const companies = [
            'EZOFIS Corp',
            'Google LLC',
            'DeepMind Inc',
            'Acme Systems',
            'Globex Corp',
          ]
          values[field.id] = companies[idx % companies.length]
        } else if (label.includes('subject') || label.includes('issue')) {
          const issues = [
            'Billing query',
            'Access request',
            'Bug report',
            'Feature feedback',
            'General question',
          ]
          values[field.id] = issues[idx % issues.length]
        } else if (field.settings?.specific?.customOptions) {
          const optString = field.settings.specific.customOptions
          const delimiter =
            field.settings.specific.separateOptionsUsing === 'COMMA'
              ? ','
              : '\n'
          const opts = optString
            .split(delimiter)
            .map((o: any) => o.trim())
            .filter(Boolean)
          values[field.id] =
            opts.length > 0 ? opts[idx % opts.length] : `Option ${idx + 1}`
        } else {
          values[field.id] = `Sample ${field.label || 'Value'} ${idx + 1}`
        }
      }
    })

    return {
      createdAt: `2026-06-04T12:00:00.000Z`,
      createdBy: sampleUsers[idx % sampleUsers.length],
      id: entryId,
      isDeleted: false,
      values: applyCalculatedFields(
        [{ fields: activeFields, id: 'dummy', settings: { description: '' } }],
        values,
      ),
    }
  })
}

// Sub-component for Inline Expansion Line Item Form (Flat-Focus UI compliant: no drawers, no popups, no modals)
const FormLineItemInlineEditor = ({
  columns,
  initialRow,
  isOpen,
  onClose,
  onSave,
}: {
  columns: { id: string; label: string }[]
  initialRow: Record<string, any> | null
  isOpen: boolean
  onClose: () => void
  onSave: (row: Record<string, any>, addAnother?: boolean) => void
}) => {
  const { t } = useLingui()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  )

  useEffect(() => {
    if (isOpen) {
      setFormData(initialRow ? { ...initialRow } : {})
      setIsDirty(false)
      setShowCloseConfirm(false)
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus()
        }
      }, 100)
    }
  }, [isOpen, initialRow])

  if (!isOpen) return null

  const handleFieldChange = (colId: string, val: any) => {
    setFormData((prev) => {
      const next = { ...prev, [colId]: val }
      // Auto-calculate Extended / Total if Quantity and Unit Cost are present
      const qtyKey = columns.find((c) =>
        ['qty', 'quantity', 'count'].includes(
          c.id.toLowerCase().replace(/[^a-z0-9]/g, ''),
        ),
      )?.id
      const priceKey = columns.find((c) =>
        ['price', 'unitcost', 'unitprice', 'cost', 'rate'].includes(
          c.id.toLowerCase().replace(/[^a-z0-9]/g, ''),
        ),
      )?.id
      const extendedKey = columns.find((c) =>
        ['extended', 'total', 'amount', 'linetotal'].includes(
          c.id.toLowerCase().replace(/[^a-z0-9]/g, ''),
        ),
      )?.id

      if (extendedKey && (colId === qtyKey || colId === priceKey)) {
        const q =
          parseFloat(
            String(colId === qtyKey ? val : next[qtyKey || ''] || 0),
          ) || 0
        const p =
          parseFloat(
            String(colId === priceKey ? val : next[priceKey || ''] || 0),
          ) || 0
        if (q > 0 && p > 0) {
          next[extendedKey] = (q * p).toFixed(2)
        }
      }
      return next
    })
    setIsDirty(true)
  }

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const isEditMode = !!initialRow

  return (
    <div className='animate-in fade-in slide-in-from-top-3 my-3 space-y-4 rounded-xl border border-accent-soft bg-surface-primary p-5 font-inter shadow-xs duration-300'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-gray-2 pb-3'>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-7 items-center justify-center rounded-lg bg-accent-soft/20 text-accent-primary'>
            <Icon
              className='size-4'
              name={isEditMode ? 'lucide:pencil' : 'lucide:plus'}
            />
          </div>
          <div>
            <h4 className='text-xs font-bold text-gray-13'>
              {isEditMode ? t`Edit Line Item` : t`Add Line Item`}
            </h4>
            <p className='text-[11px] text-gray-7'>
              {t`Enter itemized quantity, pricing, and specs inline below.`}
            </p>
          </div>
        </div>
        <IconButton
          color='gray'
          icon='lucide:x'
          size='xs'
          variant='ghost'
          onClick={handleAttemptClose}
        />
      </div>

      {/* Unsaved Changes Confirmation Warning */}
      {showCloseConfirm && (
        <div className='border-amber-3 bg-amber-2 text-amber-11 flex items-center justify-between gap-4 rounded-lg border p-3 shadow-xs'>
          <div className='flex items-center gap-2 text-xs font-semibold'>
            <Icon
              className='text-amber-9 size-4 shrink-0'
              name='lucide:triangle-alert'
            />
            <span>Unsaved changes will be lost. Discard changes?</span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              color='gray'
              size='xs'
              variant='outline'
              onClick={() => setShowCloseConfirm(false)}
            >
              Keep Editing
            </Button>
            <Button color='red' size='xs' variant='solid' onClick={onClose}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Fields Grid */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {columns.map((col, idx) => {
          const normId = col.id.toLowerCase().replace(/[^a-z0-9]/g, '')
          const isLongText =
            normId.includes('description') ||
            normId.includes('note') ||
            normId.includes('comment') ||
            normId.includes('spec')

          const isNumber =
            normId.includes('qty') ||
            normId.includes('quantity') ||
            normId.includes('cost') ||
            normId.includes('price') ||
            normId.includes('tax') ||
            normId.includes('extended') ||
            normId.includes('amount') ||
            normId.includes('rate')

          const val = formData[col.id] ?? ''

          return (
            <div
              key={col.id}
              className={cn(
                'flex flex-col gap-1',
                isLongText ? 'col-span-1 sm:col-span-2' : 'col-span-1',
              )}
            >
              <label className='block text-xs font-bold text-gray-12'>
                {col.label}
                {(idx === 0 ||
                  normId.includes('item') ||
                  normId.includes('part')) && (
                    <span className='ml-1 font-bold text-red-9'>*</span>
                  )}
              </label>

              {isLongText ? (
                <InputTextarea
                  placeholder={`Enter ${col.label.toLowerCase()}...`}
                  ref={idx === 0 ? (firstInputRef as any) : undefined}
                  value={val}
                  onChange={(text) => handleFieldChange(col.id, text)}
                />
              ) : isNumber ? (
                <InputNumber
                  placeholder='0.00'
                  ref={idx === 0 ? (firstInputRef as any) : undefined}
                  value={val}
                  onChange={(num) => handleFieldChange(col.id, num)}
                />
              ) : (
                <InputText
                  placeholder={`Enter ${col.label.toLowerCase()}...`}
                  ref={idx === 0 ? (firstInputRef as any) : undefined}
                  value={val}
                  onChange={(text) => handleFieldChange(col.id, text)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Inline Footer Toolbar */}
      <div className='flex items-center justify-between border-t border-gray-2 pt-3'>
        <Button
          color='gray'
          label={t`Cancel`}
          size='sm'
          variant='outline'
          onClick={handleAttemptClose}
        />
        <div className='flex items-center gap-2'>
          {!isEditMode && (
            <Button
              color='gray'
              icon='lucide:plus-circle'
              label={t`Save & Add Another`}
              size='sm'
              variant='outline'
              onClick={() => {
                onSave(formData, true)
                setFormData({})
                setIsDirty(false)
                if (firstInputRef.current) firstInputRef.current.focus()
              }}
            />
          )}
          <Button
            color='primary'
            icon='lucide:check'
            label={isEditMode ? t`Save Changes` : t`Save Line Item`}
            size='sm'
            variant='solid'
            onClick={() => onSave(formData, false)}
          />
        </div>
      </div>
    </div>
  )
}

// Sub-component for rendering line items / table fields inside entry creation/editing
const FormLineItemsEditor = ({
  field,
  isFieldRequired,
  // isFieldRequired,
  value,
  getFieldLabel,
  onChange,
}: {
  field: Question
  isFieldRequired?: boolean
  // isFieldRequired?: boolean
  value: any
  getFieldLabel: (key: string) => string
  onChange: (val: string) => void
}) => {
  const { t } = useLingui()
  const [isInlineOpen, setIsInlineOpen] = useState(false)
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [highlightedRowIndex, setHighlightedRowIndex] = useState<number | null>(
    null,
  )

  // Parse existing data
  const rows: any[] = useMemo(() => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        console.error('Failed to parse line items JSON:', e)
      }
    }
    return []
  }, [value])

  // Determine columns
  const columns = useMemo(() => {
    const tableCols =
      field.settings?.specific?.tableColumns ||
      (field.settings?.specific as any)?.columns
    if (Array.isArray(tableCols) && tableCols.length > 0) {
      return tableCols.map((c: any) => ({
        id: c.id || c.name || c.key,
        label: c.name || c.label || getFieldLabel(c.id || c.name || c.key),
      }))
    }
    if (rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null) {
      return Object.keys(rows[0]).map((k) => ({
        id: k,
        label: getFieldLabel(k),
      }))
    }
    // Default fallback columns for line items table
    return [
      { id: 'item', label: 'Item Name' },
      { id: 'description', label: 'Description' },
      { id: 'qty', label: 'Quantity' },
      { id: 'price', label: 'Unit Price' },
      { id: 'total', label: 'Total Amount' },
    ]
  }, [field, rows, getFieldLabel])

  const handleOpenAdd = () => {
    setEditingRowIndex(null)
    setIsInlineOpen(true)
  }

  const handleOpenEdit = (rIdx: number) => {
    setEditingRowIndex(rIdx)
    setIsInlineOpen(true)
  }

  const handleSaveInlineRow = (
    savedRow: Record<string, any>,
    addAnother?: boolean,
  ) => {
    let updatedRows: any[] = []
    let targetIdx = 0

    if (editingRowIndex !== null) {
      updatedRows = rows.map((row, idx) =>
        idx === editingRowIndex ? savedRow : row,
      )
      targetIdx = editingRowIndex
    } else {
      updatedRows = [...rows, savedRow]
      targetIdx = updatedRows.length - 1
    }

    onChange(JSON.stringify(updatedRows))

    // Highlight row briefly
    setHighlightedRowIndex(targetIdx)
    setTimeout(() => setHighlightedRowIndex(null), 2500)

    if (!addAnother) {
      setIsInlineOpen(false)
      setEditingRowIndex(null)
    }
  }

  const handleDeleteRow = (rowIndex: number) => {
    const updated = rows.filter((_, idx) => idx !== rowIndex)
    onChange(JSON.stringify(updated))
  }

  return (
    <div className='space-y-3 font-inter'>
      {/* Table Field Title & Action Row */}
      <div className='mb-1.5 flex items-center justify-between'>
        <div>
          <label className='block text-xs font-bold text-gray-12'>
            {field.label || 'Untitled Question'}
            {isFieldRequired && (
              <span
                className='ml-1 font-bold text-red-9'
                title='Required field'
              >
                *
              </span>
            )}
          </label>
          {field.settings?.general?.description && (
            <p className='mt-0.5 text-[11px] text-gray-7'>
              {field.settings.general.description}
            </p>
          )}
        </div>
        <Button
          color='primary'
          icon='lucide:plus'
          label={t`Add Line Item`}
          size='xs'
          variant='solid'
          onClick={handleOpenAdd}
        />
      </div>

      {/* Inline Expansion Form Card (Flat-Focus UI rule compliant) */}
      <FormLineItemInlineEditor
        columns={columns}
        initialRow={editingRowIndex !== null ? rows[editingRowIndex] : null}
        isOpen={isInlineOpen}
        onClose={() => {
          setIsInlineOpen(false)
          setEditingRowIndex(null)
        }}
        onSave={handleSaveInlineRow}
      />

      {rows.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-3 bg-surface py-8 text-center'>
          <div className='mb-2 flex size-10 items-center justify-center rounded-full bg-gray-2 text-gray-7'>
            <Icon className='size-5' name='lucide:shopping-bag' />
          </div>
          <p className='text-xs font-semibold text-gray-11'>
            No line items added
          </p>
          <p className='mt-0.5 text-[11px] text-gray-7'>
            Click &quot;Add Line Item&quot; to include itemized goods and
            pricing.
          </p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-xl border border-gray-2 bg-surface shadow-xs'>
          <div className='custom-scrollbar max-h-[340px] overflow-x-auto overflow-y-auto'>
            <table className='w-full border-collapse text-left text-xs'>
              <thead>
                <tr className='bg-surface-muted/95 sticky top-0 z-10 border-b border-gray-2 backdrop-blur-xs'>
                  {columns.map((col) => (
                    <th
                      className='p-2.5 font-bold whitespace-nowrap text-gray-11'
                      key={col.id}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className='w-20 p-2.5 text-center font-bold text-gray-11'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => {
                  const isHighlighted = highlightedRowIndex === rIdx
                  return (
                    <tr
                      key={rIdx}
                      className={cn(
                        'hover:bg-surface-hover/60 border-b border-gray-1 transition-colors last:border-0',
                        isHighlighted ? 'animate-pulse bg-accent-soft/20' : '',
                      )}
                    >
                      {columns.map((col) => (
                        <td
                          className='p-2.5 font-medium whitespace-nowrap text-gray-12'
                          key={col.id}
                        >
                          {row[col.id] !== undefined &&
                            row[col.id] !== null &&
                            String(row[col.id]).trim() !== '' ? (
                            String(row[col.id])
                          ) : (
                            <span className='text-gray-5'>—</span>
                          )}
                        </td>
                      ))}
                      <td className='p-2 text-center'>
                        <div className='flex items-center justify-center gap-1'>
                          <IconButton
                            color='gray'
                            icon='lucide:pencil'
                            size='sm'
                            title={t`Edit Line Item`}
                            variant='ghost'
                            onClick={() => handleOpenEdit(rIdx)}
                          />
                          <IconButton
                            color='red'
                            icon='lucide:trash-2'
                            size='sm'
                            title={t`Delete Row`}
                            variant='ghost'
                            onClick={() => handleDeleteRow(rIdx)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className='bg-surface-muted/60 flex items-center justify-between border-t border-gray-2 px-4 py-3 text-xs'>
            <span className='text-[11px] font-medium text-gray-7'>
              Showing {rows.length} line {rows.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const FormEntriesPage = () => {
  const { t } = useLingui()
  const { formId } = useParams({ strict: false }) as any
  const navigate = useNavigate()
  const deepLinkSearch: any = useSearch({ strict: false })

  const [entries, setEntries] = useState<any[]>([])
  const [trashEntries, setTrashEntries] = useState<any[]>([])
  const [tabValue, setTabValue] = useState<string>('Browse')
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<{
    id: string
    type: 'trash' | 'permanent'
  } | null>(null)

  // Pagination states
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  // Active line items for the modal table explorer
  const [activeLineItems, setActiveLineItems] = useState<{
    colLabel: string
    data: any[]
    rowId: string
  } | null>(null)

  // Fetch users list for Created By resolution
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const { error, payload } = await userApi.getUserList()
      if (error) throw new Error(error)
      return payload || []
    },
  })

  // Helper to match createdBy user ID to user name or logged in user name
  const resolveUserName = (userId: string) => {
    const store = authUserStore.getState()
    const loggedInSession = store.session
    const loggedInUser = store.user
    const currentUserName =
      loggedInSession?.name ||
      (loggedInSession?.firstName
        ? `${loggedInSession.firstName} ${loggedInSession.lastName || ''}`.trim()
        : '') ||
      loggedInSession?.email ||
      loggedInUser?.name ||
      loggedInUser?.email ||
      ''

    if (
      !userId ||
      userId === 'unknown@ezofis.com' ||
      userId.toLowerCase() === 'unknown'
    ) {
      return currentUserName || 'System'
    }

    if (usersData && Array.isArray(usersData)) {
      const user = usersData.find(
        (u: any) =>
          String(u.id) === String(userId) ||
          String(u.userId) === String(userId) ||
          String(u.email || '').toLowerCase() === String(userId).toLowerCase(),
      )
      if (user) {
        const fullName =
          user.fullName ||
          user.name ||
          (user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : '') ||
          user.loginName ||
          user.email
        if (fullName) return fullName
      }
    }

    if (
      loggedInSession &&
      (String(loggedInSession.id) === String(userId) ||
        String(loggedInSession.email || '').toLowerCase() ===
        String(userId).toLowerCase())
    ) {
      if (currentUserName) return currentUserName
    }

    return userId
  }

  // Fetch form schema
  const {
    data: formData,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    enabled: !!formId,
    queryKey: ['forms', 'detail', formId],
    queryFn: async () => {
      const { data, error } = await formApi.getFormDataById(formId)
      if (error) throw new Error(error)
      return data
    },
  })

  // Fetch form entries from backend API
  const {
    data: fetchedEntries,
    isError: isEntriesError,
    isLoading: isEntriesLoading,
    refetch: refetchEntries,
  } = useQuery({
    enabled: !!formId,
    queryKey: ['forms', 'entries', formId],
    queryFn: async () => {
      const { data, error } = await formApi.getFormEntries(formId, 1, 500)
      if (error) throw new Error(error)
      if (data && typeof data === 'object' && Array.isArray(data.entries)) {
        return data.entries
      }
      return Array.isArray(data) ? data : []
    },
  })

  const panels = useMemo(() => {
    if (!formData) return []
    let json = formData._json || formData.formJson
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json)
      } catch (e) {
        console.error('Failed to parse formJson:', e)
        json = null
      }
    }
    return json?.panels || []
  }, [formData])

  const fields = useMemo(
    () => panels.flatMap((p: any) => p.fields || []),
    [panels],
  )

  const formName = useMemo(() => {
    if (!formData) return ''
    let json = formData._json || formData.formJson
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json)
      } catch (e) {
        console.error('Failed to parse formJson:', e)
        json = null
      }
    }
    return json?.settings?.general?.name || formData?.name || ''
  }, [formData])

  const isPoMasterForm = useMemo(() => {
    const normalized = formName.toLowerCase().replace(/[^a-z0-9]/g, '')
    return normalized.includes('pomaster')
  }, [formName])

  // Resolver helper to find human-readable names for nested keys inside table structures
  const getFieldLabel = useCallback(
    (key: string) => {
      const topField = fields.find((item: Question) => item.id === key)
      if (topField) return topField.label || key

      for (const field of fields) {
        const tableCols =
          field.settings?.specific?.tableColumns ||
          field.settings?.specific?.columns
        if (Array.isArray(tableCols)) {
          const matchedCol = tableCols.find((col: any) => col.id === key)
          if (matchedCol) return matchedCol.name || matchedCol.label || key
        }
      }

      return key
    },
    [fields],
  )

  // Distinct values already used for each SELECT-type field, sourced from
  // existing entries, so dropdowns offer real data instead of static options
  const fieldDistinctOptions = useMemo(() => {
    const map: Record<string, Option[]> = {}
    fields.forEach((field: Question) => {
      const isMulti = (field.type || '').toUpperCase() === 'MULTI_SELECT'
      const unique = new Set<string>()
      entries.forEach((entry) => {
        const raw = entry.values?.[field.id]
        if (raw === undefined || raw === null || raw === '') return
        if (typeof raw === 'string' && raw.trim().startsWith('[')) return

        if (isMulti) {
          String(raw)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .forEach((v) => unique.add(v))
        } else {
          unique.add(String(raw).trim())
        }
      })
      map[field.id] = Array.from(unique).map((v) => ({ id: v, name: v }))
    })
    return map
  }, [fields, entries])

  // Set up standard data table state
  const {
    expandState,
    groupState,
    searchState,
    sortState,
    visibilityState,
    setExpandState,
    setSearchState,
    setVisibilityState,
    ...restState
  } = useDataTableState({
    initialVisibilityState: {},
  })

  // Synchronize fetched entries from backend with component state
  useEffect(() => {
    if (fetchedEntries && Array.isArray(fetchedEntries)) {
      const parsedEntries = fetchedEntries.map((e: any) => {
        const metadataKeys = [
          'itemId',
          'id',
          'uid',
          'createdAt',
          'modifiedAt',
          'createdBy',
          'modifiedBy',
          'isDeleted',
          'todayTask',
          'isMarked',
          'ValidFrom',
          'ValidTo',
        ]
        // Extract flat dynamic field values from API item root into values object
        let values: Record<string, any> = {}
        if (e.values) {
          if (typeof e.values === 'string') {
            try {
              values = JSON.parse(e.values)
            } catch (err) {
              console.error('Failed to parse entry values:', err)
            }
          } else {
            values = e.values
          }
        } else {
          Object.keys(e).forEach((key) => {
            if (!metadataKeys.includes(key)) {
              values[key] = e[key]
            }
          })
        }

        const store = authUserStore.getState()
        const loggedInUserEmail =
          store.session?.email ||
          store.user?.email ||
          store.session?.name ||
          store.user?.name ||
          ''

        const rawCreatedBy =
          e.createdBy ??
          e.CreatedBy ??
          e.created_by ??
          e.createdUser ??
          e.user ??
          e.userId ??
          e.createdById

        const createdBy =
          rawCreatedBy && rawCreatedBy !== 'unknown@ezofis.com'
            ? rawCreatedBy
            : loggedInUserEmail || 'unknown@ezofis.com'

        return {
          createdAt: e.createdAt || e.CreatedDate || new Date().toISOString(),
          createdBy,
          entryId: e.itemId ?? e.entryId ?? e.id ?? 0,
          id: e.itemId
            ? `Entry #${e.itemId}`
            : e.id || e.uid || `Entry #${Math.random()}`,
          isDeleted: !!e.isDeleted,
          values,
        }
      })

      const active = parsedEntries.filter((e: any) => !e.isDeleted)
      const trashed = parsedEntries.filter((e: any) => e.isDeleted)
      setEntries(active)
      setTrashEntries(trashed)
    }
  }, [fetchedEntries])

  const handleFieldChange = (fieldId: string, val: any) => {
    setEditValues((prev) => {
      const next = { ...prev, [fieldId]: val }
      const dependentChildIds = getDependentChildFieldIds(fieldId, panels)
      for (const childId of dependentChildIds) {
        delete next[childId]
      }
      return applyCalculatedFields(panels, next)
    })
  }

  // Slide-in pane toggle functions
  const openNewEntry = () => {
    setEditValues(applyCalculatedFields(panels, {}))
    setSelectedEntry(null)
    setIsAddOpen(true)
  }

  const openEditEntry = (entry: any) => {
    setEditValues(applyCalculatedFields(panels, { ...entry.values }))
    setSelectedEntry(entry)
    setIsAddOpen(false)
  }

  // Notification / Ask AI deep-link: open entry and optionally seed table search
  useEffect(() => {
    const entryId = String(deepLinkSearch.entryId || '').trim()
    const searchText = String(deepLinkSearch.search || '').trim()
    if (!entryId && !searchText) return
    if (entries.length === 0 && entryId) return

    if (searchText) {
      setSearchState({ id: '', value: searchText })
    }

    if (entryId) {
      const target = entries.find((entry) => entry.id === entryId)
      if (target) openEditEntry(target)
    }

    void navigate({
      params: { formId },
      replace: true,
      search: {},
      to: '/forms/$formId/entries',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const closeSidebar = () => {
    setIsAddOpen(false)
    setSelectedEntry(null)
    setEditValues({})
  }

  // Actions
  const handleSaveEntry = async () => {
    setIsSaving(true)
    try {
      let targetEntryId: number | string =
        '00000000-0000-0000-0000-000000000000'
      if (!isAddOpen && selectedEntry) {
        targetEntryId =
          selectedEntry.entryId ??
          selectedEntry.itemId ??
          (typeof selectedEntry.id === 'string'
            ? selectedEntry.id.replace(/^Entry #/, '')
            : selectedEntry.id) ??
          '00000000-0000-0000-0000-000000000000'
      }

      const { data, error } = await formApi.saveFormEntry(
        formId,
        targetEntryId,
        editValues,
      )

      if (error) {
        showToast({
          message: error || 'Failed to save form entry',
          variant: 'error',
        })
        return
      }

      showToast({
        message: isAddOpen
          ? 'Entry created successfully!'
          : 'Entry updated successfully!',
        variant: 'success',
      })

      await refetchEntries()
      closeSidebar()
    } catch (err: any) {
      console.error('Error saving entry:', err)
      showToast({
        message: err.message || 'Error saving form entry',
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleMoveToTrash = (entryId: string) => {
    const item = entries.find((e) => e.id === entryId)
    if (item) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
      setTrashEntries((prev) => [{ ...item, isDeleted: true }, ...prev])
      showToast({ message: 'Entry moved to Trash', variant: 'success' })
      if (selectedEntry?.id === entryId) closeSidebar()
    }
  }

  const handleRestore = (entryId: string) => {
    const item = trashEntries.find((e) => e.id === entryId)
    if (item) {
      setTrashEntries((prev) => prev.filter((e) => e.id !== entryId))
      setEntries((prev) => [...prev, { ...item, isDeleted: false }])
      showToast({ message: 'Entry restored successfully', variant: 'success' })
    }
  }

  const handlePermanentDelete = (entryId: string) => {
    setTrashEntries((prev) => prev.filter((e) => e.id !== entryId))
    showToast({ message: 'Entry deleted permanently', variant: 'success' })
  }

  // Filtering based on active tab and search state
  const activeList = tabValue === 'Browse' ? entries : trashEntries
  const searchVal = searchState.value || ''

  // Reset page when tab, search value or sort changes
  useEffect(() => {
    setPage(1)
  }, [tabValue, searchVal, sortState])

  const filteredEntries = useMemo(() => {
    let list = activeList

    // Apply Custom Filters
    list = list.filter((entry) => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'createdAt' || key === 'modifiedAt') {
          if (!matchesDateRangeValue(entry[key], value)) matches = false
        } else if (key === 'createdBy' || key === 'modifiedBy') {
          if (!matchesCategoryFilterValue(entry[key], value)) matches = false
        } else {
          const entryVal = entry[key] || entry.values?.[key]
          if (!matchesCategoryFilterValue(entryVal, value, 'contains')) {
            matches = false
          }
        }
      })
      return matches
    })

    if (!searchVal.trim()) return list
    const q = searchVal.toLowerCase()

    return list.filter((entry) => {
      if (entry.id.toLowerCase().includes(q)) return true
      const resolvedUserName = resolveUserName(entry.createdBy).toLowerCase()
      if (resolvedUserName.includes(q)) return true
      return Object.values(entry.values).some((v) =>
        String(v).toLowerCase().includes(q),
      )
    })
  }, [activeList, searchVal, activeFilters])

  // Sorting
  const sortedAndFilteredEntries = useMemo(() => {
    const list = [...filteredEntries]
    if (sortState && sortState.length > 0) {
      const { desc, id } = sortState[0]
      list.sort((a, b) => {
        let valA, valB
        if (id === 'id') {
          valA = a.id
          valB = b.id
        } else if (id === 'createdBy') {
          valA = a.createdBy
          valB = b.createdBy
        } else {
          valA = a.values?.[id] ?? ''
          valB = b.values?.[id] ?? ''
        }

        if (typeof valA === 'string') {
          return desc
            ? String(valB).localeCompare(String(valA))
            : String(valA).localeCompare(String(valB))
        } else {
          return desc
            ? Number(valB) - Number(valA)
            : Number(valA) - Number(valB)
        }
      })
    }
    return list
  }, [filteredEntries, sortState])

  const totalItems = sortedAndFilteredEntries.length

  // Paginated list
  const paginatedEntries = useMemo(() => {
    if (pageSize === 0) return sortedAndFilteredEntries
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return sortedAndFilteredEntries.slice(start, end)
  }, [sortedAndFilteredEntries, page, pageSize])

  // Build Table Columns dynamically
  const columns: Column[] = useMemo(() => {
    const colList: Column[] = []

    // Render dynamic columns from fields
    fields.forEach((field: Question) => {
      const fieldLabel = field.label || t`Untitled Field`
      const isStatusCol = fieldLabel.toLowerCase().trim() === 'matched status'

      // Calculate max character length across header label and cell values
      let maxCharLength = fieldLabel.length
      paginatedEntries.forEach((row: any) => {
        const val = row.values?.[field.id]
        if (val !== undefined && val !== null) {
          const valStr = String(val)
          if (valStr.length > maxCharLength) {
            maxCharLength = valStr.length
          }
        }
      })

      // Dynamic width calculation (min 180px, max 450px)
      const dynamicSize = Math.min(Math.max(maxCharLength * 11 + 54, 180), 450)

      colList.push({
        id: field.id,
        label: fieldLabel,
        // minSize: dynamicSize,
        size: dynamicSize,
        renderCell: (row: any) => {
          const val = row.values?.[field.id]

          // 1. Handle matched status badge
          if (isStatusCol && val) {
            const statusStr = String(val).trim()
            let badgeColor: 'green' | 'red' | 'orange' | 'gray' = 'gray'
            const lowerStatus = statusStr.toLowerCase()
            if (
              lowerStatus.includes('partially matched') ||
              lowerStatus.includes('partial')
            ) {
              badgeColor = 'orange' // yellow/orange
            } else if (
              lowerStatus.includes('not matched') ||
              lowerStatus.includes('mismatch') ||
              lowerStatus.includes('fail') ||
              lowerStatus.includes('error')
            ) {
              badgeColor = 'red'
            } else if (
              lowerStatus.includes('matched') ||
              lowerStatus === 'match'
            ) {
              badgeColor = 'green'
            }
            return <Badge color={badgeColor} label={statusStr} />
          }

          // 2. Handle nested PO line items table inline expansion
          const isJsonTable = (() => {
            if (typeof val !== 'string') return false
            const trimmed = val.trim()
            return trimmed.startsWith('[') && trimmed.endsWith(']')
          })()

          if (isJsonTable) {
            let parsedData: any[] = []
            try {
              parsedData = JSON.parse(String(val))
            } catch (e) {
              console.error('Failed to parse nested table JSON', e)
            }

            return (
              <div className='flex items-center gap-2'>
                <IconButton
                  color='primary'
                  icon='lucide:table'
                  title={t`View Line Items Table`}
                  variant='ghost'
                  onClick={() =>
                    setActiveLineItems({
                      colLabel: fieldLabel,
                      data: parsedData,
                      rowId: row.id,
                    })
                  }
                />
                <span className='text-[10px] font-semibold text-gray-7'>
                  ({parsedData.length} {t`items`})
                </span>
              </div>
            )
          }

          return (
            <span className='block overflow-hidden font-medium text-ellipsis whitespace-nowrap text-[var(--gray-12)]'>
              {val !== undefined && val !== null ? String(val) : '-'}
            </span>
          )
        },
      })
    })

    if (fields.length === 0) {
      colList.push(
        {
          id: 'empty-1',
          label: t`Placeholder Column 1`,
          size: 180,
          renderCell: () => (
            <span className='text-[var(--gray-6)] italic'>
              {t`Empty form field`}
            </span>
          ),
        },
        {
          id: 'empty-2',
          label: t`Placeholder Column 2`,
          size: 180,
          renderCell: () => (
            <span className='text-[var(--gray-6)] italic'>
              {t`Empty form field`}
            </span>
          ),
        },
      )
    }

    colList.push(
      {
        id: 'createdBy',
        label: t`Created By`,
        size: 180,
        renderCell: (row: any) => (
          <span className='font-medium text-[var(--gray-12)]'>
            {resolveUserName(row.createdBy)}
          </span>
        ),
      },
      {
        className: 'p-1',
        enableSorting: false,
        hideHeader: true,
        id: 'actions',
        isDisplayColumn: true,
        label: t`Actions`,
        showMenu: false,
        size: 40,
        renderCell: (row: any) => (
          <div
            className='flex items-center justify-center'
            onClick={(e) => e.stopPropagation()}
          >
            <Menu
              position='bottom-end'
              width={180}
              target={
                <IconButton
                  color='gray'
                  icon='lucide:more-vertical'
                  variant='ghost'
                />
              }
            >
              {tabValue === 'Browse' ? (
                <>
                  <MenuItem
                    icon='lucide:pencil'
                    label={t`Edit`}
                    onClick={() => openEditEntry(row)}
                  />
                  <MenuItem
                    icon='lucide:trash-2'
                    iconClass='text-red-11'
                    label={t`Move to Trash`}
                    onClick={() =>
                      setDeletingEntry({ id: row.id, type: 'trash' })
                    }
                  />
                </>
              ) : (
                <>
                  <MenuItem
                    icon='lucide:rotate-ccw'
                    iconClass='text-green-11'
                    label={t`Restore`}
                    onClick={() => handleRestore(row.id)}
                  />
                  <MenuItem
                    icon='lucide:trash-2'
                    iconClass='text-red-11'
                    label={t`Delete Permanently`}
                    onClick={() =>
                      setDeletingEntry({ id: row.id, type: 'permanent' })
                    }
                  />
                </>
              )}
            </Menu>
          </div>
        ),
      },
    )

    return colList
  }, [fields, tabValue, activeLineItems, usersData, paginatedEntries, t])

  // Initialize selected columns (all columns visible by default)
  const [initialVisibilitySet, setInitialVisibilitySet] = useState(false)
  useEffect(() => {
    if (columns.length > 0 && !initialVisibilitySet) {
      const visibility: Record<string, boolean> = {}
      columns.forEach((col: Column) => {
        visibility[col.id] = true
      })
      setVisibilityState(visibility)
      setInitialVisibilitySet(true)
    }
  }, [columns, initialVisibilitySet, setVisibilityState])

  // Map flat paginated entries to DataTable format
  const formattedRows = useMemo(() => {
    return [
      {
        groupCount: paginatedEntries.length,
        groupId: 'all',
        groupKey: '',
        groupValue: '',
        items: paginatedEntries,
      },
    ]
  }, [paginatedEntries])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: formattedRows as any,
    state: {
      expandState,
      groupState,
      searchState,
      sortState,
      visibilityState,
      setExpandState,
      setSearchState,
      setVisibilityState,
      ...restState,
    },
  })

  const isPageLoading = isLoading || isEntriesLoading
  const isPageError = isError || isEntriesError

  const createdByOptions = useMemo(() => {
    const unique = new Map<string, string>()
    entries.forEach((e: any) => {
      if (e.createdBy) unique.set(e.createdBy, resolveUserName(e.createdBy))
    })
    return Array.from(unique.entries()).map(([value, label]) => ({
      label,
      value,
    }))
  }, [entries, usersData])

  const dynamicFilters = useMemo(() => {
    return fields
      .map((field: any) => {
        const unique = new Set<string>()
        entries.forEach((e) => {
          const val = e.values?.[field.id]
          // Skip JSON arrays for dropdown options
          if (val && !(typeof val === 'string' && val.trim().startsWith('['))) {
            unique.add(String(val))
          }
        })
        const options = Array.from(unique).map((val) => ({
          label: val,
          value: val,
        }))

        if (options.length === 0) return null

        return {
          id: field.id,
          label: field.label || field.id,
          options,
        }
      })
      .filter(Boolean) as any[]
  }, [fields, entries])

  const nameFieldFilter = useMemo(() => {
    return (
      dynamicFilters.find((f) =>
        String(f.label || f.id)
          .toLowerCase()
          .includes('name'),
      ) || null
    )
  }, [dynamicFilters])

  const moreEntryFilters = useMemo(() => {
    return dynamicFilters.filter((f) => f.id !== nameFieldFilter?.id)
  }, [dynamicFilters, nameFieldFilter])

  const getColumnSpan = (size?: string) => {
    switch (size) {
      case 'col-6':
        return 'col-span-12 md:col-span-6'
      case 'col-4':
        return 'col-span-12 md:col-span-4'
      case 'col-3':
        return 'col-span-12 md:col-span-3'
      default:
        return 'col-span-12'
    }
  }

  // Skeleton Loader for initial fetching
  if (isPageLoading) {
    return (
      <div className='bg-surface-muted/20 flex h-full flex-col p-8'>
        <div className='mb-6 flex items-center justify-between border-b border-gray-2 pb-4'>
          <Stack gap='xs'>
            <Skeleton height={14} width={120} />
            <Skeleton height={28} width={240} />
          </Stack>
          <Skeleton height={40} radius='md' width={130} />
        </div>
        <Skeleton className='mb-4' height={45} radius='md' />
        <Skeleton className='flex-1' height={300} radius='md' />
      </div>
    )
  }

  if (isPageError) {
    return (
      <div className='bg-surface-muted/20 flex h-full flex-col items-center justify-center p-8'>
        <div className='mb-4 flex size-14 items-center justify-center rounded-2xl border border-red-3 bg-red-2 text-red-11'>
          <Icon className='size-7 animate-bounce' name='lucide:alert-circle' />
        </div>
        <h3 className='text-lg font-bold text-gray-12'>Failed to load form</h3>
        <p className='mt-1 max-w-[280px] text-center text-xs text-gray-7'>
          The form may have been deleted, or there was a database networking
          error.
        </p>
        <Button
          className='mt-6'
          icon='lucide:rotate-cw'
          label={t`Retry Loading`}
          onClick={() => {
            refetch()
            refetchEntries()
          }}
        />
      </div>
    )
  }

  if (isImportOpen) {
    return (
      <div className='flex h-full flex-col bg-surface font-inter'>
        {isPoMasterForm ? (
          <PoSetupFlowPage onClose={() => setIsImportOpen(false)} />
        ) : (
          <GenericFormImportModal
            fields={fields}
            formId={formId}
            formName={formName}
            onClose={() => setIsImportOpen(false)}
            onComplete={() => refetchEntries()}
          />
        )}
      </div>
    )
  }

  const isPanelOpen = isAddOpen || !!selectedEntry

  if (isPanelOpen) {
    const evaluatedFieldStates = evaluateFormRules(panels, editValues)

    return (
      <div className='bg-surface-muted/20 flex h-full flex-col font-inter'>
        {/* Compact Enterprise Form Banner Header */}
        <div className='flex shrink-0 items-center justify-between border-b border-gray-2 bg-surface px-4 py-3.5 shadow-xs'>
          <div className='flex min-w-0 items-center gap-3.5'>
            <IconButton
              color='gray'
              icon='lucide:arrow-left'
              title={t`Back to Entries`}
              variant='ghost'
              onClick={closeSidebar}
            />
            <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft/15 text-accent-primary'>
              <Icon
                height={18}
                name={isAddOpen ? 'lucide:file-plus-2' : 'lucide:file-edit'}
                width={18}
              />
            </div>
            <div className='flex min-w-0 flex-col'>
              <div className='flex items-center gap-2.5'>
                <h3 className='truncate text-sm font-extrabold text-gray-13'>
                  {isAddOpen ? t`New Form Entry` : t`Edit Form Entry`}
                </h3>
              </div>
              <p className='truncate text-[11px] font-medium text-gray-7'>
                {isAddOpen
                  ? t`Complete required form information using the metadata-driven enterprise canvas below.`
                  : t`Modify existing form response answers and save changes.`}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body with ~80% Width Container */}
        <div className='custom-scrollbar bg-surface-muted/40 flex-1 overflow-y-auto px-4 py-6'>
          <div className='mx-auto w-full max-w-[1200px] space-y-6'>
            {panels.map((panel: any, pIdx: number) => {
              const panelTitle = panel.settings?.title || t`Section ${pIdx + 1}`
              const panelDescription = panel.settings?.description || ''
              const renderableFields = (panel.fields || []).filter((f: any) => {
                if (
                  ['HEADING', 'DIVIDER'].includes((f.type || '').toUpperCase())
                )
                  return false
                const state = evaluatedFieldStates[f.id]
                if (state && !state.visible) return false
                return true
              })

              if (renderableFields.length === 0) return null

              return (
                <div
                  className='rounded-2xl border border-gray-2 bg-surface p-6 shadow-xs transition-shadow hover:shadow-md'
                  key={panel.id || `panel_${pIdx}`}
                >
                  {/* Block Card Header */}
                  <div className='mb-5 flex items-center justify-between border-b border-gray-2 pb-3.5'>
                    <div className='flex items-center gap-3'>
                      <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft/20 text-accent-primary'>
                        <Icon className='size-4' name='lucide:layers' />
                      </div>
                      <div>
                        <h4 className='text-sm font-bold text-gray-12'>
                          {panelTitle}
                        </h4>
                        {panelDescription && (
                          <p className='text-[11px] text-gray-7'>
                            {panelDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Block Fields Layout using 12-column grid */}
                  <div className='grid grid-cols-12 gap-x-6 gap-y-4'>
                    {renderableFields.map((field: Question) => {
                      const type = (field.type || 'SHORT_TEXT').toUpperCase()
                      const val = editValues[field.id] ?? ''
                      const state = evaluatedFieldStates[field.id]
                      const isFieldRequired = state
                        ? state.required
                        : field.settings?.validation?.fieldRule === 'REQUIRED'
                      const isReadOnly = state
                        ? state.disabled
                        : Boolean((field.settings?.specific as any)?.isReadOnly)
                      const colSpan = getColumnSpan(
                        field.settings?.general?.size,
                      )

                      const isTableType =
                        type === 'LINE_ITEM' ||
                        type === 'TABLE' ||
                        type === 'DYNAMIC_TABLE' ||
                        (typeof val === 'string' &&
                          val.trim().startsWith('[') &&
                          val.trim().endsWith(']')) ||
                        Array.isArray(val)

                      return (
                        <div
                          className={cn('flex flex-col justify-start', colSpan)}
                          key={field.id}
                        >
                          {/* Label / Required Indicators (rendered internally for table fields) */}
                          {!isTableType && (
                            <div className='mb-1.5 flex items-center justify-between'>
                              <label className='block text-xs font-bold text-gray-12'>
                                {field.label || 'Untitled Question'}
                                {isFieldRequired && (
                                  <span
                                    className='ml-1 font-bold text-red-9'
                                    title='Required field'
                                  >
                                    *
                                  </span>
                                )}
                              </label>
                              {(type === 'CALCULATED' || isReadOnly) && (
                                <span className='rounded bg-gray-2 px-1.5 py-0.5 text-[10px] font-semibold text-gray-8'>
                                  Auto-calculated
                                </span>
                              )}
                            </div>
                          )}

                          {!isTableType &&
                            field.settings?.general?.description && (
                              <p className='mb-1.5 text-[11px] text-gray-7'>
                                {field.settings.general.description}
                              </p>
                            )}

                          {/* Form Input Control */}
                          {type === 'YES_NO_TOGGLE' || type === 'CONSENT' ? (
                            <div className='bg-surface-muted/50 flex max-w-xs items-center justify-between rounded-xl border border-gray-2 p-2.5 transition-colors hover:border-gray-3'>
                              <span className='text-xs font-semibold text-gray-11'>
                                Consent / Enable
                              </span>
                              <InputSwitch
                                checked={val === 'Yes'}
                                onChange={(checked) =>
                                  handleFieldChange(
                                    field.id,
                                    checked ? 'Yes' : 'No',
                                  )
                                }
                              />
                            </div>
                          ) : type === 'DATE' ? (
                            <InputDate
                              placeholder={field.settings?.general?.placeholder}
                              value={val ? val : null}
                              onChange={(dateString) =>
                                handleFieldChange(field.id, dateString)
                              }
                            />
                          ) : type === 'NUMBER' || type === 'COUNTER' ? (
                            <FormEntriesSearchableInput
                              editValues={editValues}
                              field={field}
                              formId={formId}
                              val={val}
                              onUpdateModel={(patch) =>
                                setEditValues((prev: any) => ({
                                  ...prev,
                                  ...patch,
                                }))
                              }
                            >
                              <InputNumber
                                placeholder={field.settings?.general?.placeholder}
                                value={val}
                                onChange={(num) =>
                                  handleFieldChange(field.id, num)
                                }
                              />
                            </FormEntriesSearchableInput>
                          ) : type === 'CURRENCY_AMOUNT' ? (
                            <div className='max-w-xs'>
                              <InputNumber
                                value={val}
                                placeholder={
                                  field.settings?.general?.placeholder || '0.00'
                                }
                                onChange={(num) =>
                                  handleFieldChange(field.id, num)
                                }
                              />
                            </div>
                          ) : type === 'RATING' ? (
                            <div className='py-1'>
                              <Rating
                                color='yellow'
                                count={field.settings?.specific?.iconCount || 5}
                                size='md'
                                value={Number(val || 0)}
                                onChange={(v) => handleFieldChange(field.id, v)}
                              />
                            </div>
                          ) : type === 'OPINION_SCALE' ? (
                            <div className='flex flex-wrap gap-1 py-1'>
                              {Array.from({ length: 11 }).map((_, i) => {
                                const isSelected =
                                  Number(val) === i && val !== ''
                                return (
                                  <button
                                    key={i}
                                    type='button'
                                    className={cn(
                                      'size-8 rounded-lg border text-xs font-bold transition-all hover:bg-accent-soft hover:text-accent-primary active:scale-95',
                                      isSelected
                                        ? 'border-accent-primary bg-accent-primary text-white'
                                        : 'border-gray-3 bg-surface text-gray-12',
                                    )}
                                    onClick={() =>
                                      handleFieldChange(field.id, i)
                                    }
                                  >
                                    {i}
                                  </button>
                                )
                              })}
                            </div>
                          ) : type === 'SINGLE_CHOICE' ? (
                            <FormEntriesChoiceInput
                              allFields={renderableFields}
                              field={field}
                              formModel={editValues}
                              val={val}
                              onChange={(next) =>
                                handleFieldChange(field.id, next)
                              }
                            />
                          ) : type === 'MULTIPLE_CHOICE' ? (
                            <FormEntriesChoiceInput
                              allFields={renderableFields}
                              field={field}
                              formModel={editValues}
                              isMultiple
                              val={val}
                              onChange={(next) =>
                                handleFieldChange(field.id, next)
                              }
                            />
                          ) : type === 'SINGLE_SELECT' ||
                            type === 'MULTI_SELECT' ? (
                            <FormEntriesSearchableInput
                              editValues={editValues}
                              field={field}
                              formId={formId}
                              val={val}
                              onUpdateModel={(patch) =>
                                setEditValues((prev: any) => ({
                                  ...prev,
                                  ...patch,
                                }))
                              }
                            >
                              <FormEntriesSelectInput
                                allFields={renderableFields}
                                field={field}
                                fieldDistinctOptions={
                                  fieldDistinctOptions[field.id] || []
                                }
                                formModel={editValues}
                                val={val}
                                onChange={(next) =>
                                  handleFieldChange(field.id, next)
                                }
                              />
                            </FormEntriesSearchableInput>
                          ) : type === 'FILE_UPLOAD' ||
                            type === 'IMAGE_UPLOAD' ? (
                            <div className='bg-surface-muted/60 flex items-center justify-between rounded-xl border border-gray-2 p-3.5'>
                              <div className='flex items-center gap-3'>
                                <div className='flex size-9 items-center justify-center rounded-lg bg-gray-2 text-gray-8'>
                                  <Icon
                                    className='size-4.5'
                                    name='lucide:upload-cloud'
                                  />
                                </div>
                                <div>
                                  <span className='block text-xs font-bold text-gray-12'>
                                    Upload Document / Attachment
                                  </span>
                                  <span className='block text-[10px] text-gray-7'>
                                    PDF, PNG, JPG, or DOCX up to 10MB
                                  </span>
                                </div>
                              </div>
                              <Button
                                color='gray'
                                icon='lucide:upload'
                                label={t`Choose File`}
                                size='xs'
                                variant='outline'
                                onClick={() =>
                                  showToast({
                                    message:
                                      'File picker simulated successfully',
                                  })
                                }
                              />
                            </div>
                          ) : type === 'CALCULATED' ? (
                            <CalculatedFieldInput value={val} hideLabel />
                          ) : type === 'LONG_TEXT' ? (
                            <InputTextarea
                              placeholder={field.settings?.general?.placeholder}
                              value={val}
                              onChange={(text) =>
                                handleFieldChange(field.id, text)
                              }
                            />
                          ) : isTableType ? (
                            <FormLineItemsEditor
                              field={field}
                              isFieldRequired={isFieldRequired}
                              value={val}
                              getFieldLabel={getFieldLabel}
                              onChange={(newVal) =>
                                handleFieldChange(field.id, newVal)
                              }
                            />
                          ) : (
                            <FormEntriesSearchableInput
                              editValues={editValues}
                              field={field}
                              formId={formId}
                              val={val}
                              onUpdateModel={(patch) =>
                                setEditValues((prev: any) => ({
                                  ...prev,
                                  ...patch,
                                }))
                              }
                            >
                              <InputText
                                placeholder={field.settings?.general?.placeholder}
                                value={val}
                                onChange={(text) =>
                                  handleFieldChange(field.id, text)
                                }
                              />
                            </FormEntriesSearchableInput>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {panels.length === 0 && (
              <div className='rounded-2xl border border-dashed border-gray-3 bg-surface py-16 text-center text-xs text-gray-7 shadow-xs'>
                This form currently has no input fields defined.
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Footer Bar */}
        <div className='sticky bottom-0 z-20 flex shrink-0 items-center justify-end border-t border-gray-2 bg-surface/95 px-4 py-3.5 shadow-lg backdrop-blur-md'>
          {/* Action Buttons */}
          <div className='flex items-center gap-3'>
            <Button
              color='gray'
              label={t`Cancel`}
              variant='outline'
              onClick={closeSidebar}
            />
            <Button
              color='primary'
              disabled={isSaving}
              icon={isAddOpen ? 'lucide:plus' : 'lucide:check'}
              label={isAddOpen ? t`Save Entry` : t`Save Changes`}
              loading={isSaving}
              variant='solid'
              onClick={handleSaveEntry}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='relative flex h-full flex-col bg-surface'>
      {/* 1. HEADER (Title, Back button, Browse/Trash Tabs) */}
      <div className='flex items-center justify-between border-b border-gray-2 px-4'>
        <div className='flex items-center gap-4'>
          <IconButton
            color='gray'
            icon='lucide:arrow-left'
            title={t`Back to Forms`}
            variant='ghost'
            onClick={() =>
              navigate({
                to: getSettingsReturnPath('form-configuration') ?? '/forms',
              })
            }
          />
          <Tabs
            color='primary'
            value={tabValue}
            onChange={(val) => setTabValue(val || 'Browse')}
          >
            <Tab label={t`Browse`} value='Browse' />
            <Tab label={t`Trash`} value='Trash' />
          </Tabs>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            color='primary'
            icon='lucide:plus'
            label={t`Add Entry`}
            variant='solid'
            onClick={openNewEntry}
          />
        </div>
      </div>

      {deletingEntry && (
        <div className='animate-in fade-in slide-in-from-top-4 mx-6 mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-3 bg-red-2 p-4 text-red-11 shadow-sm duration-300'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-3 text-red-11'>
              <Icon
                className='h-5 w-5 animate-pulse text-red-11'
                name='lucide:triangle-alert'
              />
            </div>
            <div>
              <h4 className='text-sm font-semibold text-red-12'>
                {deletingEntry.type === 'trash'
                  ? t`Move Entry to Trash`
                  : t`Permanently Delete Entry`}
              </h4>
              <p className='mt-0.5 text-xs text-red-11'>
                {deletingEntry.type === 'trash' ? (
                  <>
                    {t`Are you sure you want to move`}{' '}
                    <span className='font-bold text-red-12'>
                      {deletingEntry.id}
                    </span>{' '}
                    {t`to Trash?`}
                  </>
                ) : (
                  <>
                    {t`Are you sure you want to permanently delete`}{' '}
                    <span className='font-bold text-red-12'>
                      {deletingEntry.id}
                    </span>
                    ? {t`This action is permanent and cannot be undone.`}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Button
              color='gray'
              size='sm'
              variant='subtle'
              onClick={() => setDeletingEntry(null)}
            >
              {t`Cancel`}
            </Button>
            <Button
              color='red'
              icon='lucide:trash-2'
              size='sm'
              variant='solid'
              onClick={() => {
                if (deletingEntry.type === 'trash') {
                  handleMoveToTrash(deletingEntry.id)
                } else {
                  handlePermanentDelete(deletingEntry.id)
                }
                setDeletingEntry(null)
              }}
            >
              {deletingEntry.type === 'trash'
                ? t`Move to Trash`
                : t`Delete Permanently`}
            </Button>
          </div>
        </div>
      )}

      {/* 2. MAIN LAYOUT (Table view) */}
      <div className='relative flex flex-1 overflow-hidden'>
        <div className='bg-surface-muted/50 flex flex-1 flex-col overflow-hidden p-4'>
          <CustomFilter
            activeFilters={activeFilters}
            customSearchComponent={<TableSearch table={table as any} />}
            searchPlaceholder={t`Search entries...`}
            searchQuery=''
            trailingActions={<TableExport table={table as any} />}
            actionButtons={[
              {
                color: 'gray',
                disabled: isPageLoading,
                icon: 'tabler:refresh',
                id: 'refresh',
                isIconButton: true,
                tooltip: t`Refresh`,
                variant: 'outline',
                onClick: () => {
                  refetch()
                  refetchEntries()
                },
              },
              {
                color: 'gray',
                icon: 'tabler:table-import',
                id: 'bulk-import',
                isIconButton: true,
                tooltip: t`Bulk Import`,
                variant: 'outline',
                onClick: () => setIsImportOpen(true),
              },
            ]}
            filters={[
              ...(nameFieldFilter
                ? [
                  {
                    id: nameFieldFilter.id,
                    label: nameFieldFilter.label || t`Name`,
                    options: nameFieldFilter.options || [],
                    searchable: true,
                    searchPlaceholder: t`Search name...`,
                  },
                ]
                : []),
              {
                id: 'createdBy',
                label: t`Created By`,
                options: createdByOptions,
              },
            ]}
            moreFilters={[
              {
                dataType: 'date',
                id: 'createdAt',
                label: t`Created Date`,
              },
              ...moreEntryFilters,
            ]}
            showReset={
              Object.keys(activeFilters).some((k) => activeFilters[k]) ||
              !!searchState?.value
            }
            onFilterChange={(id, value) => {
              setActiveFilters((prev) => ({ ...prev, [id]: value }))
              setPage(1)
            }}
            onReset={() => {
              setActiveFilters({})
              setSearchState({ id: '', value: '' })
              setPage(1)
            }}
            onSearchChange={() => { }}
          />
          <div className='mt-2 min-h-0 flex-1 overflow-hidden'>
            <DataTable
              actions={[]}
              hideActionBar={true}
              hideExport={true}
              hideFilters={true}
              hideGrouping={true}
              hideReload={true}
              hideSearch={true}
              isLoading={isPageLoading}
              isReLoading={isPageLoading}
              pageSize={pageSize}
              stickyHeader={true}
              table={table}
              onReload={() => {
                refetch()
                refetchEntries()
              }}
            />
          </div>
          <Pagination
            className='mt-4 shrink-0'
            itemLabel={t`Entries`}
            page={page}
            pageSize={pageSize}
            showPageNumbers={false}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Dynamic Modal popup for nested table data */}
      <Modal
        opened={!!activeLineItems}
        width={700}
        onClose={() => setActiveLineItems(null)}
      >
        {activeLineItems && (
          <div className='flex flex-col rounded-lg bg-surface p-6 font-inter'>
            <div className='mb-4 flex items-center justify-between border-b border-gray-2 pb-2'>
              <div className='flex items-center gap-2'>
                <Icon
                  className='size-5 text-accent-primary'
                  name='lucide:table'
                />
                <h3 className='text-sm font-bold text-gray-13'>
                  {activeLineItems.colLabel} — {activeLineItems.rowId}
                </h3>
              </div>
              <IconButton
                color='gray'
                icon='lucide:x'
                size='sm'
                variant='ghost'
                onClick={() => setActiveLineItems(null)}
              />
            </div>

            <div className='custom-scrollbar max-h-[400px] overflow-x-auto overflow-y-auto rounded-lg border border-gray-2 bg-surface'>
              <table className='w-full border-collapse text-left text-xs'>
                <thead>
                  <tr className='bg-surface-muted border-b border-gray-2'>
                    {activeLineItems.data.length > 0 &&
                      Object.keys(activeLineItems.data[0]).map((k) => (
                        <th
                          className='p-3 font-bold whitespace-nowrap text-gray-11'
                          key={k}
                        >
                          {getFieldLabel(k)}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {activeLineItems.data.map((item: any, idx: number) => (
                    <tr
                      className='hover:bg-surface-hover/50 border-b border-gray-1 last:border-0'
                      key={idx}
                    >
                      {Object.keys(item).map((k) => (
                        <td
                          className='p-3 font-medium whitespace-nowrap text-gray-12'
                          key={k}
                        >
                          {item[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

FormEntriesPage.displayName = 'FormEntriesPage'
export default FormEntriesPage
