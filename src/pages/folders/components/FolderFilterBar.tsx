import { LayoutGrid, List, RefreshCcw } from 'lucide-react'
import { useMemo } from 'react'
import CustomFilter, {
  type FilterDefinition,
  type FilterGroup,
} from '@/components/common/CustomFilter'
import Tooltip from '@/components/base/Tooltip'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import { decodeRepositoryNodeId } from '../api/folderApi'
import type { ExplorerView, FolderItem } from '../types/folderTypes'
import type { ExplorerFilterMode, FolderFilterOptionsCache } from '../utils/folderExplorerUtils'
import {
  getCachedFilterOptionsForId,
  mergeFilterOptionLists,
} from '../utils/folderExplorerUtils'
import {
  getRepositoryFieldStringValue,
  matchesFieldKey,
  normalizeFieldKey,
} from '../utils/repositoryFieldUtils'
import { IconButton } from './Ui'

type AnyFileItem = Record<string, any>

const HIDDEN_FILTER_KEYS = new Set([
  'storageproviderid',
  'storageprovidercode',
  'hasfilepath',
  'filename',
  'name',
  '__name',
  'id',
  'fileversion',
  'ocrpercent',
  'workflowinstanceid',
])

/** Folder table filters — match Name, Items, Date Modified columns. */
const DEFAULT_FOLDER_FILTER_SPECS = [
  { id: '__folderName', label: 'Name' },
  { id: '__folderItems', label: 'Items' },
  { id: '__folderModified', label: 'Date Modified' },
] as const

/** Default file filters — same property keys as repository items. */
const DEFAULT_FILE_FILTER_SPECS = [
  { id: 'status', label: 'Status', aliases: ['status', 'Status', '__status'] },
  {
    id: 'supplier',
    label: 'Supplier',
    aliases: ['supplier', 'Supplier'],
  },
  {
    id: 'documentType',
    label: 'Document Type',
    aliases: ['documentType', 'DocumentType'],
  },
] as const

const normalizeKey = normalizeFieldKey

const isDateColumn = (dataType?: string) => {
  const normalized = String(dataType || '')
    .trim()
    .toLowerCase()
  return (
    normalized === 'date' ||
    normalized === 'datetime' ||
    normalized.includes('date')
  )
}

/** Prefer sqlColumnName / item property key that matches the sample payload. */
const resolveFilterId = (
  preferredId: string,
  aliases: readonly string[],
  fileColumns: DynamicRepositoryColumn[],
  files: AnyFileItem[],
) => {
  const candidates = [preferredId, ...aliases]

  const columnMatch = fileColumns.find((column) =>
    candidates.some(
      (candidate) =>
        normalizeKey(column.key) === normalizeKey(candidate) ||
        normalizeKey(column.label || '') === normalizeKey(candidate),
    ),
  )
  if (columnMatch?.key) return columnMatch.key

  const sampleFile = files[0]
  if (sampleFile) {
    const itemKey = Object.keys(sampleFile).find((key) =>
      candidates.some(
        (candidate) => normalizeKey(key) === normalizeKey(candidate),
      ),
    )
    if (itemKey) return itemKey
  }

  return preferredId
}

const getFilterValue = (
  item: AnyFileItem,
  filterId: string,
  folderContextFilters: Record<string, string> = {},
) =>
  getRepositoryFieldStringValue(item, filterId, folderContextFilters)

const mergeUniqueOptions = (
  ...optionLists: Array<Array<{ label: string; value: string }>>
) => mergeFilterOptionLists(...optionLists)

const withActiveFilterOption = (
  filterId: string,
  options: Array<{ label: string; value: string }>,
  activeFilters: Record<string, string> = {},
) => {
  const activeValue = String(activeFilters[filterId] || '').trim()
  if (!activeValue) return options

  return mergeUniqueOptions(options, [{ label: activeValue, value: activeValue }])
}

const buildFilterOptionsFromContext = (
  filterId: string,
  folderContextFilters: Record<string, string> = {},
) => {
  const value = getRepositoryFieldStringValue(
    {},
    filterId,
    folderContextFilters,
  )
  if (!value) return []
  return [{ label: value, value }]
}

const buildFilterOptionsFromFiles = (
  files: AnyFileItem[],
  filterId: string,
) =>
  files
    .map((file) => getRepositoryFieldStringValue(file, filterId))
    .filter((value) => value.length > 0)
    .map((value) => ({ label: value, value }))

const shouldIncludeFolderOptions = (
  filterId: string,
  currentFolderGroupField?: string,
) => {
  if (!currentFolderGroupField) return false
  return matchesFieldKey(filterId, currentFolderGroupField)
}

/** Folder browse rows only contribute values for their active group field. */
const buildFilterOptionsFromFolders = (
  folders: FolderItem[],
  filterId: string,
) =>
  folders
    .map((folder) => {
      const decoded = decodeRepositoryNodeId(folder.id)
      if (!decoded || decoded.kind !== 'browse') return null
      if (!matchesFieldKey(decoded.groupField, filterId)) return null

      const value = String(
        decoded.groupValue || folder.title || decoded.label || '',
      ).trim()
      if (!value) return null

      return { label: value, value }
    })
    .filter((option): option is { label: string; value: string } =>
      Boolean(option),
    )

