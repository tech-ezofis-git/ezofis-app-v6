import { Button, IconButton } from './Ui'
import type { ExplorerView } from '../types/folderTypes'
import { DynamicIcon } from './icons'
import { Breadcrumbs } from './Breadcrumbs'
import type { BreadcrumbItem } from './Breadcrumbs'

type ExplorerToolbarProps = {
  view: ExplorerView
  setView: (view: ExplorerView) => void
  items: BreadcrumbItem[]
  onSelect: (id: string) => void
  onBack?: () => void
  onForward?: () => void
  onRefresh?: () => void
  onUpload?: () => void
  onNewFolder?: () => void
  onDownload?: () => void
  folderSearch?: string
  onFolderSearchChange?: (value: string) => void
  refreshing?: boolean
  loadingPage?: boolean
  disabled?: boolean
}

export function ExplorerToolbar({
  view,
  setView,
  items,
  onSelect,
  onRefresh,
  onUpload,
  folderSearch = '',
  onFolderSearchChange,
  refreshing = false,
  loadingPage = false,
  disabled = false,
}: ExplorerToolbarProps) {
  const isBusy = refreshing || loadingPage || disabled

  const handleRefresh = () => {
    if (isBusy) return
    onRefresh?.()
  }

  const handleUpload = () => {
    if (isBusy) return
    onUpload?.()
  }

  const handleViewChange = (nextView: ExplorerView) => {
    if (isBusy || nextView === view) return
    setView(nextView)
  }

  return (
    <div className="flex h-[56px] shrink-0 items-center justify-between gap-4 border-b border-gray-3 bg-surface-primary px-5">
      <div className="flex min-w-0 flex-1 items-center">
        <Breadcrumbs items={items} onSelect={onSelect} />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="relative w-[360px]">
          <DynamicIcon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-8"
          />

          <input
            type="search"
            value={folderSearch}
            disabled={isBusy}
            onChange={(event) => onFolderSearchChange?.(event.target.value)}
            placeholder={view === 'list' ? 'Search files...' : 'Search folders...'}
            className="h-9 w-full rounded-xl border border-[#d8dcea] bg-white pl-9 pr-9 text-sm font-medium text-gray-13 outline-none transition-all placeholder:text-gray-8 focus:border-[#9aa8d9] focus:ring-2 focus:ring-[#dbe2ff] disabled:cursor-not-allowed disabled:bg-gray-2 disabled:opacity-60"
          />

          {folderSearch ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onFolderSearchChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-8 hover:text-gray-13 disabled:cursor-not-allowed disabled:opacity-50"
              title="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={handleUpload}
          disabled={isBusy}
          className="border-transparent shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <DynamicIcon name="upload" />
          Upload
        </Button>

        <button
          type="button"
          disabled={isBusy}
          onClick={handleRefresh}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-3 bg-surface px-3 text-sm font-semibold text-gray-13 shadow-sm transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50"
          title={refreshing ? 'Refreshing...' : 'Refresh'}
        >
          <DynamicIcon
            name="refresh"
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden xl:inline">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>

        <div className="flex rounded-lg bg-gray-2 p-1">
          <IconButton
            icon="list"
            active={view === 'list'}
            disabled={isBusy}
            onClick={() => handleViewChange('list')}
          />

          <IconButton
            icon="grid"
            active={view === 'grid'}
            disabled={isBusy}
            onClick={() => handleViewChange('grid')}
          />
        </div>
      </div>
    </div>
  )
}
