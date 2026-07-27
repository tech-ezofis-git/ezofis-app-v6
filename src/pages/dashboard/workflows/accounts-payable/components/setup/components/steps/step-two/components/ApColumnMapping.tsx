import { useEffect, useMemo, useRef, useState } from 'react'
import logoMark from '@/assets/logo/mark.png'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import {
  compareHeaderSimilarity,
  normalizeFieldMapping,
  resolvePredefinedFieldKey,
} from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import { DEFAULT_FIELD_TYPES } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/mappingFieldDefaults'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import cn from '@/utils/cn'

interface ApColumnMappingProps {
  activeMappingTab: 'header' | 'lineItems'
  fieldDataTypes: Record<string, string>
  mapping: Record<string, string>
  previewRows: any[]
  uploadedColumns: string[]
  onUpdateMapping: (
    mapping: Record<string, string>,
    fieldDataTypes: Record<string, string>,
  ) => void
}

interface TemplateColumn {
  readonly key: string
  readonly required: boolean
}

const DATA_TYPES = [
  { icon: 'lucide:type', id: 'SHORT_TEXT', name: 'Short Text' },
  { icon: 'tabler:align-left', id: 'LONG_TEXT', name: 'Long Text' },
  { icon: 'tabler:numbers', id: 'NUMBER', name: 'Number' },
  { icon: 'tabler:calendar', id: 'DATE', name: 'Date' },
  { icon: 'tabler:clock', id: 'DATE_TIME', name: 'Date & Time' },
  { icon: 'tabler:currency-dollar', id: 'CURRENCY_AMOUNT', name: 'Currency' },
  { icon: 'tabler:list', id: 'SINGLE_SELECT', name: 'Dropdown' },
  { icon: 'tabler:list-check', id: 'MULTI_SELECT', name: 'Multi Select' },
  { icon: 'tabler:mail', id: 'EMAIL', name: 'Email' },
  { icon: 'tabler:phone', id: 'PHONE_NUMBER', name: 'Phone' },
  { icon: 'tabler:link', id: 'URL', name: 'Link' },
]

const FIELD_KIND_ICONS = {
  custom: { className: 'text-purple-11', icon: 'tabler:circle-plus' },
  predefined: { className: 'text-gray-10', icon: 'tabler:template' },
} as const

