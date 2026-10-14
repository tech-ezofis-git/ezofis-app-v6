import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { SegmentedControl } from '@mantine/core'
import { useDebouncedCallback } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { Option } from '@/types/option'
import {
  getRepositoryItemFacets,
  getRepositorys,
  uploadForOcr,
} from '@/api/v6/folder/folder'
import {
  fetchFtlCatalogCodes,
  fetchFtlCatalogProduct,
} from '@/api/v6/ftlCatalog'
import { getUsers } from '@/api/v6/user'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputDateTime from '@/components/base/inputs/InputDateTime'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import InputTime from '@/components/base/inputs/InputTime'
import Combobox from '@/components/base/inputs/select/Combobox'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import BarcodeScannerPanel from '@/components/common/barcode-scanner/BarcodeScannerPanel'
import { extractHeadersAndData } from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/step-two/utils/fileParser'
import { evaluateFormula } from '@/pages/form-builder/helpers/formula'
import {
  applyCalculatedContentRule,
  buildTableRowDefaults,
  canReplaceUntouchedRow,
  clampTextToMaxLength,
  getColumnCurrencyCode,
  getColumnCurrencyOptions,
  getNumberBounds,
  getNumberCellProps,
  parseScannedNumber,
} from '@/pages/form-builder/helpers/tableColumnDefaults'
import {
  addFilesToValue,
  buildColumnOcrHints,
  getColumnFileError,
  getColumnOcrTargets,
  getFileInputAccept,
  isFileColumnType,
  isMultiFileColumn,
  mapOcrToRowPatch,
  removeFileFromValue,
  toFileList,
} from '@/pages/form-builder/helpers/tableColumnFiles'
import {
  applyScannedValue,
  ensureSelectedOptions,
  getColumnMasterConfig,
  getColumnOptionsSource,
  getColumnPredefinedType,
  parseColumnOptions,
  selectColumnCellOptions,
  toStoredOptionValue,
} from '@/pages/form-builder/helpers/tableColumnOptions'
import { getRowCellRuleStates } from '@/pages/form-builder/helpers/tableColumnRules'
import {
  type AddressSuggestion,
  buildAddressPatch,
  fetchAddressSuggestions,
  isAddressColumn,
  isQrColumn,
} from '@/pages/form-builder/helpers/tableColumnShortText'
import { getSessionTableUser } from '@/pages/form-builder/helpers/tableColumnUser'
import {
  computeTableColumnTotals,
  extractCurrencyNumericValue,
  extractPhoneInputString,
  fetchMasterFormColumnOptions,
  fetchMasterTableRows,
  formatRuntimeFieldDisplayValue,
  getDateTimeLimits,
  getEffectiveColumnLabel,
  getEffectiveFieldLabel,
  resolveRuntimeFieldType,
  shouldShowTableSummaryRow,
  updateCurrencyFieldValue,
  updatePhoneFieldValue,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

const generateRowId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }
}

export interface TableColumn {
  id: string
  label?: string
  name?: string
  size?: 'SMALL' | 'MEDIUM' | 'LARGE'
  type?: string
  settings?: {
    general?: {
      displayLabel?: string
      tooltip?: string
      visibility?: 'DISABLE' | 'HIDDEN' | 'NORMAL' | 'READ_ONLY'
    }
    lookupSettings?: {
      cascadeFromColumn?: string
      optionsSource?: 'API' | 'LOOKUP' | 'MASTER' | 'PREDEFINED' | 'USER_LIST'
      repositoryField?: string
      repositoryId?: string
    }
    specific?: {
      addressMatchingFields?: Array<{
        addressColumn: string
        id: string
        selectFieldColumn: string[]
      }>
      allowMultipleFiles?: boolean
      allowToAddNewOptions?: boolean
      currencyOptionsType?: 'ALL' | 'SPECIFIC'
      customDefaultValue?: string
      customOptions?: string
      defaultCurrency?: string
      defaultValueType?: string
      formulaTokens?: Array<{ type: string; value: string }>
      isAddressField?: boolean
      isSameMaster?: boolean
      masterFormColumn?: string
      masterFormId?: string
      placeholder?: string
      predefinedType?: 'FOLDER' | 'USER'
      prefixLabel?: string
      qrValue?: boolean
      separateOptionsUsing?: 'COMMA' | 'NEWLINE'
      showAllData?: boolean
      showColumnTotal?: boolean
      specificCurrencies?: string[]
      step?: number | string
      suffixLabel?: string
      yearType?: 'CALENDER_YEAR' | 'FINANCIAL_YEAR'
    }
    validation?: {
      allowedFileTypes?: string[]
      assignOtherControls?: string[]
      contentRule?: string
      dateLimitType?: 'MAX_DATE' | 'MIN_DATE' | 'NONE' | 'RANGE'
      decimalDigits?: number | string
      fieldRule?: 'OPTIONAL' | 'REQUIRED'
      fixedEndDate?: string
      fixedEndTime?: string
      fixedStartDate?: string
      fixedStartTime?: string
      mandatorySettings?: Array<{
        controls: string[]
        id: string
        value: string
      }>
      maxDateOffset?: number | string
      maxFileSize?: number | string
      maximum?: number | string
      maximumNumberField?: string
      maxTimeOffset?: number | string
      minDateOffset?: number | string
      minimum?: number | string
      minimumNumberField?: string
      minTimeOffset?: number | string
      rangeType?: 'CUSTOM' | 'MIN_FIXED_MAX_FLEX' | 'MIN_FLEX_MAX_FIXED'
      readonlySettings?: Array<{
        controls: string[]
        id: string
        notEqual?: boolean
        value: string
      }>
      timeFormat?: '12' | '24'
      timeLimitType?: 'MAX_TIME' | 'MIN_TIME' | 'NONE' | 'RANGE'
    }
  }
}

const getColumnPlaceholder = (col: TableColumn) =>
  col.settings?.specific?.placeholder || getEffectiveColumnLabel(col) || '...'

const getColumnLabel = (col: TableColumn) => getEffectiveColumnLabel(col)

const isColumnReadOnly = (col: TableColumn) =>
  col.settings?.general?.visibility === 'READ_ONLY' ||
  col.settings?.general?.visibility === 'DISABLE'

const isApiOptionsColumn = (col: TableColumn) =>
  col.settings?.lookupSettings?.optionsSource === 'API'

const findPriceColumnId = (columns: TableColumn[]) => {
  const exact = columns.find((col) => {
    const key = normalizeHeaderKey(col.name || col.id)
    return key === 'price' || key === 'unitprice'
  })
  if (exact) return exact.id
  const fuzzy = columns.find((col) => {
    const key = normalizeHeaderKey(col.name || col.id)
    return key.includes('price') && !key.includes('subtotal')
  })
  return fuzzy?.id
}

const findDescriptionColumnId = (columns: TableColumn[]) =>
  columns.find((col) => isDescriptionColumn(col))?.id

const normalizeHeaderKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, '')

const HEADER_ALIAS_GROUPS = [
  ['qty', 'quantity', 'qnty'],
  ['price', 'rate', 'unitprice'],
  ['subtotal', 'amount', 'lineamount', 'linetotal', 'extended'],
  ['product', 'item', 'itemname', 'sku'],
  ['description', 'desc', 'details', 'itemdescription'],
]

const headerLookupKeys = (header: string) => {
  const normalized = normalizeHeaderKey(header)
  const group = HEADER_ALIAS_GROUPS.find((keys) => keys.includes(normalized))
  return group || [normalized]
}

const isDescriptionColumn = (col: { id?: string; name?: string }) => {
  const keys = [col.name, col.id].filter(Boolean).map((v) => String(v))
  return keys.some((key) => {
    const normalized = normalizeHeaderKey(key)
    return (
      normalized.includes('description') ||
      normalized === 'desc' ||
      normalized === 'details'
    )
  })
}

export const mapExternalRowsToTableColumns = (
  externalRows: Record<string, any>[],
  tableColumns: Array<{ id: string; name?: string }>,
): Record<string, any>[] => {
  const columnByHeader = new Map<string, string>()
  tableColumns.forEach((col) => {
    headerLookupKeys(col.name || '').forEach((key) => {
      if (key && !columnByHeader.has(key)) columnByHeader.set(key, col.id)
    })
    headerLookupKeys(col.id || '').forEach((key) => {
      if (key && !columnByHeader.has(key)) columnByHeader.set(key, col.id)
    })
  })
  return externalRows.map((row) => {
    const mapped: Record<string, any> = { _rowId: generateRowId() }
    Object.entries(row || {}).forEach(([header, cellVal]) => {
      if (header.startsWith('_')) {
        mapped[header] = cellVal
        return
      }
      const colId = headerLookupKeys(header)
        .map((key) => columnByHeader.get(key))
        .find(Boolean)
      if (colId) mapped[colId] = cellVal
      // Keep warning / category keys even when the form has no matching column.
      if (
        header === 'Note' ||
        header === 'Needs Engineering Review' ||
        header === 'Category'
      ) {
        mapped[header] = cellVal
      }
    })
    return mapped
  })
}

interface Props {
  field: any
  /** The resolved master-form column key the parent field matches against (see fetchMasterTableRows). */
  masterSyncParentColumnKey?: string
  /** The current form's parent field live value — triggers a master-table re-sync when it changes. */
  masterSyncParentValue?: any
  ocrLineItems?: Record<string, any>[]
  readOnly?: boolean
  /** Repository the OCR upload runs against (for "fill other columns" file columns). */
  repositoryId?: string
  required?: boolean
  showRowApprove?: boolean
  value?: Array<Record<string, any>>
  /** AP-style flat chrome (default). Use `form` for denser card-style table. */
  variant?: 'flat' | 'form'
  onChange: (rows: Record<string, any>[]) => void
}

const getTableIconName = (label: string) => {
  const l = String(label || '').toLowerCase()
  if (l.includes('matched') || l.includes('match')) return 'tabler:circle-check'
  if (l.includes('excluded') || l.includes('exclude') || l.includes('reject'))
    return 'tabler:circle-x'
  if (l.includes('po ') || l.includes('purchase')) return 'tabler:shopping-cart'
  if (l.includes('invoice')) return 'tabler:file-invoice'
  if (l.includes('line')) return 'tabler:file-invoice'
  return 'tabler:table'
}

