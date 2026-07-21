import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import { AnimateFadeIn } from '@/components/common/animations'
import { compareHeaderSimilarity } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import cn from '@/utils/cn'
import logoMark from '@/assets/logo/mark.png'

interface TemplateColumn {
  readonly key: string
  readonly required: boolean
}

interface ApColumnMappingProps {
  mapping: Record<string, string>
  previewRows: any[]
  uploadedColumns: string[]
  onUpdateMapping: (
    mapping: Record<string, string>,
    fieldDataTypes: Record<string, string>
  ) => void
  fieldDataTypes: Record<string, string>
  activeMappingTab: 'header' | 'lineItems'
}

const DEFAULT_FIELD_TYPES: Record<string, string> = {
  'PO Number': 'SHORT_TEXT',
  'Supplier': 'SHORT_TEXT',
  'Supplier Address': 'LONG_TEXT',
  'Ship To Address': 'LONG_TEXT',
  'PO Date': 'DATE',
  'Terms': 'LONG_TEXT',
  'Buyer': 'SHORT_TEXT',
  'PO Amount': 'CURRENCY_AMOUNT',
  'Currency': 'SINGLE_SELECT',
  'Line ': 'NUMBER',
  'Part Number': 'SHORT_TEXT',
  'Description': 'LONG_TEXT',
  'Quantity': 'NUMBER',
  'UOM': 'SHORT_TEXT',
  'Unit Cost': 'CURRENCY_AMOUNT',
  'Tax': 'CURRENCY_AMOUNT',
  'Extended': 'CURRENCY_AMOUNT',
  'Req Date': 'DATE',
  'Weight': 'NUMBER',
  'G/L Account': 'SHORT_TEXT',
  'Additional Notes': 'LONG_TEXT',
}

const DATA_TYPES = [
  { id: 'SHORT_TEXT', name: 'Short Text', icon: 'tabler:abc' },
  { id: 'LONG_TEXT', name: 'Long Text', icon: 'tabler:align-left' },
  { id: 'NUMBER', name: 'Number', icon: 'tabler:numbers' },
  { id: 'DATE', name: 'Date', icon: 'tabler:calendar' },
  { id: 'DATE_TIME', name: 'Date & Time', icon: 'tabler:clock' },
  { id: 'CURRENCY_AMOUNT', name: 'Currency', icon: 'tabler:currency-dollar' },
  { id: 'SINGLE_SELECT', name: 'Dropdown', icon: 'tabler:list' },
  { id: 'MULTI_SELECT', name: 'Multi Select', icon: 'tabler:list-check' },
  { id: 'EMAIL', name: 'Email', icon: 'tabler:mail' },
  { id: 'PHONE_NUMBER', name: 'Phone', icon: 'tabler:phone' },
  { id: 'URL', name: 'Link', icon: 'tabler:link' },
]

