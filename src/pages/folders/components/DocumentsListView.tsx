import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import type { FileItem, RepositoryFilePage } from '../types/folderTypes'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'
import DataTable from '@/components/base/data-table/DataTable'
import { DynamicIcon } from './icons'
import { Button } from './Ui'
import InputSelect from '@/components/base/inputs/InputSelect'
import Pagination from '@/components/base/pagination/Pagination'

type AnyFileItem = FileItem & Record<string, any>

type DynamicColumn = {
  key: string
  label: string
  minWidth?: number
  dataType?: string
}

type ActionMenuPosition = {
  top: number
  left: number
  placement: 'top' | 'bottom'
}

type SelectOption = {
  id: string
  name: string
}

type DocumentsListViewProps = {
  files: FileItem[]
  fileColumns?: DynamicRepositoryColumn[]
  breadcrumbs: BreadcrumbItem[]
  filePage?: RepositoryFilePage
  loading?: boolean
  loadingPage?: boolean
  refreshing?: boolean
  error?: string
  folderSearch?: string
  onFolderSearchChange?: (value: string) => void
  onRefresh?: () => void
  onBreadcrumbSelect: (id: string) => void
  onOpenFile: (id: string) => void
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onEdit: (id: string) => void
  onAiSummary: (id: string) => void
  onShare: (id: string) => void
  onWorkflow: (id: string) => void
}

const HIDDEN_FILE_KEYS = new Set([
  'storageproviderid',
  'storageprovidercode',
  'hasfilepath',
])

const ACTION_MENU_WIDTH = 220
const ACTION_MENU_HEIGHT = 274

const isHiddenFileKey = (key: string) =>
  HIDDEN_FILE_KEYS.has(key.toLowerCase())


const PRIMARY_NAME_KEYS = new Set([
  'filename',
  'file name',
  'name',
  'invoicenumber',
  'invoice number',
  'invoiceno',
  'invoice no',
  'documentname',
  'document name',
])

const normalizeKey = (key: string) =>
  String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const isPrimaryNameKey = (key: string) =>
  PRIMARY_NAME_KEYS.has(normalizeKey(key))

const getPrimaryFileName = (file: AnyFileItem) => {
  const directValue =
    file?.fileName ??
    file?.FileName ??
    file?.name ??
    file?.Name ??
    file?.InvoiceNumber ??
    file?.invoiceNumber ??
    file?.InvoiceNo ??
    file?.invoiceNo ??
    file?.['Invoice No'] ??
    file?.DocumentName ??
    file?.documentName

  if (directValue !== undefined && directValue !== null && directValue !== '') {
    return String(directValue)
  }

  const matchedKey = Object.keys(file || {}).find((key) => isPrimaryNameKey(key))
  const matchedValue = matchedKey ? file[matchedKey] : undefined

  if (matchedValue !== undefined && matchedValue !== null && matchedValue !== '') {
    return String(matchedValue)
  }

  return '-'
}

const toTitle = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (value) => value.toUpperCase())

const formatDateValue = (value: any) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toISOString().slice(0, 10)
}

