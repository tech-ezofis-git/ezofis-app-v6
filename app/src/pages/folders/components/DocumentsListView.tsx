import { useLingui } from '@lingui/react/macro'
import {
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Option } from '@/types/option'
import BaseButton from '@/components/base/button/Button'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import DataTable from '@/components/base/data-table/DataTable'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import Tooltip from '@/components/base/Tooltip'
import InputSelect from '@/components/base/inputs/InputSelect'
import Pagination from '@/components/base/pagination/Pagination'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import type {
  DynamicRepositoryColumn,
  RepositoryItemFilterField,
} from '../api/folderApi'
import type {
  ExplorerView,
  FileItem,
  FolderItem,
  RepositoryFilePage,
  TreeNode,
} from '../types/folderTypes'
import type { FolderFilterOptionsCache } from '../utils/folderExplorerUtils'
import {
  formatRepositoryDateDisplay,
  isRepositoryDateDataType,
} from '../utils/folderExplorerUtils'
import { matchesAnyFilterValue } from '../utils/multiFilterValues'
import {
  getRepositoryFieldRawValue,
  normalizeFieldKey,
} from '../utils/repositoryFieldUtils'
import { type BreadcrumbItem } from './Breadcrumbs'
import { EmptyFolderUploadDropzone } from './EmptyFolderUploadDropzone'
import { FolderFilterBar, matchesSearchText } from './FolderFilterBar'
import { FolderDataTableSection } from './FolderTable'
import { DynamicIcon } from './icons'
import {
  FileCategorySegmentedControl,
  type FileCategory,
} from './FileCategorySegmentedControl'
import {
  hasAllMandatoryFieldsFilled,
  isArchivedFile,
  isUnarchivedStageFile,
  StagedFileDeleteButton,
  StagedFileExportButton,
} from './StagedFileDeleteButton'
import DynamicTableColumnCell, {
  isTableColumnType,
} from './DynamicTableColumnCell'
import { Button, EllipsisText, StatusPill } from './Ui'

type ActionMenuPosition = {
  left: number
  placement: 'top' | 'bottom'
  top: number
}

type AnyFileItem = FileItem & Record<string, any>

