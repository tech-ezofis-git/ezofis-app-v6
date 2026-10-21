import {
  Badge,
  Button,
  Divider,
  Rating,
  SegmentedControl,
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
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputTime from '@/components/base/inputs/InputTime'
import BarcodeScannerPanel from '@/components/common/barcode-scanner/BarcodeScannerPanel'
import CalculatedFieldInput from '@/pages/form-builder/components/common/CalculatedFieldInput'
import {
  LegacyInlineFieldRenderer,
  RuntimeMatrixField,
} from '@/pages/form-builder/components/common/RuntimeComplexFieldRenderer'
import { applyCalculatedFields } from '@/pages/form-builder/helpers/formula'
import {
  evaluateFormRules,
  resetRuleDrivenValues,
  evaluatePanelRules,
} from '@/pages/form-builder/helpers/ruleEngine'
import { executeSearchFieldSync } from '@/pages/form-builder/helpers/searchFieldSync'
import {
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import {
  buildInitialFormModel,
  buildMasterConditions,
  buildMergedOcrFieldHints,
  extractCurrencyCode,
  extractCurrencyNumericValue,
  extractPhoneInputString,
  extractScalarStrings,
  facetsToFieldOptions,
  fetchMasterFormColumnOptions,
  findFieldOption,
  formatRuntimeFieldDisplayValue,
  getConfiguredFieldOptions,
  getDependentChildFieldIds,
  getDropdownFacetSource,
  getEffectiveFieldDescription,
  getEffectiveFieldLabel,
  getEffectiveFieldPlaceholder,
  getMasterFormInfo,
  getFieldOptions as getSharedFieldOptions,
  isFieldLabelHidden,
  isFieldReadOnly,
  isStructuredCurrencyValue,
  mapOcrFieldsToModel,
  normalizeStoredMultiSelectValue,
  resolveRuntimeFieldType,
  normalizeScannedValue,
  resolveShortTextFillValue,
  selectOptionStoredValue,
  updateCurrencyFieldValue,
  updatePhoneFieldValue,
  withExtraFieldOptions,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { validateFormModel } from '@/pages/form-builder/helpers/runtimeValidation'
import { getPendingUploadSource } from '@/pages/form-builder/helpers/uploadFillLock'
import MasterFillSync from '@/pages/requests/components/workflow-request/components/MasterFillSync'
import MasterPreselectSync from '@/pages/requests/components/workflow-request/components/MasterPreselectSync'
import TableFieldRenderer from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

const LivePreview = () => {
  const { isPreviewOpen, name, panels, rules, setIsPreviewOpen } =
    useFormStore()
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  )
  const [previewModel, setPreviewModel] = useState<Record<string, any>>({})
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [extractingFieldId, setExtractingFieldId] = useState<string | null>(
    null,
  )
  const [repositories, setRepositories] = useState<any[]>([])
  const [selectedRepoId, setSelectedRepoId] = useState<string>('')

  const fieldStates = useMemo(
    () => evaluateFormRules(panels, previewModel, rules as any),
    [panels, previewModel, rules],
  )
  const panelStates = useMemo(
    () => evaluatePanelRules(panels, previewModel),
    [panels, previewModel],
  )

  const validationErrors = useMemo(() => {
    if (!hasAttemptedSubmit) return {} as Record<string, string>
    return validateFormModel(panels, previewModel, {
      formRules: rules as any[],
    }).errors
  }, [hasAttemptedSubmit, panels, previewModel, rules])

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
    if (!isPreviewOpen) return

    setPreviewModel((prev) => {
      const defaults = buildInitialFormModel(panels)
      const next: Record<string, any> = { ...defaults, ...prev }
      const session = authUserStore.getState().session

      const allFields = panels.flatMap((panel: any) => panel.fields || [])

      for (const field of allFields) {
        // Don't overwrite an already populated value
        const hasValue =
          next[field.id] !== undefined &&
          next[field.id] !== null &&
          next[field.id] !== ''

        if (hasValue) continue
        if (hasValue) continue

        // Default USER_EMAIL
        if (
          field.settings?.specific?.defaultValueInSelectField ===
            'USER_EMAIL' &&
          session?.email
        ) {
          next[field.id] = session.email
          continue
        }

        // Default USER_NAME
        if (
          field.settings?.specific?.defaultValueInSelectField === 'USER_NAME'
        ) {
          const name = session
            ? `${session.firstName || ''} ${session.lastName || ''}`.trim()
            : ''

          if (name) {
            next[field.id] = name
            continue
          }
        }

        // SHORT_TEXT / FULL_NAME auto-fill
        if (field.type === 'SHORT_TEXT' || field.type === 'FULL_NAME') {
          const resolved = resolveShortTextFillValue(field)

          if (resolved) {
            next[field.id] = resolved
          }
        }
      }

      return applyCalculatedFields(panels, next)
    })
  }, [isPreviewOpen, panels])
  if (!isPreviewOpen) return null

  const handleFieldValueChange = (fieldId: string, value: any) => {
    setPreviewModel((prev) => {
      const next = { ...prev, [fieldId]: value }
      const dependentChildIds = getDependentChildFieldIds(fieldId, panels)
      for (const childId of dependentChildIds) {
        delete next[childId]
      }
      return applyCalculatedFields(
        panels,
        resetRuleDrivenValues(panels, prev, next, rules as any),
        rules,
      )
    })
  }

  const handleOcrFileSelect = async (files: File[], field: Question) => {
    const file = files[0]
    if (!file) return

    const fieldId = field.id
    const allowMultiple = field.settings?.specific?.allowMultipleFiles === true
    // OCR runs on the first file; the field shows every selected file name.
    const displayName = allowMultiple
      ? files.map((f) => f.name).join(', ')
      : file.name
    const assignedFieldIds = field.settings.validation.assignOtherControls || []

    // OCR only runs when this upload field has target fields assigned to it.
    if (assignedFieldIds.length === 0) {
      setPreviewModel((prev) => ({ ...prev, [fieldId]: displayName }))
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

        const mergedPatch = { ...restrictedPatch, [fieldId]: displayName }
        setPreviewModel((prev) =>
          applyCalculatedFields(panels, { ...prev, ...mergedPatch }, rules),
        )
      } else {
        setPreviewModel((prev) =>
          applyCalculatedFields(
            panels,
            { ...prev, [fieldId]: displayName },
            rules,
          ),
        )
      }
    } catch (err: any) {
      console.error('OCR Extraction error:', err)
      setPreviewModel((prev) =>
        applyCalculatedFields(
          panels,
          { ...prev, [fieldId]: displayName },
          rules,
        ),
      )
    } finally {
      setExtractingFieldId(null)
    }
  }

  return (
    <div className='animate-in fade-in fixed inset-0 z-[200] flex flex-col bg-gray-2/80 font-inter backdrop-blur-sm duration-300'>
      {/* Header Control Bar */}
      <div className='z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-3 bg-surface px-6 shadow-2xs'>
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
          <Button
            className='h-9 cursor-pointer rounded-xl font-medium'
            color='primary'
            size='sm'
            variant='filled'
            leftSection={<Icon height={14} name='tabler:check' width={14} />}
            onClick={() => setHasAttemptedSubmit(true)}
          >
            Test Validation
          </Button>

          {Object.keys(previewModel).length > 0 && (
            <Button
              className='h-9 cursor-pointer rounded-xl font-medium'
              color='gray'
              size='sm'
              variant='outline'
              leftSection={
                <Icon height={14} name='lucide:rotate-ccw' width={14} />
              }
              onClick={() => {
                setHasAttemptedSubmit(false)
                setPreviewModel(applyCalculatedFields(panels, {}, rules))
              }}
            >
              Clear Values
            </Button>
          )}

          <SegmentedControl
            radius='xl'
            size='xs'
            value={deviceType}
            classNames={{
              indicator: 'bg-surface-contrast shadow-xs',
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
            'relative flex h-full max-h-[880px] w-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-surface shadow-xl transition-all duration-300',
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
              panels.map((panel, idx) =>
                panelStates[panel.id]?.visible === false ? null : (
                  <div
                    className={cn(
                      'space-y-4 rounded-xl border border-gray-3 bg-surface p-5 shadow-2xs',
                      panelStates[panel.id]?.disabled && 'opacity-70',
                    )}
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
                        const isDisabled =
                          isFieldReadOnly(field) || Boolean(state?.disabled)
                        // Fields an upload field fills wait for its file.
                        const pendingUpload = getPendingUploadSource(
                          field,
                          panels,
                          previewModel,
                        )
                        const effectiveLabel = getEffectiveFieldLabel(
                          field,
                          'Untitled Question',
                        )
                        const effectiveDesc =
                          getEffectiveFieldDescription(field)

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
                            {!isFieldLabelHidden(field) && (
                              <div className='mb-1.5 flex items-center justify-between'>
                                <label className='block text-xs font-semibold text-gray-12'>
                                  {effectiveLabel}
                                  {isRequired && (
                                    <span className='ml-1 font-bold text-red-11'>
                                      *
                                    </span>
                                  )}
                                </label>
                                {isDisabled && (
                                  <Badge color='gray' size='xs' variant='light'>
                                    Read-only
                                  </Badge>
                                )}
                              </div>
                            )}
                            {effectiveDesc && (
                              <p className='mb-1.5 text-[11px] font-normal text-gray-10'>
                                {effectiveDesc}
                              </p>
                            )}
                            {renderPreviewInput(
                              field,
                              previewModel,
                              handleFieldValueChange,
                              (files) => handleOcrFileSelect(files, field),
                              extractingFieldId === field.id,
                              selectedRepoId,
                              (patch) =>
                                setPreviewModel((prev) =>
                                  applyCalculatedFields(
                                    panels,
                                    {
                                      ...prev,
                                      ...patch,
                                    },
                                    rules,
                                  ),
                                ),
                              isDisabled || Boolean(pendingUpload),
                            )}
                            {pendingUpload && (
                              <p className='animate-in fade-in mt-1 flex items-center gap-1 text-[11px] font-medium text-gray-10 duration-200'>
                                <Icon
                                  height={12}
                                  name='lucide:lock'
                                  width={12}
                                />
                                Upload "
                                {getEffectiveFieldLabel(
                                  pendingUpload,
                                  'the file',
                                )}
                                " first to fill this field.
                              </p>
                            )}
                            {hasAttemptedSubmit &&
                              validationErrors[field.id] && (
                                <p className='animate-in fade-in mt-1 text-[11px] font-medium text-red-11 duration-200'>
                                  {validationErrors[field.id]}
                                </p>
                              )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const getFieldOptions = (field: Question): string[] => {
  const shared = getSharedFieldOptions(field)
  if (shared.length > 0) return shared.map((o) => o.name)
  return []
}

const useLivePreviewFieldOptions = (
  field: Question,
  model?: Record<string, any>,
  fallbackRepositoryId?: string,
) => {
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
        splitArrayValues: resolveRuntimeFieldType(field) === 'MULTI_SELECT',
      })
    },
  })

  const { data: userFieldOptions = [] } = useQuery({
    enabled: optionsType === 'USER_LIST',
    queryKey: ['livePreviewUserList'],
    queryFn: async () => {
      const res = await getUsers()
      const session = authUserStore.getState().session
      const currentUserEmail = session?.email?.trim().toLowerCase()
      const currentUserId = session?.id ? String(session.id) : undefined

      return res.data
        .filter((user) => {
          const userEmail = user.email?.trim().toLowerCase()
          if (currentUserEmail && userEmail === currentUserEmail) return false
          if (currentUserId && user.id && String(user.id) === currentUserId)
            return false
          return true
        })
        .map((user) => ({ id: user.email, name: user.email }))
    },
  })

  const masterConditions = buildMasterConditions(field, model, allFields)
  const masterConditionsKey = JSON.stringify(masterConditions)

  const { data: masterFieldOptions = [] } = useQuery({
    enabled: masterInfo.enabled,
    queryKey: [
      'livePreviewMasterOptions',
      masterInfo.masterFormId,
      masterInfo.masterFormColumn,
      parentValue,
      parentMasterColumn,
      masterInfo.showAllData,
      masterConditionsKey,
    ],
    queryFn: () =>
      fetchMasterFormColumnOptions(
        masterInfo.masterFormId,
        masterInfo.masterFormColumn,
        parentValue,
        parentMasterColumn,
        masterInfo.showAllData,
        masterConditions,
      ),
  })

  const selectOptions = useMemo(() => {
    if (masterInfo.enabled) {
      return masterFieldOptions
    }
    if (optionsType === 'USER_LIST') {
      return userFieldOptions
    }
    if (facetSource.enabled) {
      return uniqueFieldOptions
    }
    return optionsType === 'DYNAMIC'
      ? getSharedFieldOptions(field)
      : getConfiguredFieldOptions(field)
  }, [
    masterInfo.enabled,
    masterFieldOptions,
    optionsType,
    userFieldOptions,
    facetSource.enabled,
    uniqueFieldOptions,
    field,
  ])

  return selectOptions
}

const LivePreviewDropdown = ({
  disabled,
  fallbackRepositoryId,
  field,
  model,
  multiple,
  value,
  onChange,
}: {
  disabled?: boolean
  fallbackRepositoryId?: string
  field: Question
  model?: Record<string, any>
  multiple?: boolean
  value: any
  onChange: (val: any) => void
}) => {
  const selectOptions = useLivePreviewFieldOptions(
    field,
    model,
    fallbackRepositoryId,
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

  const allowAddNew = Boolean(
    field.settings?.specific?.allowToAddNewOptions ||
    field.settings?.specific?.allowCustomEntries,
  )

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
        creatable={allowAddNew}
        createOptionLabel={(query) => `Add "${query}"`}
        disabled={disabled}
        options={withExtraFieldOptions(selectOptions, selectedOptions)}
        placeholder={getEffectiveFieldPlaceholder(field) || 'Select options...'}
        searchable
        value={selectedOptions}
        onChange={(opts: Option[]) => onChange(opts.map((o) => o.id))}
      />
    )
  }

  const selectedOpt =
    findFieldOption(selectOptions, value) ||
    (value !== undefined && value !== null && value !== ''
      ? { id: String(value), name: String(value) }
      : null)

  return (
    <InputSelect
      creatable={allowAddNew}
      createOptionLabel={(query) => `Add "${query}"`}
      disabled={disabled}
      options={withExtraFieldOptions(
        selectOptions,
        selectedOpt ? [selectedOpt] : [],
      )}
      placeholder={getEffectiveFieldPlaceholder(field) || 'Select an option'}
      searchable
      value={selectedOpt}
      onChange={(opt) =>
        onChange(opt ? selectOptionStoredValue(opt, selectOptions) : '')
      }
    />
  )
}