const buildFolderTableFilterOptions = (
  folders: FolderItem[],
  filterId: string,
) => {
  if (filterId === '__folderName') {
    return folders
      .map((folder) => String(folder.title || '').trim())
      .filter(Boolean)
      .map((value) => ({ label: value, value }))
  }

  if (filterId === '__folderItems') {
    return folders
      .map((folder) => String(folder.itemsText || '').trim())
      .filter((value) => value && value !== '-')
      .map((value) => ({ label: value, value }))
  }

  if (filterId === '__folderModified') {
    return folders
      .map((folder) => String(folder.modifiedText || '').trim())
      .filter((value) => value && value !== '-')
      .map((value) => ({ label: value, value }))
  }

  return []
}

const getFolderTableFilterValue = (folder: FolderItem, filterId: string) => {
  if (filterId === '__folderName') return String(folder.title || '').trim()
  if (filterId === '__folderItems') return String(folder.itemsText || '').trim()
  if (filterId === '__folderModified') {
    return String(folder.modifiedText || '').trim()
  }
  return ''
}

export const isFolderTableFilterId = (filterId: string) =>
  DEFAULT_FOLDER_FILTER_SPECS.some((spec) => spec.id === filterId)

export const matchesFolderTableFilters = (
  folder: FolderItem,
  filters: Record<string, string>,
) =>
  Object.entries(filters).every(([key, value]) => {
    if (!value || !isFolderTableFilterId(key)) return true

    return getFolderTableFilterValue(folder, key)
      .toLowerCase()
      .includes(value.trim().toLowerCase())
  })

export const filterFolders = (
  folders: FolderItem[],
  filters: Record<string, string>,
) =>
  folders.filter((folder) => matchesFolderTableFilters(folder, filters))

export const matchesFolderFileFilters = (
  file: AnyFileItem,
  filters: Record<string, string>,
  folderContextFilters: Record<string, string> = {},
) =>
  Object.entries(filters).every(([key, value]) => {
    if (!value) return true

    return getFilterValue(file, key, folderContextFilters)
      .toLowerCase()
      .includes(value.trim().toLowerCase())
  })

export const filterFolderFiles = (
  files: AnyFileItem[],
  filters: Record<string, string>,
  folderContextFilters: Record<string, string> = {},
) =>
  files.filter((file) =>
    matchesFolderFileFilters(file, filters, folderContextFilters),
  )

type FolderFilterBarProps = {
  activeFilters: Record<string, string>
  currentFolderGroupField?: string
  fileColumns?: DynamicRepositoryColumn[]
  files: AnyFileItem[]
  filterMode?: ExplorerFilterMode
  folderContextFilters?: Record<string, string>
  filterOptionsCache?: FolderFilterOptionsCache
  folderFilterOptionSource?: FolderItem[]
  folders?: FolderItem[]
  isBusy?: boolean
  refreshing?: boolean
  searchPlaceholder?: string
  searchQuery: string
  view: ExplorerView
  onFilterChange: (id: string, value: string) => void
  onRefresh?: () => void
  onResetFilters: () => void
  onSearchChange: (value: string) => void
  onUpload?: () => void
  setView: (view: ExplorerView) => void
}

