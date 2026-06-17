import type { ExplorerView } from '../types/folderTypes'
import type { BreadcrumbItem } from './Breadcrumbs'
import { Breadcrumbs } from './Breadcrumbs'
import { DynamicIcon } from './icons'
import { Button, IconButton } from './Ui'

type ExplorerToolbarProps = {
  disabled?: boolean
  folderSearch?: string
  items: BreadcrumbItem[]
  loadingPage?: boolean
  refreshing?: boolean
  view: ExplorerView
  onBack?: () => void
  onDownload?: () => void
  onFolderSearchChange?: (value: string) => void
  onForward?: () => void
  onNewFolder?: () => void
  onRefresh?: () => void
  onSelect: (id: string) => void
  onUpload?: () => void
  setView: (view: ExplorerView) => void
}

export function ExplorerToolbar({
  disabled = false,
  folderSearch = '',
  items,
  loadingPage = false,
  refreshing = false,
  view,
  setView,
  onFolderSearchChange,
  onRefresh,
  onSelect,
  onUpload,
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
    <div className='flex h-[56px] shrink-0 items-center justify-between gap-4 border-b border-gray-3 bg-surface-primary px-5'>
      <div className='flex min-w-0 flex-1 items-center'>
        <Breadcrumbs items={items} onSelect={onSelect} />
      </div>

      <div className='flex shrink-0 items-center gap-3'>
        <div className='relative w-[360px]'>
          <DynamicIcon
            className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-8'
            name='search'
          />

          <input
            className='h-9 w-full rounded-xl border border-[#d8dcea] bg-white pr-9 pl-9 text-sm font-medium text-gray-13 transition-all outline-none placeholder:text-gray-8 focus:border-[#9aa8d9] focus:ring-2 focus:ring-[#dbe2ff] disabled:cursor-not-allowed disabled:bg-gray-2 disabled:opacity-60'
            disabled={isBusy}
            type='search'
            value={folderSearch}
            placeholder={
              view === 'list' ? 'Search files...' : 'Search folders...'
            }
            onChange={(event) => onFolderSearchChange?.(event.target.value)}
          />

          {folderSearch ? (
            <button
              className='absolute top-1/2 right-3 -translate-y-1/2 text-sm font-semibold text-gray-8 hover:text-gray-13 disabled:cursor-not-allowed disabled:opacity-50'
              disabled={isBusy}
              title='Clear search'
              type='button'
              onClick={() => onFolderSearchChange?.('')}
            >
              ×
            </button>
          ) : null}
        </div>

        <Button
          className='border-transparent shadow-none disabled:cursor-not-allowed disabled:opacity-50'
          disabled={isBusy}
          type='button'
          onClick={handleUpload}
        >
          <DynamicIcon name='upload' />
          Upload
        </Button>

        <button
          className='inline-flex h-9 items-center gap-2 rounded-xl border border-gray-3 bg-surface px-3 text-sm font-semibold text-gray-13 shadow-sm transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50'
          disabled={isBusy}
          title={refreshing ? 'Refreshing...' : 'Refresh'}
          type='button'
          onClick={handleRefresh}
        >
          <DynamicIcon
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            name='refresh'
          />
          <span className='hidden xl:inline'>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>

        <div className='flex rounded-lg bg-gray-2 p-1'>
          <IconButton
            active={view === 'list'}
            disabled={isBusy}
            icon='list'
            onClick={() => handleViewChange('list')}
          />

          <IconButton
            active={view === 'grid'}
            disabled={isBusy}
            icon='grid'
            onClick={() => handleViewChange('grid')}
          />
        </div>
      </div>
    </div>
  )
}