const LivePreviewChoiceGroup = ({
  disabled,
  fallbackRepositoryId,
  field,
  model,
  value,
  onChange,
}: {
  disabled?: boolean
  fallbackRepositoryId?: string
  field: Question
  model?: Record<string, any>
  value: any
  onChange: (val: any) => void
}) => {
  const specific = field.settings?.specific ?? {}
  const validation = field.settings?.validation ?? {}
  const [customList, setCustomList] = useState<string[]>([])
  const [newOptionText, setNewOptionText] = useState('')
  const [isAddingOption, setIsAddingOption] = useState(false)

  const selectOptions = useLivePreviewFieldOptions(
    field,
    model,
    fallbackRepositoryId,
  )

  const baseOptions = useMemo(() => {
    if (selectOptions && selectOptions.length > 0) {
      return selectOptions.map((o) => o.name || String(o.id))
    }
    return getFieldOptions(field)
  }, [selectOptions, field])

  const allOptions = [...baseOptions, ...customList]

  const optionsPerLine = specific.optionsPerLine ?? 3
  const isAutoFlex = optionsPerLine === 0
  const resolvedType = resolveRuntimeFieldType(field)
  const isSingle = resolvedType === 'SINGLE_CHOICE'
  const isMulti = resolvedType === 'MULTIPLE_CHOICE'

  const selectedList = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.includes(',') && isMulti
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
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
    if (disabled) return
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
    if (disabled) return
    onChange(allOptions)
  }

  const handleClearAll = () => {
    if (disabled) return
    onChange([])
  }

  const handleAddCustomOption = () => {
    if (disabled) return
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
        disabled && 'opacity-70',
      )}
    >
      {/* Header controls for QR code and Bulk actions */}
      <div className='flex items-center justify-between'>
        {isMulti && specific.bulkActionsEnabled && !disabled && (
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

        {isSingle && specific.qrCodeEnabled && !disabled && (
          <button
            className='ml-auto flex cursor-pointer items-center gap-1 rounded-md border border-gray-3 bg-surface px-2 py-1 text-[11px] font-medium text-gray-7 shadow-2xs hover:border-primary-5 hover:text-primary-9'
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
                'flex min-h-[38px] items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-all',
                disabled
                  ? 'cursor-not-allowed'
                  : 'cursor-pointer active:scale-[0.99]',
                isAutoFlex ? 'flex-shrink-0' : '',
                isSelected
                  ? 'border-primary-9 bg-primary-1 font-semibold text-primary-9 shadow-2xs'
                  : 'border-gray-3 bg-surface text-gray-12 hover:border-gray-4 hover:bg-gray-2',
              )}
              onClick={() => handleToggle(opt)}
            >
              <div
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center border transition-colors',
                  isSingle ? 'rounded-full' : 'rounded-md',
                  isSelected
                    ? 'border-primary-9 bg-primary-9 text-white'
                    : 'border-gray-4 bg-surface',
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
      {(specific.allowCustomEntries || specific.allowToAddNewOptions) &&
        !disabled && (
          <div className='pt-1'>
            {isAddingOption ? (
              <div className='flex items-center gap-2'>
                <input
                  className='h-8 flex-1 rounded-lg border border-gray-3 bg-surface px-2.5 text-xs text-gray-12 outline-none focus:border-primary-9 focus:ring-1 focus:ring-primary-3'
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

const LivePreviewPreselect = ({
  field,
  model,
  onChange,
  value,
}: {
  field: Question
  model: Record<string, any>
  onChange: (value: any) => void
  value: any
}) => {
  const { panels } = useFormStore()
  if (!field.settings?.specific?.masterPreselectEnabled) return null
  return (
    <MasterPreselectSync
      allFields={panels.flatMap((p: any) => p.fields || [])}
      field={field}
      formModel={model}
      value={value}
      onChange={onChange}
    />
  )
}

const LivePreviewSearchableInput = ({
  children,
  fallbackRepositoryId,
  field,
  model,
  onChange,
  onUpdateModel,
}: {
  children: React.ReactNode
  fallbackRepositoryId?: string
  field: Question
  model: Record<string, any>
  onChange: (fieldId: string, value: any) => void
  onUpdateModel?: (patch: Record<string, any>) => void
}) => {
  const [isSearching, setIsSearching] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const isSearchField = field.settings?.specific?.isSearchField === 'YES'
  const qrEnabled = Boolean(field.settings?.specific?.qrValue)
  const fieldValue = model[field.id] ?? ''
  const { panels } = useFormStore()

  const masterFill = (
    <MasterFillSync
      allFields={panels.flatMap((p: any) => p.fields || [])}
      field={field}
      formModel={model}
      value={model[field.id]}
      onChange={(v) => onChange(field.id, v)}
    />
  )

  if (!isSearchField && !qrEnabled)
    return (
      <>
        {masterFill}
        {children}
      </>
    )

  const handleSearch = (overrideVal?: any) => {
    const valToSearch = overrideVal !== undefined ? overrideVal : fieldValue
    executeSearchFieldSync({
      currentFormId: fallbackRepositoryId,
      field,
      formModel: model,
      panels,
      searchValue: valToSearch,
      onSearchingStateChange: setIsSearching,
      onUpdateModel: (patch) => {
        if (onUpdateModel) {
          onUpdateModel(patch)
        } else {
          Object.entries(patch).forEach(([fId, val]) => {
            onChange(fId, val)
          })
        }
      },
    })
  }

  return (
    <div className='relative w-full'>
      {masterFill}
      <div className='flex w-full items-end gap-1.5'>
        <div
          className='min-w-0 flex-1'
          onKeyDown={(e) => {
            if (isSearchField && e.key === 'Enter') {
              e.preventDefault()
              handleSearch()
            }
          }}
        >
          {children}
        </div>
        {qrEnabled && (
          <button
            className='flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-gray-3 bg-primary-1 text-primary-9 shadow-2xs transition-all hover:border-primary-5 hover:bg-primary-2 active:scale-95'
            title='Scan QR / Barcode'
            type='button'
            onClick={() => setIsScannerOpen((prev) => !prev)}
          >
            <Icon className='size-4' name='lucide:qr-code' />
          </button>
        )}
        {isSearchField && (
          <button
            className='flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-gray-3 bg-primary-1 text-primary-9 shadow-2xs transition-all hover:border-primary-5 hover:bg-primary-2 active:scale-95 disabled:opacity-50'
            disabled={isSearching}
            title='Search & Auto-Sync'
            type='button'
            onClick={() => handleSearch()}
          >
            {isSearching ? (
              <Icon className='size-4 animate-spin' name='lucide:loader-2' />
            ) : (
              <Icon className='size-4' name='lucide:search' />
            )}
          </button>
        )}
      </div>
      {isScannerOpen && (
        <div className='absolute top-full z-20 mt-1.5 w-full'>
          <BarcodeScannerPanel
            onClose={() => setIsScannerOpen(false)}
            onScan={(rawValue) => {
              const next = normalizeScannedValue(field.type, rawValue)
              if (next !== undefined) onChange(field.id, next)
              setIsScannerOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

const renderPreviewInput = (
  field: Question,
  model: Record<string, any>,
  onChange: (fieldId: string, value: any) => void,
  onOcrProcessFile?: (files: File[]) => void,
  isExtracting?: boolean,
  fallbackRepositoryId?: string,
  onUpdateModel?: (patch: Record<string, any>) => void,
  disabled?: boolean,
) => {
  const fieldValue = model[field.id] ?? ''
  const resolvedType = resolveRuntimeFieldType(field)
  const placeholder =
    getEffectiveFieldPlaceholder(field) || 'Type your answer here...'

  switch (resolvedType) {
    case 'HEADING':
      return (
        <h4 className='border-b border-gray-3 pb-2 text-sm font-bold text-gray-13'>
          {getEffectiveFieldLabel(field, 'Section Heading')}
        </h4>
      )
    case 'LABEL':
      return (
        <div className='text-sm font-medium text-gray-12'>
          {getEffectiveFieldLabel(field, 'Label Text')}
        </div>
      )
    case 'DIVIDER':
      return <Divider className='my-2' />
    case 'TEXT_BUILDER':
    case 'HTML_EDITOR':
      return (
        <div className='min-h-[100px] w-full overflow-hidden rounded-lg border border-gray-3 bg-surface'>
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
          <textarea
            className='min-h-[80px] w-full border-0 bg-surface p-3 text-xs text-gray-12 outline-none placeholder:text-gray-9 placeholder:italic'
            disabled={disabled}
            placeholder='Rich text content editor...'
            value={fieldValue ? String(fieldValue) : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        </div>
      )
    case 'JSON_EDITOR':
      return (
        <textarea
          className='min-h-[100px] w-full rounded-lg border border-gray-3 bg-surface p-2.5 font-mono text-xs text-gray-12 shadow-2xs outline-none focus:border-primary-9'
          disabled={disabled}
          placeholder='{ "key": "value" }'
          value={
            typeof fieldValue === 'object' && fieldValue !== null
              ? JSON.stringify(fieldValue, null, 2)
              : String(fieldValue || '')
          }
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )
    case 'IMAGE_UPLOAD':
    case 'FILE_UPLOAD': {
      const fileInputId = `preview-field-file-${field.id}`
      return (
        <div className='w-full'>
          <input
            accept={resolvedType === 'IMAGE_UPLOAD' ? 'image/*' : '*/*'}
            className='hidden'
            disabled={disabled || isExtracting}
            id={fileInputId}
            multiple={
              resolvedType === 'FILE_UPLOAD' &&
              field.settings?.specific?.allowMultipleFiles === true
            }
            type='file'
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length > 0 && onOcrProcessFile) {
                onOcrProcessFile(files)
              }
              e.target.value = ''
            }}
          />
          <label
            htmlFor={disabled || isExtracting ? undefined : fileInputId}
            className={cn(
              'flex w-full flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-all',
              disabled
                ? 'cursor-not-allowed border-gray-3 bg-gray-1/30 opacity-60'
                : isExtracting
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
                      {formatRuntimeFieldDisplayValue(fieldValue, field)}
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
          disabled={disabled}
          value={fieldValue || ''}
          format={
            field.settings.validation?.timeFormat === '24' ? '24h' : '12h'
          }
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'DATE_TIME':
      return (
        <LivePreviewSearchableInput
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          onChange={onChange}
          onUpdateModel={onUpdateModel}
        >
          <InputDateTime
            disabled={disabled}
            value={fieldValue || null}
            format={
              field.settings.validation?.timeFormat === '24' ? '24h' : '12h'
            }
            onChange={(val) => onChange(field.id, val)}
          />
        </LivePreviewSearchableInput>
      )
    case 'TABLE':
    case 'DYNAMIC_TABLE': {
      // Same table renderer the published form / New Request uses, so every
      // column setting behaves here exactly as it will for end users.
      const configured = field.settings.specific.tableColumns
      const previewField =
        (Array.isArray(configured) && configured.length > 0) ||
        field.type === 'DYNAMIC_TABLE'
          ? field
          : {
              ...field,
              settings: {
                ...field.settings,
                specific: {
                  ...field.settings.specific,
                  tableColumns: [1, 2, 3].map((n) => ({
                    id: String(n),
                    name: `Column ${n}`,
                    size: 'MEDIUM',
                    type: 'SHORT_TEXT',
                  })),
                },
              },
            }
      return (
        <TableFieldRenderer
          field={previewField}
          readOnly={disabled}
          repositoryId={fallbackRepositoryId}
          value={Array.isArray(fieldValue) ? fieldValue : []}
          onChange={(rows) => onChange(field.id, rows)}
        />
      )
    }
    case 'MATRIX':
      return (
        <RuntimeMatrixField
          disabled={disabled}
          field={field}
          value={fieldValue}
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'POPUP':
    case 'TABS':
    case 'NESTED_LIST':
    case 'LOGIN_AUTHENTICATION':
    case 'EMAIL_AUTHENTICATION':
    case 'MOBILE_AUTHENTICATION':
      return (
        <LegacyInlineFieldRenderer
          disabled={disabled}
          field={field}
          value={fieldValue}
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'PHONE_NUMBER':
      return (
        <LivePreviewSearchableInput
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          onChange={onChange}
          onUpdateModel={onUpdateModel}
        >
          <TextInput
            disabled={disabled}
            size='sm'
            value={extractPhoneInputString(fieldValue)}
            variant='default'
            classNames={{
              input:
                'border-gray-3 bg-surface text-xs text-gray-12 shadow-2xs focus:border-primary-9',
            }}
            placeholder={placeholder}
            onChange={(e) =>
              onChange(
                field.id,
                updatePhoneFieldValue(fieldValue, e.target.value, field),
              )
            }
          />
        </LivePreviewSearchableInput>
      )
    case 'CURRENCY_AMOUNT': {
      const currencyCode = extractCurrencyCode(fieldValue, field)
      return (
        <LivePreviewSearchableInput
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          onChange={onChange}
          onUpdateModel={onUpdateModel}
        >
          <div className='flex items-center gap-1.5'>
            <span className='flex h-9 items-center rounded-md border border-gray-3 bg-gray-1 px-2.5 text-xs font-semibold text-gray-11'>
              {currencyCode}
            </span>
            <TextInput
              className='flex-1'
              disabled={disabled}
              size='sm'
              type='number'
              value={String(extractCurrencyNumericValue(fieldValue))}
              variant='default'
              classNames={{
                input:
                  'border-gray-3 bg-surface text-xs text-gray-12 shadow-2xs focus:border-primary-9',
              }}
              placeholder={placeholder}
              onChange={(e) =>
                onChange(
                  field.id,
                  updateCurrencyFieldValue(fieldValue, e.target.value, field),
                )
              }
            />
          </div>
        </LivePreviewSearchableInput>
      )
    }
    case 'SHORT_TEXT':
    case 'EMAIL':
    case 'URL':
    case 'ADDRESS':
    case 'FULL_NAME':
    case 'CONTACT_INFO':
      return (
        <LivePreviewSearchableInput
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          onChange={onChange}
          onUpdateModel={onUpdateModel}
        >
          <TextInput
            disabled={disabled}
            size='sm'
            value={
              isStructuredCurrencyValue(fieldValue)
                ? formatRuntimeFieldDisplayValue(fieldValue, field)
                : String(fieldValue)
            }
            variant='default'
            classNames={{
              input:
                'border-gray-3 bg-surface text-xs text-gray-12 shadow-2xs focus:border-primary-9',
            }}
            placeholder={placeholder}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        </LivePreviewSearchableInput>
      )
    case 'NUMBER':
    case 'COUNTER':
      return (
        <LivePreviewSearchableInput
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          onChange={onChange}
          onUpdateModel={onUpdateModel}
        >
          <TextInput
            disabled={disabled}
            size='sm'
            type='number'
            value={String(fieldValue)}
            variant='default'
            classNames={{
              input:
                'border-gray-3 bg-surface text-xs text-gray-12 shadow-2xs focus:border-primary-9',
            }}
            placeholder={placeholder}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        </LivePreviewSearchableInput>
      )
    case 'CALCULATED':
      return <CalculatedFieldInput value={fieldValue} hideLabel />
    case 'LONG_TEXT':
      return (
        <textarea
          className='min-h-[80px] w-full rounded-md border border-gray-3 bg-surface p-2.5 text-xs text-gray-12 shadow-2xs transition-colors outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-1 focus:ring-primary-3 disabled:opacity-60'
          disabled={disabled}
          placeholder={placeholder}
          value={String(fieldValue)}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )
    case 'DATE':
      return (
        <LivePreviewSearchableInput
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          onChange={onChange}
          onUpdateModel={onUpdateModel}
        >
          <TextInput
            disabled={disabled}
            leftSection={<Icon height={15} name='tabler:calendar' width={15} />}
            placeholder='YYYY-MM-DD or MM/DD/YYYY'
            size='sm'
            value={String(fieldValue)}
            variant='default'
            classNames={{
              input:
                'border-gray-3 bg-surface text-xs text-gray-12 shadow-2xs focus:border-primary-9',
            }}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        </LivePreviewSearchableInput>
      )
    case 'RATING':
      return (
        <Rating
          color='yellow'
          count={field.settings.specific.iconCount || 5}
          readOnly={disabled}
          size='md'
          value={Number(fieldValue) || 0}
          onChange={(val) => onChange(field.id, val)}
        />
      )
    case 'OPINION_SCALE': {
      const maxScale = Number((field.settings.specific as any).scaleMax) || 10
      const currentNum = Number(fieldValue)
      return (
        <div className='flex flex-wrap gap-1.5'>
          {Array.from({ length: maxScale }, (_, idx) => idx + 1).map((num) => (
            <button
              disabled={disabled}
              key={num}
              type='button'
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-all',
                currentNum === num
                  ? 'border-primary-9 bg-primary-9 text-white'
                  : 'border-gray-3 bg-surface text-gray-12 hover:border-primary-5',
                disabled && 'cursor-not-allowed opacity-60',
              )}
              onClick={() => onChange(field.id, num)}
            >
              {num}
            </button>
          ))}
        </div>
      )
    }
    case 'YES_NO_TOGGLE': {
      const isYes =
        fieldValue === true ||
        fieldValue === 'true' ||
        fieldValue === 'Yes' ||
        fieldValue === 'YES'
      return (
        <div className='flex items-center gap-2'>
          <button
            disabled={disabled}
            type='button'
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
              isYes
                ? 'border-primary-9 bg-primary-9 text-white'
                : 'border-gray-3 bg-surface text-gray-12',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            onClick={() => onChange(field.id, true)}
          >
            Yes
          </button>
          <button
            disabled={disabled}
            type='button'
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
              fieldValue === false ||
                fieldValue === 'false' ||
                fieldValue === 'No' ||
                fieldValue === 'NO'
                ? 'border-primary-9 bg-primary-9 text-white'
                : 'border-gray-3 bg-surface text-gray-12',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            onClick={() => onChange(field.id, false)}
          >
            No
          </button>
        </div>
      )
    }
    case 'SINGLE_SELECT':
      return (
        <LivePreviewSearchableInput
          fallbackRepositoryId={fallbackRepositoryId}
          field={field}
          model={model}
          onChange={onChange}
          onUpdateModel={onUpdateModel}
        >
          <LivePreviewDropdown
            disabled={disabled}
            fallbackRepositoryId={fallbackRepositoryId}
            field={field}
            model={model}
            value={fieldValue}
            onChange={(val) => onChange(field.id, val)}
          />
        </LivePreviewSearchableInput>
      )
    case 'MULTI_SELECT':
      return (
        <>
          <LivePreviewPreselect
            field={field}
            model={model}
            value={fieldValue}
            onChange={(val) => onChange(field.id, val)}
          />
          <LivePreviewDropdown
            disabled={disabled}
            fallbackRepositoryId={fallbackRepositoryId}
            field={field}
            model={model}
            value={fieldValue}
            multiple
            onChange={(val) => onChange(field.id, val)}
          />
        </>
      )
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return (
        <>
          <LivePreviewPreselect
            field={field}
            model={model}
            value={fieldValue}
            onChange={(val) => onChange(field.id, val)}
          />
          <LivePreviewChoiceGroup
            disabled={disabled}
            fallbackRepositoryId={fallbackRepositoryId}
            field={field}
            model={model}
            value={fieldValue}
            onChange={(val) => onChange(field.id, val)}
          />
        </>
      )
    default:
      return (
        <TextInput
          disabled={disabled}
          size='sm'
          value={
            formatRuntimeFieldDisplayValue(fieldValue, field) === '-'
              ? ''
              : formatRuntimeFieldDisplayValue(fieldValue, field)
          }
          variant='default'
          classNames={{
            input:
              'border-gray-3 bg-surface text-xs text-gray-12 shadow-2xs focus:border-primary-9',
          }}
          placeholder={placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )
  }
}

export default LivePreview