export function FolderFilterBar({
  activeFilters,
  currentFolderGroupField = '',
  fileColumns = [],
  files,
  filterMode = 'files',
  folderContextFilters = {},
  filterOptionsCache = {},
  folderFilterOptionSource = [],
  folders = [],
  isBusy = false,
  onFilterChange,
  onRefresh,
  onResetFilters,
  onSearchChange,
  onUpload,
  refreshing = false,
  searchPlaceholder = 'Search files...',
  searchQuery,
  setView,
  view,
}: FolderFilterBarProps) {
  const showFileFilters = filterMode === 'files' || filterMode === 'both'
  const showFolderFilters = filterMode === 'folders' || filterMode === 'both'
  const folderOptionSource =
    folderFilterOptionSource.length > 0 ? folderFilterOptionSource : folders

  const getCachedOptionsForFilter = (filterId: string) =>
    getCachedFilterOptionsForId(filterOptionsCache, filterId)

  const resolvedFileDefaultFilters = useMemo(
    () =>
      DEFAULT_FILE_FILTER_SPECS.map((spec) => ({
        ...spec,
        id: resolveFilterId(spec.id, spec.aliases, fileColumns, files),
      })),
    [fileColumns, files],
  )

  const buildOptionsForFileFilter = (filterId: string) => {
    const cachedOptions = getCachedOptionsForFilter(filterId)
    const isFolderStructureFilter =
      shouldIncludeFolderOptions(filterId, currentFolderGroupField) ||
      cachedOptions.length > 0

    return withActiveFilterOption(
      filterId,
      mergeUniqueOptions(
        cachedOptions,
        buildFilterOptionsFromContext(filterId, folderContextFilters),
        isFolderStructureFilter
          ? buildFilterOptionsFromFolders(folderOptionSource, filterId)
          : [],
        buildFilterOptionsFromFiles(files, filterId),
      ),
      activeFilters,
    )
  }

  const buildOptionsForFolderFilter = (filterId: string) =>
    withActiveFilterOption(
      filterId,
      mergeUniqueOptions(
        getCachedOptionsForFilter(filterId),
        buildFolderTableFilterOptions(folderOptionSource, filterId),
        buildFilterOptionsFromFolders(folderOptionSource, filterId),
      ),
      activeFilters,
    )

  const buildFolderFilterDefinitions = (): FilterDefinition[] =>
    DEFAULT_FOLDER_FILTER_SPECS.map((spec) => ({
      id: spec.id,
      label: spec.label,
      options: buildOptionsForFolderFilter(spec.id),
      searchable: true,
      searchPlaceholder: `Search ${spec.label.toLowerCase()}...`,
      width: 240,
    }))

  const buildFileFilterDefinitions = (): FilterDefinition[] =>
    resolvedFileDefaultFilters.map((spec) => {
      const matchedColumn = fileColumns.find(
        (column) =>
          normalizeKey(column.key) === normalizeKey(spec.id) ||
          normalizeKey(column.label || '') === normalizeKey(spec.label),
      )

      const label = matchedColumn?.label || spec.label

      return {
        id: spec.id,
        label,
        options: buildOptionsForFileFilter(spec.id),
        searchable: true,
        searchPlaceholder: `Search ${label.toLowerCase()}...`,
        width: 240,
      }
    })

  const defaultFilters = useMemo<FilterDefinition[]>(() => {
    const folderDefaultFilters = showFolderFilters
      ? buildFolderFilterDefinitions()
      : []
    const fileDefaultFilters = showFileFilters ? buildFileFilterDefinitions() : []

    if (filterMode === 'folders') return folderDefaultFilters
    if (filterMode === 'files') return fileDefaultFilters

    if (filterMode === 'both') {
      const folderIds = new Set(folderDefaultFilters.map((filter) => filter.id))
      const fileOnlyFilters = fileDefaultFilters.filter(
        (filter) => !folderIds.has(filter.id),
      )
      return [...folderDefaultFilters, ...fileOnlyFilters]
    }

    return []
  }, [
    activeFilters,
    currentFolderGroupField,
    fileColumns,
    filterOptionsCache,
    files,
    filterMode,
    folderContextFilters,
    folderOptionSource,
    folders,
    resolvedFileDefaultFilters,
    showFileFilters,
    showFolderFilters,
  ])

  const moreFilters = useMemo<FilterGroup[]>(() => {
    const defaultIds = new Set(
      defaultFilters.map((filter) => normalizeKey(filter.id)),
    )

    const extraColumns = fileColumns.filter((column) => {
      const key = normalizeKey(column.key)
      if (HIDDEN_FILTER_KEYS.has(key) || defaultIds.has(key)) return false

      if (filterMode === 'folders') return false

      if (filterMode === 'files' || filterMode === 'both') {
        return true
      }

      return false
    })

    if (!showFolderFilters && !showFileFilters) return []

    return extraColumns.map((column) => {
      const filterId = resolveFilterId(
        column.key,
        [column.key, column.label || ''],
        fileColumns,
        files,
      )

      return {
        id: filterId,
        label: column.label || column.key,
        dataType: column.dataType,
        options: isDateColumn(column.dataType)
          ? undefined
          : buildOptionsForFileFilter(filterId),
      }
    })
  }, [
    activeFilters,
    currentFolderGroupField,
    defaultFilters,
    fileColumns,
    filterOptionsCache,
    files,
    filterMode,
    folderContextFilters,
    folderOptionSource,
    folders,
    showFileFilters,
    showFolderFilters,
  ])

  const hasActiveFilters = Object.values(activeFilters).some(Boolean)

  return (
    <CustomFilter
      activeFilters={activeFilters}
      filters={defaultFilters}
      moreFilters={moreFilters}
      searchPlaceholder={searchPlaceholder}
      searchQuery={searchQuery}
      showReset={hasActiveFilters}
      actionButtons={[
        {
          id: 'upload',
          icon: 'lucide:upload',
          tooltip: 'Upload',
          onClick: () => onUpload?.(),
          disabled: isBusy,
          isIconButton: true,
          color: 'gray',
          variant: 'outline'
        },
        {
          id: 'refresh',
          icon: refreshing ? 'tabler:loader-2' : 'lucide:refresh-ccw',
          tooltip: refreshing ? 'Refreshing...' : 'Refresh',
          onClick: () => onRefresh?.(),
          disabled: isBusy,
          isIconButton: true,
          color: 'gray',
          variant: 'outline'
        }
      ]}
      viewMode={view === 'list' ? 'table' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'table' ? 'list' : 'grid')}
      onFilterChange={onFilterChange}
      onReset={onResetFilters}
      onSearchChange={onSearchChange}
    />
  )
}