// Calculated columns can reference OTHER calculated columns in the same row
// (e.g. "Total" = "Amount" + "Tax" where "Amount" is itself Quantity × Rate).
// Resolves them together with repeated passes until nothing changes anymore,
// so a calculated cell's value is visible to any other formula that
// references it — matching the same fixed-point approach the top-level
// CALCULATED field type already uses (helpers/formula.ts's
// applyCalculatedFields), just scoped to one table row instead of the whole
// form's values.
const resolveCalculatedRow = (
  row: Record<string, any>,
  tableColumns: TableColumn[],
  allRows: Record<string, any>[] = [],
  tableFieldId?: string,
): Record<string, any> => {
  const next = { ...row }
  const calculatedColumns = tableColumns.filter((c) => c.type === 'CALCULATED')
  if (calculatedColumns.length === 0) return next

  const colRefs = tableColumns.map((c) => ({
    id: c.id,
    label: c.name,
    name: c.name,
    settings: c.settings,
    type: c.type,
  }))

  for (let pass = 0; pass <= calculatedColumns.length; pass += 1) {
    let changed = false
    for (const col of calculatedColumns) {
      const tokens = col.settings?.specific?.formulaTokens
      if (!tokens?.length) continue
      const context = tableFieldId
        ? { ...next, [tableFieldId]: allRows }
        : { ...next, _rows: allRows }
      const result = applyCalculatedContentRule(
        col,
        evaluateFormula(tokens as any, context, colRefs as any),
      )
      const formatted = result === null ? '' : result
      if (next[col.id] !== formatted) {
        next[col.id] = formatted
        changed = true
      }
    }
    if (!changed) break
  }
  return next
}

const getColumnWidthClass = (size?: string) => {
  switch (size) {
    case 'SMALL':
      return 'w-28 min-w-[120px]'
    case 'LARGE':
      return 'w-64 min-w-[240px]'
    case 'MEDIUM':
    default:
      return 'w-44 min-w-[160px]'
  }
}

const toCatalogOptions = (codes: string[], currentValue: string): Option[] => {
  const next = codes.map((code) => ({
    id: code,
    name: code,
    value: code,
  }))
  if (currentValue && !next.some((opt) => String(opt.id) === currentValue)) {
    next.unshift({
      id: currentValue,
      name: currentValue,
      value: currentValue,
    })
  }
  return next
}

const TABLE_CATALOG_DROPDOWN_WIDTH = 220

