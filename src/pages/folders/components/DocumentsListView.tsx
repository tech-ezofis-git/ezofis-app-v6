import {
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import type { ExplorerView, FileItem, RepositoryFilePage } from '../types/folderTypes'
import {
  getRepositoryFieldRawValue,
  normalizeFieldKey,
} from '../utils/repositoryFieldUtils'
import { type BreadcrumbItem } from './Breadcrumbs'
import { FolderFilterBar } from './FolderFilterBar'
import { DynamicIcon } from './icons'
import { Button, EllipsisText, StatusPill } from './Ui'

type ActionMenuPosition = {
  left: number
  placement: 'top' | 'bottom'
  top: number
}

type AnyFileItem = FileItem & Record<string, any>

type DocumentsListViewProps = {
  breadcrumbs: BreadcrumbItem[]
  currentFolderGroupField?: string
  error?: string
  fileColumns?: DynamicRepositoryColumn[]
  fileFilters?: Record<string, string>
  filePage?: RepositoryFilePage
  files: FileItem[]
  folderContextFilters?: Record<string, string>
  loading?: boolean
  loadingPage?: boolean
  refreshing?: boolean
  searchQuery?: string
  view: ExplorerView
  onAiSummary: (id: string) => void
  onBreadcrumbSelect: (id: string) => void
  onEdit: (id: string) => void
  onFiltersChange?: (filters: Record<string, string>) => void
  onOpenFile: (id: string) => void
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onRefresh?: () => void
  onSearchChange?: (value: string) => void
  onShare: (id: string) => void
  onUpload?: () => void
  onWorkflow: (id: string) => void
  setView: (view: ExplorerView) => void
}

type DynamicColumn = {
  dataType?: string
  key: string
  label: string
  minWidth?: number
}

const HIDDEN_FILE_KEYS = new Set([
  'storageproviderid',
  'storageprovidercode',
  'hasfilepath',
  'status',
])

const ACTION_MENU_WIDTH = 220
const ACTION_MENU_HEIGHT = 274

const isHiddenFileKey = (key: string) => HIDDEN_FILE_KEYS.has(key.toLowerCase())

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

const normalizeKey = normalizeFieldKey

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

  const matchedKey = Object.keys(file || {}).find((key) =>
    isPrimaryNameKey(key),
  )
  const matchedValue = matchedKey ? file[matchedKey] : undefined

  if (
    matchedValue !== undefined &&
    matchedValue !== null &&
    matchedValue !== ''
  ) {
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

const getRepositoryFieldRawValueFromRow = (
  row: AnyFileItem,
  sqlColumnName: string,
  folderContextFilters: Record<string, string> = {},
) => getRepositoryFieldRawValue(row, sqlColumnName, folderContextFilters)

const getDisplayValue = (
  row: AnyFileItem,
  sqlColumnName: string,
  dataType?: string,
  folderContextFilters: Record<string, string> = {},
) => {
  const value = getRepositoryFieldRawValueFromRow(
    row,
    sqlColumnName,
    folderContextFilters,
  )
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

const getColumnWidth = (key: string, label?: string, dataType?: string) => {
  const normalizedType = String(dataType || '').toLowerCase()
  const normalizedKey = String(key || '').toLowerCase()
  const labelWidth = Math.ceil(String(label || key).length * 8.5) + 40

  if (key === '__name') return 260
  if (key === '__status') return 130
  if (normalizedType === 'date' || normalizedType === 'datetime') return 150
  if (
    ['decimal', 'number', 'int', 'integer', 'currency', 'amount'].includes(
      normalizedType,
    ) ||
    normalizedKey.includes('amount')
  ) {
    return Math.max(140, labelWidth)
  }

  return Math.min(Math.max(labelWidth, 140), 260)
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
    {
      key: '__status',
      label: 'Current Stage',
      minWidth: 140,
    },
    ...normalColumns.map((column) => {
      const label = column.label || toTitle(column.key)

      return {
        dataType: column.dataType,
        key: column.key,
        label,
        minWidth: getColumnWidth(column.key, label, column.dataType),
      }
    }),
  ]
}

export function DocumentsListView({
  breadcrumbs: _breadcrumbs,
  currentFolderGroupField = '',
  error = '',
  fileColumns = [],
  fileFilters = {},
  filePage,
  files,
  folderContextFilters = {},
  loading = false,
  loadingPage = false,
  onAiSummary,
  onBreadcrumbSelect: _onBreadcrumbSelect,
  onEdit,
  onFiltersChange,
  onOpenFile,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onSearchChange,
  onShare,
  onUpload,
  onWorkflow,
  refreshing = false,
  searchQuery: searchQueryProp = '',
  setView,
  view,
}: DocumentsListViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState(searchQueryProp)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const normalizedFiles = useMemo(() => files as AnyFileItem[], [files])

  useEffect(() => {
    setSearchQuery(searchQueryProp)
  }, [searchQueryProp])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearchChange?.(searchQuery)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [onSearchChange, searchQuery])

  const columns = useMemo(
    () => buildRepositoryColumns(fileColumns),
    [fileColumns],
  )

  const currentPage = filePage?.page || 1
  const pageSize = filePage?.pageSize || 50
  const apiTotalCount = Number(filePage?.totalCount ?? 0)
  const totalCount =
    apiTotalCount > 0
      ? apiTotalCount
      : filePage?.hasMore
        ? Math.max(currentPage * pageSize + 1, normalizedFiles.length)
        : Math.max(
            (currentPage - 1) * pageSize + normalizedFiles.length,
            normalizedFiles.length,
          )
  const isBusy = loading || loadingPage || refreshing

  // Server already applies filters/search; keep a light pass for status aliasing.
  const visibleFiles = useMemo(() => {
    return normalizedFiles.filter((file) =>
      Object.entries(fileFilters).every(([key, value]) => {
        if (!value) return true

        if (key === '__status' || normalizeKey(key) === 'status') {
          return String(file.status ?? file.Status ?? '')
            .trim()
            .toLowerCase()
            .includes(value.trim().toLowerCase())
        }

        const matchedKey = Object.keys(file).find(
          (fieldKey) => normalizeKey(fieldKey) === normalizeKey(key),
        )
        const fieldValue = matchedKey
          ? file[matchedKey]
          : getRepositoryFieldRawValueFromRow(
              file,
              key,
              folderContextFilters,
            )

        return String(fieldValue ?? '')
          .trim()
          .toLowerCase()
          .includes(value.trim().toLowerCase())
      }),
    )
  }, [folderContextFilters, normalizedFiles, fileFilters])

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
    const next = { ...fileFilters }
    if (value) next[key] = value
    else delete next[key]
    onFiltersChange?.(next)
  }

  const resetFilters = () => onFiltersChange?.({})

  const resetSearchAndFilters = () => {
    setSearchQuery('')
    onSearchChange?.('')
    onFiltersChange?.({})
  }

  const closeAndRun = (callback: () => void) => {
    setOpenMenuId(null)
    setActionMenuPosition(null)
    callback()
  }

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
    setActionMenuPosition({ left, placement, top })
  }

  const dataTableColumns = useMemo<ColumnDef<AnyFileItem>[]>(() => {
    const selectColumn: ColumnDef<AnyFileItem> = {
      id: 'selection',
      enableSorting: false,
      maxSize: 44,
      minSize: 44,
      size: 44,
      cell: ({ row }) => {
        const fileId = getFileId(row.original)
        const isSelected = selectedIds.includes(fileId)

        return (
          <div className='flex justify-center'>
            {selectionEnabled ? (
              <CheckBoxButton
                checked={isSelected}
                onClick={() => toggleSelect(fileId)}
              />
            ) : (
              <button
                className='h-5 w-5 rounded-md border border-transparent transition-all hover:border-blue-9 hover:bg-blue-1 disabled:cursor-not-allowed disabled:opacity-40'
                disabled={isBusy}
                title='Select'
                type='button'
                onClick={() => toggleSelect(fileId)}
              />
            )}
          </div>
        )
      },
      header: () => (
        <div className='flex justify-center'>
          {selectionEnabled && (
            <CheckBoxButton
              checked={allVisibleSelected}
              onClick={toggleSelectAllVisible}
            />
          )}
        </div>
      ),
    }

    const dynamicColumns: ColumnDef<AnyFileItem>[] = columns.map((column) => ({
      enableResizing: column.key !== '__name',
      header: column.label,
      id: column.key,
      minSize: column.minWidth || 160,
      size: column.minWidth || 160,
      maxSize: column.key === '__name' ? 340 : 320,
      accessorFn: (row) => {
        if (column.key === '__name') return getPrimaryFileName(row)
        if (column.key === '__status') {
          return String(row.status ?? row.Status ?? '').trim()
        }
        return getDisplayValue(
          row,
          column.key,
          column.dataType,
          folderContextFilters,
        )
      },
      cell: ({ row, getValue }) => {
        const value = String(getValue() ?? '-')

        if (column.key === '__name') {
          const fileId = getFileId(row.original)

          return (
            <button
              className='flex max-w-full min-w-0 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-40'
              disabled={isBusy}
              type='button'
              onClick={() => onOpenFile(fileId)}
            >
              <DynamicIcon
                className='h-5 w-5 shrink-0 text-[#4f5b88]'
                name='fileText'
              />
              <EllipsisText
                className='font-semibold text-gray-13'
                lines={1}
                value={value}
              />
            </button>
          )
        }

        if (column.key === '__status') {
          const status = String(getValue() || '').trim()
          if (!status) return <span className='text-gray-10'>—</span>
          return <StatusPill status={status} />
        }

        return <span className='text-gray-10'>{value}</span>
      },
    }))

    const actionColumn: ColumnDef<AnyFileItem> = {
      enableResizing: false,
      enableSorting: false,
      header: '',
      id: 'actions',
      maxSize: 72,
      minSize: 56,
      size: 64,
      meta: { headerAlign: 'right' as const },
      cell: ({ row }) => {
        const fileId = getFileId(row.original)

        return (
          <div className='relative flex justify-end'>
            <button
              className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 transition-all hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40'
              disabled={isBusy}
              type='button'
              onClick={(event) => openActionMenu(event, fileId)}
            >
              <DynamicIcon className='h-4 w-4' name='more' />
            </button>
          </div>
        )
      },
    }

    return [selectColumn, ...dynamicColumns, actionColumn]
  }, [
    allVisibleSelected,
    columns,
    folderContextFilters,
    isBusy,
    onOpenFile,
    openActionMenu,
    selectedIds,
    selectionEnabled,
    visibleFiles,
  ])

  const table = useReactTable({
    columnResizeMode: 'onChange',
    columns: dataTableColumns,
    data: visibleFiles,
    defaultColumn: {
      enableResizing: true,
      enableSorting: true,
      maxSize: 480,
      minSize: 80,
    },
    enableColumnResizing: true,
    enableSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => getFileId(row),
    initialState: {
      columnPinning: {
        left: ['selection', '__name'],
        right: ['actions'],
      },
    },
    manualPagination: true,
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
      <div className='m-4 rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10'>
        {error}
      </div>
    )
  }

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface text-sm text-gray-11 duration-300'>
      <div className='relative z-40 shrink-0 bg-surface px-6 py-2'>
        <FolderFilterBar
          activeFilters={fileFilters}
          currentFolderGroupField={currentFolderGroupField}
          fileColumns={fileColumns}
          files={normalizedFiles}
          folderContextFilters={folderContextFilters}
          isBusy={isBusy}
          refreshing={refreshing}
          searchPlaceholder='Search invoice, supplier, PO...'
          searchQuery={searchQuery}
          view={view}
          onFilterChange={updateFilter}
          onRefresh={handleRefresh}
          onResetFilters={resetFilters}
          onSearchChange={setSearchQuery}
          onUpload={onUpload}
          setView={setView}
        />
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-2 pt-2'>
        <section className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
          {visibleFiles.length === 0 &&
          !loading &&
          !loadingPage &&
          !refreshing ? (
            <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
              <DynamicIcon className='h-8 w-8 text-gray-8' name='search' />
              <b className='text-gray-13'>No documents found</b>
              <p className='text-sm text-gray-10'>
                Try changing the file search or resetting the selected
                filters.
              </p>
              <Button
                className='mt-2 h-9 px-4 text-sm'
                onClick={resetSearchAndFilters}
              >
                <DynamicIcon className='h-4 w-4' name='refresh' />
                Reset Search
              </Button>
            </div>
          ) : (
            <DataTable
              component={<div />}
              isLoading={loading || loadingPage || refreshing}
              pageSize={Math.max(5, visibleFiles.length || pageSize)}
              table={table}
              isSticky
              stickyHeader
              hideGrouping
              isReLoading={
                refreshing ||
                loadingPage ||
                (loading && visibleFiles.length > 0)
              }
              onReload={handleRefresh}
            />
          )}
        </section>
      </div>

      <div className='z-50 shrink-0 border-t border-gray-3 bg-surface px-6 py-1 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]'>
        <Pagination
          itemLabel='Files'
          page={currentPage}
          pageSize={pageSize}
          showPageNumbers={false}
          totalItems={totalCount}
          onPageChange={(nextPage: any) => {
            if (loadingPage) return

            if (nextPage === currentPage) return

            if (nextPage < currentPage) {
              onPageChange?.(nextPage, null)
              return
            }

            onPageChange?.(nextPage, filePage?.nextCursor || null)
          }}
          onPageSizeChange={(nextPageSize) => {
            if (loadingPage) return
            onPageSizeChange?.(nextPageSize)
          }}
        />
      </div>

      {openMenuId && actionMenuPosition ? (
        <div
          className='fixed z-[9999] w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-[0_18px_45px_rgba(15,23,42,0.22)] ring-1 ring-black/5'
          ref={menuRef}
          style={{
            left: actionMenuPosition.left,
            top: actionMenuPosition.top,
          }}
        >
          <span
            className={`absolute right-7 h-3 w-3 rotate-45 border-gray-3 bg-surface ${
              actionMenuPosition.placement === 'bottom'
                ? '-top-1.5 border-t border-l'
                : '-bottom-1.5 border-r border-b'
            }`}
          />

          <MenuItem
            icon='eye'
            label='View Details'
            onClick={() => closeAndRun(() => onOpenFile(openMenuId))}
          />
          <MenuItem
            icon='edit'
            label='Edit Metadata'
            onClick={() => closeAndRun(() => onEdit(openMenuId))}
          />
          <MenuItem
            icon='bot'
            label='AI Summary'
            onClick={() => closeAndRun(() => onAiSummary(openMenuId))}
          />
          <MenuItem
            icon='share'
            label='Share'
            onClick={() => closeAndRun(() => onShare(openMenuId))}
          />
          <MenuItem
            icon='clock'
            label='Start Workflow'
            onClick={() => closeAndRun(() => onWorkflow(openMenuId))}
          />

          <div className='my-2 border-t border-gray-3' />

          <MenuItem
            icon='trash'
            label='Delete'
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
      type='button'
      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border transition-all focus:ring-2 focus:ring-blue-3 focus:outline-none ${
        checked
          ? 'border-[#2196f3] bg-[#2196f3] text-white'
          : 'border-[#2196f3] bg-surface text-transparent'
      }`}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <span className='text-[10px] leading-none'>✓</span>
    </button>
  )
}

function MenuItem({
  danger = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] hover:bg-gray-2 ${
        danger ? 'text-red-9' : 'text-gray-13'
      }`}
      onClick={onClick}
    >
      <DynamicIcon className='h-4 w-4 text-current' name={icon} />
      <span>{label}</span>
    </button>
  )
}
