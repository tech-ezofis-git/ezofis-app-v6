import { useEffect, useMemo, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import type {
  DynamicRepositoryColumn,
  RepositoryItemFilterField,
} from '../api/folderApi'
import type { ExplorerView, FileItem, FolderItem } from '../types/folderTypes'
import {
  getExplorerFilterMode,
  getExplorerSectionVisibility,
  type ExplorerFilterMode,
  type FolderFilterOptionsCache,
} from '../utils/folderExplorerUtils'
import { FolderFilterBar, isFolderTableFilterId } from './FolderFilterBar'

type ExplorerToolbarProps = {
  currentFolderGroupField?: string
  disabled?: boolean
  fileColumns?: DynamicRepositoryColumn[]
  fileFilters?: Record<string, string>
  files?: FileItem[]
  fileSearch?: string
  folderContextFilters?: Record<string, string>
  folderFilters?: Record<string, string>
  filterOptionsCache?: FolderFilterOptionsCache
  folderFilterOptionSource?: FolderItem[]
  folders?: FolderItem[]
  folderSearch?: string
  itemFilterFields?: RepositoryItemFilterField[]
  loading?: boolean
  loadingFolders?: boolean
  loadingPage?: boolean
  refreshing?: boolean
  repositoryId?: string
  view: ExplorerView
  onFolderSearchChange?: (value: string) => void
  onFileSearchChange?: (value: string) => void
  onFileFiltersChange?: (filters: Record<string, string>) => void
  onFolderFiltersChange?: (filters: Record<string, string>) => void
  onFilterMenuOpenChange?: (id: string | null) => void
  onRefresh?: () => void
  onUpload?: () => void
  setView: (view: ExplorerView) => void
}

const normalizeKey = (key: string) =>
  String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const isFolderStructureFilter = (
  filterId: string,
  fileColumns: DynamicRepositoryColumn[],
) =>
  isFolderTableFilterId(filterId) ||
  fileColumns.some(
    (column) =>
      Boolean(column.includeInFolderStructure) &&
      (normalizeKey(column.key) === normalizeKey(filterId) ||
        normalizeKey(column.label || '') === normalizeKey(filterId)),
  )

export function ExplorerToolbar({
  currentFolderGroupField = '',
  disabled = false,
  fileColumns = [],
  fileFilters = {},
  files = [],
  fileSearch = '',
  folderContextFilters = {},
  folderFilters = {},
  filterOptionsCache = {},
  folderFilterOptionSource = [],
  folders = [],
  folderSearch = '',
  itemFilterFields = [],
  loading = false,
  loadingFolders = false,
  loadingPage = false,
  onFolderSearchChange,
  onFileSearchChange,
  onFileFiltersChange,
  onFolderFiltersChange,
  onFilterMenuOpenChange,
  onRefresh,
  onUpload,
  refreshing = false,
  repositoryId = '',
  setView,
  view,
}: ExplorerToolbarProps) {
  const { t } = useLingui()
  const hasActiveFolderFilters = Object.values(folderFilters).some(Boolean)
  const hasActiveFileFilters = Object.values(fileFilters).some(Boolean)
  const useApiItemFilters = itemFilterFields.length > 0

  const filterMode: ExplorerFilterMode = useMemo(() => {
    if (view === 'list') return 'files'

    const visibility = getExplorerSectionVisibility({
      folderSearch,
      foldersLength: folders.length,
      filesLength: files.length,
      hasActiveFileFilters,
      hasActiveFolderFilters,
      loading,
      loadingFolders,
      loadingPage,
    })

    const mode = getExplorerFilterMode(visibility)

    // Empty filter results still keep the matching filter set visible
    if (mode === 'none') {
      if (hasActiveFolderFilters && hasActiveFileFilters) return 'both'
      if (hasActiveFolderFilters || Boolean(folderSearch.trim())) return 'folders'
      if (hasActiveFileFilters || Boolean(fileSearch.trim())) return 'files'
      return 'folders'
    }

    return mode
  }, [
    fileSearch,
    files.length,
    folderSearch,
    folders.length,
    hasActiveFileFilters,
    hasActiveFolderFilters,
    loading,
    loadingFolders,
    loadingPage,
    view,
  ])

  const activeFilters = useMemo(() => {
    if (useApiItemFilters) return { ...folderFilters, ...fileFilters }
    if (filterMode === 'folders') return folderFilters
    if (filterMode === 'files') return fileFilters
    if (filterMode === 'both') return { ...folderFilters, ...fileFilters }
    return { ...folderFilters, ...fileFilters }
  }, [fileFilters, filterMode, folderFilters, useApiItemFilters])

  const searchFromParent =
    filterMode === 'files' ? fileSearch : folderSearch

  const [searchQuery, setSearchQuery] = useState(searchFromParent)

  const normalizedFiles = useMemo(
    () => files as Array<Record<string, unknown>>,
    [files],
  )

  useEffect(() => {
    setSearchQuery(searchFromParent)
  }, [searchFromParent])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onFileSearchChange?.(searchQuery)
      onFolderSearchChange?.(searchQuery)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [filterMode, onFileSearchChange, onFolderSearchChange, searchQuery])

  const isBusy = refreshing || loading || loadingPage || disabled

  const isApiItemFilterId = (filterId: string) =>
    itemFilterFields.some((field) => {
      const id = String(field.sqlColumnName || field.name || '').trim()
      return id && normalizeKey(id) === normalizeKey(filterId)
    })

  const applyFolderFilter = (id: string, value: string) => {
    const next = { ...folderFilters }
    if (value) next[id] = value
    else delete next[id]
    onFolderFiltersChange?.(next)
  }

  const applyFileFilter = (id: string, value: string) => {
    const next = { ...fileFilters }
    if (value) next[id] = value
    else delete next[id]
    onFileFiltersChange?.(next)
  }

  const handleFilterChange = (id: string, value: string) => {
    // Repository item filter-fields always apply to files, and also to folder
    // browse so GET .../items and browse children stay in sync.
    if (useApiItemFilters && isApiItemFilterId(id)) {
      applyFileFilter(id, value)
      applyFolderFilter(id, value)
      return
    }

    if (filterMode === 'folders') {
      applyFolderFilter(id, value)
      return
    }

    if (filterMode === 'files') {
      applyFileFilter(id, value)
      return
    }

    if (filterMode === 'both') {
      if (isFolderStructureFilter(id, fileColumns)) {
        applyFolderFilter(id, value)
        applyFileFilter(id, value)
        return
      }
      applyFileFilter(id, value)
    }
  }

  const handleResetFilters = () => {
    if (useApiItemFilters) {
      onFolderFiltersChange?.({})
      onFileFiltersChange?.({})
      return
    }
    if (filterMode === 'folders') {
      onFolderFiltersChange?.({})
      return
    }
    if (filterMode === 'files') {
      onFileFiltersChange?.({})
      return
    }
    if (filterMode === 'both') {
      onFolderFiltersChange?.({})
      onFileFiltersChange?.({})
    }
  }

  return (
    <div className='relative z-40 border-b border-gray-3 bg-surface-primary px-5 py-2'>
      <FolderFilterBar
        activeFilters={activeFilters}
        currentFolderGroupField={currentFolderGroupField}
        fileColumns={fileColumns}
        files={normalizedFiles}
        filterMode={filterMode}
        folderContextFilters={folderContextFilters}
        filterOptionsCache={filterOptionsCache}
        folderFilterOptionSource={folderFilterOptionSource}
        folders={folders}
        isBusy={isBusy}
        itemFilterFields={itemFilterFields}
        refreshing={refreshing}
        repositoryId={repositoryId}
        searchPlaceholder={t`Search by name or metadata...`}
        searchQuery={searchQuery}
        view={view}
        onFilterChange={handleFilterChange}
        onFilterMenuOpenChange={onFilterMenuOpenChange}
        onRefresh={onRefresh}
        onResetFilters={handleResetFilters}
        onSearchChange={setSearchQuery}
        onUpload={onUpload}
        setView={setView}
      />
    </div>
  )
}
