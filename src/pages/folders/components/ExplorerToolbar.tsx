import { useEffect, useMemo, useState } from 'react'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import type { ExplorerView, FileItem } from '../types/folderTypes'
import { FolderFilterBar } from './FolderFilterBar'

type ExplorerToolbarProps = {
  disabled?: boolean
  fileColumns?: DynamicRepositoryColumn[]
  files?: FileItem[]
  loadingPage?: boolean
  refreshing?: boolean
  view: ExplorerView
  onFolderSearchChange?: (value: string) => void
  onFiltersChange?: (filters: Record<string, string>) => void
  onRefresh?: () => void
  onUpload?: () => void
  setView: (view: ExplorerView) => void
}

export function ExplorerToolbar({
  disabled = false,
  fileColumns = [],
  files = [],
  loadingPage = false,
  onFolderSearchChange,
  onFiltersChange,
  onRefresh,
  onUpload,
  refreshing = false,
  setView,
  view,
}: ExplorerToolbarProps) {
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')

  const normalizedFiles = useMemo(
    () => files as Array<Record<string, unknown>>,
    [files],
  )

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onFolderSearchChange?.(searchQuery)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [onFolderSearchChange, searchQuery])

  useEffect(() => {
    onFiltersChange?.(filters)
  }, [filters, onFiltersChange])

  const isBusy = refreshing || loadingPage || disabled

  return (
    <div className='relative z-40 border-b border-gray-3 bg-surface-primary px-5 py-2'>
      <FolderFilterBar
        activeFilters={filters}
        fileColumns={fileColumns}
        files={normalizedFiles}
        isBusy={isBusy}
        refreshing={refreshing}
        searchPlaceholder={
          view === 'list' ? 'Search files...' : 'Search folders...'
        }
        searchQuery={searchQuery}
        view={view}
        onFilterChange={(id, value) =>
          setFilters((prev) => ({ ...prev, [id]: value }))
        }
        onRefresh={onRefresh}
        onResetFilters={() => setFilters({})}
        onSearchChange={handleSearchChange}
        onUpload={onUpload}
        setView={setView}
      />
    </div>
  )
}
