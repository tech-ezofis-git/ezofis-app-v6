import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { useDebouncedCallback } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { Option } from '@/types/option'
import { getRepositoryItemFacets } from '@/api/v6/folder/folder'
import {
  fetchFtlCatalogCodes,
  fetchFtlCatalogProduct,
} from '@/api/v6/ftlCatalog'
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
  name?: string
  size?: 'SMALL' | 'MEDIUM' | 'LARGE'
  type?: string
  settings?: {
    lookupSettings?: {
      optionsSource?: 'LOOKUP' | 'API'
      repositoryField?: string
      repositoryId?: string
    }
    specific?: {
      customOptions?: string
      formulaTokens?: Array<{ type: string; value: string }>
      placeholder?: string
    }
    validation?: { fieldRule?: 'OPTIONAL' | 'REQUIRED' }
  }
}

const getColumnPlaceholder = (col: TableColumn) =>
  col.settings?.specific?.placeholder || col.name || '...'

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

const SUMMABLE_TYPES = new Set(['NUMBER', 'CURRENCY_AMOUNT', 'COUNTER'])

const parseColumnOptions = (col: TableColumn): { id: string; name: string }[] =>
  (col.settings?.specific?.customOptions || '')
    .split(',')
    .map((opt) => opt.trim())
    .filter(Boolean)
    .map((opt) => ({ id: opt, name: opt }))

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
      if (
        header === '_rowId' ||
        header === '_approved' ||
        header === '_hideNote'
      ) {
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
  ocrLineItems?: Record<string, any>[]
  readOnly?: boolean
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
): Record<string, any> => {
  const next = { ...row }
  const calculatedColumns = tableColumns.filter((c) => c.type === 'CALCULATED')
  if (calculatedColumns.length === 0) return next

  for (let pass = 0; pass <= calculatedColumns.length; pass += 1) {
    let changed = false
    for (const col of calculatedColumns) {
      const tokens = col.settings?.specific?.formulaTokens
      if (!tokens?.length) continue
      const result = evaluateFormula(tokens as any, next)
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

const renderCellInput = (
  col: TableColumn,
  val: any,
  onCellChange: (newVal: any) => void,
  readOnly?: boolean,
  resolvedOptions?: { id: string; name: string }[],
  onApiProductSelect?: (productCode: string | null) => void | Promise<void>,
): ReactNode => {
  const cellType = (col.type || 'SHORT_TEXT').toUpperCase()

  if (cellType === 'CALCULATED') {
    return (
      <div className='truncate px-2 py-1 text-xs font-semibold text-gray-11'>
        {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
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
        {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
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
          onChange={(v) => onCellChange(v)}
        />
      )

    case 'NUMBER':
    case 'COUNTER':
      return (
        <InputNumber
          className='w-full'
          placeholder='0'
          value={val != null ? val : ''}
          onChange={(v) => onCellChange(v)}
        />
      )

    case 'CURRENCY_AMOUNT':
      return (
        <InputNumber
          className='w-full'
          placeholder='0.00'
          prefix='$'
          thousandSeparator=','
          value={val != null ? val : ''}
          onChange={(v) => onCellChange(v)}
        />
      )

    case 'DATE':
      return (
        <InputDate
          className='w-full'
          placeholder='YYYY-MM-DD'
          value={val != null && val !== '' ? String(val) : null}
          onChange={(v) => onCellChange(v || '')}
        />
      )

    case 'TIME':
      return (
        <InputTime
          className='w-full'
          value={val != null ? String(val) : ''}
          onChange={(v) => onCellChange(v || '')}
        />
      )

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
          {val || col.name}
        </div>
      )

    case 'SINGLE_SELECT':
    case 'SINGLE_CHOICE': {
      const options = resolvedOptions || parseColumnOptions(col)
      return (
        <InputSelect
          className='w-full'
          options={options}
          placeholder={getColumnPlaceholder(col)}
          value={options.find((opt) => opt.id === val) || null}
          onChange={(opt) => onCellChange(opt ? opt.id : null)}
        />
      )
    }

    case 'MULTI_SELECT':
    case 'MULTIPLE_CHOICE': {
      const options = resolvedOptions || parseColumnOptions(col)
      const selectedIds: string[] = Array.isArray(val) ? val : []
      return (
        <InputSelectMultiple
          className='w-full'
          options={options}
          placeholder={getColumnPlaceholder(col)}
          value={options.filter((opt) => selectedIds.includes(opt.id))}
          onChange={(opts) => onCellChange(opts.map((opt) => opt.id))}
        />
      )
    }

    case 'FILE_UPLOAD':
    case 'IMAGE_UPLOAD': {
      const fileName: string | undefined = val?.fileName
      return (
        <label className='flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-gray-3 bg-white px-2 py-1 text-xs text-gray-9 hover:border-primary-5'>
          <Icon
            className='shrink-0 text-gray-6'
            height={12}
            name={fileName ? 'lucide:paperclip' : 'lucide:upload'}
            width={12}
          />
          <span className='min-w-0 flex-1 truncate'>{fileName || '...'}</span>
          <input
            accept={cellType === 'IMAGE_UPLOAD' ? 'image/*' : undefined}
            className='hidden'
            type='file'
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              onCellChange({ fileName: file.name, rawFile: file })
              e.target.value = ''
            }}
          />
        </label>
      )
    }

    case 'SHORT_TEXT':
    case 'EMAIL':
    case 'PHONE_NUMBER':
    case 'URL':
    default:
      return (
        <InputText
          className='w-full'
          placeholder={getColumnPlaceholder(col)}
          value={val != null ? String(val) : ''}
          onChange={(v) => onCellChange(v)}
        />
      )
  }
}

const TableFieldRenderer = ({
  field,
  ocrLineItems,
  readOnly,
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
  const rowsType: 'ON_DEMAND' | 'FIXED' = specific.rowsType || 'ON_DEMAND'
  const fixedRowCount: number = specific.fixedRowCount || 5
  const rowSelection: 'NONE' | 'SINGLE' | 'MULTIPLE' =
    specific.rowSelection || 'NONE'
  const showSummaryRow: boolean = Boolean(specific.showSummaryRow)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  const rows: Array<Record<string, any>> = (() => {
    const raw = Array.isArray(value) ? value : []
    if (rowsType === 'FIXED') {
      if (raw.length >= fixedRowCount) {
        return raw.slice(0, fixedRowCount)
      }
      const backfilled = [...raw]
      while (backfilled.length < fixedRowCount) {
        backfilled.push({ _rowId: generateRowId() })
      }
      return backfilled
    }
    // ON_DEMAND: by default open at least 1 row
    if (raw.length === 0) {
      return [{ _rowId: generateRowId() }]
    }
    return raw
  })()

  const lookupColumns = tableColumns.filter(
    (col) =>
      col.settings?.lookupSettings?.optionsSource !== 'API' &&
      col.settings?.lookupSettings?.repositoryId,
  )
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
    resolveCalculatedRow(row, tableColumns),
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
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r
      return {
        ...r,
        [colId]: cellVal,
      }
    })
    onChange(next)
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
    onChange([...rows, { _rowId: generateRowId() }])
  }

  const handleDeleteRow = (rowIndex: number) => {
    const next = rows.filter((_, i) => i !== rowIndex)
    onChange(next.length > 0 ? next : [{ _rowId: generateRowId() }])
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

  const importExportEnabled: boolean = Boolean(specific.importExportEnabled)
  const qrScanEnabled: boolean = Boolean(specific.qrCodeEnabled)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const appendRows = (newRows: Record<string, any>[]) => {
    const withoutDefaultBlank =
      rows.length === 1 && Object.keys(rows[0]).length <= 1 ? [] : rows
    onChange([...withoutDefaultBlank, ...newRows])
  }

  const handleScan = (rawValue: string) => {
    try {
      const parsed = JSON.parse(rawValue)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        appendRows(mapExternalRowsToTableColumns([parsed], tableColumns))
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
    appendRows(mapExternalRowsToTableColumns(ocrLineItems, tableColumns))
  }

  const handleImportFile = async (file: File) => {
    setIsImporting(true)
    setImportError(null)
    try {
      const { previewRows } = await extractHeadersAndData(file)
      const nonEmptyRows = (previewRows || []).filter((row: any) =>
        Object.values(row || {}).some((v) => v !== undefined && v !== ''),
      )
      const imported = mapExternalRowsToTableColumns(nonEmptyRows, tableColumns)
      if (imported.length === 0) {
        setImportError(
          t`No matching columns found — CSV/Excel headers must match table column names.`,
        )
        return
      }
      appendRows(imported)
    } catch (err: any) {
      setImportError(err?.message || t`Could not read that file.`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleExport = () => {
    const exportRows = rows.map((row) => {
      const out: Record<string, any> = {}
      tableColumns.forEach((col) => {
        out[col.name || col.id] = row[col.id] ?? ''
      })
      return out
    })
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Table')
    XLSX.writeFile(workbook, `${field.label || 'table'}.xlsx`)
  }

  const columnTotals: Record<string, number> = showSummaryRow
    ? tableColumns.reduce<Record<string, number>>((totals, col) => {
        if (!col.type || !SUMMABLE_TYPES.has(col.type.toUpperCase())) {
          return totals
        }
        totals[col.id] = rows.reduce((sum, row) => {
          const num = Number(row[col.id])
          return sum + (Number.isFinite(num) ? num : 0)
        }, 0)
        return totals
      }, {})
    : {}

  if (tableColumns.length === 0) {
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
          <h4 className='flex items-center gap-1.5 text-xs font-bold tracking-tight text-[var(--gray-13)]'>
            <Icon
              className='h-4 w-4 text-[var(--primary-9)]'
              name={getTableIconName(field.label)}
            />
            {field.label}
            {isFlat ? (
              <span className='font-bold text-[var(--gray-13)]'>
                ({rows.length})
              </span>
            ) : null}
            {required && <span className='ml-1 text-red-9'>*</span>}
          </h4>
          {general.description && (
            <p className='mt-0.5 ml-5 text-12 text-gray-9'>
              {general.description}
            </p>
          )}
        </div>
        <div className='flex shrink-0 items-center gap-1.5'>
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
                <IconButton
                  color='gray'
                  icon='lucide:upload'
                  loading={isImporting}
                  size='xs'
                  tooltip={t`Import CSV/Excel`}
                  variant='ghost'
                  onClick={() => fileInputRef.current?.click()}
                />
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
            className='shrink-0 rounded-md border border-primary-5/50 bg-white px-2.5 py-1 text-11 font-bold text-primary-9 hover:bg-primary-1'
            type='button'
            onClick={handleImportOcrLineItems}
          >
            {t`Import extracted items`}
          </button>
        </div>
      )}

      <div
        className={cn(
          'relative w-full max-w-full min-w-0 overflow-hidden',
          isFlat
            ? 'rounded-xl border border-[var(--gray-3)] bg-surface'
            : 'rounded-lg border border-gray-3 bg-white shadow-2xs',
        )}
      >
        <div
          className={cn(
            'h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain',
            // Spreadsheet-like borderless inputs
            '[&_.mantine-Input-input]:border-transparent [&_.mantine-Input-input]:bg-transparent',
            '[&_.mantine-Input-input]:hover:border-gray-4 [&_.mantine-Input-input]:hover:bg-gray-1',
            '[&_.mantine-Input-input]:focus:border-[var(--primary-6)] [&_.mantine-Input-input]:focus:bg-white',
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
                    <span className='sr-only'>{t`Select`}</span>
                  </Th>
                )}
                <Th className='w-10 px-2.5 py-2 text-center text-11 font-bold text-gray-10'>
                  #
                </Th>
                {tableColumns.map((col) => (
                  <Th
                    key={col.id}
                    className={cn(
                      'px-3 py-2 text-left text-11 font-bold text-gray-12',
                      getColumnWidthClass(col.size),
                    )}
                  >
                    <span className='truncate'>{col.name || 'Column'}</span>
                  </Th>
                ))}
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
                      {tableColumns.map((col) => (
                        <Td className='px-3 py-3 align-middle' key={col.id}>
                          <div className='h-4 w-5/6 animate-pulse rounded-full bg-[var(--gray-3)]' />
                        </Td>
                      ))}
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
                                rowSelection === 'SINGLE' ? 'radio' : 'checkbox'
                              }
                              onChange={() => toggleRowSelected(rowId)}
                            />
                          </Td>
                        )}
                        <Td className='px-2.5 py-1.5 text-center text-xs font-semibold text-gray-8'>
                          {rowIndex + 1}
                        </Td>
                        {tableColumns.map((col) => (
                          <Td className='p-1.5 align-middle' key={col.id}>
                            {renderCellInput(
                              col,
                              resolvedRow[col.id] ??
                                (col.name ? resolvedRow[col.name] : undefined),
                              (cellVal) =>
                                handleCellChange(rowIndex, col.id, cellVal),
                              readOnly,
                              lookupOptionsByColumn[col.id],
                              isApiOptionsColumn(col)
                                ? (code) =>
                                    handleApiProductSelect(
                                      rowIndex,
                                      col.id,
                                      code,
                                    )
                                : undefined,
                            )}
                          </Td>
                        ))}
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
                  {tableColumns.map((col) => (
                    <Td
                      className='px-3 py-1.5 text-left text-xs font-bold text-gray-12'
                      key={col.id}
                    >
                      {col.id in columnTotals
                        ? columnTotals[col.id].toLocaleString()
                        : ''}
                    </Td>
                  ))}
                  {showActionColumn && <Td />}
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      </div>
    </div>
  )
}

TableFieldRenderer.displayName = 'TableFieldRenderer'
export default TableFieldRenderer