export default function ApColumnMapping({
  mapping,
  previewRows,
  uploadedColumns,
  onUpdateMapping,
  fieldDataTypes,
  activeMappingTab,
}: ApColumnMappingProps) {
  const templateSchema: readonly TemplateColumn[] =
    activeMappingTab === 'header' ? SYSTEM_TEMPLATE_COLUMNS : LINE_ITEM_TEMPLATE_COLUMNS

  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null)
  const [activeTypeDropdownRow, setActiveTypeDropdownRow] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [customFieldText, setCustomFieldText] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)


  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownRow(null)
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setActiveTypeDropdownRow(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectField = (excelCol: string, ezKey: string | null) => {
    const nextMapping = { ...mapping }
    const nextDataTypes = { ...fieldDataTypes }

    // Find if this Excel column was mapped to any other EZOFIS field, and clear it
    Object.keys(nextMapping).forEach((key) => {
      if (nextMapping[key]?.toLowerCase().trim() === excelCol.toLowerCase().trim()) {
        delete nextMapping[key]
      }
    })

    if (ezKey) {
      // Map new field
      nextMapping[ezKey] = excelCol
      // If it doesn't have a data type, assign a default
      if (!nextDataTypes[ezKey]) {
        nextDataTypes[ezKey] = DEFAULT_FIELD_TYPES[ezKey] || 'SHORT_TEXT'
      }
    }


    onUpdateMapping(nextMapping, nextDataTypes)
    setActiveDropdownRow(null)
    setSearchQuery('')
    setCustomFieldText('')
  }

  const handleCreateCustomField = (excelCol: string, customName: string) => {
    const trimmed = customName.trim()
    if (!trimmed) return

    // Ensure it's not a duplicate of predefined fields
    const matchesPredefined = templateSchema.some(
      (col) => col.key.toLowerCase() === trimmed.toLowerCase()
    )

    if (matchesPredefined) {
      // Match it with the predefined one instead
      const predefined = templateSchema.find(
        (col) => col.key.toLowerCase() === trimmed.toLowerCase()
      )
      if (predefined) {
        handleSelectField(excelCol, predefined.key)
        return
      }
    }

    const nextMapping = { ...mapping }
    const nextDataTypes = { ...fieldDataTypes }

    // Clear old mapping for this column
    Object.keys(nextMapping).forEach((key) => {
      if (nextMapping[key]?.toLowerCase().trim() === excelCol.toLowerCase().trim()) {
        delete nextMapping[key]
      }
    })

    // Map new custom field
    nextMapping[trimmed] = excelCol
    nextDataTypes[trimmed] = 'SHORT_TEXT' // default datatype for custom fields

    onUpdateMapping(nextMapping, nextDataTypes)
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
        compareHeaderSimilarity(excelCol, col.key)
      )
      if (match) {
        nextMapping[match.key] = excelCol
        nextDataTypes[match.key] = DEFAULT_FIELD_TYPES[match.key] || 'SHORT_TEXT'
      }
    })

    onUpdateMapping(nextMapping, nextDataTypes)
    showToast({
      message: 'Reset mappings to matching suggestions.',
      variant: 'default',
    })
  }

  // Predefined fields that are not yet mapped
  const getPredefinedOptions = (currentExcelCol: string) => {
    return templateSchema.map((col) => {
      const mappedCol = mapping[col.key]
      const isMappedToCurrent = !!(mappedCol && currentExcelCol && mappedCol.toLowerCase().trim() === currentExcelCol.toLowerCase().trim())
      const isMappedToOther = !!(mappedCol && currentExcelCol && mappedCol.toLowerCase().trim() !== currentExcelCol.toLowerCase().trim())

      return {
        key: col.key,
        required: col.required,
        isMappedToCurrent,
        isMappedToOther,
      }
    })
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300 overflow-visible">
      <div className="mt-0 space-y-3 border border-border-default rounded-xl pt-2.5 pb-4 px-4 bg-surface-primary shadow-sm overflow-visible">

        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-border-default pb-3">
          <div>
            <p className="text-[11px] text-gray-8">
              Map Excel file headers (source) to EZOFIS database fields (destination).
            </p>
          </div>
          <Tooltip content="Reset to default suggestions" position="top">
            <button
              className="flex items-center gap-1 text-[11px] font-bold text-primary-9 hover:underline active:scale-95 transition-all"
              type="button"
              onClick={handleReset}
            >
              <Icon className="size-3.5" name="tabler:rotate" />
              <span>Reset</span>
            </button>
          </Tooltip>
        </div>

        {/* Table layout */}
        <div className="flex flex-col gap-2">
          {/* Table Column Headers */}
          <div className="grid grid-cols-[1.2fr_1.2fr_1.6fr] gap-4 border-b border-border-default pb-2 text-[11px] font-semibold tracking-wider text-gray-10 select-none">
            <div className="flex items-center gap-1.5">
              <Icon className="size-3.5" name="vscode-icons:file-type-excel" />
              <span>Excel Fields</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2">
              <span>Example</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2">
              <img src={logoMark} className="size-3.5 shrink-0 object-contain" alt="EZOFIS Logo" />
              <span>EZOFIS Fields</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border-default/60 pr-1 overflow-visible">
            {uploadedColumns.map((excelCol) => {
              // Find which EZOFIS field maps to this Excel column
              const mappedEzField = Object.keys(mapping).find(
                (key) => mapping[key]?.toLowerCase().trim() === excelCol.toLowerCase().trim()
              )
              const hasMapping = !!mappedEzField
              const currentDataType = mappedEzField ? (fieldDataTypes[mappedEzField] || 'SHORT_TEXT') : 'SHORT_TEXT'
              const activeDataTypeObj = DATA_TYPES.find((t) => t.id === currentDataType) || DATA_TYPES[0]

              // First row preview value
              const rawPreviewVal = previewRows?.[0]?.[excelCol]
              let previewVal = ''
              if (rawPreviewVal !== undefined && rawPreviewVal !== null && rawPreviewVal !== '') {
                previewVal = String(rawPreviewVal)
              }

              const isDropdownOpen = activeDropdownRow === excelCol
              const isTypeDropdownOpen = activeTypeDropdownRow === excelCol

              const options = getPredefinedOptions(excelCol)
              const filteredOptions = options.filter((opt) =>
                opt.key.toLowerCase().includes(searchQuery.toLowerCase())
              )

              return (
                <div
                  className="grid grid-cols-[1.2fr_1.2fr_1.6fr] items-center gap-4 py-2.5 first:pt-1"
                  key={excelCol}
                >
                  {/* Column 1: Excel Field */}
                  <div className="flex min-w-0 items-center">
                    <span className="truncate text-[13px] font-semibold text-gray-12" title={excelCol}>
                      {excelCol}
                    </span>
                  </div>

                  {/* Column 2: Example value (excel 1st row value) */}
                  <div className="truncate text-[12px] font-medium text-gray-8 pl-2 hover:whitespace-normal hover:overflow-visible hover:break-words" title={previewVal}>
                    {previewVal ? (
                      <span>{previewVal}</span>
                    ) : (
                      <span className="italic text-gray-6">Empty</span>
                    )}
                  </div>

                  {/* Column 3: EZOFIS Field Selector */}
                  <div className="relative pl-2 min-w-0">
                    <div
                      className={cn(
                        'flex items-center justify-between w-full h-9 px-3 rounded-lg border text-12 font-medium transition-all duration-200 select-none cursor-pointer',
                        hasMapping
                          ? 'border-primary-9 bg-primary-2 text-primary-12 shadow-sm'
                          : 'border-gray-3 bg-surface hover:border-gray-4 text-gray-11'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTypeDropdownRow(null)
                        setActiveDropdownRow(isDropdownOpen ? null : excelCol)
                        setSearchQuery('')
                        setCustomFieldText('')
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {hasMapping ? (
                          <>
                            <Icon className="size-3.5 text-primary-9 shrink-0" name="tabler:circle-check" />
                            <span className="truncate text-[13px] font-semibold">{mappedEzField}</span>
                          </>
                        ) : (
                          <span className="text-gray-9 italic">Skip this field</span>
                        )}
                      </div>

                      {/* Dropdown controls (Datatype icon picker + toggle arrow) */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Datatype picker icon inside the field on the right side */}
                        {hasMapping && (
                          <Tooltip content={`Datatype: ${activeDataTypeObj.name}`} position="top">
                            <button
                              type="button"
                              className={cn(
                                'p-1 hover:bg-primary-3 rounded-md transition-colors flex items-center justify-center border',
                                isTypeDropdownOpen
                                  ? 'bg-primary-3 border-primary-9 text-primary-11'
                                  : 'border-transparent text-primary-9 hover:text-primary-11'
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveDropdownRow(null)
                                setActiveTypeDropdownRow(isTypeDropdownOpen ? null : excelCol)
                              }}
                            >
                              <Icon className="size-4" name={activeDataTypeObj.icon} />
                            </button>
                          </Tooltip>
                        )}
                        <Icon
                          className={cn(
                            'size-4 text-gray-9 transition-transform duration-200',
                            isDropdownOpen && 'rotate-180'
                          )}
                          name="tabler:chevron-down"
                        />
                      </div>
                    </div>

                    {/* Datatype Dropdown Selection */}
                    {isTypeDropdownOpen && hasMapping && (
                      <div
                        ref={typeDropdownRef}
                        className="absolute right-0 top-11 w-48 bg-surface-primary border border-border-default rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-2.5 pb-1 mb-1 border-b border-border-default/60 text-[10px] font-bold text-gray-9 tracking-wider select-none">
                          Choose Datatype
                        </div>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {DATA_TYPES.map((type) => (
                            <button
                              key={type.id}
                              type="button"
                              className={cn(
                                'w-full text-left px-3 py-1.5 text-12 font-medium flex items-center gap-2 hover:bg-gray-2 transition-colors',
                                currentDataType === type.id
                                  ? 'text-primary-9 bg-primary-1/10'
                                  : 'text-gray-12 hover:text-gray-13'
                              )}
                              onClick={() => handleSelectDataType(mappedEzField, type.id)}
                            >
                              <Icon className="size-4 shrink-0" name={type.icon} />
                              <span>{type.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Field Dropdown Selection */}
                    {isDropdownOpen && (
                      <div
                        ref={dropdownRef}
                        className="absolute left-2 right-0 top-11 min-w-[240px] bg-surface-primary border border-border-default rounded-xl shadow-xl z-40 p-2 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Search field */}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-2 border border-gray-3 rounded-lg mb-2">
                          <Icon className="size-4 text-gray-9" name="tabler:search" />
                          <input
                            type="text"
                            placeholder="Search or enter custom name..."
                            className="bg-transparent border-none text-12 font-medium text-gray-13 placeholder:text-gray-9 focus:outline-none w-full h-5"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value)
                              setCustomFieldText(e.target.value)
                            }}
                            autoFocus
                          />
                        </div>

                        {/* Dropdown Options List */}
                        <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-0.5">
                          {/* Option to skip / unmap */}
                          {hasMapping && (
                            <button
                              type="button"
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-12 font-medium text-red-11 hover:bg-red-2 hover:text-red-12 flex items-center gap-2 transition-all"
                              onClick={() => handleSelectField(excelCol, null)}
                            >
                              <Icon className="size-4" name="tabler:circle-x" />
                              <span>Skip this field (unmap)</span>
                            </button>
                          )}

                          {/* Predefined fields header */}
                          <div className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-bold text-gray-9 tracking-wider select-none">
                            PREDEFINED FIELDS
                          </div>

                          {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                className={cn(
                                  'w-full text-left px-2.5 py-1.5 rounded-lg text-12 font-medium flex items-center justify-between transition-all cursor-pointer',
                                  opt.isMappedToCurrent
                                    ? 'bg-primary-2 text-primary-12'
                                    : 'text-gray-12 hover:bg-gray-2 hover:text-gray-13'
                                )}
                                onClick={() => handleSelectField(excelCol, opt.key)}
                              >
                                <span className="truncate">{opt.key}</span>
                                {opt.required && !opt.isMappedToCurrent && !opt.isMappedToOther && (
                                  <span className="text-[10px] bg-red-2 text-red-11 px-1.5 py-0.5 rounded-md font-semibold border border-red-5/40">
                                    Required
                                  </span>
                                )}
                                {opt.isMappedToOther && (
                                  <span className="text-[10px] bg-gray-2 text-gray-8 px-1.5 py-0.5 rounded-md">
                                    Mapped
                                  </span>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="px-2.5 py-1.5 text-11 text-gray-9 italic select-none">
                              No matching predefined fields
                            </div>
                          )}

                          {/* Custom field addition */}
                          {customFieldText.trim() && (
                            <div className="border-t border-border-default/60 pt-1.5 mt-1.5">
                              <button
                                type="button"
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-12 font-medium text-primary-12 bg-primary-2 border border-primary-9 hover:bg-primary-3 flex items-center gap-2 transition-all"
                                onClick={() => handleCreateCustomField(excelCol, customFieldText)}
                              >
                                <Icon className="size-4 text-primary-9 shrink-0 animate-pulse" name="tabler:circle-plus" />
                                <span className="truncate font-semibold">
                                  Use custom field "{customFieldText.trim()}"
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend/Status footer */}
        <div className="flex items-center justify-between border-t border-border-default pt-3 mt-2 text-[11px] font-semibold text-gray-8 select-none">
          <span className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-primary-9" name="tabler:info-square-rounded" />
            <span>Type custom names to map non-standard fields</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-green-11" name="tabler:shield-check" />
            <span>Form datatypes automatically saved</span>
          </span>
        </div>
      </div>
    </div>
  )
}
