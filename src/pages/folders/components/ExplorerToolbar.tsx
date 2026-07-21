import { useEffect, useMemo, useState } from 'react'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import type { ExplorerView, FileItem, FolderItem } from '../types/folderTypes'
import {
  type ExplorerFilterMode,
  type FolderFilterOptionsCache,
  getExplorerFilterMode,
  getExplorerSectionVisibility,
} from '../utils/folderExplorerUtils'
import { FolderFilterBar, isFolderTableFilterId } from './FolderFilterBar'

type ExplorerToolbarProps = {
  currentFolderGroupField?: string
  disabled?: boolean
  fileColumns?: DynamicRepositoryColumn[]
  fileFilters?: Record<string, string>
  files?: FileItem[]
  fileSearch?: string
  filterOptionsCache?: FolderFilterOptionsCache
  folderContextFilters?: Record<string, string>
  folderFilterOptionSource?: FolderItem[]
  folderFilters?: Record<string, string>
  folders?: FolderItem[]
  folderSearch?: string
  loading?: boolean
  loadingFolders?: boolean
  loadingPage?: boolean
  refreshing?: boolean
  view: ExplorerView
  onFileFiltersChange?: (filters: Record<string, string>) => void
  onFileSearchChange?: (value: string) => void
  onFolderFiltersChange?: (filters: Record<string, string>) => void
  onFolderSearchChange?: (value: string) => void
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
  filterOptionsCache = {},
  folderContextFilters = {},
  folderFilterOptionSource = [],
  folderFilters = {},
  folders = [],
  folderSearch = '',
  loading = false,
  loadingFolders = false,
  loadingPage = false,
  refreshing = false,
  view,
  setView,
  onFileFiltersChange,
  onFileSearchChange,
  onFolderFiltersChange,
  onFolderSearchChange,
  onRefresh,
  onUpload,
}: ExplorerToolbarProps) {
  const hasActiveFolderFilters = Object.values(folderFilters).some(Boolean)
  const hasActiveFileFilters = Object.values(fileFilters).some(Boolean)

  const filterMode: ExplorerFilterMode = useMemo(() => {
    if (view === 'list') return 'files'

    const visibility = getExplorerSectionVisibility({
      filesLength: files.length,
      folderSearch,
      foldersLength: folders.length,
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
      if (hasActiveFolderFilters || Boolean(folderSearch.trim()))
        return 'folders'
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
    if (filterMode === 'folders') return folderFilters
    if (filterMode === 'files') return fileFilters
    if (filterMode === 'both') return { ...folderFilters, ...fileFilters }
    return { ...folderFilters, ...fileFilters }
  }, [fileFilters, filterMode, folderFilters])

  const searchFromParent = filterMode === 'files' ? fileSearch : folderSearch

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
      if (filterMode === 'files') {
        onFileSearchChange?.(searchQuery)
        return
      }
      // folders | both → folder browse search
      onFolderSearchChange?.(searchQuery)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [filterMode, onFileSearchChange, onFolderSearchChange, searchQuery])

  const isBusy = refreshing || loadingPage || disabled

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
        filterOptionsCache={filterOptionsCache}
        folderContextFilters={folderContextFilters}
        folderFilterOptionSource={folderFilterOptionSource}
        folders={folders}
        isBusy={isBusy}
        refreshing={refreshing}
        searchQuery={searchQuery}
        view={view}
        searchPlaceholder={
          filterMode === 'files'
            ? 'Search files...'
            : filterMode === 'both'
              ? 'Search folders and files...'
              : 'Search folders...'
        }
        setView={setView}
        onFilterChange={handleFilterChange}
        onRefresh={onRefresh}
        onResetFilters={handleResetFilters}
        onSearchChange={setSearchQuery}
        onUpload={onUpload}
      />
    </div>
  )
}