export default function ApColumnMapping({
  activeMappingTab,
  fieldDataTypes = {},
  mapping = {},
  previewRows = [],
  uploadedColumns = [],
  onUpdateMapping,
}: ApColumnMappingProps) {
  const templateSchema: readonly TemplateColumn[] =
    activeMappingTab === 'header'
      ? SYSTEM_TEMPLATE_COLUMNS
      : LINE_ITEM_TEMPLATE_COLUMNS

  const customFieldKeys = useMemo(
    () =>
      [...new Set(Object.keys(mapping))].filter(
        (key) => !resolvePredefinedFieldKey(key, templateSchema),
      ),
    [mapping, templateSchema],
  )

  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(
    null,
  )
  const [activeTypeDropdownRow, setActiveTypeDropdownRow] = useState<
    string | null
  >(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [customFieldText, setCustomFieldText] = useState('')
  const [sectionOpen, setSectionOpen] = useState<
    Record<string, { custom: boolean; predefined: boolean }>
  >({})

  const dropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  const getSectionState = (excelCol: string) =>
    sectionOpen[excelCol] ?? { custom: true, predefined: true }

  const toggleSection = (
    excelCol: string,
    section: 'predefined' | 'custom',
  ) => {
    setSectionOpen((prev) => {
      const current = prev[excelCol] ?? { custom: true, predefined: true }
      return {
        ...prev,
        [excelCol]: {
          ...current,
          [section]: !current[section],
        },
      }
    })
  }

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdownRow(null)
      }
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveTypeDropdownRow(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Normalize legacy/custom keys that match predefined fields
  useEffect(() => {
    const needsNormalization = Object.keys(mapping).some((key) => {
      const resolved = resolvePredefinedFieldKey(key, templateSchema)
      return resolved !== null && resolved !== key
    })

    if (!needsNormalization) return

    const normalized = applyNormalizedMapping(
      mapping,
      fieldDataTypes,
      templateSchema,
    )
    onUpdateMapping(normalized.mapping, normalized.fieldDataTypes)
  }, [mapping, fieldDataTypes, templateSchema, onUpdateMapping])

  const handleSelectField = (excelCol: string, ezKey: string | null) => {
    const nextMapping = { ...mapping }
    const nextDataTypes = { ...fieldDataTypes }

    // Find if this Excel column was mapped to any other EZOFIS field, and clear it
    Object.keys(nextMapping).forEach((key) => {
      if (
        nextMapping[key]?.toLowerCase().trim() === excelCol.toLowerCase().trim()
      ) {
        delete nextMapping[key]
        delete nextDataTypes[key]
      }
    })

    if (ezKey) {
      const resolvedKey =
        resolvePredefinedFieldKey(ezKey, templateSchema) ?? ezKey
      // Map new field
      nextMapping[resolvedKey] = excelCol
      // If it doesn't have a data type, assign a default
      if (!nextDataTypes[resolvedKey]) {
        nextDataTypes[resolvedKey] =
          nextDataTypes[ezKey] ||
          DEFAULT_FIELD_TYPES[resolvedKey] ||
          'SHORT_TEXT'
      }
      if (resolvedKey !== ezKey) {
        delete nextDataTypes[ezKey]
      }
    }

    const normalized = applyNormalizedMapping(
      nextMapping,
      nextDataTypes,
      templateSchema,
    )

    onUpdateMapping(normalized.mapping, normalized.fieldDataTypes)
    setActiveDropdownRow(null)
    setSearchQuery('')
    setCustomFieldText('')
  }

  const handleCreateCustomField = (excelCol: string, customName: string) => {
    const trimmed = customName.trim()
    if (!trimmed) return

    const predefinedKey = resolvePredefinedFieldKey(trimmed, templateSchema)
    if (predefinedKey) {
      handleSelectField(excelCol, predefinedKey)
      return
    }

    const nextMapping = { ...mapping }
    const nextDataTypes = { ...fieldDataTypes }

    // Clear old mapping for this column
    Object.keys(nextMapping).forEach((key) => {
      if (
        nextMapping[key]?.toLowerCase().trim() === excelCol.toLowerCase().trim()
      ) {
        delete nextMapping[key]
        delete nextDataTypes[key]
      }
    })

    // Map new custom field
    nextMapping[trimmed] = excelCol
    nextDataTypes[trimmed] = 'SHORT_TEXT' // default datatype for custom fields

    const normalized = applyNormalizedMapping(
      nextMapping,
      nextDataTypes,
      templateSchema,
    )

    onUpdateMapping(normalized.mapping, normalized.fieldDataTypes)
    setActiveDropdownRow(null)
    setSearchQuery('')
    setCustomFieldText('')

    showToast({
      message: `Created custom field "${trimmed}"`,
      variant: 'default',
    })
  }

  const handleSelectDataType = (ezKey: string, typeId: string) => {
    const nextDataTypes = { ...fieldDataTypes }
    nextDataTypes[ezKey] = typeId
    onUpdateMapping(mapping, nextDataTypes)
    setActiveTypeDropdownRow(null)
  }

  const handleReset = () => {
    const nextMapping: Record<string, string> = {}
    const nextDataTypes: Record<string, string> = {}

    uploadedColumns.forEach((excelCol) => {
      const match = templateSchema.find((col) =>
        compareHeaderSimilarity(excelCol, col.key),
      )
      if (match) {
        nextMapping[match.key] = excelCol
        nextDataTypes[match.key] =
          DEFAULT_FIELD_TYPES[match.key] || 'SHORT_TEXT'
      }
    })

    const normalized = applyNormalizedMapping(
      nextMapping,
      nextDataTypes,
      templateSchema,
    )

    onUpdateMapping(normalized.mapping, normalized.fieldDataTypes)
    showToast({
      message: 'Reset mappings to matching suggestions.',
      variant: 'default',
    })
  }

  // Predefined fields that are not yet mapped
  const getPredefinedOptions = (currentExcelCol: string) => {
    return templateSchema.map((col) => {
      const mappedCol = mapping[col.key]
      const isMappedToCurrent = !!(
        mappedCol &&
        currentExcelCol &&
        mappedCol.toLowerCase().trim() === currentExcelCol.toLowerCase().trim()
      )
      const isMappedToOther = !!(
        mappedCol &&
        currentExcelCol &&
        mappedCol.toLowerCase().trim() !== currentExcelCol.toLowerCase().trim()
      )

      return {
        isMappedToCurrent,
        isMappedToOther,
        key: col.key,
        required: col.required,
      }
    })
  }

  return (
    <div className='animate-in fade-in slide-in-from-top-2 w-full overflow-visible duration-300'>
      <div className='mt-0 space-y-3 overflow-visible rounded-xl border border-border-default bg-surface-primary px-4 pt-2.5 pb-4 shadow-sm'>
        {/* Header toolbar */}
        <div className='flex items-center justify-between border-b border-border-default pb-3'>
          <div>
            <p className='text-[11px] text-gray-8'>
              Map Excel file headers (source) to EZOFIS database fields
              (destination).
            </p>
          </div>
          <Tooltip content='Reset to default suggestions' position='top'>
            <button
              className='flex items-center gap-1 text-[11px] font-bold text-primary-9 transition-all hover:underline active:scale-95'
              type='button'
              onClick={handleReset}
            >
              <Icon className='size-3.5' name='tabler:rotate' />
              <span>Reset</span>
            </button>
          </Tooltip>
        </div>

        {/* Table layout */}
        <div className='flex flex-col gap-2'>
          {/* Table Column Headers */}
          <div className='grid grid-cols-[1.2fr_1.2fr_1.6fr] gap-4 border-b border-border-default pb-2 text-[11px] font-semibold tracking-wider text-gray-10 select-none'>
            <div className='flex items-center gap-1.5'>
              <Icon className='size-3.5' name='vscode-icons:file-type-excel' />
              <span>Excel Fields</span>
            </div>
            <div className='flex items-center gap-1.5 pl-2'>
              <span>Example</span>
            </div>
            <div className='flex items-center gap-1.5 pl-2'>
              <img
                alt='EZOFIS Logo'
                className='size-3.5 shrink-0 object-contain'
                src={logoMark}
              />
              <span>EZOFIS Fields</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className='divide-y divide-border-default/60 overflow-visible pr-1'>
            {uploadedColumns.map((excelCol) => {
              // Find which EZOFIS field maps to this Excel column
              const mappedEzField = Object.keys(mapping).find(
                (key) =>
                  mapping[key]?.toLowerCase().trim() ===
                  excelCol.toLowerCase().trim(),
              )
              const hasMapping = !!mappedEzField
              const selectedFieldKind = mappedEzField
                ? isPredefinedField(mappedEzField, templateSchema)
                  ? 'predefined'
                  : 'custom'
                : null
              const currentDataType = mappedEzField
                ? fieldDataTypes[mappedEzField] || 'SHORT_TEXT'
                : 'SHORT_TEXT'
              const activeDataTypeObj =
                DATA_TYPES.find((t) => t.id === currentDataType) ||
                DATA_TYPES[0]

              // First row preview value
              const rawPreviewVal = previewRows?.[0]?.[excelCol]
              let previewVal = ''
              if (
                rawPreviewVal !== undefined &&
                rawPreviewVal !== null &&
                rawPreviewVal !== ''
              ) {
                previewVal = String(rawPreviewVal)
              }

              const isDropdownOpen = activeDropdownRow === excelCol
              const isTypeDropdownOpen = activeTypeDropdownRow === excelCol

              const options = getPredefinedOptions(excelCol)
              const filteredOptions = options.filter((opt) =>
                opt.key.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              const filteredCustomFields = customFieldKeys.filter((key) =>
                key.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              const isSearching = searchQuery.trim().length > 0
              const sectionState = getSectionState(excelCol)
              const showAddCustomField =
                !!customFieldText.trim() &&
                !resolvePredefinedFieldKey(
                  customFieldText.trim(),
                  templateSchema,
                ) &&
                !customFieldKeys.some(
                  (key) =>
                    key.toLowerCase() === customFieldText.trim().toLowerCase(),
                )
              const predefinedOpen =
                sectionState.predefined ||
                (isSearching && filteredOptions.length > 0)
              const customOpen =
                sectionState.custom ||
                (isSearching &&
                  (filteredCustomFields.length > 0 || showAddCustomField))

              return (
                <div
                  className='grid grid-cols-[1.2fr_1.2fr_1.6fr] items-center gap-4 py-2.5 first:pt-1'
                  key={excelCol}
                >
                  {/* Column 1: Excel Field */}
                  <div className='flex min-w-0 items-center'>
                    <span
                      className='truncate text-[13px] font-semibold text-gray-12'
                      title={excelCol}
                    >
                      {excelCol}
                    </span>
                  </div>

                  {/* Column 2: Example value (excel 1st row value) */}
                  <div
                    className='truncate pl-2 text-[12px] font-medium text-gray-8 hover:overflow-visible hover:break-words hover:whitespace-normal'
                    title={previewVal}
                  >
                    {previewVal ? (
                      <span>{previewVal}</span>
                    ) : (
                      <span className='text-gray-6 italic'>Empty</span>
                    )}
                  </div>

                  {/* Column 3: EZOFIS Field Selector */}
                  <div className='relative min-w-0 pl-2'>
                    <div
                      className='flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-3 bg-surface px-3 text-13 font-medium text-gray-12 transition-all duration-200 select-none hover:border-gray-4'
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTypeDropdownRow(null)
                        setActiveDropdownRow(isDropdownOpen ? null : excelCol)
                        setSearchQuery('')
                        setCustomFieldText('')
                      }}
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        {hasMapping ? (
                          <>
                            <Icon
                              name={FIELD_KIND_ICONS[selectedFieldKind!].icon}
                              className={cn(
                                'size-2.5 shrink-0',
                                FIELD_KIND_ICONS[selectedFieldKind!].className,
                              )}
                            />
                            <span className='truncate text-13 font-medium text-gray-12'>
                              {mappedEzField}
                            </span>
                          </>
                        ) : (
                          <span className='truncate text-13 font-normal text-gray-8'>
                            Skip this field
                          </span>
                        )}
                      </div>

                      {/* Dropdown controls (Datatype icon picker + toggle arrow) */}
                      <div className='flex shrink-0 items-center gap-2'>
                        {/* Datatype picker icon inside the field on the right side */}
                        {hasMapping && (
                          <Tooltip
                            content={`${activeDataTypeObj.name}`}
                            position='top'
                          >
                            <button
                              type='button'
                              className={cn(
                                'flex size-5 items-center justify-center rounded-md border transition-colors hover:bg-gray-2',
                                isTypeDropdownOpen
                                  ? 'border-gray-4 bg-gray-2 text-gray-12'
                                  : 'border-transparent text-gray-9 hover:text-gray-11',
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveDropdownRow(null)
                                setActiveTypeDropdownRow(
                                  isTypeDropdownOpen ? null : excelCol,
                                )
                              }}
                            >
                              <Icon
                                className='size-3 shrink-0'
                                name={activeDataTypeObj.icon}
                              />
                            </button>
                          </Tooltip>
                        )}
                        <Icon
                          name='tabler:chevron-down'
                          className={cn(
                            'size-3.5 shrink-0 text-gray-9 transition-transform duration-200',
                            isDropdownOpen && 'rotate-180',
                          )}
                        />
                      </div>
                    </div>

                    {/* Datatype Dropdown Selection */}
                    {isTypeDropdownOpen && hasMapping && (
                      <div
                        className='animate-in fade-in zoom-in-95 absolute top-11 right-0 z-50 w-48 rounded-xl border border-border-default bg-surface-primary py-1.5 shadow-xl duration-150'
                        ref={typeDropdownRef}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className='mb-1 border-b border-border-default/60 px-2.5 pb-1 text-[10px] font-bold tracking-wider text-gray-9 uppercase select-none'>
                          Choose Datatype
                        </div>
                        <div className='custom-scrollbar max-h-56 overflow-y-auto'>
                          {DATA_TYPES.map((type) => (
                            <button
                              key={type.id}
                              type='button'
                              className={cn(
                                'flex min-h-8 w-full items-center gap-2 px-3 py-1.5 text-left text-13 font-medium transition-colors hover:bg-gray-2',
                                currentDataType === type.id
                                  ? 'bg-gray-2 text-gray-13'
                                  : 'text-gray-12 hover:text-gray-13',
                              )}
                              onClick={() =>
                                handleSelectDataType(mappedEzField, type.id)
                              }
                            >
                              <Icon
                                className='size-3.5 shrink-0'
                                name={type.icon}
                              />
                              <span className='truncate'>{type.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Field Dropdown Selection */}
                    {isDropdownOpen && (
                      <div
                        className='animate-in fade-in zoom-in-95 absolute top-11 right-0 left-2 z-40 min-w-[240px] rounded-xl border border-border-default bg-surface-primary p-2 shadow-xl duration-150'
                        ref={dropdownRef}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Search field */}
                        <div className='mb-2 border-b border-border-default/60 px-2 pb-2'>
                          <input
                            className='h-7 w-full border-none bg-transparent text-13 font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 focus:outline-none'
                            placeholder='Search or enter custom name...'
                            type='text'
                            value={searchQuery}
                            autoFocus
                            onChange={(e) => {
                              setSearchQuery(e.target.value)
                              setCustomFieldText(e.target.value)
                            }}
                          />
                        </div>

                        {/* Dropdown Options List */}
                        <div className='custom-scrollbar max-h-52 space-y-0.5 overflow-y-auto'>
                          {/* Predefined fields */}
                          <button
                            className='flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-gray-9 uppercase transition-colors hover:bg-gray-2'
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSection(excelCol, 'predefined')
                            }}
                          >
                            <span>
                              Predefined fields ({filteredOptions.length})
                            </span>
                            <Icon
                              name='tabler:chevron-down'
                              className={cn(
                                'size-3.5 text-gray-8 transition-transform duration-200',
                                predefinedOpen && 'rotate-180',
                              )}
                            />
                          </button>

                          {predefinedOpen &&
                            (filteredOptions.length > 0 ? (
                              filteredOptions.map((opt) => (
                                <button
                                  key={opt.key}
                                  type='button'
                                  className={cn(
                                    'flex min-h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-13 font-medium transition-colors',
                                    opt.isMappedToCurrent
                                      ? 'bg-gray-2 text-gray-13'
                                      : 'text-gray-12 hover:bg-gray-2 hover:text-gray-13',
                                  )}
                                  onClick={() =>
                                    handleSelectField(excelCol, opt.key)
                                  }
                                >
                                  <span className='truncate'>{opt.key}</span>
                                </button>
                              ))
                            ) : (
                              <div className='px-2.5 py-1.5 text-13 font-normal text-gray-8 select-none'>
                                No matching predefined fields
                              </div>
                            ))}

                          {(filteredCustomFields.length > 0 ||
                            showAddCustomField) && (
                            <>
                              <button
                                className='mt-1 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-gray-9 uppercase transition-colors hover:bg-gray-2'
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSection(excelCol, 'custom')
                                }}
                              >
                                <span>
                                  Custom fields
                                  {filteredCustomFields.length > 0 &&
                                    ` (${filteredCustomFields.length})`}
                                </span>
                                <Icon
                                  name='tabler:chevron-down'
                                  className={cn(
                                    'size-3.5 text-gray-8 transition-transform duration-200',
                                    customOpen && 'rotate-180',
                                  )}
                                />
                              </button>
                              {customOpen && (
                                <>
                                  {filteredCustomFields.map((customKey) => {
                                    const mappedCol = mapping[customKey]
                                    const isMappedToCurrent = !!(
                                      mappedCol &&
                                      mappedCol.toLowerCase().trim() ===
                                        excelCol.toLowerCase().trim()
                                    )

                                    return (
                                      <button
                                        key={customKey}
                                        type='button'
                                        className={cn(
                                          'flex min-h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-13 font-medium transition-colors',
                                          isMappedToCurrent
                                            ? 'bg-gray-2 text-gray-13'
                                            : 'text-gray-12 hover:bg-gray-2 hover:text-gray-13',
                                        )}
                                        onClick={() =>
                                          handleSelectField(excelCol, customKey)
                                        }
                                      >
                                        <span className='truncate'>
                                          {customKey}
                                        </span>
                                      </button>
                                    )
                                  })}
                                  {showAddCustomField && (
                                    <div className='mt-1.5 border-t border-border-default/60 pt-1.5'>
                                      <button
                                        className='w-full rounded-md border border-gray-4 bg-gray-2 px-2.5 py-1.5 text-left text-13 font-medium text-gray-12 transition-colors hover:bg-gray-3'
                                        type='button'
                                        onClick={() =>
                                          handleCreateCustomField(
                                            excelCol,
                                            customFieldText,
                                          )
                                        }
                                      >
                                        <span className='truncate'>
                                          Add custom field "
                                          {customFieldText.trim()}"
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Skip field */}
                        <div className='mt-2 border-t border-border-default/60 px-2 pt-2'>
                          <button
                            className='flex min-h-8 w-full items-center gap-2 text-left text-13 font-medium text-red-11 transition-colors hover:text-red-12'
                            type='button'
                            onClick={() => handleSelectField(excelCol, null)}
                          >
                            <Icon
                              className='size-3.5 shrink-0'
                              name='tabler:circle-x'
                            />
                            <span>
                              Skip this field{hasMapping ? ' (unmap)' : ''}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status footer */}
        <div className='mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border-default pt-3 text-[11px] font-semibold text-gray-8 select-none'>
          <span className='flex items-center gap-1.5'>
            <Icon
              className='size-3.5 text-green-11'
              name='tabler:shield-check'
            />
            <span>Form datatypes automatically saved</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function applyNormalizedMapping(
  mapping: Record<string, string>,
  fieldDataTypes: Record<string, string>,
  templateSchema: readonly TemplateColumn[],
) {
  return normalizeFieldMapping(
    mapping,
    fieldDataTypes,
    templateSchema,
    DEFAULT_FIELD_TYPES,
  )
}

function isPredefinedField(
  fieldKey: string,
  templateSchema: readonly TemplateColumn[],
) {
  return resolvePredefinedFieldKey(fieldKey, templateSchema) !== null
}
