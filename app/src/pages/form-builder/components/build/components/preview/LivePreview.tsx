import {
  Badge,
  Button,
  Divider,
  Rating,
  SegmentedControl,
  Select,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import type { Option } from '@/types/option'
import {
  getRepositoryItemFacets,
  getRepositorys,
  uploadForOcr,
} from '@/api/v6/folder/folder'
import { getUsers } from '@/api/v6/user'
import Icon from '@/components/base/icon/Icon'
import InputDateTime from '@/components/base/inputs/InputDateTime'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputTime from '@/components/base/inputs/InputTime'
import CalculatedFieldInput from '@/pages/form-builder/components/common/CalculatedFieldInput'
import { applyCalculatedFields } from '@/pages/form-builder/helpers/formula'
import { evaluateFormRules } from '@/pages/form-builder/helpers/ruleEngine'
import {
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import {
  buildMergedOcrFieldHints,
  extractScalarStrings,
  facetsToFieldOptions,
  fetchMasterFormColumnOptions,
  findFieldOption,
  getConfiguredFieldOptions,
  getDependentChildFieldIds,
  getDropdownFacetSource,
  getMasterFormInfo,
  getFieldOptions as getSharedFieldOptions,
  mapOcrFieldsToModel,
  normalizeStoredMultiSelectValue,
  withExtraFieldOptions,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import cn from '@/utils/cn'

const LivePreview = () => {
  const { isPreviewOpen, name, panels, setIsPreviewOpen } = useFormStore()
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  )
  const [previewModel, setPreviewModel] = useState<Record<string, any>>({})
  const [extractingFieldId, setExtractingFieldId] = useState<string | null>(
    null,
  )
  const [repositories, setRepositories] = useState<any[]>([])
  const [selectedRepoId, setSelectedRepoId] = useState<string>('')

  const fieldStates = useMemo(
    () => evaluateFormRules(panels, previewModel),
    [panels, previewModel],
  )

  // Fetch repositories for OCR target context
  useEffect(() => {
    let cancelled = false
    getRepositorys().then((res) => {
      if (
        !cancelled &&
        res.data &&
        Array.isArray(res.data) &&
        res.data.length > 0
      ) {
        setRepositories(res.data)
        setSelectedRepoId(res.data[0].id)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreviewOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsPreviewOpen])

  useEffect(() => {
    if (isPreviewOpen) {
      setPreviewModel((prev) => applyCalculatedFields(panels, prev))
    }
  }, [isPreviewOpen, panels])

  if (!isPreviewOpen) return null

  const handleFieldValueChange = (fieldId: string, value: any) => {
    setPreviewModel((prev) => {
      const next = { ...prev, [fieldId]: value }
      const dependentChildIds = getDependentChildFieldIds(fieldId, panels)
      for (const childId of dependentChildIds) {
        delete next[childId]
      }
      return applyCalculatedFields(panels, next)
    })
  }

  const handleOcrFileSelect = async (file: File, field: Question) => {
    if (!file) return

    const fieldId = field.id
    const assignedFieldIds = field.settings.validation.assignOtherControls || []

    // OCR only runs when this upload field has target fields assigned to it.
    if (assignedFieldIds.length === 0) {
      setPreviewModel((prev) => ({ ...prev, [fieldId]: file.name }))
      return
    }

    setExtractingFieldId(fieldId)

    try {
      const assignedFields = panels
        .flatMap((p) => p.fields || [])
        .filter((f) => assignedFieldIds.includes(f.id))

      const fieldHints = buildMergedOcrFieldHints([], panels, field)

      const repoIdToUse =
        selectedRepoId || (repositories[0]?.id ?? 'default-repo')

      const { data, error } = await uploadForOcr(repoIdToUse, file, fieldHints)

      if (!error && data?.ocrFieldList) {
        const ocrPatch = mapOcrFieldsToModel(panels, data.ocrFieldList)

        // Direct label/type matching fallback, restricted to assigned fields
        const extraPatch: Record<string, string> = {}
        if (Array.isArray(data.ocrFieldList)) {
          for (const item of data.ocrFieldList) {
            if (!item?.name || !item.value) continue
            const targetName = item.name.trim().toLowerCase()
            for (const targetField of assignedFields) {
              if (
                targetField.label &&
                targetField.label.trim().toLowerCase() === targetName
              ) {
                extraPatch[targetField.id] = item.value
              }
            }
          }
        }

        // Only ever populate fields this upload field was explicitly assigned to
        const restrictedPatch: Record<string, string> = {}
        for (const id of assignedFieldIds) {
          if (extraPatch[id] !== undefined) restrictedPatch[id] = extraPatch[id]
          else if (ocrPatch[id] !== undefined)
            restrictedPatch[id] = ocrPatch[id]
        }

        const mergedPatch = { ...restrictedPatch, [fieldId]: file.name }
        setPreviewModel((prev) =>
          applyCalculatedFields(panels, { ...prev, ...mergedPatch }),
        )
      } else {
        setPreviewModel((prev) =>
          applyCalculatedFields(panels, { ...prev, [fieldId]: file.name }),
        )
      }
    } catch (err: any) {
      console.error('OCR Extraction error:', err)
      setPreviewModel((prev) =>
        applyCalculatedFields(panels, { ...prev, [fieldId]: file.name }),
      )
    } finally {
      setExtractingFieldId(null)
    }
  }

  return (
    <div className='animate-in fade-in fixed inset-0 z-[200] flex flex-col bg-gray-2/80 font-inter backdrop-blur-sm duration-300'>
      {/* Header Control Bar */}
      <div className='z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-3 bg-white px-6 shadow-2xs'>
        <div className='flex items-center gap-3'>
          <div className='flex size-9 items-center justify-center rounded-xl border border-gray-3 bg-primary-3 text-primary-9 shadow-2xs'>
            <Icon height={18} name='tabler:eye' width={18} />
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-bold text-gray-12'>
              Form Live Preview
            </span>
            <span className='text-xs text-gray-10'>
              {name || 'Untitled Form'}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {Object.keys(previewModel).length > 0 && (
            <Button
              className='h-9 cursor-pointer rounded-xl font-medium'
              color='gray'
              size='sm'
              variant='outline'
              leftSection={
                <Icon height={14} name='lucide:rotate-ccw' width={14} />
              }
              onClick={() => setPreviewModel(applyCalculatedFields(panels, {}))}
            >
              Clear Values
            </Button>
          )}

          <SegmentedControl
            radius='xl'
            size='xs'
            value={deviceType}
            classNames={{
              indicator: 'bg-white shadow-xs',
              root: 'border border-gray-3 bg-gray-2 p-1',
            }}
            data={[
              {
                label: (
                  <Icon height={14} name='tabler:device-desktop' width={14} />
                ),
                value: 'desktop',
              },
              {
                label: (
                  <Icon height={14} name='tabler:device-tablet' width={14} />
                ),
                value: 'tablet',
              },
              {
                label: (
                  <Icon height={14} name='tabler:device-mobile' width={14} />
                ),
                value: 'mobile',
              },
            ]}
            onChange={(v) => setDeviceType(v as any)}
          />

          <div className='h-6 w-px bg-gray-3' />

          <Button
            className='h-9 cursor-pointer rounded-xl px-4 text-gray-12 hover:bg-gray-2'
            color='gray'
            leftSection={<Icon height={16} name='tabler:x' width={16} />}
            size='sm'
            variant='subtle'
            onClick={() => setIsPreviewOpen(false)}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Single Scrollable Full-Form Preview Container */}
      <div className='relative flex flex-1 items-center justify-center overflow-hidden bg-gray-2/40 p-4 sm:p-6'>
        <div
          className={cn(
            'relative flex h-full max-h-[880px] w-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-white shadow-xl transition-all duration-300',
            deviceType === 'desktop' && 'max-w-4xl',
            deviceType === 'tablet' && 'max-w-[768px]',
            deviceType === 'mobile' && 'max-w-[380px]',
          )}
        >
          {/* Scrollable Form Content */}
          <div className='custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 sm:p-8'>
            {panels.length === 0 ||
            panels.every((p) => p.fields.length === 0) ? (
              <div className='py-24 text-center text-gray-10'>
                <Icon
                  className='mx-auto mb-3 text-gray-8 opacity-60'
                  height={40}
                  name='tabler:clipboard-x'
                  width={40}
                />
                <div className='text-sm font-semibold text-gray-12'>
                  No fields added to this form yet.
                </div>
                <div className='mt-1 text-xs text-gray-9'>
                  Add sections and fields in the Form Builder to preview them
                  here.
                </div>
              </div>
            ) : (
              panels.map((panel, idx) => (
                <div
                  className='space-y-4 rounded-xl border border-gray-3 bg-white p-5 shadow-2xs'
                  key={panel.id}
                >
                  {/* Section Title & Description Header */}
                  <div className='border-b border-gray-3 pb-3'>
                    <h3 className='text-base font-bold text-gray-12'>
                      {panel.settings.title || `Section ${idx + 1}`}
                    </h3>
                    {panel.settings.description && (
                      <p className='mt-1 text-xs font-normal text-gray-10'>
                        {panel.settings.description}
                      </p>
                    )}
                  </div>

                  {/* Section Fields Grid */}
                  <div className='grid grid-cols-12 gap-x-4 gap-y-4'>
                    {panel.fields.map((field) => {
                      const state = fieldStates[field.id]
                      if (state && !state.visible) return null
                      const isRequired = state
                        ? state.required
                        : field.settings.validation.fieldRule === 'REQUIRED'

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            'col-span-12',
                            deviceType !== 'mobile' &&
                              field.settings.general.size === 'col-6' &&
                              'md:col-span-6',
                            deviceType !== 'mobile' &&
                              field.settings.general.size === 'col-4' &&
                              'md:col-span-4',
                            deviceType !== 'mobile' &&
                              field.settings.general.size === 'col-3' &&
                              'md:col-span-3',
                          )}
                        >
                          {!field.settings.general.hideLabel && (
                            <div className='mb-1.5 flex items-center justify-between'>
                              <label className='block text-xs font-semibold text-gray-12'>
                                {field.label || 'Untitled Question'}
                                {isRequired && (
                                  <span className='ml-1 font-bold text-red-11'>
                                    *
                                  </span>
                                )}
                              </label>
                            </div>
                          )}
                          {field.settings.general.description && (
                            <p className='mb-1.5 text-[11px] font-normal text-gray-10'>
                              {field.settings.general.description}
                            </p>
                          )}
                          {renderPreviewInput(
                            field,
                            previewModel,
                            handleFieldValueChange,
                            (file) => handleOcrFileSelect(file, field),
                            extractingFieldId === field.id,
                            selectedRepoId,
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const getFieldOptions = (field: Question): string[] => {
  const { customOptions, separateOptionsUsing } = field.settings.specific
  if (!customOptions) return ['Option A', 'Option B', 'Option C']

  const separator = separateOptionsUsing === 'COMMA' ? ',' : '\n'
  const options = customOptions
    .split(separator)
    .map((opt) => opt.trim())
    .filter(Boolean)

  return options.length > 0 ? options : ['Option A', 'Option B', 'Option C']
}

const LivePreviewDropdown = ({
  fallbackRepositoryId,
  field,
  model,
  multiple,
  value,
  onChange,
}: {
  fallbackRepositoryId?: string
  field: Question
  model?: Record<string, any>
  multiple?: boolean
  value: any
  onChange: (val: any) => void
}) => {
  const optionsType = field.settings?.specific?.optionsType || 'CUSTOM'
  const facetSource = getDropdownFacetSource(field, fallbackRepositoryId)
  const { panels } = useFormStore()
  const masterInfo = getMasterFormInfo(field)

  const allFields = useMemo(
    () => panels.flatMap((p: any) => p.fields || []),
    [panels],
  )
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
    ? model?.[parentField.id]
    : masterInfo.masterFormParentColumn && model
    ? model[masterInfo.masterFormParentColumn]
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
    ? model?.[repoParentField.id]
    : facetSource.repositoryFieldParent && model
    ? model[facetSource.repositoryFieldParent]
    : undefined

  const repoParentValue = extractScalarStrings(repoParentRawValue)[0] || ''

  const hasRepoParentFilter = Boolean(facetSource.repositoryFieldParent)
  const isRepoFacetEnabled =
    facetSource.enabled && (!hasRepoParentFilter || Boolean(repoParentValue))

  const { data: uniqueFieldOptions = [] } = useQuery({
    enabled: isRepoFacetEnabled,
    queryKey: [
      'livePreviewFacets',
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
    queryKey: ['livePreviewUserList'],
    queryFn: async () => {
      const res = await getUsers()
      return res.data.map((user) => ({ id: user.email, name: user.email }))
    },
  })

  const { data: masterFieldOptions = [] } = useQuery({
    enabled: masterInfo.enabled,
    queryKey: [
      'livePreviewMasterOptions',
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

  const selectOptions = withExtraFieldOptions(
    withExtraFieldOptions(
      withExtraFieldOptions(
        optionsType === 'DYNAMIC'
          ? getSharedFieldOptions(field)
          : getConfiguredFieldOptions(field),
        uniqueFieldOptions,
      ),
      userFieldOptions,
    ),
    masterFieldOptions,
  )

  useEffect(() => {
    if (selectOptions.length === 1) {
      const singleOptVal = String(selectOptions[0].id ?? selectOptions[0].name)
      if (multiple) {
        const currentList = normalizeStoredMultiSelectValue(value)
        if (currentList.length === 0) {
          onChange([singleOptVal])
        }
      } else {
        if (value === undefined || value === null || value === '') {
          onChange(singleOptVal)
        }
      }
    }
  }, [selectOptions, value, multiple, onChange])

  if (multiple) {
    const seen = new Set<string>()
    const selectedOptions = normalizeStoredMultiSelectValue(value).flatMap(
      (id) => {
        const opt = findFieldOption(selectOptions, id)
        if (!opt) return []
        const key = String(opt.id).toLowerCase()
        if (seen.has(key)) return []
        seen.add(key)
        return [opt]
      },
    )

    return (
      <InputSelectMultiple
        options={withExtraFieldOptions(selectOptions, selectedOptions)}
        value={selectedOptions}
        placeholder={
          field.settings?.general?.placeholder || 'Select options...'
        }
        onChange={(opts: Option[]) => onChange(opts.map((o) => o.id))}
      />
    )
  }

  return (
    <Select
      data={selectOptions.map((opt) => opt.name)}
      placeholder={field.settings.general.placeholder || 'Select an option'}
      size='sm'
      value={String(value) || null}
      classNames={{
        input:
          'border-gray-3 bg-white text-xs text-gray-12 shadow-2xs focus:border-primary-9',
      }}
      onChange={(val) => onChange(val)}
    />
  )
}

const LivePreviewChoiceGroup = ({
  field,
  value,
  onChange,
}: {
  field: Question
  value: any
  onChange: (val: any) => void
}) => {
  const specific = field.settings?.specific ?? {}
  const validation = field.settings?.validation ?? {}
  const [customList, setCustomList] = useState<string[]>([])
  const [newOptionText, setNewOptionText] = useState('')
  const [isAddingOption, setIsAddingOption] = useState(false)

  const baseOptions = getFieldOptions(field)
  const allOptions = [...baseOptions, ...customList]

  const optionsPerLine = specific.optionsPerLine ?? 3
  const isAutoFlex = optionsPerLine === 0
  const isSingle = field.type === 'SINGLE_CHOICE'
  const isMulti = field.type === 'MULTIPLE_CHOICE'

  const selectedList = Array.isArray(value)
    ? value
    : value
      ? [String(value)]
      : []

  useEffect(() => {
    if (allOptions.length === 1) {
      if (isSingle) {
        if (value === undefined || value === null || value === '') {
          onChange(allOptions[0])
        }
      } else if (isMulti) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          onChange([allOptions[0]])
        }
      }
    }
  }, [allOptions, value, isSingle, isMulti, onChange])

  const handleToggle = (opt: string) => {
    if (isSingle) {
      onChange(opt)
    } else {
      const next = selectedList.includes(opt)
        ? selectedList.filter((item) => item !== opt)
        : [...selectedList, opt]
      onChange(next)
    }
  }

  const handleSelectAll = () => {
    onChange(allOptions)
  }

  const handleClearAll = () => {
    onChange([])
  }

  const handleAddCustomOption = () => {
    const trimmed = newOptionText.trim()
    if (!trimmed || allOptions.includes(trimmed)) return
    setCustomList((prev) => [...prev, trimmed])
    if (isSingle) {
      onChange(trimmed)
    } else {
      onChange([...selectedList, trimmed])
    }
    setNewOptionText('')
    setIsAddingOption(false)
  }

  return (
    <div
      className={cn(
        'w-full space-y-2.5',
        specific.showOptionsWrapper &&
          'rounded-xl border border-gray-3 bg-gray-1/40 p-3 shadow-2xs',
      )}
    >
      {/* Header controls for QR code and Bulk actions */}
      <div className='flex items-center justify-between'>
        {isMulti && specific.bulkActionsEnabled && (
          <div className='flex items-center gap-2'>
            <button
              className='cursor-pointer text-[11px] font-semibold text-primary-9 hover:underline'
              type='button'
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <span className='text-xs text-gray-4'>•</span>
            <button
              className='cursor-pointer text-[11px] font-semibold text-gray-7 hover:underline'
              type='button'
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>
        )}

        {isSingle && specific.qrCodeEnabled && (
          <button
            className='ml-auto flex cursor-pointer items-center gap-1 rounded-md border border-gray-3 bg-white px-2 py-1 text-[11px] font-medium text-gray-7 shadow-2xs hover:border-primary-5 hover:text-primary-9'
            title='Simulate QR Code Scan'
            type='button'
            onClick={() => {
              if (allOptions.length > 0) {
                const randomOpt =
                  allOptions[Math.floor(Math.random() * allOptions.length)]
                onChange(randomOpt)
              }
            }}
          >
            <Icon height={13} name='lucide:qr-code' width={13} />
            <span>Scan QR</span>
          </button>
        )}
      </div>

      {/* Options Layout */}
      <div
        className={cn(
          'gap-2',
          isAutoFlex ? 'flex flex-wrap items-center' : 'grid',
        )}
        style={
          !isAutoFlex
            ? {
                gridTemplateColumns: `repeat(${optionsPerLine}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {allOptions.map((opt, i) => {
          const isSelected = selectedList.includes(opt)
          return (
            <div
              key={i}
              className={cn(
                'flex min-h-[38px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-all active:scale-[0.99]',
                isAutoFlex ? 'flex-shrink-0' : '',
                isSelected
                  ? 'border-primary-9 bg-primary-1 font-semibold text-primary-9 shadow-2xs'
                  : 'border-gray-3 bg-white text-gray-12 hover:border-gray-4 hover:bg-gray-2',
              )}
              onClick={() => handleToggle(opt)}
            >
              <div
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center border transition-colors',
                  isSingle ? 'rounded-full' : 'rounded-md',
                  isSelected
                    ? 'border-primary-9 bg-primary-9 text-white'
                    : 'border-gray-4 bg-white',
                )}
              >
                {isSelected && (
                  <Icon
                    height={10}
                    name={isSingle ? 'lucide:circle' : 'lucide:check'}
                    width={10}
                  />
                )}
              </div>
              <span className='truncate'>{opt}</span>
            </div>
          )
        })}
      </div>

      {/* Custom option adder */}
      {(specific.allowCustomEntries || specific.allowToAddNewOptions) && (
        <div className='pt-1'>
          {isAddingOption ? (
            <div className='flex items-center gap-2'>
              <input
                className='h-8 flex-1 rounded-lg border border-gray-3 bg-white px-2.5 text-xs text-gray-12 outline-none focus:border-primary-9 focus:ring-1 focus:ring-primary-3'
                placeholder='Type custom option...'
                type='text'
                value={newOptionText}
                autoFocus
                onChange={(e) => setNewOptionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomOption()
                  if (e.key === 'Escape') setIsAddingOption(false)
                }}
              />
              <Button
                className='h-8 cursor-pointer rounded-lg'
                size='xs'
                onClick={handleAddCustomOption}
              >
                Add
              </Button>
              <Button
                className='h-8 cursor-pointer rounded-lg'
                color='gray'
                size='xs'
                variant='subtle'
                onClick={() => setIsAddingOption(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              className='flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary-9 hover:underline'
              type='button'
              onClick={() => setIsAddingOption(true)}
            >
              <Icon height={13} name='lucide:plus' width={13} />
              <span>Add custom option</span>
            </button>
          )}
        </div>
      )}

      {/* Requirement mode info note */}
      {isMulti &&
        validation.fieldRule === 'REQUIRED' &&
        validation.requiredValidation === 'ALL' && (
          <div className='text-amber-7 flex items-center gap-1 pt-0.5 text-[10px] font-medium'>
            <Icon height={11} name='lucide:alert-circle' width={11} />
            <span>
              All {allOptions.length} options must be checked to fulfill
              requirements.
            </span>
          </div>
        )}
    </div>
  )
}

const renderPreviewInput = (
  field: Question,
  model: Record<string, any>,
  onChange: (fieldId: string, value: any) => void,
  onOcrProcessFile?: (file: File) => void,
  isExtracting?: boolean,
  fallbackRepositoryId?: string,
) => {
  const fieldValue = model[field.id] ?? ''

  switch (field.type) {
    case 'LABEL':
      return (
        <div className='text-sm font-medium text-gray-12'>
          {field.label || 'Label Text'}
        </div>
      )
    case 'DIVIDER':
      return <Divider className='my-2' />
    case 'TEXT_BUILDER':
      return (
        <div className='min-h-[100px] w-full overflow-hidden rounded-lg border border-gray-3 bg-white'>
          <div className='flex gap-2 border-b border-gray-3 bg-gray-2/60 p-2'>
            <Icon
              className='text-gray-10'
              height={14}
              name='tabler:bold'
              width={14}
            />
            <Icon
              className='text-gray-10'
              height={14}
              name='tabler:italic'
              width={14}
            />
            <Icon
              className='text-gray-10'
              height={14}
              name='tabler:list'
              width={14}
            />
          </div>
          <div className='p-3 text-xs text-gray-9 italic'>
            {fieldValue ? String(fieldValue) : 'Rich text content editor...'}
          </div>
        </div>
      )
    case 'IMAGE_UPLOAD':
    case 'FILE_UPLOAD': {
      const fileInputId = `preview-field-file-${field.id}`
      return (
        <div className='w-full'>
          <input
            accept={field.type === 'IMAGE_UPLOAD' ? 'image/*' : '*/*'}
            className='hidden'
            disabled={isExtracting}
            id={fileInputId}
            type='file'
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && onOcrProcessFile) {
                onOcrProcessFile(file)
              }
            }}
          />
          <label
            htmlFor={isExtracting ? undefined : fileInputId}
            className={cn(
              'flex w-full flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-all',
              isExtracting
                ? 'cursor-wait border-purple-4 bg-purple-1/40'
                : 'cursor-pointer border-gray-3 bg-gray-1/40 hover:border-primary-9 hover:bg-primary-1/30 active:scale-[0.99]',
            )}
          >
            {isExtracting ? (
              <>
                <Icon
                  className='mb-1.5 animate-spin text-purple-9'
                  height={24}
                  name='lucide:loader-2'
                  width={24}
                />
                <div className='text-xs font-bold text-purple-11'>
                  Extracting document data...
                </div>
                <div className='mt-0.5 text-[10px] text-purple-9'>
                  Populating form fields, please wait...
                </div>
              </>
            ) : (
              <>
                <Icon
                  className='mb-1.5 text-primary-9'
                  height={22}
                  name='tabler:upload'
                  width={22}
                />
                <div className='text-xs font-semibold text-gray-12'>
                  {fieldValue ? (
                    <span className='flex items-center gap-1.5 font-bold text-primary-9'>
                      <Icon height={16} name='lucide:file-check' width={16} />
                      {String(fieldValue)}
                    </span>
                  ) : (
                    'Click to select file for this field or drag & drop'
                  )}
                </div>
                <div className='mt-0.5 text-[10px] text-gray-9'>
                  Supports PDF & Images (Auto-extracts /uploadForOCR data)
                </div>
              </>
            )}
          </label>
        </div>
      )
    }
    case 'TIME':
      return (
        <InputTime
          value={fieldValue || ''}
          format={
            field.settings.validation?.timeFormat === '24' ? '24h' : '12h'
          }
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'DATE_TIME':
      return (
        <InputDateTime
          value={fieldValue || null}
          format={
            field.settings.validation?.timeFormat === '24' ? '24h' : '12h'
          }
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'TABLE':
    case 'DYNAMIC_TABLE': {
      const columns = field.settings.specific.tableColumns || [
        { id: '1', name: 'Column 1', size: 'MEDIUM', type: 'SHORT_TEXT' },
        { id: '2', name: 'Column 2', size: 'MEDIUM', type: 'SHORT_TEXT' },
        { id: '3', name: 'Column 3', size: 'MEDIUM', type: 'SHORT_TEXT' },
      ]
      const rows: Array<Record<string, unknown>> = Array.isArray(fieldValue)
        ? fieldValue.length > 0
          ? fieldValue
          : [{ _rowId: '1' }, { _rowId: '2' }]
        : [{ _rowId: '1' }, { _rowId: '2' }]

      const updateCell = (
        rowIndex: number,
        columnId: string,
        cellValue: string,
      ) => {
        const next = rows.map((row, index) =>
          index === rowIndex ? { ...row, [columnId]: cellValue } : { ...row },
        )
        onChange(field.id, next)
      }

      return (
        <div className='overflow-x-auto rounded-lg border border-gray-3 bg-white'>
          <table className='w-full border-collapse text-left text-xs'>
            <thead className='border-b border-gray-3 bg-gray-2/60'>
              <tr>
                {columns.map((col: any) => (
                  <th
                    className='p-2.5 font-bold whitespace-nowrap text-gray-12'
                    key={col.id}
                  >
                    {col.name || col.label || 'Column'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  className='border-b border-gray-2 last:border-0'
                  key={String(row._rowId || rowIndex)}
                >
                  {columns.map((col: any) => (
                    <td className='p-2' key={col.id}>
                      <TextInput
                        placeholder='...'
                        size='xs'
                        variant='unstyled'
                        type={
                          col.type === 'NUMBER' ||
                          col.type === 'COUNTER' ||
                          col.type === 'CURRENCY_AMOUNT'
                            ? 'number'
                            : 'text'
                        }
                        value={
                          row[col.id] === undefined || row[col.id] === null
                            ? ''
                            : String(row[col.id])
                        }
                        onChange={(event) =>
                          updateCell(rowIndex, col.id, event.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'SHORT_TEXT':
    case 'EMAIL':
    case 'PHONE_NUMBER':
    case 'NUMBER':
    case 'COUNTER':
    case 'CURRENCY_AMOUNT':
    case 'ADDRESS':
    case 'FULL_NAME':
      return (
        <TextInput
          size='sm'
          value={String(fieldValue)}
          variant='default'
          classNames={{
            input:
              'border-gray-3 bg-white text-xs text-gray-12 shadow-2xs focus:border-primary-9',
          }}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )
    case 'CALCULATED':
      return <CalculatedFieldInput value={fieldValue} hideLabel />
    case 'LONG_TEXT':
      return (
        <textarea
          className='min-h-[80px] w-full rounded-md border border-gray-3 bg-white p-2.5 text-xs text-gray-12 shadow-2xs transition-colors outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-1 focus:ring-primary-3'
          value={String(fieldValue)}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )
    case 'DATE':
      return (
        <TextInput
          leftSection={<Icon height={15} name='tabler:calendar' width={15} />}
          placeholder='YYYY-MM-DD or MM/DD/YYYY'
          size='sm'
          value={String(fieldValue)}
          variant='default'
          classNames={{
            input:
              'border-gray-3 bg-white text-xs text-gray-12 shadow-2xs focus:border-primary-9',
          }}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )
    case 'RATING':
      return (
        <Rating
          color='yellow'
          count={field.settings.specific.iconCount || 5}
          size='md'
          value={Number(fieldValue) || 0}
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'SINGLE_SELECT':
      return (
        <LivePreviewDropdown
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          value={fieldValue}
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'MULTI_SELECT':
      return (
        <LivePreviewDropdown
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          multiple
          value={fieldValue}
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return (
        <LivePreviewChoiceGroup
          field={field}
          value={fieldValue}
          onChange={(val) => onChange(field.id, val)}
        />
      )
    default:
      return (
        <TextInput
          size='sm'
          value={String(fieldValue)}
          variant='default'
          classNames={{
            input:
              'border-gray-3 bg-white text-xs text-gray-12 shadow-2xs focus:border-primary-9',
          }}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )
  }
}

export default LivePreview