const ApiCatalogSelect = ({
  autoOpen = false,
  col,
  compact = false,
  readOnly,
  value,
  onSelectProduct,
}: {
  autoOpen?: boolean
  col?: TableColumn | null
  /** Narrow trigger + fixed dropdown width for table cells. */
  compact?: boolean
  readOnly?: boolean
  value: any
  onSelectProduct: (productCode: string | null) => void | Promise<void>
}) => {
  const [options, setOptions] = useState<Option[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const currentValue = value != null && value !== '' ? String(value) : ''
  const currentValueRef = useRef(currentValue)
  currentValueRef.current = currentValue

  const lastFetchedKeyRef = useRef<string | null>(null)
  const inFlightKeyRef = useRef<string | null>(null)
  const requestSeqRef = useRef(0)

  const loadCodes = useCallback(async (searchKey: string) => {
    const key = searchKey.trim()
    if (lastFetchedKeyRef.current === key) return
    if (inFlightKeyRef.current === key) return

    inFlightKeyRef.current = key
    const seq = ++requestSeqRef.current
    setLoading(true)
    try {
      const codes = await fetchFtlCatalogCodes(key)
      if (seq !== requestSeqRef.current) return
      lastFetchedKeyRef.current = key
      setOptions(toCatalogOptions(codes, currentValueRef.current))
    } catch {
      if (seq !== requestSeqRef.current) return
      const fallback = currentValueRef.current
      setOptions(
        fallback ? [{ id: fallback, name: fallback, value: fallback }] : [],
      )
    } finally {
      if (seq === requestSeqRef.current) {
        inFlightKeyRef.current = null
        setLoading(false)
      }
    }
  }, [])

  const debouncedLoadCodes = useDebouncedCallback((searchKey: string) => {
    void loadCodes(searchKey)
  }, 400)

  const handleDropdownOpen = useCallback(() => {
    // Prefill search with the current product code so results match the value.
    const key = currentValueRef.current.trim()
    setSearch(key)
    void loadCodes(key)
  }, [loadCodes])

  const handleSearch = useCallback(
    (nextSearch: string) => {
      setSearch(nextSearch)
      // Dropdown close / selection clears search with "" — do not fire a
      // second catalog "codes" request after the details fetch.
      if (!nextSearch.trim()) return
      debouncedLoadCodes(nextSearch)
    },
    [debouncedLoadCodes],
  )

  if (readOnly) {
    return (
      <div className='truncate px-2 py-1 text-xs text-gray-12'>
        {currentValue || '-'}
      </div>
    )
  }

  const selected: Option | null = currentValue
    ? options.find((opt) => String(opt.id) === currentValue) || {
        id: currentValue,
        name: currentValue,
        value: currentValue,
      }
    : null

  const placeholder = (col && getColumnPlaceholder(col)) || 'Select product...'

  return (
    <Combobox
      autoOpen={autoOpen}
      className={compact ? 'w-full max-w-[220px] min-w-0' : 'w-full'}
      loading={loading || loadingDetails}
      options={options}
      placeholder={placeholder}
      readOnly={readOnly}
      search={search}
      searchPlaceholder='Search...'
      value={selected ? [selected] : []}
      variant='single'
      width={compact ? TABLE_CATALOG_DROPDOWN_WIDTH : 'target'}
      searchable
      onChange={async (opts) => {
        const opt = opts?.[0] ?? null
        const code = opt ? String(opt.id) : null
        // Cancel any pending codes search so select only triggers details.
        debouncedLoadCodes.cancel?.()
        setSearch('')
        if (code) {
          setOptions((prev) =>
            toCatalogOptions(
              prev.map((o) => String(o.id)),
              code,
            ),
          )
        }
        setLoadingDetails(true)
        try {
          await onSelectProduct(code)
        } finally {
          setLoadingDetails(false)
        }
      }}
      onDropdownClose={() => {
        setSearch('')
      }}
      onDropdownOpen={handleDropdownOpen}
      onSearch={handleSearch}
    />
  )
}

export { ApiCatalogSelect }

interface CellActions {
  siblingColumns: TableColumn[]
  row?: Record<string, unknown>
  onFilesAdded?: (files: File[]) => Promise<OcrStatus | void> | void
  onRowPatch?: (patch: Record<string, unknown>) => void
}
/** Outcome of reading a document into the row, shown under the file cell. */
interface OcrStatus {
  text: string
  tone: 'error' | 'info'
}


// NUMBER / COUNTER cell: number input honoring the column's content rule,
// range (fixed, or taken from another cell of the row), step, prefix/suffix,
// plus an optional QR / barcode scan button ("Read Values From QR").
const TableCellNumber = ({
  col,
  row,
  val,
  onCellChange,
}: {
  col: TableColumn
  row?: Record<string, unknown>
  val: number | string | null | undefined
  onCellChange: (newVal: unknown) => void
}) => {
  const [scannerOpen, setScannerOpen] = useState(false)
  const qr = col.settings?.specific?.qrValue === true
  const bounds = getNumberBounds(col, row)
  const input = (
    <InputNumber
      className='w-full'
      {...getNumberCellProps(col)}
      max={bounds.max}
      min={bounds.min}
      value={val != null ? val : ''}
      onChange={(v) => onCellChange(v)}
    />
  )
  if (!qr) return input
  return (
    <div className='flex w-full min-w-0 flex-col gap-1'>
      <div className='flex w-full min-w-0 items-center gap-1'>
        <div className='min-w-0 flex-1'>{input}</div>
        <button
          aria-label='Scan QR / Barcode'
          className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-3 bg-primary-1 text-primary-9 transition-all hover:border-primary-5 hover:bg-primary-2 active:scale-95'
          title='Scan QR / Barcode'
          type='button'
          onClick={() => setScannerOpen((open) => !open)}
        >
          <Icon height={14} name='lucide:qr-code' width={14} />
        </button>
      </div>
      {scannerOpen && (
        <BarcodeScannerPanel
          onClose={() => setScannerOpen(false)}
          onScan={(raw) => {
            const scanned = parseScannedNumber(col, raw)
            if (scanned !== undefined) onCellChange(scanned)
            setScannerOpen(false)
          }}
        />
      )}
    </div>
  )
}

const TableCellShortText = ({
  col,
  siblingColumns,
  val,
  onCellChange,
  onRowPatch,
}: {
  col: TableColumn
  siblingColumns: TableColumn[]
  val: unknown
  onCellChange: (newVal: unknown) => void
  onRowPatch?: (patch: Record<string, unknown>) => void
}) => {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const qr = isQrColumn(col)
  const address = isAddressColumn(col)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const handleTyped = (typed: string) => {
    const next = clampTextToMaxLength(typed, col)
    onCellChange(next)
    if (!address) return
    if (timer.current) clearTimeout(timer.current)
    if (next.trim().length < 3) {
      setSuggestions([])
      return
    }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        setSuggestions(await fetchAddressSuggestions(next))
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  const pickSuggestion = (suggestion: AddressSuggestion) => {
    const label = clampTextToMaxLength(suggestion.label, col)
    const patch = buildAddressPatch(col, siblingColumns, suggestion.raw)
    if (onRowPatch) onRowPatch({ [col.id]: label, ...patch })
    else onCellChange(label)
    setSuggestions([])
  }

  return (
    <div className='flex w-full min-w-0 flex-col gap-1'>
      <div className='flex w-full min-w-0 items-center gap-1'>
        <div className='min-w-0 flex-1'>
          <InputText
            className='w-full'
            placeholder={getColumnPlaceholder(col)}
            value={val != null ? String(val) : ''}
            onChange={handleTyped}
          />
        </div>
        {qr && (
          <button
            aria-label='Scan QR / Barcode'
            className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-3 bg-primary-1 text-primary-9 transition-all hover:border-primary-5 hover:bg-primary-2 active:scale-95'
            title='Scan QR / Barcode'
            type='button'
            onClick={() => setScannerOpen((open) => !open)}
          >
            <Icon height={14} name='lucide:qr-code' width={14} />
          </button>
        )}
      </div>
      {scannerOpen && (
        <BarcodeScannerPanel
          onClose={() => setScannerOpen(false)}
          onScan={(raw) => {
            onCellChange(clampTextToMaxLength(String(raw), col))
            setScannerOpen(false)
          }}
        />
      )}
      {address && (loading || suggestions.length > 0) && (
        <div className='animate-in fade-in max-h-40 overflow-y-auto rounded-md border border-gray-3 bg-surface duration-200'>
          {loading ? (
            <div className='flex items-center gap-2 p-2 text-xs text-gray-9'>
              <Icon
                className='animate-spin'
                height={12}
                name='lucide:loader-2'
                width={12}
              />
              Searching addresses...
            </div>
          ) : (
            suggestions.map((suggestion, i) => (
              <button
                className='block w-full cursor-pointer truncate px-2 py-1.5 text-left text-xs text-gray-12 transition-colors hover:bg-gray-2 active:bg-gray-3'
                key={`${suggestion.label}-${i}`}
                type='button'
                onClick={() => pickSuggestion(suggestion)}
              >
                {suggestion.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const TableCellFileInput = ({
  col,
  isImageType,
  val,
  onCellChange,
  onFilesAdded,
}: {
  col: TableColumn
  isImageType: boolean
  val: any
  onCellChange: (newVal: any) => void
  onFilesAdded?: (files: File[]) => Promise<OcrStatus | void> | void
}) => {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<OcrStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const multiple = isMultiFileColumn(col)
  const files = toFileList(val)
  const fileName: string | undefined = files[0]?.fileName

  const handlePick = async (picked: File[]) => {
    // The picker's accept list can be bypassed (e.g. "All files"), so every
    // selection is checked before it is accepted.
    const accepted: File[] = []
    let problem: string | null = null
    for (const file of picked) {
      const message = getColumnFileError(col, {
        name: file.name,
        size: file.size,
      })
      if (message) problem = problem ?? `${file.name}: ${message}`
      else accepted.push(file)
    }
    setError(problem)
    setStatus(null)
    if (accepted.length === 0) return

    onCellChange(
      addFilesToValue(
        col,
        val,
        accepted.map((file) => ({
          fileName: file.name,
          fileSize: file.size,
          rawFile: file,
        })),
      ),
    )
    if (onFilesAdded) {
      setBusy(true)
      try {
        const result = await onFilesAdded(accepted)
        if (result) setStatus(result)
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className='flex min-w-0 flex-col gap-1'>
      {multiple &&
        files.map((file, index) => (
          <div
            className='animate-in fade-in flex min-w-0 items-center gap-1 rounded-md bg-gray-2 px-1.5 py-0.5 text-xs text-gray-11 duration-200'
            key={`${file.fileName}-${index}`}
          >
            <Icon
              className='shrink-0 text-gray-6'
              height={12}
              name='lucide:paperclip'
              width={12}
            />
            <span
              className='min-w-0 flex-1 truncate'
              title={String(file.fileName ?? '')}
            >
              {file.fileName}
            </span>
            <button
              aria-label='Remove file'
              className='flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-gray-8 transition-all hover:bg-red-2 hover:text-red-9 active:scale-90'
              type='button'
              onClick={() => {
                setError(null)
                onCellChange(removeFileFromValue(col, val, index))
              }}
            >
              <Icon height={10} name='lucide:x' width={10} />
            </button>
          </div>
        ))}
      <label
        className={cn(
          'flex min-w-0 items-center gap-1.5 rounded-md border border-dashed border-gray-3 bg-surface px-2 py-1 text-xs text-gray-9 hover:border-primary-5',
          busy ? 'cursor-wait opacity-70' : 'cursor-pointer',
        )}
      >
        <Icon
          className={cn('shrink-0 text-gray-6', busy && 'animate-spin')}
          height={12}
          width={12}
          name={
            busy
              ? 'lucide:loader-2'
              : fileName && !multiple
                ? 'lucide:paperclip'
                : 'lucide:upload'
          }
        />
        <span className='min-w-0 flex-1 truncate'>
          {busy
            ? 'Reading document…'
            : multiple
              ? files.length > 0
                ? 'Add more files'
                : 'Add files'
              : fileName || '...'}
        </span>
        <input
          accept={getFileInputAccept(col, isImageType)}
          className='hidden'
          disabled={busy}
          multiple={multiple}
          type='file'
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (picked.length > 0) void handlePick(picked)
          }}
        />
      </label>
      {error && (
        <p className='text-[11px] leading-tight text-red-9'>{error}</p>
      )}
      {status && (
        <p
          className={cn(
            'text-[11px] leading-tight',
            status.tone === 'error' ? 'text-red-9' : 'text-gray-9',
          )}
        >
          {status.text}
        </p>
      )}
    </div>
  )
}

const TableCellSelect = ({
  col,
  isMulti,
  options,
  val,
  onCellChange,
}: {
  col: TableColumn
  isMulti?: boolean
  options: { id: string; name: string }[]
  val: any
  onCellChange: (newVal: any) => void
}) => {
  useEffect(() => {
    if (options.length === 1) {
      const singleVal = options[0].id
      if (isMulti) {
        const selectedIds: string[] = Array.isArray(val) ? val : []
        if (selectedIds.length === 0) {
          onCellChange([singleVal])
        }
      } else {
        if (val === undefined || val === null || val === '') {
          onCellChange(singleVal)
        }
      }
    }
  }, [options, val, isMulti, onCellChange])

  // A saved selection stays visible even if the option list changed or has
  // not loaded yet (the stored value itself is never altered here).
  const displayOptions = ensureSelectedOptions(options, val)
  const allowNew = col.settings?.specific?.allowToAddNewOptions === true
  const qr = col.settings?.specific?.qrValue === true
  const [scannerOpen, setScannerOpen] = useState(false)

  const select = isMulti ? (
    <InputSelectMultiple
      className='w-full'
      creatable={allowNew}
      options={displayOptions}
      placeholder={getColumnPlaceholder(col)}
      value={displayOptions.filter((opt) =>
        (Array.isArray(val) ? val : []).includes(opt.id),
      )}
      onChange={(opts) =>
        onCellChange(opts.map((opt) => toStoredOptionValue(opt, displayOptions)))
      }
    />
  ) : (
    <InputSelect
      className='w-full'
      creatable={allowNew}
      options={displayOptions}
      placeholder={getColumnPlaceholder(col)}
      value={displayOptions.find((opt) => opt.id === val) || null}
      onChange={(opt) =>
        onCellChange(opt ? toStoredOptionValue(opt, displayOptions) : null)
      }
    />
  )

  if (!qr) return select

  // "Read values from QR": a scanned code picks the matching option (or adds
  // it when users may add new options).
  return (
    <div className='flex w-full min-w-0 flex-col gap-1'>
      <div className='flex w-full min-w-0 items-center gap-1'>
        <div className='min-w-0 flex-1'>{select}</div>
        <button
          aria-label='Scan QR / Barcode'
          className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-gray-3 bg-primary-1 text-primary-9 transition-all hover:border-primary-5 hover:bg-primary-2 active:scale-95'
          title='Scan QR / Barcode'
          type='button'
          onClick={() => setScannerOpen((open) => !open)}
        >
          <Icon height={14} name='lucide:qr-code' width={14} />
        </button>
      </div>
      {scannerOpen && (
        <BarcodeScannerPanel
          onClose={() => setScannerOpen(false)}
          onScan={(raw) => {
            onCellChange(
              applyScannedValue(displayOptions, val, String(raw), {
                allowNew,
                multi: Boolean(isMulti),
              }),
            )
            setScannerOpen(false)
          }}
        />
      )}
    </div>
  )
}

const renderCellInput = (
  col: TableColumn,
  val: any,
  onCellChange: (newVal: any) => void,
  readOnly?: boolean,
  resolvedOptions?: { id: string; name: string }[],
  onApiProductSelect?: (productCode: string | null) => void | Promise<void>,
  rowIndex?: number,
  actions?: CellActions,
): ReactNode => {
  const cellType = resolveRuntimeFieldType(col)

  if (cellType === 'SERIAL_NUMBER') {
    return (
      <div className='truncate px-2 py-1 text-xs font-semibold text-gray-11'>
        {(rowIndex ?? 0) + 1}
      </div>
    )
  }

  if (cellType === 'CALCULATED') {
    return (
      <div className='truncate px-2 py-1 text-xs font-semibold text-gray-11'>
        {formatRuntimeFieldDisplayValue(val, col)}
      </div>
    )
  }

  if (
    (cellType === 'SINGLE_SELECT' || cellType === 'SINGLE_CHOICE') &&
    isApiOptionsColumn(col)
  ) {
    return (
      <div className='max-w-[220px] min-w-0'>
        <ApiCatalogSelect
          col={col}
          readOnly={readOnly}
          value={val}
          compact
          onSelectProduct={(code) =>
            onApiProductSelect ? onApiProductSelect(code) : onCellChange(code)
          }
        />
      </div>
    )
  }

  if (readOnly) {
    return (
      <div className='truncate px-2 py-1 text-xs text-gray-12'>
        {formatRuntimeFieldDisplayValue(val, col)}
      </div>
    )
  }

  switch (cellType) {
    case 'LONG_TEXT':
      return (
        <InputTextarea
          className='w-full'
          maxRows={4}
          minRows={1}
          placeholder={getColumnPlaceholder(col)}
          value={val != null ? String(val) : ''}
          autosize
          onChange={(v) => onCellChange(clampTextToMaxLength(v, col))}
        />
      )

    case 'NUMBER':
    case 'COUNTER':
      return (
        <TableCellNumber
          col={col}
          row={actions?.row}
          val={val}
          onCellChange={onCellChange}
        />
      )

    case 'CURRENCY_AMOUNT': {
      const currencyOptions = getColumnCurrencyOptions(col)
      const currencyCode = getColumnCurrencyCode(col, val)
      // Only a restricted list of 2+ currencies needs a picker; a single or
      // default currency is shown as the prefix. No currency configured keeps
      // the original `$` prefix.
      const showPicker = currencyOptions.length > 1
      const amount = (
        <InputNumber
          className='w-full'
          placeholder='0.00'
          prefix={showPicker ? undefined : currencyCode ? `${currencyCode} ` : '$'}
          thousandSeparator=','
          value={extractCurrencyNumericValue(val)}
          onChange={(v) =>
            // With a configured currency the shown code is stored with the
            // amount ({ currency, value }); otherwise the cell is unchanged.
            onCellChange(updateCurrencyFieldValue(val, v, col, currencyCode))
          }
        />
      )
      if (!showPicker) return amount
      return (
        <div className='flex w-full items-center gap-1'>
          <InputSelect
            className='w-24 shrink-0'
            options={currencyOptions.map((code) => ({ id: code, name: code }))}
            value={
              currencyCode ? { id: currencyCode, name: currencyCode } : null
            }
            onChange={(opt) =>
              onCellChange(
                updateCurrencyFieldValue(
                  val,
                  extractCurrencyNumericValue(val),
                  col,
                  opt?.id ? String(opt.id) : undefined,
                ),
              )
            }
          />
          <div className='min-w-0 flex-1'>{amount}</div>
        </div>
      )
    }

    case 'DATE': {
      const { maxDate, minDate } = getDateTimeLimits(col)
      return (
        <InputDate
          className='w-full'
          maxDate={maxDate}
          minDate={minDate}
          placeholder='YYYY-MM-DD'
          value={val != null && val !== '' ? String(val) : null}
          onChange={(v) => onCellChange(v || '')}
        />
      )
    }

    case 'TIME': {
      const { maxTime, minTime } = getDateTimeLimits(col)
      return (
        <InputTime
          className='w-full'
          format={col.settings?.validation?.timeFormat === '24' ? '24h' : '12h'}
          maxTime={maxTime}
          minTime={minTime}
          value={val != null ? String(val) : ''}
          onChange={(v) => onCellChange(v || '')}
        />
      )
    }

    case 'DATE_TIME':
      return (
        <InputDateTime
          className='w-full'
          value={val != null && val !== '' ? String(val) : null}
          onChange={(v) => onCellChange(v || '')}
        />
      )

    case 'LABEL':
      return (
        <div className='truncate px-2 py-1 text-xs font-semibold text-gray-11'>
          {val || getColumnLabel(col)}
        </div>
      )

    case 'SINGLE_SELECT':
    case 'SINGLE_CHOICE': {
      const options = resolvedOptions || parseColumnOptions(col)
      return (
        <TableCellSelect
          col={col}
          options={options}
          val={val}
          onCellChange={onCellChange}
        />
      )
    }

    case 'MULTI_SELECT':
    case 'MULTIPLE_CHOICE': {
      const options = resolvedOptions || parseColumnOptions(col)
      return (
        <TableCellSelect
          col={col}
          options={options}
          val={val}
          isMulti
          onCellChange={onCellChange}
        />
      )
    }

    case 'FILE_UPLOAD':
    case 'IMAGE_UPLOAD':
      return (
        <TableCellFileInput
          col={col}
          isImageType={cellType === 'IMAGE_UPLOAD'}
          val={val}
          onCellChange={onCellChange}
          onFilesAdded={actions?.onFilesAdded}
        />
      )

    case 'CHIPS': {
      const chips: string[] = Array.isArray(val)
        ? val
        : typeof val === 'string' && val
          ? val.split(',').map((v) => v.trim())
          : []
      return (
        <div className='flex min-h-[28px] w-full flex-wrap items-center gap-1 rounded-md border border-transparent px-1 py-0.5'>
          {chips.map((chip, i) => (
            <span
              className='flex items-center gap-1 rounded-full bg-primary-2 px-2 py-0.5 text-[11px] font-medium text-primary-10'
              key={`${chip}-${i}`}
            >
              {chip}
              <button
                className='cursor-pointer text-primary-8 hover:text-primary-11'
                type='button'
                onClick={() =>
                  onCellChange(chips.filter((_, idx) => idx !== i))
                }
              >
                <Icon height={10} name='lucide:x' width={10} />
              </button>
            </span>
          ))}
          <input
            className='min-w-[60px] flex-1 bg-transparent text-xs outline-none'
            placeholder={chips.length === 0 ? getColumnPlaceholder(col) : ''}
            type='text'
            onKeyDown={(e) => {
              const input = e.currentTarget
              if (e.key === 'Enter' && input.value.trim()) {
                e.preventDefault()
                onCellChange([...chips, input.value.trim()])
                input.value = ''
              }
            }}
          />
        </div>
      )
    }

    case 'PHONE_NUMBER':
      return (
        <InputText
          className='w-full'
          placeholder={getColumnPlaceholder(col)}
          value={extractPhoneInputString(val)}
          onChange={(v) => onCellChange(updatePhoneFieldValue(val, v, col))}
        />
      )

    case 'SHORT_TEXT':
    case 'EMAIL':
    case 'URL':
    default: {
      // QR scan / address autocomplete (SHORT_TEXT columns that enable them)
      if (isQrColumn(col) || isAddressColumn(col)) {
        return (
          <TableCellShortText
            col={col}
            siblingColumns={actions?.siblingColumns ?? []}
            val={val}
            onCellChange={onCellChange}
            onRowPatch={actions?.onRowPatch}
          />
        )
      }
      return (
        <InputText
          className='w-full'
          placeholder={getColumnPlaceholder(col)}
          value={val != null ? String(val) : ''}
          onChange={(v) => onCellChange(clampTextToMaxLength(v, col))}
        />
      )
    }
  }
}

const TableFieldRenderer = ({
  field,
  masterSyncParentColumnKey,
  masterSyncParentValue,
  ocrLineItems,
  readOnly,
  repositoryId,
  required,
  showRowApprove,
  value,
  variant = 'flat',
  onChange,
}: Props) => {
  const { t } = useLingui()
  const isFlat = variant !== 'form'
  const general = field?.settings?.general || {}
  const specific = field?.settings?.specific || {}
  const tableColumns: TableColumn[] = specific.tableColumns || []

  // A fresh row carrying each column's configured default (if any).
  // `existingRows` are the rows that will remain alongside it.
  // Rows the user has edited this session. Stored rows don't record whether a
  // value was typed or generated, so this keeps an edited row from ever being
  // mistaken for an untouched default row when scanned/imported rows arrive.
  const editedRowKeys = useRef(new Set<string>())
  const rowKeyOf = (row: { _rowId?: string } | undefined, idx: number) =>
    row?._rowId || `row-${idx}`

  const createBlankRow = (existingRows: Array<Record<string, unknown>>) => ({
    _rowId: generateRowId(),
    ...buildTableRowDefaults(
      tableColumns,
      existingRows,
      getSessionTableUser(),
    ),
  })
  const rowsType: 'ON_DEMAND' | 'FIXED' = specific.rowsType || 'ON_DEMAND'
  const fixedRowCount: number = specific.fixedRowCount || 5
  const fixedRowLabels: any[] = specific.tableFixedRowLabels || []
  const getRowDisplayLabel = (rowIndex: number) => {
    if (rowsType !== 'FIXED') return String(rowIndex + 1)
    const entry = fixedRowLabels[rowIndex]
    if (typeof entry === 'string' && entry.trim()) return entry
    if (entry && typeof entry === 'object') {
      const labelCol = tableColumns.find((c) => c.type === 'LABEL')
      const val = labelCol ? entry[labelCol.id] : entry.label
      if (val) return String(val)
    }
    return String(rowIndex + 1)
  }
  const rowSelection: 'NONE' | 'SINGLE' | 'MULTIPLE' =
    specific.rowSelection || 'NONE'
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [isMasterSyncing, setIsMasterSyncing] = useState(false)
  const [viewOverride, setViewOverride] = useState<'ADVANCE' | 'NORMAL' | null>(
    null,
  )
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null)

  const hasUploadColumn = tableColumns.some((c) =>
    ['FILE_UPLOAD', 'IMAGE', 'IMAGE_UPLOAD'].includes(
      (c.type || '').toUpperCase(),
    ),
  )
  const activeView: 'ADVANCE' | 'NORMAL' =
    viewOverride ||
    (hasUploadColumn || specific.tableViewMode === 'ADVANCE'
      ? 'ADVANCE'
      : 'NORMAL')

  const isMasterSynced = specific.fillValueType === 'MASTER'
  const masterFormId = specific.masterFormId
    ? String(specific.masterFormId)
    : ''
  const masterFormTableColumns = specific.masterFormTableColumns || []

  useEffect(() => {
    if (readOnly || !isMasterSynced || !masterFormId) return
    if (masterFormTableColumns.length === 0) return

    let cancelled = false
    setIsMasterSyncing(true)
    fetchMasterTableRows(
      masterFormId,
      masterSyncParentColumnKey,
      masterSyncParentValue,
      masterFormTableColumns,
    )
      .then((syncedRows) => {
        if (cancelled) return
        onChange(syncedRows.map((row) => ({ _rowId: generateRowId(), ...row })))
      })
      .finally(() => {
        if (!cancelled) setIsMasterSyncing(false)
      })

    return () => {
      cancelled = true
    }
    // Re-sync only when the parent value (or the master binding itself)
    // changes — not on every row edit, or user edits would be clobbered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMasterSynced, masterFormId, masterSyncParentValue])

  const rows: Array<Record<string, any>> = (() => {
    const raw = Array.isArray(value) ? value : []
    if (rowsType === 'FIXED') {
      if (raw.length >= fixedRowCount) {
        return raw.slice(0, fixedRowCount)
      }
      const labelCol = tableColumns.find((c: any) => c.type === 'LABEL')
      const fixedRowLabels: any[] = specific.tableFixedRowLabels || []

      const backfilled = [...raw]
      while (backfilled.length < fixedRowCount) {
        const idx = backfilled.length
        const rowObj: Record<string, any> = { _rowId: generateRowId() }
        if (labelCol) {
          const labelEntry = fixedRowLabels[idx]
          if (typeof labelEntry === 'string') {
            rowObj[labelCol.id] = labelEntry
          } else if (labelEntry && typeof labelEntry === 'object') {
            rowObj[labelCol.id] = labelEntry[labelCol.id] ?? labelEntry.label ?? ''
          }
        }
        backfilled.push(rowObj)
      }
      return backfilled
    }
    // ON_DEMAND: by default open at least 1 row. For an empty saved table this
    // row is display-only, so it carries no defaults (they would not be saved).
    if (raw.length === 0) {
      return [{ _rowId: generateRowId() }]
    }
    return raw
  })()

  // DYNAMIC_TABLE's defining feature: end-users can add/rename/reorder their
  // own columns at fill-time, on top of whatever the builder predefined.
  // There's no separate schema channel for per-submission column defs (the
  // TABLE value is just a row array), so the ad-hoc column list is carried
  // as a reserved `_dynamicColumns` key copied onto every row — self
  // contained inside this field's own value, same as any other row data.
  const isDynamicTable = field?.type === 'DYNAMIC_TABLE'
  const dynamicColumns: TableColumn[] = isDynamicTable
    ? rows.find((r) => r._dynamicColumns)?._dynamicColumns || []
    : []
  const effectiveColumns: TableColumn[] = (
    isDynamicTable ? [...tableColumns, ...dynamicColumns] : tableColumns
  ).filter((col) => col.settings?.general?.visibility !== 'HIDDEN')
  const isDynamicColumn = (col: TableColumn) =>
    isDynamicTable && dynamicColumns.some((c) => c.id === col.id)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)

  const updateDynamicColumns = (next: TableColumn[]) => {
    onChange(rows.map((row) => ({ ...row, _dynamicColumns: next })))
  }

  const handleAddDynamicColumn = () => {
    const newCol: TableColumn = {
      id: generateRowId(),
      name: `Column ${dynamicColumns.length + 1}`,
      size: 'MEDIUM',
      type: 'SHORT_TEXT',
    }
    updateDynamicColumns([...dynamicColumns, newCol])
    setEditingColumnId(newCol.id)
  }

  const handleRenameDynamicColumn = (colId: string, name: string) => {
    updateDynamicColumns(
      dynamicColumns.map((c) => (c.id === colId ? { ...c, name } : c)),
    )
  }

  const handleDeleteDynamicColumn = (colId: string) => {
    updateDynamicColumns(dynamicColumns.filter((c) => c.id !== colId))
  }

  const handleMoveDynamicColumn = (colId: string, direction: -1 | 1) => {
    const idx = dynamicColumns.findIndex((c) => c.id === colId)
    const nextIdx = idx + direction
    if (idx === -1 || nextIdx < 0 || nextIdx >= dynamicColumns.length) return
    const next = [...dynamicColumns]
    ;[next[idx], next[nextIdx]] = [next[nextIdx], next[idx]]
    updateDynamicColumns(next)
  }

  const lookupColumns = tableColumns.filter(
    (col) =>
      getColumnOptionsSource(col) === 'LOOKUP' &&
      col.settings?.lookupSettings?.repositoryId &&
      !col.settings?.lookupSettings?.cascadeFromColumn,
  )
  const cascadeColumns = tableColumns.filter(
    (col) =>
      getColumnOptionsSource(col) === 'LOOKUP' &&
      col.settings?.lookupSettings?.repositoryId &&
      col.settings?.lookupSettings?.cascadeFromColumn,
  )
  const masterColumns = tableColumns.filter(
    (col) =>
      getColumnMasterConfig(col) &&
      !col.settings?.lookupSettings?.cascadeFromColumn,
  )
  const masterCascadeColumns = tableColumns.filter(
    (col) =>
      getColumnMasterConfig(col) &&
      col.settings?.lookupSettings?.cascadeFromColumn,
  )
  const hasUserListColumn = tableColumns.some(
    (col) => getColumnOptionsSource(col) === 'USER_LIST',
  )

  // Master-table sources, same fetcher the top-level choice fields use.
  const { data: masterOptionsByColumn = {} } = useQuery({
    enabled: masterColumns.length > 0,
    queryKey: [
      'tableColumnMasterOptions',
      field?.id,
      masterColumns.map((c) => {
        const cfg = getColumnMasterConfig(c)
        return `${c.id}:${cfg?.masterFormId}:${cfg?.masterFormColumn}:${cfg?.showAllData}`
      }),
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        masterColumns.map(async (col) => {
          const cfg = getColumnMasterConfig(col)
          if (!cfg) return [col.id, []] as const
          const options = await fetchMasterFormColumnOptions(
            cfg.masterFormId,
            cfg.masterFormColumn,
            undefined,
            undefined,
            cfg.showAllData,
          )
          return [
            col.id,
            options.map((o) => ({
              id: String(o.id ?? o.name),
              name: String(o.name ?? o.id),
            })),
          ] as const
        }),
      )
      return Object.fromEntries(entries)
    },
  })

  // Master-table sources filtered by another column of the same row.
  const { data: masterCascadedOptions = {} } = useQuery({
    enabled: masterCascadeColumns.length > 0,
    queryKey: [
      'tableColumnMasterCascadedOptions',
      field?.id,
      masterCascadeColumns.map((c) => {
        const cfg = getColumnMasterConfig(c)
        const parentColId = c.settings?.lookupSettings?.cascadeFromColumn
        const distinct = Array.from(
          new Set(
            rows
              .map((r) => r[parentColId || ''])
              .filter((v) => v !== undefined && v !== null && v !== ''),
          ),
        )
        return `${c.id}:${cfg?.masterFormId}:${cfg?.masterFormColumn}:${cfg?.showAllData}:${distinct.join(',')}`
      }),
    ],
    queryFn: async () => {
      const result: Record<
        string,
        Record<string, { id: string; name: string }[]>
      > = {}
      await Promise.all(
        masterCascadeColumns.map(async (col) => {
          const cfg = getColumnMasterConfig(col)
          const parentColId = col.settings?.lookupSettings?.cascadeFromColumn
          if (!cfg || !parentColId) return
          const parentCol = tableColumns.find((c) => c.id === parentColId)
          // Same rule as top-level fields: the parent's master column, else its label
          const parentMasterColumn =
            parentCol?.settings?.specific?.masterFormColumn ||
            parentCol?.name ||
            parentColId
          const distinct = Array.from(
            new Set(
              rows
                .map((r) => r[parentColId])
                .filter((v) => v !== undefined && v !== null && v !== ''),
            ),
          )
          const byValue: Record<string, { id: string; name: string }[]> = {}
          await Promise.all(
            distinct.map(async (val) => {
              const options = await fetchMasterFormColumnOptions(
                cfg.masterFormId,
                cfg.masterFormColumn,
                val,
                parentMasterColumn,
                cfg.showAllData,
              )
              byValue[String(val)] = options.map((o) => ({
                id: String(o.id ?? o.name),
                name: String(o.name ?? o.id),
              }))
            }),
          )
          result[col.id] = byValue
        }),
      )
      return result
    },
  })

  // OCR needs a repository. When the screen did not provide one, use the first
  // available repository, as the builder's own upload preview does.
  const needsOcrRepository = tableColumns.some(
    (c) =>
      isFileColumnType(c.type) && getColumnOcrTargets(c, tableColumns).length > 0,
  )
  const { data: fallbackRepositoryId } = useQuery({
    enabled: needsOcrRepository && !repositoryId,
    queryKey: ['tableOcrFallbackRepository'],
    queryFn: async () => {
      const res = await getRepositorys()
      const list: Array<{ id?: string | number }> = Array.isArray(res.data)
        ? res.data
        : []
      return list[0]?.id != null ? String(list[0].id) : ''
    },
  })

  const predefinedColumns = tableColumns.filter(
    (col) => getColumnOptionsSource(col) === 'PREDEFINED',
  )
  const hasPredefinedUser = predefinedColumns.some(
    (col) => getColumnPredefinedType(col) === 'USER',
  )
  const hasPredefinedFolder = predefinedColumns.some(
    (col) => getColumnPredefinedType(col) === 'FOLDER',
  )

  // Folders / repositories (names) for "predefined list: folders" columns
  const { data: folderOptions = [] } = useQuery({
    enabled: hasPredefinedFolder,
    queryKey: ['tableColumnPredefinedFolders'],
    queryFn: async () => {
      const res = await getRepositorys()
      const list: Array<{ name?: string }> = Array.isArray(res.data)
        ? res.data
        : []
      return list
        .filter((r) => r?.name)
        .map((r) => ({ id: String(r.name), name: String(r.name) }))
    },
  })

  // System users (emails), as for the top-level "User List" options.
  const { data: userListOptions = [] } = useQuery({
    enabled: hasUserListColumn || hasPredefinedUser,
    queryKey: ['tableColumnUserListOptions'],
    queryFn: async () => {
      const res = await getUsers()
      const session = authUserStore.getState().session
      const currentUserEmail = session?.email?.trim().toLowerCase()
      const currentUserId = session?.id ? String(session.id) : undefined
      return res.data
        .filter((user) => {
          const userEmail = user.email?.trim().toLowerCase()
          if (currentUserEmail && userEmail === currentUserEmail) return false
          if (currentUserId && user.id && String(user.id) === currentUserId) {
            return false
          }
          return true
        })
        .map((user) => ({ id: user.email, name: user.email }))
    },
  })

  // For columns configured with a "cascade" parent (another column in the
  // same row), facet options are filtered server-side per distinct parent
  // value seen across the current rows — unlike lookupOptionsByColumn below,
  // this is keyed by [columnId][parentValue] since options differ per row.
  const { data: cascadedOptionsByColumn = {} } = useQuery({
    enabled: cascadeColumns.length > 0,
    queryKey: [
      'tableColumnCascadedLookupOptions',
      field?.id,
      cascadeColumns.map((c) => {
        const parentColId = c.settings?.lookupSettings?.cascadeFromColumn
        const distinctValues = Array.from(
          new Set(
            rows
              .map((r) => r[parentColId || ''])
              .filter((v) => v !== undefined && v !== null && v !== ''),
          ),
        )
        return `${c.id}:${c.settings?.lookupSettings?.repositoryId}:${c.settings?.lookupSettings?.repositoryField}:${distinctValues.join(',')}`
      }),
    ],
    queryFn: async () => {
      const result: Record<
        string,
        Record<string, { id: string; name: string }[]>
      > = {}
      await Promise.all(
        cascadeColumns.map(async (col) => {
          const repositoryId = col.settings?.lookupSettings?.repositoryId
          const repositoryField = col.settings?.lookupSettings?.repositoryField
          const parentColId = col.settings?.lookupSettings?.cascadeFromColumn
          const parentCol = tableColumns.find((c) => c.id === parentColId)
          const parentFieldName =
            parentCol?.settings?.lookupSettings?.repositoryField ||
            parentCol?.name ||
            parentColId
          if (!repositoryId || !repositoryField || !parentColId) return

          const distinctValues = Array.from(
            new Set(
              rows
                .map((r) => r[parentColId])
                .filter((v) => v !== undefined && v !== null && v !== ''),
            ),
          )
          const byValue: Record<string, { id: string; name: string }[]> = {}
          await Promise.all(
            distinctValues.map(async (val) => {
              const res = await getRepositoryItemFacets({
                fieldName: repositoryField,
                limit: 1000,
                repositoryId,
                scopeFilters: parentFieldName
                  ? { [parentFieldName]: String(val) }
                  : undefined,
              })
              byValue[String(val)] = (res.data || []).map((f) => ({
                id: f.value,
                name: f.value,
              }))
            }),
          )
          result[col.id] = byValue
        }),
      )
      return result
    },
  })

  // A cell is locked (value kept, input disabled) while a conditional
  // read-only rule in the same row matches.
  const isCellRuleReadOnly = (
    col: TableColumn,
    row: Record<string, unknown>,
  ): boolean => Boolean(getRowCellRuleStates(tableColumns, row)[col.id]?.readOnly)

  const getLookupOptionsForCell = (
    col: TableColumn,
    row: Record<string, any>,
  ): { id: string; name: string }[] | undefined =>
    selectColumnCellOptions(col, row, {
      masterByColumn: masterOptionsByColumn,
      masterCascaded: masterCascadedOptions,
      predefinedByColumn: Object.fromEntries(
        predefinedColumns.map((c) => [
          c.id,
          getColumnPredefinedType(c) === 'FOLDER'
            ? folderOptions
            : userListOptions,
        ]),
      ),
      repositoryByColumn: lookupOptionsByColumn,
      repositoryCascaded: cascadedOptionsByColumn,
      userList: userListOptions,
    })

  const { data: lookupOptionsByColumn = {} } = useQuery({
    enabled: lookupColumns.length > 0,
    queryKey: [
      'tableColumnLookupOptions',
      field?.id,
      lookupColumns.map(
        (c) =>
          `${c.id}:${c.settings?.lookupSettings?.repositoryId}:${c.settings?.lookupSettings?.repositoryField}`,
      ),
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        lookupColumns.map(async (col) => {
          const repositoryId = col.settings?.lookupSettings?.repositoryId
          const repositoryField = col.settings?.lookupSettings?.repositoryField
          if (!repositoryId || !repositoryField) return [col.id, []] as const
          const res = await getRepositoryItemFacets({
            fieldName: repositoryField,
            limit: 1000,
            repositoryId,
          })
          const options = (res.data || []).map((f) => ({
            id: f.value,
            name: f.value,
          }))
          return [col.id, options] as const
        }),
      )
      return Object.fromEntries(entries) as Record<
        string,
        { id: string; name: string }[]
      >
    },
  })

  const resolvedRows = rows.map((row) =>
    resolveCalculatedRow(row, tableColumns, rows, field?.id),
  )

  // Calculated cells are computed for display above, but a submitted row
  // should carry those values too (so exports/reports/other calculated
  // fields referencing this table see them) — sync them back once they
  // settle. Guarded by a content comparison so this only fires when a
  // calculated value actually changed, not on every render.
  useEffect(() => {
    const hasCalculated = tableColumns.some((c) => c.type === 'CALCULATED')
    if (!hasCalculated) return
    const changed = resolvedRows.some(
      (resolved, i) => JSON.stringify(resolved) !== JSON.stringify(rows[i]),
    )
    if (changed) onChange(resolvedRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(resolvedRows)])

  const handleCellChange = (rowIndex: number, colId: string, cellVal: any) => {
    editedRowKeys.current.add(rowKeyOf(rows[rowIndex], rowIndex))
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r
      return {
        ...r,
        [colId]: cellVal,
      }
    })
    onChange(next)
  }

  // Latest rows, so an OCR result that arrives after the user kept editing
  // is merged into the current rows instead of overwriting their changes.
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  // Applies several cell values to one row at once (an address pick fills
  // the address cell and the chosen sibling cells together), merged into the
  // latest rows so nothing typed in the meantime is lost.
  const handleRowPatch = (rowIndex: number, patch: Record<string, unknown>) => {
    const rowKey = rowKeyOf(rows[rowIndex], rowIndex)
    const current = rowsRef.current
    const idx = current.findIndex((r, i) => rowKeyOf(r, i) === rowKey)
    if (idx < 0) return
    editedRowKeys.current.add(rowKey)
    const next = current.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    rowsRef.current = next
    onChange(next)
  }

  // A file column set to "fill other columns": send each new document to the
  // OCR upload with the chosen sibling columns as the field list, then write
  // the extracted values into those cells of the same row.
  const handleFilesAdded = async (
    rowIndex: number,
    col: TableColumn,
    files: File[],
  ): Promise<OcrStatus | void> => {
    const targets = getColumnOcrTargets(col, tableColumns)
    if (targets.length === 0 || files.length === 0) return
    const targetNames = targets.map((t) => t.name || t.label || t.id)
    // The form's own repository, else the first one (as the builder preview does)
    const ocrRepositoryId = repositoryId || fallbackRepositoryId
    if (!ocrRepositoryId) {
      return {
        text: t`Text could not be read from the document: no repository is available for this form.`,
        tone: 'error',
      }
    }
    const hints = buildColumnOcrHints(targets)
    const rowKey = rowKeyOf(rows[rowIndex], rowIndex)
    const filled = new Set<string>()
    let failure = ''
    for (const file of files) {
      const { data, error } = await uploadForOcr(ocrRepositoryId, file, hints)
      if (error || !data?.ocrFieldList) {
        failure = String(error || 'no data was returned')
        console.warn('[table uploadForOcr] OCR extraction warning:', failure)
        continue
      }
      const current = rowsRef.current
      const idx = current.findIndex((r, i) => rowKeyOf(r, i) === rowKey)
      if (idx < 0) continue
      const patch = mapOcrToRowPatch(
        targets,
        data.ocrFieldList,
        current[idx],
        !isMultiFileColumn(col),
      )
      if (Object.keys(patch).length === 0) continue
      editedRowKeys.current.add(rowKey)
      const next = current.map((r, i) => (i === idx ? { ...r, ...patch } : r))
      rowsRef.current = next
      onChange(next)
      for (const id of Object.keys(patch)) {
        const target = targets.find((tg) => tg.id === id)
        filled.add(String(target?.name || target?.label || id))
      }
    }
    const filledNames = Array.from(filled).join(', ')
    const wantedNames = targetNames.join(', ')
    if (filled.size > 0) {
      return { text: t`Filled from the document: ${filledNames}`, tone: 'info' }
    }
    if (failure) {
      return { text: t`Could not read the document: ${failure}`, tone: 'error' }
    }
    return {
      text: t`No values were found in the document for: ${wantedNames}`,
      tone: 'info',
    }
  }

  const handleApiProductSelect = async (
    rowIndex: number,
    colId: string,
    productCode: string | null,
  ) => {
    if (!productCode) {
      handleCellChange(rowIndex, colId, null)
      return
    }

    const priceColId = findPriceColumnId(tableColumns)
    const descriptionColId = findDescriptionColumnId(tableColumns)
    let product: Awaited<ReturnType<typeof fetchFtlCatalogProduct>> = null
    try {
      product = await fetchFtlCatalogProduct(productCode)
    } catch {
      product = null
    }

    editedRowKeys.current.add(rowKeyOf(rows[rowIndex], rowIndex))
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r
      const patched: Record<string, any> = {
        ...r,
        [colId]: product?.productCode || productCode,
      }
      if (priceColId && product?.unitPrice != null) {
        patched[priceColId] = product.unitPrice
      }
      if (descriptionColId && product?.description) {
        patched[descriptionColId] = product.description
      }
      return patched
    })
    onChange(next)
  }

  const handleAddRow = () => {
    onChange([...rows, createBlankRow(rows)])
    if (activeView === 'ADVANCE') setExpandedRowIndex(rows.length)
  }

  const handleDeleteRow = (rowIndex: number) => {
    const next = rows.filter((_, i) => i !== rowIndex)
    onChange(next.length > 0 ? next : [createBlankRow([])])
  }

  const handleApproveRow = (rowIndex: number) => {
    const next = rows.map((row, i) => {
      if (i !== rowIndex) return row
      // Keep description/text; only mark approved so warning UI can hide.
      return { ...row, _approved: true, _hideNote: true }
    })
    onChange(next)
  }

  const showActionColumn =
    (!readOnly && rowsType === 'ON_DEMAND') || (showRowApprove && !readOnly)

  const toggleRowSelected = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(rowSelection === 'MULTIPLE' ? prev : [])
      if (prev.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  const handleBulkDelete = () => {
    const remaining = rows.filter(
      (row, i) => !selectedRowIds.has(row._rowId || `row-${i}`),
    )
    onChange(remaining.length > 0 ? remaining : [createBlankRow([])])
    setSelectedRowIds(new Set())
  }

  const handleBulkApprove = () => {
    const next = rows.map((row, i) =>
      selectedRowIds.has(row._rowId || `row-${i}`)
        ? { ...row, _approved: true, _hideNote: true }
        : row,
    )
    onChange(next)
    setSelectedRowIds(new Set())
  }

  const importExportEnabled: boolean = Boolean(specific.importExportEnabled)
  const qrScanEnabled: boolean = Boolean(specific.qrCodeEnabled)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Re-stamps the current dynamic-column list onto freshly built rows (import/
  // scan/master-sync all construct plain row dicts with no knowledge of
  // `_dynamicColumns`) so a DYNAMIC_TABLE's end-user-added columns survive
  // those operations instead of silently disappearing.
  const withDynamicColumnsStamped = (newRows: Record<string, any>[]) =>
    isDynamicTable && dynamicColumns.length > 0
      ? newRows.map((r) => ({ ...r, _dynamicColumns: dynamicColumns }))
      : newRows

  const appendRows = (newRows: Record<string, any>[]) => {
    // An untouched first row (empty, or holding only generated defaults) is
    // replaced by the incoming rows; a row with user-entered data is kept.
    const withoutDefaultBlank =
      rows.length === 1 &&
      canReplaceUntouchedRow(
        rows[0],
        tableColumns,
        getSessionTableUser(),
        editedRowKeys.current.has(rowKeyOf(rows[0], 0)),
      )
        ? []
        : rows
    onChange([...withoutDefaultBlank, ...withDynamicColumnsStamped(newRows)])
  }

  const replaceRows = (newRows: Record<string, any>[]) => {
    onChange(withDynamicColumnsStamped(newRows))
  }

  const handleScan = (rawValue: string) => {
    try {
      const parsed = JSON.parse(rawValue)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        appendRows(mapExternalRowsToTableColumns([parsed], effectiveColumns))
        setIsScannerOpen(false)
        return
      }
    } catch {
      // fall through to raw-value handling below
    }
    // Not a JSON object payload — fall back to filling the first column.
    const firstColId = tableColumns[0]?.id
    appendRows([
      {
        _rowId: generateRowId(),
        ...(firstColId ? { [firstColId]: rawValue } : {}),
      },
    ])
    setIsScannerOpen(false)
  }

  const handleImportOcrLineItems = () => {
    if (!ocrLineItems?.length) return
    appendRows(mapExternalRowsToTableColumns(ocrLineItems, effectiveColumns))
  }

  const handleImportFile = async (file: File) => {
    setIsImporting(true)
    setImportError(null)
    try {
      const { previewRows } = await extractHeadersAndData(file)
      const nonEmptyRows = (previewRows || []).filter((row: any) =>
        Object.values(row || {}).some((v) => v !== undefined && v !== ''),
      )
      const imported = mapExternalRowsToTableColumns(
        nonEmptyRows,
        effectiveColumns,
      )
      if (imported.length === 0) {
        setImportError(
          t`No matching columns found — CSV/Excel headers must match table column names.`,
        )
        return
      }
      if (importMode === 'REPLACE') {
        replaceRows(imported)
      } else {
        appendRows(imported)
      }
    } catch (err: any) {
      setImportError(err?.message || t`Could not read that file.`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = () => {
    const exportRows = rows.map((row) => {
      const out: Record<string, any> = {}
      effectiveColumns.forEach((col) => {
        out[col.name || col.id] = row[col.id] ?? ''
      })
      return out
    })
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Table')
    XLSX.writeFile(workbook, `${field.label || 'table'}.xlsx`)
  }

  const showSummaryRow = shouldShowTableSummaryRow(field, effectiveColumns)
  const columnTotals: Record<string, number> = showSummaryRow
    ? computeTableColumnTotals(field, resolvedRows, effectiveColumns)
    : {}

  if (effectiveColumns.length === 0) {
    if (isDynamicTable && !readOnly) {
      return (
        <button
          className='flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-3 bg-gray-1 p-4 text-12 font-semibold text-primary-9 hover:border-primary-5 hover:bg-primary-1/40'
          type='button'
          onClick={handleAddDynamicColumn}
        >
          <Icon height={14} name='lucide:plus' width={14} />
          {t`Add the first column`}
        </button>
      )
    }
    return (
      <div className='rounded-lg border border-dashed border-gray-3 bg-gray-1 p-4 text-center text-12 text-gray-9 italic'>
        {t`No table columns configured.`}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full max-w-full min-w-0',
        isFlat ? 'space-y-2.5' : 'space-y-2',
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <div>
          {!general.hideLabel && (
            <h4 className='flex items-center gap-1.5 text-xs font-bold tracking-tight text-[var(--gray-13)]'>
              <Icon
                className='h-4 w-4 text-[var(--primary-9)]'
                name={getTableIconName(getEffectiveFieldLabel(field))}
              />
              {getEffectiveFieldLabel(field)}
              {isFlat ? (
                <span className='font-bold text-[var(--gray-13)]'>
                  ({rows.length})
                </span>
              ) : null}
              {required && <span className='ml-1 text-red-9'>*</span>}
              {general.tooltip && (
                <Icon
                  className='text-gray-8'
                  height={12}
                  name='lucide:info'
                  title={general.tooltip}
                  width={12}
                />
              )}
            </h4>
          )}
          {general.description && (
            <p className='mt-0.5 ml-5 text-12 text-gray-9'>
              {general.description}
            </p>
          )}
          {isMasterSyncing && (
            <p className='mt-0.5 ml-5 flex items-center gap-1 text-11 text-primary-9'>
              <Icon
                className='animate-spin'
                height={11}
                name='lucide:loader-2'
                width={11}
              />
              {t`Syncing from master table...`}
            </p>
          )}
        </div>
        <div className='flex shrink-0 items-center gap-1.5'>
          {!hasUploadColumn && (
            <IconButton
              color='gray'
              size='xs'
              variant='ghost'
              icon={
                activeView === 'ADVANCE'
                  ? 'lucide:table-2'
                  : 'eva:menu-2-outline'
              }
              tooltip={
                activeView === 'ADVANCE'
                  ? t`Switch to Normal (grid) view`
                  : t`Switch to Advance (card) view`
              }
              onClick={() =>
                setViewOverride(activeView === 'ADVANCE' ? 'NORMAL' : 'ADVANCE')
              }
            />
          )}
          {qrScanEnabled && !readOnly && rowsType === 'ON_DEMAND' && (
            <IconButton
              color='gray'
              icon='lucide:qr-code'
              size='xs'
              tooltip={t`Scan QR / Barcode`}
              variant='ghost'
              onClick={() => setIsScannerOpen((prev) => !prev)}
            />
          )}
          {importExportEnabled && (
            <>
              <input
                accept='.csv,.xlsx,.xls'
                className='hidden'
                ref={fileInputRef}
                type='file'
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void handleImportFile(file)
                }}
              />
              {!readOnly && (
                <>
                  <SegmentedControl
                    size='xs'
                    value={importMode}
                    data={[
                      { label: t`Append`, value: 'APPEND' },
                      { label: t`Replace`, value: 'REPLACE' },
                    ]}
                    onChange={(v) => setImportMode(v as 'APPEND' | 'REPLACE')}
                  />
                  <IconButton
                    color='gray'
                    icon='lucide:upload'
                    loading={isImporting}
                    size='xs'
                    variant='ghost'
                    tooltip={
                      importMode === 'REPLACE'
                        ? t`Import CSV/Excel (replaces existing rows)`
                        : t`Import CSV/Excel (adds to existing rows)`
                    }
                    onClick={() => fileInputRef.current?.click()}
                  />
                </>
              )}
              <IconButton
                color='gray'
                disabled={rows.length === 0}
                icon='lucide:download'
                size='xs'
                tooltip={t`Export to Excel`}
                variant='ghost'
                onClick={handleExport}
              />
            </>
          )}
          {!readOnly &&
            rowsType === 'ON_DEMAND' &&
            (isFlat ? (
              <IconButton
                color='primary'
                icon='lucide:plus'
                size='xs'
                tooltip={t`Add Row`}
                variant='ghost'
                onClick={handleAddRow}
              />
            ) : (
              <button
                className='flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-5/40 bg-primary-1/50 px-2.5 py-1 text-xs font-bold text-primary-9 shadow-2xs transition-colors hover:bg-primary-1 active:scale-95'
                type='button'
                onClick={handleAddRow}
              >
                <Icon height={13} name='lucide:plus' width={13} />
                <span>{t`Add Row`}</span>
              </button>
            ))}
        </div>
      </div>

      {importError && (
        <p className='text-12 font-medium text-red-9'>{importError}</p>
      )}

      {!readOnly && rowSelection !== 'NONE' && selectedRowIds.size > 0 && (
        <div className='flex items-center justify-between gap-2 rounded-lg border border-primary-5/40 bg-primary-1/40 px-3 py-1.5'>
          <span className='text-11 font-bold text-primary-9'>
            {t`${selectedRowIds.size} row(s) selected`}
          </span>
          <div className='flex items-center gap-1.5'>
            {showRowApprove && (
              <button
                className='flex cursor-pointer items-center gap-1 rounded-md border border-green-4 bg-green-2 px-2 py-0.5 text-[11px] font-bold text-green-11 hover:bg-green-3 active:scale-95'
                type='button'
                onClick={handleBulkApprove}
              >
                <Icon height={12} name='lucide:check' width={12} />
                {t`Approve selected`}
              </button>
            )}
            {rowsType === 'ON_DEMAND' && (
              <button
                className='flex cursor-pointer items-center gap-1 rounded-md border border-red-4 bg-red-2 px-2 py-0.5 text-[11px] font-bold text-red-11 hover:bg-red-3 active:scale-95'
                type='button'
                onClick={handleBulkDelete}
              >
                <Icon height={12} name='lucide:trash-2' width={12} />
                {t`Delete selected`}
              </button>
            )}
          </div>
        </div>
      )}

      {isScannerOpen && (
        <BarcodeScannerPanel
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScan}
        />
      )}

      {!readOnly && Boolean(ocrLineItems?.length) && (
        <div className='flex items-center justify-between gap-2 rounded-lg border border-primary-5/40 bg-primary-1/40 px-3 py-2'>
          <div className='flex items-center gap-2 text-12 text-primary-9'>
            <Icon height={14} name='lucide:sparkles' width={14} />
            <span>
              {(() => {
                const count = ocrLineItems?.length || 0
                return t`${count} line item(s) found in the uploaded document.`
              })()}
            </span>
          </div>
          <button
            className='shrink-0 rounded-md border border-primary-5/50 bg-surface px-2.5 py-1 text-11 font-bold text-primary-9 hover:bg-primary-1'
            type='button'
            onClick={handleImportOcrLineItems}
          >
            {t`Import extracted items`}
          </button>
        </div>
      )}

      {activeView === 'NORMAL' && (
        <div
          className={cn(
            'relative w-full max-w-full min-w-0 overflow-hidden',
            isFlat
              ? 'rounded-xl border border-[var(--gray-3)] bg-surface'
              : 'rounded-lg border border-gray-3 bg-surface shadow-2xs',
          )}
        >
          <div
            className={cn(
              'h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain',
              // Spreadsheet-like borderless inputs
              '[&_.mantine-Input-input]:border-transparent [&_.mantine-Input-input]:bg-transparent',
              '[&_.mantine-Input-input]:hover:border-gray-4 [&_.mantine-Input-input]:hover:bg-gray-1',
              '[&_.mantine-Input-input]:focus:border-[var(--primary-6)] [&_.mantine-Input-input]:focus:bg-surface',
              '[&_.mantine-Input-input]:shadow-none [&_.mantine-Input-input]:focus:ring-0',
              !isFlat &&
                '[&_td]:border-r [&_td]:border-gray-2 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-gray-3 [&_th:last-child]:border-r-0',
            )}
          >
            <Table className='w-max min-w-full border-collapse'>
              <Thead className={isFlat ? 'bg-[var(--gray-1)]' : 'bg-gray-2/60'}>
                <Tr className='border-b border-gray-3'>
                  {rowSelection !== 'NONE' && (
                    <Th className='w-10 px-2.5 py-2 text-center text-11 font-bold text-gray-10'>
                      {rowSelection === 'MULTIPLE' ? (
                        <input
                          aria-label={t`Select all rows`}
                          className='cursor-pointer'
                          disabled={readOnly || rows.length === 0}
                          type='checkbox'
                          checked={
                            rows.length > 0 &&
                            rows.every((row, i) =>
                              selectedRowIds.has(row._rowId || `row-${i}`),
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRowIds(
                                new Set(
                                  rows.map(
                                    (row, i) => row._rowId || `row-${i}`,
                                  ),
                                ),
                              )
                            } else {
                              setSelectedRowIds(new Set())
                            }
                          }}
                        />
                      ) : (
                        <span className='sr-only'>{t`Select`}</span>
                      )}
                    </Th>
                  )}
                  <Th className='w-10 px-2.5 py-2 text-center text-11 font-bold text-gray-10'>
                    #
                  </Th>
                  {effectiveColumns.map((col) => (
                    <Th
                      key={col.id}
                      className={cn(
                        'px-3 py-2 text-left text-11 font-bold text-gray-12',
                        getColumnWidthClass(col.size),
                      )}
                    >
                      {isDynamicColumn(col) && !readOnly ? (
                        <div className='flex items-center gap-1'>
                          {editingColumnId === col.id ? (
                            <input
                              className='min-w-0 flex-1 rounded border border-primary-5 bg-surface px-1 py-0.5 text-11 font-bold text-gray-12 outline-none'
                              defaultValue={col.name}
                              type='text'
                              autoFocus
                              onBlur={(e) => {
                                handleRenameDynamicColumn(
                                  col.id,
                                  e.target.value.trim() || col.name || 'Column',
                                )
                                setEditingColumnId(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur()
                                if (e.key === 'Escape') setEditingColumnId(null)
                              }}
                            />
                          ) : (
                            <button
                              className='min-w-0 flex-1 cursor-pointer truncate text-left hover:underline'
                              title={t`Click to rename`}
                              type='button'
                              onClick={() => setEditingColumnId(col.id)}
                            >
                              {col.name || 'Column'}
                            </button>
                          )}
                          <button
                            className='shrink-0 cursor-pointer text-gray-6 hover:text-gray-10 disabled:opacity-30'
                            disabled={dynamicColumns[0]?.id === col.id}
                            title={t`Move left`}
                            type='button'
                            onClick={() => handleMoveDynamicColumn(col.id, -1)}
                          >
                            <Icon
                              height={10}
                              name='lucide:chevron-left'
                              width={10}
                            />
                          </button>
                          <button
                            className='shrink-0 cursor-pointer text-gray-6 hover:text-gray-10 disabled:opacity-30'
                            title={t`Move right`}
                            type='button'
                            disabled={
                              dynamicColumns[dynamicColumns.length - 1]?.id ===
                              col.id
                            }
                            onClick={() => handleMoveDynamicColumn(col.id, 1)}
                          >
                            <Icon
                              height={10}
                              name='lucide:chevron-right'
                              width={10}
                            />
                          </button>
                          <button
                            className='shrink-0 cursor-pointer text-red-7 hover:text-red-9'
                            title={t`Delete column`}
                            type='button'
                            onClick={() => handleDeleteDynamicColumn(col.id)}
                          >
                            <Icon height={10} name='lucide:x' width={10} />
                          </button>
                        </div>
                      ) : (
                        <span className='inline-flex items-center gap-1 truncate'>
                          {getColumnLabel(col)}
                          {col.settings?.general?.tooltip && (
                            <Icon
                              className='shrink-0 text-gray-8'
                              height={11}
                              name='lucide:info'
                              title={col.settings.general.tooltip}
                              width={11}
                            />
                          )}
                        </span>
                      )}
                    </Th>
                  ))}
                  {isDynamicTable && !readOnly && (
                    <Th className='w-10 px-1 py-2 text-center'>
                      <IconButton
                        aria-label={t`Add column`}
                        color='primary'
                        icon='lucide:plus'
                        size='xs'
                        variant='ghost'
                        onClick={handleAddDynamicColumn}
                      />
                    </Th>
                  )}
                  {showActionColumn && (
                    <Th className='w-28 px-2 py-2 text-center text-11 font-bold text-gray-10'>
                      {showRowApprove ? (
                        t`Approve`
                      ) : (
                        <span className='sr-only'>{t`Actions`}</span>
                      )}
                    </Th>
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {rows.length === 0
                  ? [0, 1, 2].map((i) => (
                      <Tr
                        className='border-b border-gray-2 transition-colors last:border-0 hover:bg-gray-1/40'
                        key={`skeleton-${i}`}
                      >
                        {rowSelection !== 'NONE' && (
                          <Td className='px-2.5 py-3 text-center align-middle'>
                            <div className='mx-auto h-4 w-4 animate-pulse rounded bg-gray-2' />
                          </Td>
                        )}
                        <Td className='px-2.5 py-3 text-center'>
                          <div className='mx-auto h-4 w-4 animate-pulse rounded bg-gray-2' />
                        </Td>
                        {effectiveColumns.map((col) => (
                          <Td className='px-3 py-3 align-middle' key={col.id}>
                            <div className='h-4 w-5/6 animate-pulse rounded-full bg-[var(--gray-3)]' />
                          </Td>
                        ))}
                        {isDynamicTable && !readOnly && <Td />}
                        {showActionColumn && (
                          <Td className='px-2 py-3 text-center align-middle'>
                            <div className='mx-auto h-4 w-4 animate-pulse rounded bg-gray-2' />
                          </Td>
                        )}
                      </Tr>
                    ))
                  : rows.map((row, rowIndex) => {
                      const rowId = row._rowId || `row-${rowIndex}`
                      const isSelected = selectedRowIds.has(rowId)
                      const resolvedRow = resolvedRows[rowIndex] || row
                      return (
                        <Tr
                          className='group border-b border-gray-2 transition-colors last:border-0 hover:bg-gray-1/40'
                          key={rowId}
                        >
                          {rowSelection !== 'NONE' && (
                            <Td className='px-2.5 py-1.5 text-center align-middle'>
                              <input
                                aria-label={t`Select row`}
                                checked={isSelected}
                                className='cursor-pointer'
                                disabled={readOnly}
                                type={
                                  rowSelection === 'SINGLE'
                                    ? 'radio'
                                    : 'checkbox'
                                }
                                onChange={() => toggleRowSelected(rowId)}
                              />
                            </Td>
                          )}
                          <Td className='px-2.5 py-1.5 text-center text-xs font-semibold text-gray-8'>
                            {getRowDisplayLabel(rowIndex)}
                          </Td>
                          {effectiveColumns.map((col) => (
                            <Td className='p-1.5 align-middle' key={col.id}>
                              {renderCellInput(
                                col,
                                resolvedRow[col.id] ??
                                  (col.name
                                    ? resolvedRow[col.name]
                                    : undefined),
                                (cellVal) =>
                                  handleCellChange(rowIndex, col.id, cellVal),
                                readOnly ||
 isColumnReadOnly(col) ||
 isCellRuleReadOnly(col, resolvedRow),
                                getLookupOptionsForCell(col, resolvedRow),
                                isApiOptionsColumn(col)
                                  ? (code) =>
                                      handleApiProductSelect(
                                        rowIndex,
                                        col.id,
                                        code,
                                      )
                                  : undefined,
                                rowIndex,
                                {
                                  row: resolvedRow,
                                  siblingColumns: tableColumns,
                                  onFilesAdded: (files) =>
                                    handleFilesAdded(rowIndex, col, files),
                                  onRowPatch: (patch) =>
                                    handleRowPatch(rowIndex, patch),
                                },
                              )}
                            </Td>
                          ))}
                          {isDynamicTable && !readOnly && <Td />}
                          {showActionColumn && (
                            <Td className='px-1.5 py-1 text-center align-middle'>
                              <div className='flex items-center justify-center gap-1'>
                                {showRowApprove &&
                                  (row._approved ? (
                                    <span className='inline-flex items-center gap-1 rounded-md border border-green-3 bg-green-2 px-2 py-0.5 text-[10px] font-bold text-green-11'>
                                      <Icon
                                        height={12}
                                        name='lucide:check'
                                        width={12}
                                      />
                                      {t`Approved`}
                                    </span>
                                  ) : (
                                    <button
                                      className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-green-4 bg-green-2 px-2 py-0.5 text-[10px] font-bold text-green-11 opacity-80 transition-all group-hover:opacity-100 hover:bg-green-3 active:scale-95'
                                      type='button'
                                      onClick={() => handleApproveRow(rowIndex)}
                                    >
                                      <Icon
                                        height={12}
                                        name='lucide:check'
                                        width={12}
                                      />
                                      {t`Approve`}
                                    </button>
                                  ))}
                                {!readOnly && rowsType === 'ON_DEMAND' && (
                                  <IconButton
                                    aria-label={t`Delete row`}
                                    color='red'
                                    icon='lucide:trash-2'
                                    size='xs'
                                    variant='ghost'
                                    onClick={() => handleDeleteRow(rowIndex)}
                                  />
                                )}
                              </div>
                            </Td>
                          )}
                        </Tr>
                      )
                    })}
                {showSummaryRow && (
                  <Tr className='border-t-2 border-gray-3 bg-gray-1/60'>
                    {rowSelection !== 'NONE' && <Td />}
                    <Td className='px-2.5 py-1.5 text-center text-xs font-bold text-gray-9'>
                      {t`Total`}
                    </Td>
                    {effectiveColumns.map((col) => (
                      <Td
                        className='px-3 py-1.5 text-left text-xs font-bold text-gray-12'
                        key={col.id}
                      >
                        {col.id in columnTotals
                          ? columnTotals[col.id].toLocaleString()
                          : ''}
                      </Td>
                    ))}
                    {isDynamicTable && !readOnly && <Td />}
                    {showActionColumn && <Td />}
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        </div>
      )}

      {activeView === 'ADVANCE' && (
        <div className='space-y-2'>
          {rows.map((row, rowIndex) => {
            const rowId = row._rowId || `row-${rowIndex}`
            const isSelected = selectedRowIds.has(rowId)
            const resolvedRow = resolvedRows[rowIndex] || row
            const isExpanded = expandedRowIndex === rowIndex
            const summaryColumns = effectiveColumns.slice(0, 2)

            return (
              <div
                key={rowId}
                className={cn(
                  'rounded-xl border bg-surface shadow-2xs transition-colors',
                  isExpanded
                    ? 'border-primary-5'
                    : 'border-[var(--gray-3)] hover:border-gray-4',
                )}
              >
                <div className='flex items-center gap-2 px-3 py-2'>
                  {rowSelection !== 'NONE' && (
                    <input
                      aria-label={t`Select row`}
                      checked={isSelected}
                      className='cursor-pointer'
                      disabled={readOnly}
                      type={rowSelection === 'SINGLE' ? 'radio' : 'checkbox'}
                      onChange={() => toggleRowSelected(rowId)}
                    />
                  )}
                  <span className='text-xs font-semibold text-gray-8'>
                    {rowsType === 'FIXED' && fixedRowLabels[rowIndex]
                      ? fixedRowLabels[rowIndex]
                      : `#${rowIndex + 1}`}
                  </span>
                  <button
                    className='flex min-w-0 flex-1 cursor-pointer items-center gap-2 truncate text-left text-xs text-gray-11'
                    type='button'
                    onClick={() =>
                      setExpandedRowIndex(isExpanded ? null : rowIndex)
                    }
                  >
                    {summaryColumns.length > 0
                      ? summaryColumns
                          .map((col) => {
                            const v =
                              resolvedRow[col.id] ??
                              (col.name ? resolvedRow[col.name] : undefined)
                            return v != null && v !== '' ? String(v) : null
                          })
                          .filter(Boolean)
                          .join(' · ') || t`(empty row)`
                      : t`(empty row)`}
                  </button>
                  {showRowApprove &&
                    (row._approved ? (
                      <span className='inline-flex items-center gap-1 rounded-md border border-green-3 bg-green-2 px-2 py-0.5 text-[10px] font-bold text-green-11'>
                        <Icon height={12} name='lucide:check' width={12} />
                        {t`Approved`}
                      </span>
                    ) : (
                      <button
                        className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-green-4 bg-green-2 px-2 py-0.5 text-[10px] font-bold text-green-11 hover:bg-green-3 active:scale-95'
                        type='button'
                        onClick={() => handleApproveRow(rowIndex)}
                      >
                        <Icon height={12} name='lucide:check' width={12} />
                        {t`Approve`}
                      </button>
                    ))}
                  {!readOnly && rowsType === 'ON_DEMAND' && (
                    <IconButton
                      aria-label={t`Delete row`}
                      color='red'
                      icon='lucide:trash-2'
                      size='xs'
                      variant='ghost'
                      onClick={() => handleDeleteRow(rowIndex)}
                    />
                  )}
                  <IconButton
                    aria-label={isExpanded ? t`Collapse row` : t`Expand row`}
                    color='gray'
                    size='xs'
                    variant='ghost'
                    icon={
                      isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'
                    }
                    onClick={() =>
                      setExpandedRowIndex(isExpanded ? null : rowIndex)
                    }
                  />
                </div>

                {isExpanded && (
                  <div className='space-y-3 border-t border-[var(--gray-3)] px-3 py-3'>
                    {effectiveColumns.map((col) => (
                      <div key={col.id}>
                        <div className='mb-1 flex items-center gap-1.5'>
                          <label className='block text-11 font-bold text-gray-8'>
                            {getColumnLabel(col)}
                          </label>
                          {isDynamicColumn(col) && !readOnly && (
                            <button
                              className='cursor-pointer text-[10px] text-red-7 hover:text-red-9'
                              type='button'
                              onClick={() => handleDeleteDynamicColumn(col.id)}
                            >
                              {t`(remove column)`}
                            </button>
                          )}
                        </div>
                        {renderCellInput(
                          col,
                          resolvedRow[col.id] ??
                            (col.name ? resolvedRow[col.name] : undefined),
                          (cellVal) =>
                            handleCellChange(rowIndex, col.id, cellVal),
                          readOnly ||
 isColumnReadOnly(col) ||
 isCellRuleReadOnly(col, resolvedRow),
                          getLookupOptionsForCell(col, resolvedRow),
                          isApiOptionsColumn(col)
                            ? (code) =>
                                handleApiProductSelect(rowIndex, col.id, code)
                            : undefined,
                          rowIndex,
                          {
                            row: resolvedRow,
                            siblingColumns: tableColumns,
                            onFilesAdded: (files) =>
                              handleFilesAdded(rowIndex, col, files),
                            onRowPatch: (patch) =>
                              handleRowPatch(rowIndex, patch),
                          },
                        )}
                      </div>
                    ))}
                    {isDynamicTable && !readOnly && (
                      <button
                        className='flex cursor-pointer items-center gap-1.5 text-11 font-bold text-primary-9 hover:underline'
                        type='button'
                        onClick={handleAddDynamicColumn}
                      >
                        <Icon height={12} name='lucide:plus' width={12} />
                        {t`Add column`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {rows.length === 0 && (
            <div className='rounded-xl border border-dashed border-[var(--gray-3)] bg-gray-1/40 p-4 text-center text-12 text-gray-9 italic'>
              {t`No rows yet.`}
            </div>
          )}

          {showSummaryRow && Object.keys(columnTotals).length > 0 && (
            <div className='rounded-xl border border-[var(--gray-3)] bg-gray-1/60 px-3 py-2 text-xs font-bold text-gray-9'>
              {effectiveColumns
                .filter((col) => col.id in columnTotals)
                .map(
                  (col) =>
                    `${getColumnLabel(col)}: ${columnTotals[col.id].toLocaleString()}`,
                )
                .join('   ·   ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

TableFieldRenderer.displayName = 'TableFieldRenderer'
export default TableFieldRenderer