type DocumentsListViewProps = {
  activeRepositoryId?: string
  breadcrumbs: BreadcrumbItem[]
  currentFolderGroupField?: string
  error?: string
  fileColumns?: DynamicRepositoryColumn[]
  fileFilters?: Record<string, string>
  filePage?: RepositoryFilePage
  files: FileItem[]
  filterOptionsCache?: FolderFilterOptionsCache
  folderContextFilters?: Record<string, string>
  folderFilterOptionSource?: FolderItem[]
  folders?: FolderItem[]
  itemFilterFields?: RepositoryItemFilterField[]
  loading?: boolean
  loadingPage?: boolean
  permissions?: {
    delete?: boolean
    download?: boolean
    editDocument?: boolean
    editMetadata?: boolean
    print?: boolean
    sendForSignature?: boolean
    upload?: boolean
    view?: boolean
  }
  refreshing?: boolean
  repositories?: TreeNode[]
  repositoryId?: string
  searchQuery?: string
  uploadDisabled?: boolean
  view: ExplorerView
  onAiSummary: (id: string) => void
  onBreadcrumbSelect: (id: string) => void
  onEdit?: (id: string) => void
  onFilterMenuOpenChange?: (id: string | null) => void
  onFiltersChange?: (filters: Record<string, string>) => void
  onIntelligentUpload?: () => void
  onOpenFile: (id: string) => void
  onDeleteFile?: (fileId: string) => Promise<void>
  onDeleteStagedFile?: (file: FileItem) => Promise<void>
  onDeleteStagedFiles?: (files: FileItem[]) => Promise<void>
  onExportStagedFile?: (file: FileItem) => Promise<void>
  onExportStagedFiles?: (files: FileItem[]) => Promise<void>
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onRefresh?: () => void
  onRepositoryChange?: (id: string) => void
  onSearchChange?: (value: string) => void
  onShare: (id: string) => void
  onShareFilter?: (shares: any[], message: string) => Promise<boolean>
  onUpload?: () => void
  onUploadFile?: (files: File[]) => void
  onWorkflow?: (id: string) => void
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

  const fromRaw =
    getRepositoryFieldRawValueFromRow(file, 'name') ??
    getRepositoryFieldRawValueFromRow(file, 'Name') ??
    getRepositoryFieldRawValueFromRow(file, 'fileName') ??
    getRepositoryFieldRawValueFromRow(file, 'FileName') ??
    getRepositoryFieldRawValueFromRow(file, 'DocumentName') ??
    getRepositoryFieldRawValueFromRow(file, 'documentName')

  if (fromRaw !== undefined && fromRaw !== null && fromRaw !== '') {
    return String(fromRaw)
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

const formatDateValue = (value: any) => formatRepositoryDateDisplay(value)

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

  if (
    isRepositoryDateDataType(dataType) ||
    normalizedType === 'date' ||
    normalizedKey.includes('date')
  ) {
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
  if (isTableColumnType(dataType)) return 130
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

export const isAccountsPayableFolder = (
  repositoryTitleOrId?: string,
  breadcrumbs?: Array<{ label?: string; title?: string }>,
  files?: any[],
): boolean => {
  const normalize = (val?: string) =>
    (val || '').toLowerCase().replace(/[^a-z]/g, '')

  const repoNorm = normalize(repositoryTitleOrId)
  if (repoNorm.includes('accountspayable') || repoNorm.includes('payables')) {
    return true
  }

  if (
    breadcrumbs?.some((b) => {
      const text = normalize(b.label || b.title)
      return text.includes('accountspayable') || text.includes('payables')
    })
  ) {
    return true
  }

  if (
    files?.some((f) => {
      const status = String(f?.status ?? f?.Status ?? '').trim()
      return Boolean(
        status &&
        status !== '-' &&
        status !== 'null' &&
        status !== 'undefined' &&
        status !== '—',
      )
    })
  ) {
    return true
  }

  return false
}

const buildRepositoryColumns = (
  fileColumns: DynamicRepositoryColumn[],
  labels: { currentStage: string; name: string },
  isAccountsPayable: boolean = false,
): DynamicColumn[] => {
  const primaryNameCol = fileColumns.find((col) => isPrimaryNameKey(col.key))
  const normalColumns = fileColumns.filter(
    (column) => !isHiddenFileKey(column.key) && !isPrimaryNameKey(column.key),
  )

  return [
    {
      key: '__name',
      label: primaryNameCol?.label || labels.name,
      minWidth: 220,
    },
    ...(isAccountsPayable
      ? [
          {
            key: '__status',
            label: labels.currentStage,
            minWidth: 140,
          },
        ]
      : []),
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
  activeRepositoryId = '',
  breadcrumbs = [],
  currentFolderGroupField = '',
  error = '',
  fileColumns = [],
  fileFilters = {},
  filePage,
  files,
  filterOptionsCache = {},
  folderContextFilters = {},
  folderFilterOptionSource = [],
  folders = [],
  itemFilterFields = [],
  loading = false,
  loadingPage = false,
  permissions,
  refreshing = false,
  repositories = [],
  repositoryId = '',
  searchQuery: searchQueryProp = '',
  uploadDisabled = false,
  view,
  setView,
  onAiSummary,
  onBreadcrumbSelect,
  onEdit,
  onFilterMenuOpenChange,
  onFiltersChange,
  onIntelligentUpload,
  onOpenFile,
  onDeleteFile,
  onDeleteStagedFile,
  onDeleteStagedFiles,
  onExportStagedFile,
  onExportStagedFiles,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onRepositoryChange,
  onSearchChange,
  onShare,
  onShareFilter,
  onUpload,
  onUploadFile,
  onWorkflow,
}: DocumentsListViewProps) {
  const { t } = useLingui()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState(searchQueryProp)
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null)
  const [isDeletingFile, setIsDeletingFile] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const handleOpenFolder = useCallback(
    (id: string) => {
      if (onRepositoryChange) {
        onRepositoryChange(id)
      } else if (onBreadcrumbSelect) {
        onBreadcrumbSelect(id)
      }
    },
    [onBreadcrumbSelect, onRepositoryChange],
  )

  const [fileCategory, setFileCategory] = useState<FileCategory>('all')

  const stagedCount = useMemo(
    () => files.filter(isUnarchivedStageFile).length,
    [files],
  )
  const archivedCount = useMemo(
    () => files.filter(isArchivedFile).length,
    [files],
  )

  useEffect(() => {
    if (stagedCount <= 0 && fileCategory === 'staged') {
      setFileCategory('all')
    }
  }, [stagedCount, fileCategory])

  const activeCategoryFiles = useMemo(() => {
    if (fileCategory === 'staged') {
      return files.filter(isUnarchivedStageFile)
    }
    if (fileCategory === 'archived') {
      return files.filter(isArchivedFile)
    }
    return files
  }, [files, fileCategory])

  const normalizedFiles = useMemo(
    () => activeCategoryFiles as AnyFileItem[],
    [activeCategoryFiles],
  )

  const repositoryOptions = useMemo<Option[]>(
    () =>
      repositories.map((node) => ({
        id: node.id,
        name: node.title,
        value: node.id,
      })),
    [repositories],
  )

  const selectedRepositoryOption = useMemo(
    () =>
      repositoryOptions.find(
        (option) =>
          String(option.value || option.id) === String(activeRepositoryId),
      ) ?? null,
    [activeRepositoryId, repositoryOptions],
  )

  const handleRepositoryChange = (option: Option | null) => {
    if (!option || !onRepositoryChange) return
    onRepositoryChange(String(option.value || option.id))
  }

  useEffect(() => {
    setSearchQuery(searchQueryProp)
  }, [searchQueryProp])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Parent already owns this value (e.g. Ask AI apply) — don't echo back
      // as a manual change, or ephemeral Ask AI search won't clear on leave.
      if (searchQuery === searchQueryProp) return
      onSearchChange?.(searchQuery)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [onSearchChange, searchQuery, searchQueryProp])

  const isAPFolder = useMemo(
    () =>
      isAccountsPayableFolder(
        selectedRepositoryOption?.name || activeRepositoryId,
        breadcrumbs,
        normalizedFiles,
      ),
    [
      activeRepositoryId,
      breadcrumbs,
      normalizedFiles,
      selectedRepositoryOption,
    ],
  )

  const columns = useMemo(
    () =>
      buildRepositoryColumns(
        fileColumns,
        {
          currentStage: t`Current Stage`,
          name: t`Name`,
        },
        isAPFolder,
      ),
    [fileColumns, isAPFolder, t],
  )

  const currentPage = filePage?.page || 1
  const pageSize = filePage?.pageSize || 50
  const apiTotalCount = Number(filePage?.totalCount ?? 0)
  const isBusy = loading || loadingPage || refreshing
  const hasActiveQuery =
    Boolean(String(searchQuery || '').trim()) ||
    Object.values(fileFilters).some((value) =>
      Boolean(String(value || '').trim()),
    )

  // Client OR-match for multi-select (same field); AND across different fields; plus searchQuery.
  const visibleFiles = useMemo(() => {
    return normalizedFiles.filter((file) => {
      if (searchQuery && !matchesSearchText(file, searchQuery)) {
        return false
      }

      return Object.entries(fileFilters).every(([key, value]) => {
        if (!value) return true

        if (key === '__status' || normalizeKey(key) === 'status') {
          return matchesAnyFilterValue(
            String(file.status ?? file.Status ?? '').trim(),
            value,
          )
        }

        const matchedKey = Object.keys(file).find(
          (fieldKey) => normalizeKey(fieldKey) === normalizeKey(key),
        )
        const fieldValue = matchedKey
          ? file[matchedKey]
          : getRepositoryFieldRawValueFromRow(file, key, folderContextFilters)

        return matchesAnyFilterValue(String(fieldValue ?? ''), value)
      })
    })
  }, [folderContextFilters, normalizedFiles, fileFilters, searchQuery])

  const stagedFilesList = useMemo(
    () => visibleFiles.filter(isUnarchivedStageFile),
    [visibleFiles],
  )
  const hasStagedFiles = stagedFilesList.length > 0

  const selectedStagedFiles = useMemo(() => {
    const idSet = new Set(selectedIds)
    return stagedFilesList.filter((f) => idSet.has(getFileId(f)))
  }, [stagedFilesList, selectedIds])

  const selectedStagedCount = selectedStagedFiles.length
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false)
  const [isBulkExporting, setIsBulkExporting] = useState(false)
  const [isBulkExportConfirmOpen, setIsBulkExportConfirmOpen] = useState(false)

  const canBulkExport = useMemo(
    () =>
      selectedStagedFiles.length > 0 &&
      selectedStagedFiles.every((file) =>
        hasAllMandatoryFieldsFilled(file, fileColumns, folderContextFilters),
      ),
    [fileColumns, folderContextFilters, selectedStagedFiles],
  )

  const isStagedCategory = fileCategory === 'staged'
  const totalCount =
    isStagedCategory
      ? visibleFiles.length
      : apiTotalCount > 0
        ? apiTotalCount
        : filePage?.hasMore
          ? Math.max(currentPage * pageSize + 1, visibleFiles.length)
          : Math.max(
              (currentPage - 1) * pageSize + visibleFiles.length,
              visibleFiles.length,
            )

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
      enableSorting: false,
      id: 'selection',
      maxSize: 48,
      meta: {
        className: '!px-0 !pl-0 !pr-0 text-center',
        headerClassName: '!px-0 !pl-0 !pr-0 text-center',
        headerAlign: 'center',
        disableEllipsis: true,
      },
      minSize: 48,
      size: 48,
      cell: ({ row }) => {
        const file = row.original
        const fileId = getFileId(file)
        const isSelected = selectedIds.includes(fileId)

        return (
          <div
            className='flex w-full items-center justify-center'
            onClick={(e) => e.stopPropagation()}
          >
            <InputCheckbox
              aria-label={t`Select file`}
              checked={isSelected}
              onChange={() => toggleSelect(fileId)}
            />
          </div>
        )
      },
      header: () => {
        const isAllSelected =
          visibleFiles.length > 0 &&
          selectedVisibleCount === visibleFiles.length
        const isIndeterminate =
          selectedVisibleCount > 0 && !isAllSelected

        return (
          <div
            className='flex w-full items-center justify-center'
            onClick={(e) => e.stopPropagation()}
          >
            <InputCheckbox
              aria-label={t`Select all files`}
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onChange={(checked) => {
                if (checked) {
                  setSelectedIds((prev) =>
                    Array.from(
                      new Set([...prev, ...visibleFiles.map(getFileId)]),
                    ),
                  )
                } else {
                  const visibleIdSet = new Set(visibleFiles.map(getFileId))
                  setSelectedIds((prev) =>
                    prev.filter((id) => !visibleIdSet.has(id)),
                  )
                }
              }}
            />
          </div>
        )
      },
    }

    const dynamicColumns: ColumnDef<AnyFileItem>[] = columns.map((column) => ({
      enableResizing: column.key !== '__name',
      id: column.key,
      maxSize: column.key === '__name' ? 340 : 320,
      meta: { disableEllipsis: true },
      minSize: column.minWidth || 160,
      size: column.minWidth || 160,
      accessorFn: (row) => {
        if (column.key === '__name') {
          const nameCol = fileColumns.find((col) => isPrimaryNameKey(col.key))
          if (nameCol?.key) {
            const val = getDisplayValue(
              row,
              nameCol.key,
              nameCol.dataType,
              folderContextFilters,
            )
            if (val && val !== '-') return val
          }
          return getPrimaryFileName(row)
        }
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
          const fileName =
            value !== '-'
              ? value
              : getPrimaryFileName(row.original) !== '-'
                ? getPrimaryFileName(row.original)
                : row.original.name || row.original.fileName || ''
          const iconName = getFileIcon(fileName)

          return (
            <button
              className='flex max-w-full min-w-0 items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-40'
              disabled={isBusy}
              type='button'
              onClick={() => onOpenFile(fileId)}
            >
              <Icon className='size-5 shrink-0 pt-0.5' name={iconName} />
              <EllipsisText
                className='font-semibold text-gray-13'
                lines={1}
                value={fileName || '-'}
              />
            </button>
          )
        }

        if (column.key === '__status') {
          const status = String(getValue() || '').trim()
          if (!status) return <span className='text-gray-10'>—</span>
          return <StatusPill status={status} />
        }

        if (isTableColumnType(column.dataType)) {
          const rawVal =
            row.original[column.key] ??
            getRepositoryFieldRawValueFromRow(
              row.original,
              column.key,
              folderContextFilters,
            ) ??
            getValue()
          return (
            <DynamicTableColumnCell
              rawVal={rawVal}
              title={column.label || column.key}
            />
          )
        }

        return (
          <EllipsisText
            className='text-sm leading-4 font-normal text-gray-10'
            lines={1}
            value={value}
          />
        )
      },
      header: () => <EllipsisText lines={1} value={column.label} />,
    }))

    const actionColumn: ColumnDef<AnyFileItem> = {
      enableResizing: false,
      enableSorting: false,
      header: '',
      id: 'actions',
      maxSize: 96,
      meta: { headerAlign: 'right' as const },
      minSize: 56,
      size: 80,
      cell: ({ row }) => {
        const file = row.original
        const fileId = getFileId(file)

        if (isUnarchivedStageFile(file)) {
          const canExport = hasAllMandatoryFieldsFilled(
            file,
            fileColumns,
            folderContextFilters,
          )

          return (
            <div
              className='relative flex items-center justify-end gap-1'
              onClick={(event) => event.stopPropagation()}
            >
              {canExport && onExportStagedFile ? (
                <StagedFileExportButton
                  disabled={isBusy || isBulkExporting || isBulkDeleting}
                  fileName={String(file.name || t`this file`)}
                  onExport={() => onExportStagedFile(file)}
                />
              ) : null}
              {onDeleteStagedFile ? (
                <StagedFileDeleteButton
                  disabled={isBusy || isBulkExporting || isBulkDeleting}
                  fileName={String(file.name || t`this file`)}
                  onDelete={() => onDeleteStagedFile(file)}
                />
              ) : null}
            </div>
          )
        }

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
    fileColumns,
    folderContextFilters,
    hasStagedFiles,
    isBulkDeleting,
    isBulkExporting,
    isBusy,
    onDeleteStagedFile,
    onExportStagedFile,
    onOpenFile,
    openActionMenu,
    selectedIds,
    selectedStagedCount,
    selectionEnabled,
    stagedFilesList,
    t,
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
    initialState: {
      columnPinning: {
        left: ['selection', '__name'],
        right: ['actions'],
      },
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getFileId(row),
    getSortedRowModel: getSortedRowModel(),
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

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface text-sm text-gray-11 duration-300'>
      <div className='relative z-40 shrink-0 bg-surface px-6 py-2'>
        <FolderFilterBar
          activeFilters={fileFilters}
          currentFolderGroupField={currentFolderGroupField}
          fileColumns={fileColumns}
          files={normalizedFiles}
          filterMode='files'
          filterOptionsCache={filterOptionsCache}
          folderContextFilters={folderContextFilters}
          folderFilterOptionSource={folderFilterOptionSource}
          folders={folders}
          isBusy={isBusy}
          itemFilterFields={itemFilterFields}
          refreshing={refreshing}
          repositoryId={repositoryId}
          searchPlaceholder={t`Search by name or metadata...`}
          searchQuery={searchQuery}
          view={view}
          afterSearchActions={
            repositoryOptions.length > 0 ? (
              <InputSelect
                aria-label={t`Repository`}
                className='shrink-0 border-[var(--gray-3)] transition-colors hover:border-[var(--primary-3)]'
                options={repositoryOptions}
                value={selectedRepositoryOption}
                width={240}
                searchable
                leftSection={
                  <Icon
                    className='text-[var(--gray-10)]'
                    name='lucide:folder'
                  />
                }
                onChange={handleRepositoryChange}
              />
            ) : null
          }
          setView={setView}
          onFilterChange={updateFilter}
          onFilterMenuOpenChange={onFilterMenuOpenChange}
          onIntelligentUpload={onIntelligentUpload}
          onRefresh={handleRefresh}
          onResetFilters={resetFilters}
          onSearchChange={setSearchQuery}
          onShare={onShareFilter}
          onUpload={onUpload}
        />
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-1 pb-2'>
        <section className='flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden'>
          {error ? (
            <div className='m-4 rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10'>
              {error}
            </div>
          ) : !activeRepositoryId || folders.length > 0 ? (
            <FolderDataTableSection
              effectiveFolderTotal={folders.length}
              folderFilters={{}}
              folders={folders}
              folderSearch={searchQuery}
              hasFiles={activeRepositoryId ? visibleFiles.length > 0 : false}
              hasMoreFolders={false}
              hideFolderActions={!activeRepositoryId}
              isExpanded={!activeRepositoryId || visibleFiles.length === 0}
              isSplitView={false}
              loading={loading}
              loadingFolders={false}
              loadingPage={loadingPage}
              rowSize='compact'
              folderBodyMaxHeight={
                activeRepositoryId && visibleFiles.length > 0
                  ? `${Math.min(260, Math.max(96, folders.length * 56 + 52))}px`
                  : undefined
              }
              onLoadMoreFolders={() => undefined}
              onOpenFolder={handleOpenFolder}
              onReload={handleRefresh}
            />
          ) : null}

          {activeRepositoryId && stagedCount > 0 && (files.length > 0 || loading || loadingPage) ? (
            <div className='relative my-2 flex shrink-0 items-center justify-center select-none'>
              <div className='pointer-events-none absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-gray-4' />
              <div className='relative z-10'>
                <FileCategorySegmentedControl
                  activeCategory={fileCategory}
                  allCount={files.length}
                  archivedCount={archivedCount}
                  stagedCount={stagedCount}
                  onChange={setFileCategory}
                />
              </div>
            </div>
          ) : null}

          {activeRepositoryId ? (
            visibleFiles.length === 0 &&
            !loading &&
            !loadingPage &&
            !refreshing &&
            folders.length === 0 ? (
              hasActiveQuery ? (
                <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
                  <DynamicIcon className='h-8 w-8 text-gray-8' name='search' />
                  <b className='text-gray-13'>{t`No documents found`}</b>
                  <p className='text-sm text-gray-10'>
                    {t`Try changing the file search or resetting the selected filters.`}
                  </p>
                  <Button
                    className='mt-2 h-9 px-4 text-sm'
                    onClick={resetSearchAndFilters}
                  >
                    <DynamicIcon className='h-4 w-4' name='refresh' />
                    {t`Reset Search`}
                  </Button>
                </div>
              ) : (
                <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
                  <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-3 shadow-sm'>
                    <div className='flex h-14 w-14 items-center justify-center rounded-full bg-white'>
                      <DynamicIcon
                        className='h-8 w-8 text-gray-10'
                        name='folder'
                      />
                    </div>
                  </div>
                  <b className='text-gray-13'>{t`No documents found`}</b>
                  <p className='max-w-[460px] text-sm text-gray-10'>
                    {t`This folder does not contain any folders or files yet.`}
                  </p>
                  {onUpload && (
                    <button
                      className='mt-4 flex items-center gap-2 rounded-xl bg-[var(--primary-9)] px-4 py-2 text-[13px] font-bold text-white shadow-xs transition-all hover:bg-[var(--primary-10)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
                      disabled={uploadDisabled}
                      type='button'
                      onClick={onUpload}
                    >
                      <Icon className='size-4' name='tabler:upload' />
                      {t`Upload Documents`}
                    </button>
                  )}
                </div>
              )
            ) : visibleFiles.length > 0 ||
              files.length > 0 ||
              loading ||
              loadingPage ||
              refreshing ? (
              <>
                {selectedStagedCount > 0 &&
                (onDeleteStagedFiles || onExportStagedFiles) ? (
                  <div className='animate-in fade-in slide-in-from-top-1 mb-2 flex shrink-0 items-center justify-between rounded-lg border border-gray-4 bg-gray-2 px-4 py-2 text-xs duration-200'>
                    <div className='flex items-center gap-2.5'>
                      <span className='inline-flex items-center justify-center rounded-full bg-primary-9 px-2 py-0.5 text-[11px] font-semibold text-white'>
                        {selectedStagedCount}
                      </span>
                      <span className='font-medium text-gray-12'>
                        {selectedStagedCount === 1
                          ? t`1 staged file selected`
                          : t`${selectedStagedCount} staged files selected`}
                      </span>
                      <button
                        className='text-[12px] font-medium text-gray-10 underline hover:text-gray-13'
                        type='button'
                        onClick={() => setSelectedIds([])}
                      >
                        {t`Deselect all`}
                      </button>
                    </div>
                    <div className='flex items-center gap-2'>
                      {canBulkExport && onExportStagedFiles ? (
                        <Tooltip content={t`Export selected staged files`} position='top'>
                          <BaseButton
                            color='primary'
                            disabled={isBulkExporting || isBulkDeleting}
                            loading={isBulkExporting}
                            size='xs'
                            onClick={() => setIsBulkExportConfirmOpen(true)}
                          >
                            <Icon className='size-3.5' name='tabler:file-export' />
                            {t`Export Selected (${selectedStagedCount})`}
                          </BaseButton>
                        </Tooltip>
                      ) : null}
                      {onDeleteStagedFiles ? (
                        <Tooltip content={t`Delete selected staged files`} position='top'>
                          <BaseButton
                            color='red'
                            disabled={isBulkDeleting || isBulkExporting}
                            loading={isBulkDeleting}
                            size='xs'
                            onClick={() => setIsBulkConfirmOpen(true)}
                          >
                            <DynamicIcon className='size-3.5' name='trash' />
                            {t`Delete Selected (${selectedStagedCount})`}
                          </BaseButton>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <DataTable
                  pageSize={Math.max(5, visibleFiles.length || pageSize)}
                  rowSize='compact'
                  table={table}
                  hideActionBar
                  hideGrouping
                  isSticky
                  stickyHeader
                  isLoading={
                    (loading || loadingPage) && visibleFiles.length === 0
                  }
                  isReLoading={
                    refreshing ||
                    loadingPage ||
                    (loading && visibleFiles.length > 0)
                  }
                  onReload={handleRefresh}
                />
              </>
            ) : null
          ) : null}
        </section>
      </div>

      {!activeRepositoryId || isStagedCategory ? null : (
        <div className='z-50 shrink-0 border-t border-gray-3 bg-surface px-6 py-3 shadow-[0_-6px_18px_rgba(15,23,42,0.08)]'>
          <Pagination
            itemLabel={t`Files`}
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
      )}

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
            label={t`View Details`}
            onClick={() => closeAndRun(() => onOpenFile(openMenuId))}
          />
          {onEdit && permissions?.editMetadata === true ? (
            <MenuItem
              icon='edit'
              label={t`Edit Metadata`}
              onClick={() => closeAndRun(() => onEdit(openMenuId))}
            />
          ) : null}
          <MenuItem
            icon='bot'
            label={t`AI Summary`}
            onClick={() => closeAndRun(() => onAiSummary(openMenuId))}
          />
          <MenuItem
            icon='share'
            label={t`Share`}
            onClick={() => closeAndRun(() => onShare(openMenuId))}
          />
          {onWorkflow ? (
            <MenuItem
              icon='play'
              label={t`Start Workflow`}
              onClick={() => closeAndRun(() => onWorkflow(openMenuId))}
            />
          ) : null}

          {permissions?.delete !== false ? (
            <>
              <div className='my-2 border-t border-gray-3' />
              <MenuItem
                icon='trash'
                label={t`Delete`}
                danger
                onClick={() => {
                  const targetId = openMenuId
                  closeAndRun(() => {
                    if (targetId) setConfirmDeleteFileId(targetId)
                  })
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Delete`}
        description={t`Are you sure you want to delete this document? This action cannot be undone.`}
        isConfirming={isDeletingFile}
        opened={Boolean(confirmDeleteFileId)}
        title={t`Delete Document`}
        variant='danger'
        onCancel={() => {
          if (!isDeletingFile) setConfirmDeleteFileId(null)
        }}
        onConfirm={async () => {
          if (!confirmDeleteFileId || isDeletingFile) return
          setIsDeletingFile(true)
          try {
            await onDeleteFile?.(confirmDeleteFileId)
            setConfirmDeleteFileId(null)
          } catch {
            // error handled by caller toast
          } finally {
            setIsDeletingFile(false)
          }
        }}
      />

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Delete`}
        description={
          selectedStagedCount === 1
            ? t`Are you sure you want to delete 1 selected staged file?`
            : t`Are you sure you want to delete ${selectedStagedCount} selected staged files?`
        }
        isConfirming={isBulkDeleting}
        opened={isBulkConfirmOpen}
        title={t`Delete staged files`}
        variant='danger'
        onCancel={() => {
          if (!isBulkDeleting) setIsBulkConfirmOpen(false)
        }}
        onConfirm={async () => {
          setIsBulkDeleting(true)
          try {
            if (onDeleteStagedFiles) {
              await onDeleteStagedFiles(selectedStagedFiles)
              setSelectedIds([])
              setIsBulkConfirmOpen(false)
            }
          } catch {
            // caller handles error toast
          } finally {
            setIsBulkDeleting(false)
          }
        }}
      />

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Export`}
        description={
          selectedStagedCount === 1
            ? t`Are you sure you want to export 1 selected staged file?`
            : t`Are you sure you want to export ${selectedStagedCount} selected staged files?`
        }
        isConfirming={isBulkExporting}
        opened={isBulkExportConfirmOpen}
        title={t`Export staged files`}
        variant='default'
        onCancel={() => {
          if (!isBulkExporting) setIsBulkExportConfirmOpen(false)
        }}
        onConfirm={async () => {
          setIsBulkExporting(true)
          try {
            if (onExportStagedFiles) {
              await onExportStagedFiles(selectedStagedFiles)
              setSelectedIds([])
              setIsBulkExportConfirmOpen(false)
            }
          } catch {
            // caller handles error toast
          } finally {
            setIsBulkExporting(false)
          }
        }}
      />
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
