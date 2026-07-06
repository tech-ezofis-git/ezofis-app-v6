import { useState, useMemo, useEffect, useRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'

// System template columns schema with metadata
export const SYSTEM_TEMPLATE_COLUMNS = [
  { key: 'PO Number', label: 'Purchase Order #', desc: 'Unique PO Identifier', required: true },
  { key: 'Vendor Name', label: 'Vendor Name', desc: 'Entity supplying goods', required: true },
  { key: 'Vendor Address', label: 'Vendor Address', desc: 'Supplier physical billing address', required: true },
  { key: 'Ship To Address', label: 'Ship To Address', desc: 'Shipping destination address', required: true },
  { key: 'PO Date', label: 'Issue Date', desc: 'Document creation date', required: true },
  { key: 'PO Amount', label: 'Total Amount', desc: 'Gross currency value', required: true },
  { key: 'Terms', label: 'Payment Terms', desc: 'Invoicing terms and conditions', required: false },
  { key: 'Buyer', label: 'Buyer', desc: 'PO issuer or procurement contact', required: false },
  { key: 'Currency', label: 'Currency', desc: 'Transactional currency', required: false },
] as const

export type SystemColumnKey = (typeof SYSTEM_TEMPLATE_COLUMNS)[number]['key']

interface EditFieldMappingsProps {
  uploadedColumns: string[]
  previewRows: any[]
  mapping: Record<string, string>
  onChangeMapping: (newMapping: Record<string, string>) => void
  fileName: string
  fileSize: number
  onSave: () => void
  onCancel: () => void
}

export default function EditFieldMappings({
  uploadedColumns,
  previewRows,
  mapping,
  onChangeMapping,
  fileName,
  fileSize,
  onSave,
  onCancel,
}: EditFieldMappingsProps) {
  const [openFieldDropdown, setOpenFieldDropdown] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")

  const suggestedMappingRef = useRef<Record<string, string>>({})

  // Save initial auto-mapped suggestions for reset action
  useEffect(() => {
    if (Object.keys(suggestedMappingRef.current).length === 0 && Object.keys(mapping).length > 0) {
      suggestedMappingRef.current = { ...mapping }
    }
  }, [mapping])

  const handleResetToSuggested = () => {
    onChangeMapping({ ...suggestedMappingRef.current })
    showToast({
      message: 'Reset to initial auto-mapped suggestions.',
      variant: 'default',
    })
  }

  // Map to format file size
  const formattedFileSize = useMemo(() => {
    if (!fileSize) return '0 KB'
    if (fileSize < 1024 * 1024) {
      return `${(fileSize / 1024).toFixed(1)} KB`
    }
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
  }, [fileSize])

  // Count required fields that are mapped
  const requiredFields = useMemo(
    () => SYSTEM_TEMPLATE_COLUMNS.filter((col) => col.required),
    []
  )
  const mappedRequiredCount = useMemo(() => {
    return requiredFields.filter((col) => !!mapping[col.key]).length
  }, [mapping, requiredFields])

  const isSaveDisabled = mappedRequiredCount < requiredFields.length

  const handleSelectColumn = (fieldKey: string, column: string | null) => {
    // If selecting a file column (that is not Skip), warn if already mapped
    if (column && column !== "Skip to Import") {
      const existingFieldEntry = Object.entries(mapping).find(
        ([masterKey, val]) => val === column && masterKey !== fieldKey
      )
      if (existingFieldEntry) {
        const existingFieldKey = existingFieldEntry[0]
        const colLabel = SYSTEM_TEMPLATE_COLUMNS.find((c) => c.key === existingFieldKey)?.label || existingFieldKey
        showToast({
          message: `Warning: Column "${column}" is already mapped to "${colLabel}".`,
          variant: 'warning',
        })
      }
    }

    const newMapping = { ...mapping }
    if (column) {
      newMapping[fieldKey] = column
    } else {
      delete newMapping[fieldKey]
    }
    onChangeMapping(newMapping)
  }

  const handleToggleDropdown = (colKey: string) => {
    setSearchText("")
    setOpenFieldDropdown(openFieldDropdown === colKey ? null : colKey)
  }

  // Get only mapped fields for data preview headers
  const mappedPreviewColumns = useMemo(() => {
    return SYSTEM_TEMPLATE_COLUMNS.filter((col) => !!mapping[col.key])
  }, [mapping])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex h-full w-full flex-col bg-surface-muted duration-300">
      {/* Top Header */}
      <div className="flex h-13 shrink-0 items-center border-b border-border-default bg-surface-primary px-6">
        <button
          className="group flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-9 transition-colors hover:text-gray-12"
          onClick={onCancel}
        >
          <Icon className="size-4 transition-transform group-hover:-translate-x-0.5" name="tabler:arrow-left" />
          <span>Back to PO Setup</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-8 pb-8 animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both">
        <div className="mx-auto flex w-full max-w-6xl flex-col lg:flex-row items-start gap-8">
          
          {/* Left Column: Mappings and Preview */}
          <div className="flex-1 flex flex-col gap-6 min-w-0 w-full">
            {/* Section Header */}
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-gray-13 xl:text-2xl">
                Edit Field Mappings
              </h1>
              <p className="max-w-3xl text-xs font-medium leading-relaxed text-gray-10 xl:text-sm">
                Your PO Master Data source has been parsed. Below, manually align the columns from your uploaded CSV/XLSX file to the required system fields for accurate processing.
              </p>
            </div>

            {/* Mapping Card */}
            <div className="rounded-2xl border border-border-default bg-surface-primary shadow-2xs overflow-hidden max-h-[48vh] flex flex-col min-h-[320px]">
              {/* Table Header */}
              <div className="flex bg-surface-secondary/40 border-b border-border-default px-6 py-2.5 text-[11px] font-bold tracking-wider text-gray-8 uppercase shrink-0 items-center justify-between">
                <div className="grid grid-cols-2 flex-1">
                  <div>System Field</div>
                  <div>File Column</div>
                </div>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-primary-9 transition-colors hover:text-primary-10 bg-transparent border-0 px-2.5 py-1 rounded-lg hover:bg-primary-9/5 active:scale-95 shrink-0"
                  onClick={handleResetToSuggested}
                >
                  <Icon className="size-3.5" name="tabler:rotate" />
                  <span>Reset to Suggested</span>
                </button>
              </div>

              {/* List of Fields */}
              <div className="divide-y divide-border-default/60 overflow-y-auto custom-scrollbar flex-1 pb-32">
                {SYSTEM_TEMPLATE_COLUMNS.map((col) => {
                  const selectedVal = mapping[col.key]
                  const isMapped = !!selectedVal
                  const isOpen = openFieldDropdown === col.key

                  const filteredColumns = searchText
                    ? uploadedColumns.filter((colName) =>
                        colName.toLowerCase().includes(searchText.toLowerCase())
                      )
                    : uploadedColumns

                  return (
                    <div
                      key={col.key}
                      className={cn(
                        "grid grid-cols-1 md:grid-cols-2 items-start px-6 py-4.5 transition-colors duration-200 gap-4",
                        isMapped ? "bg-green-3/5" : "bg-transparent",
                        isOpen && "bg-accent-soft/5"
                      )}
                    >
                      {/* Left: System Field Info */}
                      <div className="flex items-start gap-3">
                        {col.required ? (
                          <Icon
                            className="mt-1 size-3 shrink-0 text-red-11 animate-pulse"
                            name="tabler:asterisk"
                            title="Required Field"
                          />
                        ) : (
                          <Icon
                            className="mt-1 size-3 shrink-0 text-gray-7"
                            name="tabler:circle"
                            title="Optional Field"
                          />
                        )}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-semibold text-gray-12">
                              {col.label}
                            </span>
                            {col.required && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-11/70">
                                (Required)
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] font-medium text-gray-8 leading-normal">
                            {col.desc}
                          </p>
                        </div>
                      </div>

                      {/* Right: File Column Dropdown Selector */}
                      <div className="relative w-full">
                        <button
                          type="button"
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-[13px] font-medium shadow-2xs transition-all duration-200 outline-hidden hover:bg-surface-secondary active:scale-[0.99]",
                            selectedVal === "Skip to Import"
                              ? "border-gray-9/30 bg-surface-secondary text-gray-10 hover:border-gray-9/50"
                              : isMapped
                                ? "border-green-11/30 bg-green-3/10 text-green-12"
                                : col.required
                                  ? "border-red-9/30 bg-red-3/5 text-red-11 border-dashed hover:border-red-11/50"
                                  : "border-border-default bg-surface-primary text-gray-8 border-dashed hover:border-primary-9/40"
                          )}
                          onClick={() => handleToggleDropdown(col.key)}
                        >
                          <span className="truncate font-semibold flex items-center gap-1.5">
                            {selectedVal === "Skip to Import" && (
                              <Icon className="size-4 text-gray-9 shrink-0 animate-in fade-in" name="tabler:ban" />
                            )}
                            <span>{selectedVal || "Select matching column..."}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedVal === "Skip to Import" ? null : isMapped ? (
                              <Icon className="size-4 text-green-11 animate-in fade-in zoom-in" name="tabler:circle-check" />
                            ) : col.required ? (
                              <Icon className="size-4 text-red-11 animate-in fade-in" name="tabler:exclamation-circle" />
                            ) : null}
                            <Icon
                              className={cn(
                                "size-4 text-gray-9 transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                              name="tabler:chevron-down"
                            />
                          </div>
                        </button>

                        {/* Inline Preview and Validation Messages */}
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          {selectedVal === "Skip to Import" ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-8 animate-in slide-in-from-top-1">
                              <Icon className="size-3.5 text-gray-8" name="tabler:ban" />
                              <span>Skipped (Will not be imported)</span>
                            </span>
                          ) : col.required && !selectedVal ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-red-11 animate-in slide-in-from-top-1">
                              <Icon className="size-3.5" name="tabler:exclamation-circle" />
                              <span>Required field must be mapped.</span>
                            </span>
                          ) : (
                            <p className="text-[11px] font-medium text-gray-8">
                              {selectedVal ? (
                                <>
                                  Preview: <span className="font-semibold text-gray-12">"{String(previewRows[0]?.[selectedVal] ?? 'empty')}"</span>
                                </>
                              ) : (
                                <span className="italic text-gray-7">No column mapped</span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Dropdown Options (Floating Overlay) */}
                        {isOpen && (
                          <div className="animate-in slide-in-from-top-2 absolute left-0 right-0 z-50 mt-1.5 w-full rounded-xl border border-border-default bg-surface-primary p-2 shadow-lg duration-200 animate-out fade-out zoom-out-95">
                            
                            {/* Dropdown Search Input */}
                            <div className="relative mb-2 shrink-0">
                              <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-8" name="tabler:search" />
                              <input
                                type="text"
                                className="w-full rounded-lg border border-border-default bg-surface-secondary pl-9 pr-3 py-2 text-xs font-semibold text-gray-12 outline-hidden focus:border-primary-9 focus:ring-1 focus:ring-primary-9"
                                placeholder="Search columns..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            <div className="border-b border-border-default/45 px-3 py-1.5 text-[9px] font-extrabold tracking-wider text-gray-8 uppercase">
                              Select File Column
                            </div>
                            
                            <div className="custom-scrollbar max-h-40 overflow-y-auto py-1">
                              {/* Skip to Import special action */}
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] transition-all duration-150 hover:bg-accent-soft hover:text-primary-9 active:scale-[0.98] border-b border-border-default/40 pb-2.5 mb-1",
                                  selectedVal === "Skip to Import"
                                    ? "bg-accent-soft font-bold text-primary-9"
                                    : "text-gray-9 font-semibold"
                                )}
                                onClick={() => {
                                  handleSelectColumn(col.key, "Skip to Import")
                                  setOpenFieldDropdown(null)
                                }}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Icon className="size-4 text-gray-8" name="tabler:ban" />
                                  <span>Skip to Import</span>
                                </span>
                                {selectedVal === "Skip to Import" && (
                                  <Icon className="size-4 text-primary-9 font-bold" name="tabler:check" />
                                )}
                              </button>

                              {filteredColumns.map((colName) => (
                                <button
                                  key={colName}
                                  type="button"
                                  className={cn(
                                    "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] transition-all duration-150 hover:bg-accent-soft hover:text-primary-9 active:scale-[0.98]",
                                    selectedVal === colName
                                      ? "bg-accent-soft font-bold text-primary-9"
                                      : "text-gray-12"
                                  )}
                                  onClick={() => {
                                    handleSelectColumn(col.key, colName)
                                    setOpenFieldDropdown(null)
                                  }}
                                >
                                  <span className="truncate">{colName}</span>
                                  {selectedVal === colName && (
                                    <Icon className="size-4 text-primary-9 font-bold" name="tabler:check" />
                                  )}
                                </button>
                              ))}

                              {filteredColumns.length === 0 && (
                                <div className="px-3 py-4 text-center text-xs font-semibold text-gray-8">
                                  {uploadedColumns.length === 0 ? "No columns detected" : "No columns match search"}
                                </div>
                              )}
                            </div>

                            {selectedVal && (
                              <button
                                type="button"
                                className="mt-1 w-full cursor-pointer rounded-lg border-t border-border-default/45 py-2.5 text-center text-[12px] font-bold text-red-11 transition-all duration-150 hover:bg-red-3/30 hover:text-red-12 active:scale-[0.98]"
                                onClick={() => {
                                  handleSelectColumn(col.key, null)
                                  setOpenFieldDropdown(null)
                                }}
                              >
                                Clear mapping
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Data Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-13">Data Preview</h2>
              </div>

              <div className="rounded-2xl border border-border-default bg-surface-primary shadow-2xs overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar pb-1">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border-default bg-surface-secondary/40 text-[11px] font-bold text-gray-8 uppercase tracking-wider">
                        {mappedPreviewColumns.map((col, colIdx) => (
                          <th
                            key={col.key}
                            className={cn(
                              "px-4 py-3.5 text-left border-r border-border-default/50 last:border-r-0 whitespace-nowrap",
                              colIdx === 0 && "sticky left-0 bg-surface-secondary z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
                            )}
                          >
                            {col.label}
                          </th>
                        ))}
                        {mappedPreviewColumns.length === 0 && (
                          <th className="px-4 py-5 text-center text-[12px] text-gray-8 font-semibold">
                            Map columns to preview data
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 4).map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-b border-border-default/50 text-[13px] text-gray-12 hover:bg-surface-secondary/30 last:border-b-0 transition-colors duration-150 group"
                        >
                          {mappedPreviewColumns.map((col, colIdx) => {
                            const fileHeader = mapping[col.key]
                            const rawVal = fileHeader === 'Skip to Import' ? null : row[fileHeader]
                            const isSkipped = fileHeader === 'Skip to Import'

                            // Custom styling and format helpers
                            let displayVal = String(rawVal ?? '')
                            if (col.key === 'PO Amount' && rawVal && !displayVal.startsWith('$')) {
                              const parsedNum = parseFloat(displayVal.replace(/[^0-9.-]/g, ''))
                              if (!isNaN(parsedNum)) {
                                displayVal = new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD'
                                }).format(parsedNum)
                              }
                            }

                            return (
                              <td
                                key={col.key}
                                className={cn(
                                  "px-4 py-4 border-r border-border-default/40 last:border-r-0 max-w-[220px] truncate font-medium",
                                  colIdx === 0 && "sticky left-0 bg-surface-primary group-hover:bg-surface-secondary/40 z-10 border-r border-border-default shadow-[2px_0_5px_rgba(0,0,0,0.03)]"
                                )}
                              >
                                {isSkipped ? (
                                  <span className="text-gray-8 font-semibold italic flex items-center gap-1 text-[12px]">
                                    <Icon className="size-3.5 text-gray-8 animate-in fade-in" name="tabler:ban" />
                                    <span>skipped</span>
                                  </span>
                                ) : displayVal || (
                                  <span className="text-gray-7 italic">empty</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}

                      {previewRows.length === 0 && mappedPreviewColumns.length > 0 && (
                        <tr>
                          <td colSpan={mappedPreviewColumns.length} className="px-4 py-8 text-center text-xs font-semibold text-gray-8">
                            No preview rows available in this file.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Snapped Action Bar */}
          <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-4 flex flex-col gap-4">
            
            {/* Action pill / card */}
            <div className="rounded-2xl border border-border-default bg-surface-primary p-5 shadow-sm flex flex-col gap-5">
              
              <div className="space-y-2">
                <span className="block font-semibold text-gray-8 uppercase tracking-wider text-[9px]">Mapping Status</span>
                <span className="rounded-xl bg-accent-soft px-3 py-2 text-center text-xs font-bold text-primary-9 block w-full">
                  {mappedRequiredCount} of {requiredFields.length} required fields mapped
                </span>
                
                {/* Mini progress bar */}
                <div className="h-1.5 w-full bg-gray-2 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full bg-primary-9 transition-all duration-500 rounded-full"
                    style={{ width: `${(mappedRequiredCount / requiredFields.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="h-[1px] bg-border-default/60" />

              {/* Source File Info */}
              <div className="flex items-center gap-3 rounded-xl border border-border-default/50 bg-surface-secondary/40 p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary-9 shrink-0">
                  <Icon className="size-4.5" name="tabler:file-text" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-8 uppercase tracking-wider text-[9px]">Source File</span>
                  <div className="text-[12px] font-bold text-gray-12 truncate" title={fileName}>
                    {fileName}
                  </div>
                  <span className="text-[11px] text-gray-8 font-medium">({formattedFileSize})</span>
                </div>
              </div>

              <div className="h-[1px] bg-border-default/60" />

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={isSaveDisabled}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white shadow-xs transition-all duration-200 active:scale-[0.98]",
                    isSaveDisabled
                      ? "cursor-not-allowed bg-gray-2 text-gray-8 opacity-45"
                      : "bg-primary-9 hover:bg-primary-10 hover:shadow-xs"
                  )}
                  onClick={onSave}
                >
                  <Icon className="size-4.5" name="tabler:circle-check" />
                  <span>Save Mappings</span>
                </button>

                {isSaveDisabled && (
                  <p className="text-[11px] font-semibold text-red-11 leading-normal animate-pulse">
                    * Map all required fields to save.
                  </p>
                )}

                <button
                  type="button"
                  className="w-full cursor-pointer rounded-xl border border-border-default bg-surface-primary py-3 text-[13px] font-bold text-gray-11 transition-all duration-150 hover:bg-surface-secondary active:scale-[0.98]"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
