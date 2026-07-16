import { LayoutGrid, List, RefreshCcw } from 'lucide-react'
import { useMemo } from 'react'
import CustomFilter, {
  type FilterDefinition,
  type FilterGroup,
} from '@/components/common/CustomFilter'
import Tooltip from '@/components/base/Tooltip'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import type { ExplorerView } from '../types/folderTypes'
import { IconButton } from './Ui'

type AnyFileItem = Record<string, any>

const HIDDEN_FILTER_KEYS = new Set([
  'storageproviderid',
  'storageprovidercode',
  'hasfilepath',
  'status',
  'filename',
  'name',
  '__name',
])

const DEFAULT_FILTER_SPECS = [
  { id: '__status', label: 'Status' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'documentType', label: 'Document Type' },
] as const

const normalizeKey = (key: string) =>
  String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const getFilterValue = (file: AnyFileItem, filterId: string) => {
  if (filterId === '__status') {
    return String(file.status ?? file.Status ?? '').trim()
  }

  const matchedKey = Object.keys(file).find(
    (key) => normalizeKey(key) === normalizeKey(filterId),
  )

  if (matchedKey) {
    const value = file[matchedKey]
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim()
    }
  }

  return String(file[filterId] ?? '').trim()
}

const buildFilterOptions = (files: AnyFileItem[], filterId: string) =>
  Array.from(
    new Set(
      files
        .map((file) => getFilterValue(file, filterId))
        .filter((value) => value.length > 0),
    ),
  )
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ label: value, value }))

export const matchesFolderFileFilters = (
  file: AnyFileItem,
  filters: Record<string, string>,
) =>
  Object.entries(filters).every(([key, value]) => {
    if (!value) return true

    if (key === '__status') {
      return String(file.status ?? file.Status ?? '').trim() === value
    }

    return getFilterValue(file, key) === value
  })

export const filterFolderFiles = (
  files: AnyFileItem[],
  filters: Record<string, string>,
) => files.filter((file) => matchesFolderFileFilters(file, filters))

type FolderFilterBarProps = {
  activeFilters: Record<string, string>
  fileColumns?: DynamicRepositoryColumn[]
  files: AnyFileItem[]
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
  fileColumns = [],
  files,
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
  const defaultFilters = useMemo<FilterDefinition[]>(
    () =>
      DEFAULT_FILTER_SPECS.map((spec) => ({
        id: spec.id,
        label: spec.label,
        options: buildFilterOptions(files, spec.id),
        searchable: true,
        searchPlaceholder: `Search ${spec.label.toLowerCase()}...`,
        width: 240,
      })),
    [files],
  )

  const moreFilters = useMemo<FilterGroup[]>(() => {
    const defaultIds = new Set(
      DEFAULT_FILTER_SPECS.map((spec) => normalizeKey(spec.id)),
    )

    const extraColumns = fileColumns.filter((column) => {
      const key = normalizeKey(column.key)
      return !HIDDEN_FILTER_KEYS.has(key) && !defaultIds.has(key)
    })

    return extraColumns.map((column) => ({
      id: column.key,
      label: column.label || column.key,
      options: buildFilterOptions(files, column.key).map((option) => ({
        label: option.label,
        value: option.value,
      })),
    }))
  }, [fileColumns, files])

  const hasActiveFilters = Object.values(activeFilters).some(Boolean)

  return (
    <CustomFilter
      activeFilters={activeFilters}
      filters={defaultFilters}
      moreFilters={moreFilters}
      searchPlaceholder={searchPlaceholder}
      searchQuery={searchQuery}
      showReset={hasActiveFilters}
      trailingActions={
        <>
          <Tooltip content='Upload' position='top'>
            <IconButton
              aria-label='Upload'
              disabled={isBusy}
              icon='upload'
              type='button'
              onClick={() => onUpload?.()}
            />
          </Tooltip>

          <Tooltip
            content={refreshing ? 'Refreshing...' : 'Refresh'}
            position='top'
          >
            <button
              aria-label='Refresh'
              className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-11 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
              disabled={isBusy}
              type='button'
              onClick={() => onRefresh?.()}
            >
              <RefreshCcw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </Tooltip>

          <div className='flex rounded-lg bg-gray-2 p-1'>
            <Tooltip content='List view' position='top'>
              <button
                aria-label='List view'
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${view === 'list' ? 'bg-surface text-gray-13 shadow-sm' : 'text-gray-11'}`}
                disabled={isBusy}
                type='button'
                onClick={() => setView('list')}
              >
                <List className='h-4 w-4' />
              </button>
            </Tooltip>

            <Tooltip content='Grid view' position='top'>
              <button
                aria-label='Grid view'
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${view === 'grid' ? 'bg-surface text-gray-13 shadow-sm' : 'text-gray-11'}`}
                disabled={isBusy}
                type='button'
                onClick={() => setView('grid')}
              >
                <LayoutGrid className='h-4 w-4' />
              </button>
            </Tooltip>
          </div>
        </>
      }
      onFilterChange={onFilterChange}
      onReset={onResetFilters}
      onSearchChange={onSearchChange}
    />
  )
}