const formatAmountValue = (value: any) => {
  if (value === undefined || value === null || value === '') return '-'

  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return String(value)

  return numericValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

const getRepositoryFieldRawValue = (row: AnyFileItem, sqlColumnName: string) => {
  if (!row || !sqlColumnName) return undefined

  const matchedKey = Object.keys(row).find(
    (key) => key.toLowerCase() === sqlColumnName.toLowerCase(),
  )

  return matchedKey ? row[matchedKey] : undefined
}

const getDisplayValue = (
  row: AnyFileItem,
  sqlColumnName: string,
  dataType?: string,
) => {
  const value = getRepositoryFieldRawValue(row, sqlColumnName)
  if (value === undefined || value === null || value === '') return '-'

  const normalizedType = String(dataType || '').toLowerCase()
  const normalizedKey = sqlColumnName.toLowerCase()

  if (normalizedType === 'date' || normalizedKey.includes('date')) {
    return formatDateValue(value)
  }

  if (
    normalizedType === 'decimal' ||
    normalizedType === 'number' ||
    normalizedKey.includes('amount')
  ) {
    return formatAmountValue(value)
  }

  return String(value)
}

const getFileId = (file: AnyFileItem) =>
  String(
    file.id ??
      file.Id ??
      file.itemId ??
      file.ItemId ??
      file.documentId ??
      file.DocumentId ??
      file.fileId ??
      file.FileId ??
      '',
  )

const getColumnWidth = (_key: string, dataType?: string) => {
  const normalizedType = String(dataType || '').toLowerCase()

  if (normalizedType === 'date' || normalizedType === 'datetime') return 160
  if (['decimal', 'number', 'int', 'integer'].includes(normalizedType)) {
    return 160
  }

  return 180
}

const buildRepositoryColumns = (
  fileColumns: DynamicRepositoryColumn[],
): DynamicColumn[] => {
  const normalColumns = fileColumns.filter(
    (column) => !isHiddenFileKey(column.key) && !isPrimaryNameKey(column.key),
  )

  return [
    {
      key: '__name',
      label: 'Name',
      minWidth: 220,
    },
    ...normalColumns.map((column) => ({
      key: column.key,
      label: column.label || toTitle(column.key),
      dataType: column.dataType,
      minWidth: getColumnWidth(column.key, column.dataType),
    })),
  ]
}

export function DocumentsListView({
  files,
  fileColumns = [],
  breadcrumbs,
  filePage,
  loading = false,
  loadingPage = false,
  refreshing = false,
  error = '',
  folderSearch = '',
  onFolderSearchChange,
  onRefresh,
  onBreadcrumbSelect,
  onOpenFile,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onAiSummary,
  onShare,
  onWorkflow,
}: DocumentsListViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const menuRef = useRef<HTMLDivElement | null>(null)

  const normalizedFiles = useMemo(() => files as AnyFileItem[], [files])

  const columns = useMemo(
    () => buildRepositoryColumns(fileColumns),
    [fileColumns],
  )

  const currentPage = filePage?.page || 1
  const pageSize = filePage?.pageSize || 50
  const totalCount = filePage?.totalCount || normalizedFiles.length
  const isBusy = loading || loadingPage || refreshing

  const searchedFiles = useMemo(() => {
    const searchValue = folderSearch.trim().toLowerCase()

    if (!searchValue) return normalizedFiles

    return normalizedFiles.filter((file) =>
      Object.values(file).some((value) =>
        String(value ?? '').toLowerCase().includes(searchValue),
      ),
    )
  }, [normalizedFiles, folderSearch])

  const visibleFiles = useMemo(() => {
    return searchedFiles.filter((file) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true

        return String(getRepositoryFieldRawValue(file, key) ?? '') === value
      }),
    )
  }, [searchedFiles, filters])

  const filterColumns = useMemo(
    () =>
      columns.map((column) => ({
        key: column.key,
        label: `All ${column.label}`,
      })),
    [columns],
  )

  const activeFilters = Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => ({ key, label: toTitle(key), value }))

  

  const selectedVisibleCount = visibleFiles.filter((file) =>
    selectedIds.includes(getFileId(file)),
  ).length

  const allVisibleSelected =
    visibleFiles.length > 0 && selectedVisibleCount === visibleFiles.length

  const selectionEnabled = selectedIds.length > 0

  const handleRefresh = () => {
    if (isBusy) return
    onRefresh?.()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !visibleFiles.some((file) => getFileId(file) === id),
        ),
      )
      return
    }

    setSelectedIds((prev) =>
      Array.from(new Set([...prev, ...visibleFiles.map(getFileId)])),
    )
  }

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const removeFilter = (key: string) => {
    setFilters((prev) => ({ ...prev, [key]: '' }))
  }

  const resetFilters = () => setFilters({})

  const resetSearchAndFilters = () => {
    onFolderSearchChange?.('')
    setFilters({})
  }

  const closeAndRun = (callback: () => void) => {
    setOpenMenuId(null)
    setActionMenuPosition(null)
    callback()
  }

  const getUniqueOptions = (key: string) =>
    Array.from(
      new Set(
        searchedFiles
          .map((file) => getRepositoryFieldRawValue(file, key))
          .filter(
            (value) => value !== undefined && value !== null && value !== '',
          )
          .map(String),
      ),
    ).sort((a, b) => a.localeCompare(b))

  const openActionMenu = (
    event: MouseEvent<HTMLButtonElement>,
    fileId: string,
  ) => {
    event.stopPropagation()

    if (openMenuId === fileId) {
      setOpenMenuId(null)
      setActionMenuPosition(null)
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const hasBottomSpace =
      rect.bottom + ACTION_MENU_HEIGHT + 12 <= viewportHeight

    const placement: ActionMenuPosition['placement'] = hasBottomSpace
      ? 'bottom'
      : 'top'

    const left = Math.min(
      Math.max(16, rect.right - ACTION_MENU_WIDTH),
      viewportWidth - ACTION_MENU_WIDTH - 16,
    )

    const top =
      placement === 'bottom'
        ? rect.bottom + 8
        : Math.max(16, rect.top - ACTION_MENU_HEIGHT - 8)

    setOpenMenuId(fileId)
    setActionMenuPosition({ top, left, placement })
  }

  const dataTableColumns = useMemo<ColumnDef<AnyFileItem>[]>(() => {
    const selectColumn: ColumnDef<AnyFileItem> = {
      id: 'selection',
      header: () => (
        <div className="flex justify-center">
          {selectionEnabled && (
            <CheckBoxButton
              checked={allVisibleSelected}
              onClick={toggleSelectAllVisible}
            />
          )}
        </div>
      ),
      cell: ({ row }) => {
        const fileId = getFileId(row.original)
        const isSelected = selectedIds.includes(fileId)

        return (
          <div className="flex justify-center">
            {selectionEnabled ? (
              <CheckBoxButton
                checked={isSelected}
                onClick={() => toggleSelect(fileId)}
              />
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => toggleSelect(fileId)}
                className="h-5 w-5 rounded-md border border-transparent transition-all hover:border-blue-9 hover:bg-blue-1 disabled:cursor-not-allowed disabled:opacity-40"
                title="Select"
              />
            )}
          </div>
        )
      },
      size: 44,
      minSize: 44,
      maxSize: 44,
    }

    const dynamicColumns: ColumnDef<AnyFileItem>[] = columns.map((column) => ({
      id: column.key,
      accessorFn: (row) =>
        column.key === '__name'
          ? getPrimaryFileName(row)
          : getDisplayValue(row, column.key, column.dataType),
      header: column.label,
      cell: ({ row, getValue }) => {
        const value = String(getValue() ?? '-')

        if (column.key === '__name') {
          const fileId = getFileId(row.original)

          return (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onOpenFile(fileId)}
              className="flex min-w-0 max-w-full items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
              title={value}
            >
              <DynamicIcon name="fileText" className="h-5 w-5 shrink-0 text-[#4f5b88]" />
              <span className="block max-w-full truncate font-semibold text-gray-13">
                {value}
              </span>
            </button>
          )
        }

        return (
          <span
            className="block max-w-full truncate text-gray-10 hover:whitespace-normal hover:break-words hover:leading-5 hover:[overflow:visible] hover:[text-overflow:clip]"
            title={value}
          >
            {value}
          </span>
        )
      },
      size: column.minWidth || 180,
      minSize: column.minWidth || 180,
    }))

    const actionColumn: ColumnDef<AnyFileItem> = {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const fileId = getFileId(row.original)

        return (
          <div className="flex items-center gap-3 text-gray-13">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onOpenFile(fileId)}
              className="hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
              title="View"
            >
              <DynamicIcon name="eye" />
            </button>

            <button
              type="button"
              disabled={isBusy}
              className="hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
              title="Download"
            >
              <DynamicIcon name="download" />
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={(event) => openActionMenu(event, fileId)}
              className="hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
              title="More actions"
            >
              <DynamicIcon name="more" />
            </button>
          </div>
        )
      },
      size: 120,
      minSize: 120,
    }

    return [selectColumn, ...dynamicColumns, actionColumn]
  }, [
    allVisibleSelected,
    columns,
    isBusy,
    onOpenFile,
    selectedIds,
    selectionEnabled,
    visibleFiles,
  ])

  const table = useReactTable({
    data: visibleFiles,
    columns: dataTableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getFileId(row),
    manualPagination: true,
    initialState: {
      columnPinning: {
        left: ['selection', columns[0]?.key].filter(Boolean) as string[],
        right: ['actions'],
      },
    },
  })

  useEffect(() => {
    const closeMenu = (event: globalThis.MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  useEffect(() => {
    if (!openMenuId) return

    const closeFloatingMenu = () => {
      setOpenMenuId(null)
      setActionMenuPosition(null)
    }

    window.addEventListener('resize', closeFloatingMenu)
    window.addEventListener('scroll', closeFloatingMenu, true)

    return () => {
      window.removeEventListener('resize', closeFloatingMenu)
      window.removeEventListener('scroll', closeFloatingMenu, true)
    }
  }, [openMenuId])

  if (error) {
    return (
      <div className="m-4 rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10">
        {error}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface text-sm text-gray-11 animate-in fade-in duration-300">
      {false && <Breadcrumbs items={breadcrumbs} onSelect={onBreadcrumbSelect} />}

      <div className="ez-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="min-w-0 space-y-5 p-6">
          <section className="rounded-2xl border border-gray-3 bg-surface-primary p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-2">
                  <DynamicIcon name="filter" className="h-5 w-5 text-gray-11" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <b className="text-sm text-gray-13">Filters</b>
                    <span className="rounded-full bg-primary-2 px-2.5 py-0.5 text-xs font-semibold text-primary-10">
                      {activeFilters.length} active
                    </span>
                  </div>
                  <p className="text-xs text-gray-9">
                    Refine documents without expanding the page height.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                
                {activeFilters.length > 0 &&<button
                  type="button"
                  disabled={isBusy}
                  onClick={resetFilters}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-3 bg-surface px-3 text-sm font-semibold text-gray-13 shadow-sm hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DynamicIcon name="refresh" className="h-4 w-4" />
                  Clear
                </button>}
              </div>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 ez-scrollbar">
              {filterColumns.map((column) => (
                <div key={column.key} className="min-w-[210px] shrink-0">
                  <FilterSelect
                    label={column.label}
                    value={filters[column.key] || ''}
                    options={getUniqueOptions(column.key)}
                    disabled={isBusy}
                    onChange={(value) => updateFilter(column.key, value)}
                  />
                </div>
              ))}
            </div>

            {activeFilters.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilters.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isBusy}
                    onClick={() => removeFilter(item.key)}
                    className="inline-flex items-center rounded-full bg-gray-2 px-3 py-1 text-xs font-semibold text-gray-13 hover:bg-gray-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {item.label}: {item.value}
                    <span className="ml-2 text-gray-9">×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="min-w-0 overflow-hidden">
            {visibleFiles.length === 0 && !loading && !loadingPage && !refreshing ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <DynamicIcon name="search" className="h-8 w-8 text-gray-8" />
                <b className="text-gray-13">No documents found</b>
                <p className="text-sm text-gray-10">
                  Try changing the file search or resetting the selected filters.
                </p>
                <Button
                  onClick={resetSearchAndFilters}
                  className="mt-2 h-9 px-4 text-sm"
                >
                  <DynamicIcon name="refresh" className="h-4 w-4" />
                  Reset Search
                </Button>
              </div>
            ) : (
              <DataTable
                table={table}
                isLoading={loading || loadingPage||refreshing}
                isReLoading={
                  refreshing ||
                  loadingPage ||
                  (loading && visibleFiles.length > 0)
                }
                pageSize={Math.max(5, visibleFiles.length || pageSize)}
                stickyHeader
                isSticky
                component={<div />}
                onReload={handleRefresh}
                tableBodyMaxHeight={500}
              />
            )}
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 shrink-0 border-t border-gray-3 bg-surface px-6 py-1 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]">
        <Pagination
          itemLabel="Files"
          page={currentPage}
          pageSize={pageSize}
          showPageNumbers={false}
          totalItems={totalCount}
          onPageChange={(nextPage: any) => {
            if (isBusy) return

            if (nextPage < currentPage) {
              onPageChange?.(nextPage, null)
              return
            }

            if (nextPage > currentPage) {
              onPageChange?.(nextPage, filePage?.nextCursor || null)
            }
          }}
          onPageSizeChange={(nextPageSize) => {
            if (isBusy) return
            onPageSizeChange?.(nextPageSize)
          }}
        />
      </div>

      {openMenuId && actionMenuPosition ? (
        <div
          ref={menuRef}
          className="fixed z-[9999] w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-[0_18px_45px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
          style={{
            top: actionMenuPosition.top,
            left: actionMenuPosition.left,
          }}
        >
          <span
            className={`absolute right-7 h-3 w-3 rotate-45 border-gray-3 bg-surface ${
              actionMenuPosition.placement === 'bottom'
                ? '-top-1.5 border-l border-t'
                : '-bottom-1.5 border-b border-r'
            }`}
          />

          <MenuItem
            icon="eye"
            label="View Details"
            onClick={() => closeAndRun(() => onOpenFile(openMenuId))}
          />
          <MenuItem
            icon="edit"
            label="Edit Metadata"
            onClick={() => closeAndRun(() => onEdit(openMenuId))}
          />
          <MenuItem
            icon="bot"
            label="AI Summary"
            onClick={() => closeAndRun(() => onAiSummary(openMenuId))}
          />
          <MenuItem
            icon="share"
            label="Share"
            onClick={() => closeAndRun(() => onShare(openMenuId))}
          />
          <MenuItem
            icon="clock"
            label="Start Workflow"
            onClick={() => closeAndRun(() => onWorkflow(openMenuId))}
          />

          <div className="my-2 border-t border-gray-3" />

          <MenuItem
            icon="trash"
            label="Delete"
            danger
            onClick={() =>
              closeAndRun(() => console.log('delete file:', openMenuId))
            }
          />
        </div>
      ) : null}
    </div>
  )
}

function CheckBoxButton({
  checked,
  onClick,
}: {
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border transition-all focus:outline-none focus:ring-2 focus:ring-blue-3 ${
        checked
          ? 'border-[#2196f3] bg-[#2196f3] text-white'
          : 'border-[#2196f3] bg-surface text-transparent'
      }`}
    >
      <span className="text-[10px] leading-none">✓</span>
    </button>
  )
}

function FilterSelect({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const selectOptions: SelectOption[] = [
    { id: '', name: label },
    ...options.map((option) => ({
      id: option,
      name: option,
    })),
  ]

  const selectedValue =
    selectOptions.find((option) => option.id === value) || selectOptions[0]

  return (
    <InputSelect
      placeholder={label}
      options={selectOptions}
      value={selectedValue}
      width={210}
      disabled={disabled}
      onChange={(val) => onChange(val ? String(val.id) : '')}
    />
  )
}

function MenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: string
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-gray-2 ${
        danger ? 'text-red-9' : 'text-gray-13'
      }`}
    >
      <DynamicIcon name={icon} className="h-4 w-4 text-current" />
      <span>{label}</span>
    </button>
  )
}
