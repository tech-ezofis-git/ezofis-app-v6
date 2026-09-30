import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useFolderExplorer } from '@/pages/folders/hooks/useFolderExplorer'
import cn from '@/utils/cn'
import { AppBar, IconButton } from '../../components/layout/AppBar'
import { ScreenScroll, ScreenShell } from '../../components/layout/ScreenShell'
import { TabBar, type TabBarItemId } from '../../components/layout/TabBar'
import { Icon } from '../../components/primitives/Icon'
import { FileCard, FolderRow } from './FolderCards'

type FoldersScreenProps = {
  onTabBarChange?: (id: TabBarItemId) => void
}

export function FoldersScreen({ onTabBarChange }: FoldersScreenProps) {
  const navigate = useNavigate()
  const [filesOpen, setFilesOpen] = useState(true)
  const [search, setSearch] = useState('')

  const {
    breadcrumbs,
    canGoBackInExplorer,
    changeServerPage,
    changeViewMode,
    currentTitle,
    error,
    filePage,
    files,
    folderContextFilters,
    folders,
    goBackInExplorer,
    loading,
    openFile,
    openFolder,
    refreshData,
    refreshing,
    viewMode,
    setFileSearch,
    setFolderSearch,
  } = useFolderExplorer()

  const parentCrumbs = breadcrumbs.slice(0, -1)
  const isListView = viewMode === 'list'

  const fileRange = useMemo(() => {
    const total = Number(filePage?.totalCount ?? files.length)
    const page = Number(filePage?.page ?? 1)
    const pageSize = filePage?.pageSize ?? (files.length > 0 ? files.length : 1)
    const size = Number(pageSize)
    if (!files.length) return { end: 0, start: 0, total }
    const start = (page - 1) * size + 1
    const end = Math.min(page * size, total || files.length)
    return { end, start, total: total || files.length }
  }, [filePage, files.length])

  const handleSearch = (value: string) => {
    setSearch(value)
    setFolderSearch(value)
    setFileSearch(value)
  }

  const handleTabChange = (id: TabBarItemId) => {
    onTabBarChange?.(id)
    if (id === 'inbox') void navigate({ to: '/requests' })
    if (id === 'folder') return
  }

  return (
    <ScreenShell
      className='bg-surface-secondary'
      footer={<TabBar activeId='folder' onChange={handleTabChange} />}
      header={
        <div className='border-b border-border-default bg-surface-primary'>
          <AppBar
            className='border-b-0 [&_h1]:text-13'
            title={currentTitle || 'Folders'}
            subtitle={
              parentCrumbs.length > 0 ? (
                <div className='no-scrollbar flex items-center gap-1 overflow-x-auto text-[11px] whitespace-nowrap text-text-muted'>
                  <button
                    className='shrink-0 hover:text-text-secondary'
                    type='button'
                    onClick={() => {
                      const first = breadcrumbs[0]
                      if (first) void openFolder(first.id)
                    }}
                  >
                    Folders
                  </button>
                  {parentCrumbs.map((crumb) => (
                    <span
                      className='inline-flex shrink-0 items-center gap-1'
                      key={crumb.id}
                    >
                      <Icon className='size-2.5' name='ChevronRight' />
                      <button
                        className='max-w-[90px] truncate hover:text-text-secondary'
                        type='button'
                        onClick={() => void openFolder(crumb.id)}
                      >
                        {crumb.label}
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                'Folders'
              )
            }
            trailing={
              <>
                <IconButton
                  aria-label='Refresh'
                  onClick={() => void refreshData()}
                >
                  <Icon
                    className={cn('size-3.5', refreshing && 'animate-spin')}
                    name='RefreshCw'
                  />
                </IconButton>
                <IconButton
                  aria-label={isListView ? 'Folder view' : 'List view'}
                  onClick={() => changeViewMode(isListView ? 'grid' : 'list')}
                >
                  <Icon
                    className='size-3.5'
                    name={isListView ? 'LayoutGrid' : 'List'}
                  />
                </IconButton>
              </>
            }
            onBack={canGoBackInExplorer ? () => goBackInExplorer() : undefined}
          />

          <div className='px-3 pb-2.5'>
            <label className='flex items-center gap-2 rounded-xl bg-surface-secondary px-3 py-2.5'>
              <Icon className='size-3.5 text-text-muted' name='Search' />
              <input
                className='min-w-0 flex-1 bg-transparent text-12 text-text-primary outline-none placeholder:text-text-muted'
                value={search}
                placeholder={
                  isListView
                    ? 'Search invoice, supplier, PO…'
                    : 'Search folders and files…'
                }
                onChange={(e) => handleSearch(e.target.value)}
              />
              {search ? (
                <button
                  aria-label='Clear search'
                  className='text-text-muted'
                  type='button'
                  onClick={() => handleSearch('')}
                >
                  <Icon className='size-3.5' name='X' />
                </button>
              ) : null}
            </label>

            <div className='no-scrollbar mt-2.5 flex gap-2 overflow-x-auto'>
              {['Status', 'Supplier', 'Document type'].map((label) => (
                <button
                  className='inline-flex shrink-0 items-center gap-1 rounded-full border border-border-default px-3 py-1.5 text-11 font-medium text-text-secondary transition-all active:scale-95'
                  key={label}
                  type='button'
                >
                  {label}
                  <Icon
                    className='size-2.5 text-text-muted'
                    name='ChevronDown'
                  />
                </button>
              ))}
              <button
                aria-label='More filters'
                className='inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary transition-all active:scale-90'
                type='button'
              >
                <Icon className='size-3' name='Plus' />
              </button>
            </div>
          </div>
        </div>
      }
    >
      <ScreenScroll className='pb-2'>
        {loading && !folders.length && !files.length ? (
          <div className='flex flex-col items-center justify-center gap-2 py-20'>
            <Icon
              className='size-5 animate-spin text-accent-primary'
              name='LoaderCircle'
            />
            <p className='text-11 text-text-muted'>Loading folders…</p>
          </div>
        ) : error ? (
          <div className='px-4 py-10 text-center'>
            <p className='text-12 text-error-main'>{error}</p>
            <button
              className='mt-3 text-12 font-semibold text-accent-primary'
              type='button'
              onClick={() => void refreshData()}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {!isListView && folders.length > 0 ? (
              <section className='px-4 pt-3'>
                <p className='pb-2 text-[11px] font-semibold tracking-wide text-[var(--gray-9)] uppercase'>
                  Folders
                </p>
                <div className='flex flex-col gap-2'>
                  {folders.map((folder, idx) => (
                    <FolderRow
                      folder={folder}
                      index={idx}
                      key={folder.id}
                      onOpen={(id) => void openFolder(id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {!isListView ? (
              <button
                className='mt-4 mb-2 flex w-full items-center justify-between px-4 transition-opacity active:opacity-70'
                type='button'
                onClick={() => setFilesOpen((v) => !v)}
              >
                <span className='inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-accent-primary uppercase'>
                  <Icon className='size-3.5' name='FileText' />
                  Files in this folder — {files.length}
                </span>
                <Icon
                  name='ChevronDown'
                  className={cn(
                    'size-3.5 text-accent-primary transition-transform',
                    filesOpen && 'rotate-180',
                  )}
                />
              </button>
            ) : (
              <div className='px-4 pt-3 pb-1.5'>
                <p className='text-[11px] font-semibold tracking-wide text-text-muted uppercase'>
                  Files · {fileRange.total}
                </p>
              </div>
            )}

            {(isListView || filesOpen) && (
              <div className='flex flex-col gap-2 px-4'>
                {files.length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-[var(--gray-4)] bg-surface-primary px-4 py-10 text-center'>
                    <Icon
                      className='mx-auto size-5 text-[var(--gray-9)]'
                      name='FileText'
                    />
                    <p className='mt-2 text-[11px] text-[var(--gray-9)]'>
                      No files here
                    </p>
                  </div>
                ) : (
                  files.map((file, idx) => (
                    <FileCard
                      contextFilters={folderContextFilters}
                      file={file}
                      index={idx}
                      key={String(file.id)}
                      onOpen={(id) => openFile(id)}
                    />
                  ))
                )}
              </div>
            )}

            {files.length > 0 ? (
              <div className='mt-4 flex items-center justify-between px-4 text-[11px] text-text-muted'>
                <span>
                  Showing {fileRange.start}–{fileRange.end} of {fileRange.total}{' '}
                  files
                </span>
                <div className='flex items-center gap-2'>
                  <IconButton
                    aria-label='Previous page'
                    className='!size-7 border border-border-default'
                    disabled={(filePage?.page || 1) <= 1}
                    onClick={() =>
                      void changeServerPage(
                        Math.max(1, (filePage?.page || 1) - 1),
                      )
                    }
                  >
                    <Icon className='size-3' name='ChevronLeft' />
                  </IconButton>
                  <IconButton
                    aria-label='Next page'
                    className='!size-7 border border-border-default'
                    disabled={
                      fileRange.end >= fileRange.total ||
                      !(filePage?.hasMore ?? fileRange.end < fileRange.total)
                    }
                    onClick={() =>
                      void changeServerPage((filePage?.page || 1) + 1)
                    }
                  >
                    <Icon className='size-3' name='ChevronRight' />
                  </IconButton>
                </div>
              </div>
            ) : null}
          </>
        )}
      </ScreenScroll>
    </ScreenShell>
  )
}
