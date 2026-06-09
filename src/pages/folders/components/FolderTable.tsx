import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import type {
  FileItem,
  FolderItem,
  RepositoryFilePage,
} from '../types/folderTypes'
import { DynamicIcon } from './icons'
import { StatusPill } from './Ui'

const HIDDEN_FILE_KEYS = new Set([
  'storageproviderid',
  'storageprovidercode',
  'hasfilepath',
])

const FOLDER_SCROLL_OFFSET = 120
const DEFAULT_VISIBLE_FOLDER_COUNT = 100

const defaultColumns: DynamicRepositoryColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
]

const isHiddenFileKey = (key: string) => HIDDEN_FILE_KEYS.has(key.toLowerCase())

const getValue = (row: any, key: string) => {
  const value = row?.[key] ?? row?.[key.charAt(0).toLowerCase() + key.slice(1)]
  return value === undefined || value === null || value === ''
    ? '-'
    : String(value)
}

export function FolderTable({
  error = '',
  fileColumns = [],
  filePage,
  files,
  folderHasMore,
  folders,
  folderSearch = '',
  folderTotalCount,
  loading = false,
  loadingFolders = false,
  loadingPage = false,
  onAiSummary,
  onEditMetadata,
  onFolderSearchChange,
  onLoadMoreFolders,
  onOpenFile,
  onOpenFolder,
  onPageChange,
  onPageSizeChange,
  onShare,
  onWorkflow,
}: {
  error?: string
  fileColumns?: DynamicRepositoryColumn[]
  filePage?: RepositoryFilePage
  files: FileItem[]
  folderHasMore?: boolean
  folders: FolderItem[]
  folderSearch?: string
  folderTotalCount?: number
  loading?: boolean
  loadingFolders?: boolean
  loadingPage?: boolean
  onAiSummary: (id: string) => void
  onEditMetadata: (id: string) => void
  onFolderSearchChange?: (value: string) => void
  onLoadMoreFolders?: () => void
  onOpenFile: (id: string) => void
  onOpenFolder: (id: string) => void
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onShare: (id: string) => void
  onWorkflow: (id: string) => void
}) {
  const [openMenu, setOpenMenu] = useState<{
    id: string
    type: 'folder' | 'file'
  } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const folderScrollRef = useRef<HTMLDivElement | null>(null)
  const lastFolderScrollTopRef = useRef(0)
  const requestedFolderCountRef = useRef(0)

  const columns = useMemo(() => {
    const source = (fileColumns.length ? fileColumns : defaultColumns).filter(
      (column) => !isHiddenFileKey(column.key),
    )
    const hasName = source.some(
      (column) =>
        column.key === 'name' ||
        column.key === 'FileName' ||
        column.key === 'fileName',
    )
    return hasName ? source : [{ key: 'name', label: 'Name' }, ...source]
  }, [fileColumns])

  const fileGridTemplate = `48px ${columns
    .map((column) =>
      column.key === 'name' ||
      column.key === 'FileName' ||
      column.key === 'fileName'
        ? 'minmax(260px,1.8fr)'
        : 'minmax(170px,1fr)',
    )
    .join(' ')} 56px`

  const folderGridTemplate =
    '48px minmax(260px,1.6fr) minmax(150px,1fr) minmax(170px,1fr) 56px'
  const folderTableMinWidth = 920
  const fileTableMinWidth = Math.max(1180, 104 + columns.length * 180)

  const folderBodyMaxHeight =
    folders.length > 10
      ? 'min(84vh, 420px)'
      : `${Math.max(120, folders.length * 56)}px`

  const currentPage = filePage?.page || 1
  const pageSize = filePage?.pageSize || 50
  const totalCount = filePage?.totalCount || files.length
  const isAll = pageSize === 0
  const totalPages = isAll
    ? 1
    : Math.max(1, filePage?.totalPages || Math.ceil(totalCount / pageSize))
  const hasMore = Boolean(filePage?.hasMore)
  const fromItem =
    totalCount === 0 ? 0 : isAll ? 1 : (currentPage - 1) * pageSize + 1
  const toItem = isAll
    ? totalCount
    : Math.min((currentPage - 1) * pageSize + files.length, totalCount)
  const showFooter =
    Boolean(filePage) &&
    (files.length > 0 || loading || loadingPage) &&
    folders.length <= 10

  const effectiveFolderTotal = folderTotalCount ?? folders.length
  const hasMoreFolders = Boolean(
    onLoadMoreFolders && folderHasMore && folders.length < effectiveFolderTotal,
  )

  useEffect(() => {
    if (folderScrollRef.current) folderScrollRef.current.scrollTop = 0
    lastFolderScrollTopRef.current = 0
    requestedFolderCountRef.current = 0
  }, [folders[0]?.id])

  useEffect(() => {
    if (!loadingFolders) {
      requestedFolderCountRef.current = 0
    }
  }, [loadingFolders, folders.length])

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setOpenMenu(null)
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const loadNextFolderBatch = useCallback(() => {
    if (loadingFolders || loadingPage || loading || !hasMoreFolders) return
    onLoadMoreFolders?.()
  }, [hasMoreFolders, loading, loadingFolders, loadingPage, onLoadMoreFolders])

  const handleFolderScroll = useCallback(() => {
    const container = folderScrollRef.current
    if (!container || !hasMoreFolders || loadingFolders) return

    const currentScrollTop = container.scrollTop
    const isUserScrollingDown =
      currentScrollTop > lastFolderScrollTopRef.current
    lastFolderScrollTopRef.current = currentScrollTop

    if (!isUserScrollingDown) return

    const reachedBottom =
      currentScrollTop + container.clientHeight >=
      container.scrollHeight - FOLDER_SCROLL_OFFSET

    // Prevent continuous calls while the scrollbar remains at the bottom after new rows are appended.
    // A new API call can happen only after the current request finishes and the user scrolls again.
    if (reachedBottom && requestedFolderCountRef.current !== folders.length) {
      requestedFolderCountRef.current = folders.length
      loadNextFolderBatch()
    }
  }, [folders.length, hasMoreFolders, loadNextFolderBatch, loadingFolders])

  const toggleMenu = (type: 'folder' | 'file', id: string) => {
    setOpenMenu((prev) =>
      prev?.type === type && prev.id === id ? null : { id, type },
    )
  }

  const goPrevious = () => {
    if (currentPage <= 1 || loadingPage) return
    onPageChange?.(currentPage - 1, null)
  }

  const goNext = () => {
    if ((!hasMore && currentPage >= totalPages) || loadingPage) return
    onPageChange?.(currentPage + 1, filePage?.nextCursor || null)
  }

  if (error) {
    return (
      <div className='flex h-full min-h-0 flex-col bg-surface'>
        <div className='m-4 rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10'>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface duration-300'>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-surface'>
        {folders.length || folderSearch ? (
          <section className='shrink-0 overflow-hidden border-b border-gray-3 bg-surface'>
            <div className='sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-gray-3 bg-surface px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]'>
              <div className='flex min-w-0 flex-col'>
                <span className='text-sm font-bold text-[#24285b]'>
                  Folders
                </span>
                <span className='text-xs font-medium text-gray-9'>
                  Showing {folders.length} of {effectiveFolderTotal} folders
                </span>
              </div>

              <div className='relative w-full max-w-[360px]'>
                <DynamicIcon
                  className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-8'
                  name='search'
                />
                <input
                  className='h-9 w-full rounded-xl border border-[#d8dcea] bg-white pr-3 pl-9 text-sm font-medium text-gray-13 transition-all outline-none placeholder:text-gray-8 focus:border-[#9aa8d9] focus:ring-2 focus:ring-[#dbe2ff]'
                  placeholder='Search folders...'
                  type='search'
                  value={folderSearch}
                  onChange={(event) =>
                    onFolderSearchChange?.(event.target.value)
                  }
                />
              </div>
            </div>

            <div className='ez-scrollbar w-full overflow-x-auto'>
              <div style={{ minWidth: folderTableMinWidth }}>
                <div
                  className='grid border-b border-gray-3 bg-surface px-4 py-3 text-sm font-semibold text-[#24285b] shadow-[0_1px_0_rgba(15,23,42,0.04)]'
                  style={{ gridTemplateColumns: folderGridTemplate }}
                >
                  <span />
                  <span>Name</span>
                  <span>Items</span>
                  <span>Date Modified</span>
                  <span />
                </div>

                <div
                  className='ez-scrollbar overflow-y-auto'
                  ref={folderScrollRef}
                  style={{ maxHeight: folderBodyMaxHeight }}
                  onScroll={handleFolderScroll}
                >
                  {!loadingFolders && !folders.length && folderSearch ? (
                    <div className='flex min-h-[180px] items-center justify-center px-6 text-center'>
                      <div>
                        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-3'>
                          <DynamicIcon
                            className='h-5 w-5 text-gray-10'
                            name='search'
                          />
                        </div>
                        <p className='mt-3 text-sm font-bold text-gray-13'>
                          No matching folders found
                        </p>
                        <p className='mt-1 text-xs font-medium text-gray-9'>
                          Try another folder name to refine the repository view.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {folders.map((folder) => (
                    <div
                      className='group relative grid w-full cursor-pointer items-center border-b border-gray-3 bg-surface px-4 py-3 text-left text-[15px] font-medium transition-all hover:z-10 hover:bg-[#f8f9fd] hover:shadow-sm'
                      key={folder.id}
                      style={{ gridTemplateColumns: folderGridTemplate }}
                      onClick={() => onOpenFolder(folder.id)}
                    >
                      <DynamicIcon
                        className='h-5 w-5 text-[#4f5b88] group-hover:text-primary-10'
                        name={folder.iconKey}
                      />

                      <button
                        className='truncate text-left font-bold text-gray-13 disabled:cursor-not-allowed disabled:opacity-60'
                        disabled={loadingPage || loadingFolders}
                        title={folder.title}
                        type='button'
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenFolder(folder.id)
                        }}
                      >
                        {folder.title}
                      </button>

                      <span className='truncate text-gray-10'>
                        {folder.itemsText}
                      </span>
                      <span className='truncate text-gray-10'>
                        {folder.modifiedText || '-'}
                      </span>

                      <div className='relative flex justify-end'>
                        <button
                          className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40'
                          disabled={loadingFolders}
                          type='button'
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleMenu('folder', folder.id)
                          }}
                        >
                          <DynamicIcon className='h-4 w-4' name='more' />
                        </button>

                        {openMenu?.type === 'folder' &&
                          openMenu.id === folder.id && (
                            <div
                              className='absolute top-9 right-0 z-50 w-[200px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-xl'
                              ref={menuRef}
                            >
                              <MenuItem
                                icon='folder'
                                label='Open'
                                onClick={() => {
                                  setOpenMenu(null)
                                  onOpenFolder(folder.id)
                                }}
                              />
                              <MenuItem
                                icon='edit'
                                label='Rename'
                                onClick={() => setOpenMenu(null)}
                              />
                              <MenuItem
                                icon='share'
                                label='Share'
                                onClick={() => setOpenMenu(null)}
                              />
                              <div className='my-2 border-t border-gray-3' />
                              <MenuItem
                                icon='trash'
                                label='Delete'
                                danger
                                onClick={() => setOpenMenu(null)}
                              />
                            </div>
                          )}
                      </div>
                    </div>
                  ))}

                  {loadingFolders ? (
                    <FolderLoadMoreSkeleton gridTemplate={folderGridTemplate} />
                  ) : hasMoreFolders ? (
                    <div className='flex items-center justify-center border-b border-gray-3 bg-[#fbfcff] px-4 py-4'>
                      <button
                        className='flex items-center gap-2 rounded-full border border-[#d8dcea] bg-surface px-4 py-2 text-sm font-bold text-[#24285b] shadow-sm transition-all hover:bg-[#f7f8fc]'
                        type='button'
                        onClick={loadNextFolderBatch}
                      >
                        <DynamicIcon
                          className='h-4 w-4 text-[#7f89a8]'
                          name='chevronDown'
                        />
                        Load more folders
                        <span className='rounded-full bg-[#eef2ff] px-2 py-0.5 text-xs text-[#4f5b88]'>
                          {Math.min(folders.length, effectiveFolderTotal)} /{' '}
                          {effectiveFolderTotal}
                        </span>
                      </button>
                    </div>
                  ) : effectiveFolderTotal >
                    folders.length ? null : effectiveFolderTotal >
                    DEFAULT_VISIBLE_FOLDER_COUNT ? (
                    <div className='flex items-center justify-center border-b border-gray-3 bg-[#fbfcff] px-4 py-3 text-xs font-bold text-gray-8'>
                      All {effectiveFolderTotal} folders loaded
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {folders.length && files.length && folders.length < 10 ? (
          <div className='relative flex items-center justify-center bg-surface py-3'>
            <div className='absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-gray-4' />
            <div className='relative z-10 flex items-center gap-2 rounded-full border border-gray-3 bg-surface px-4 py-1.5 text-xs font-bold text-gray-10 shadow-sm'>
              <DynamicIcon className='h-4 w-4 text-gray-8' name='fileText' />
              <span className='rounded px-1.5 py-0.5 text-gray-8'>
                FILES IN THIS FOLDER
              </span>
              <span className='h-px w-5 bg-gray-4' />
              <span className='text-gray-8'>{files.length || 0}</span>
            </div>
          </div>
        ) : null}

        {(files.length || loading || loadingPage) && folders.length < 10 ? (
          <section className='flex min-h-0 flex-1 flex-col overflow-hidden bg-surface'>
            <div className='ez-scrollbar min-h-0 w-full flex-1 overflow-x-auto overflow-y-hidden'>
              <div
                className='flex h-full min-h-0 flex-col'
                style={{ minWidth: fileTableMinWidth }}
              >
                <div
                  className='grid shrink-0 border-b border-gray-3 bg-surface px-4 py-3 text-sm font-semibold text-[#24285b] shadow-[0_1px_0_rgba(15,23,42,0.04)]'
                  style={{ gridTemplateColumns: fileGridTemplate }}
                >
                  <span />

                  {columns.map((column) => (
                    <span className='truncate' key={column.key}>
                      {column.label}
                    </span>
                  ))}

                  <span />
                </div>
                <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto'>
                  {loading || loadingPage ? (
                    <TableSkeletonRows
                      columns={columns.length}
                      gridTemplate={fileGridTemplate}
                    />
                  ) : (
                    files.map((file) => (
                      <div
                        className='group relative grid w-full cursor-pointer items-center border-b border-gray-3 bg-surface px-4 py-3 text-left text-sm transition-all hover:z-10 hover:bg-[#f8f9fd] hover:shadow-sm'
                        key={file.id}
                        style={{ gridTemplateColumns: fileGridTemplate }}
                        onClick={() => onOpenFile(file.id)}
                      >
                        <DynamicIcon
                          className='h-5 w-5 text-[#4f5b88] group-hover:text-secondary-10'
                          name='fileText'
                        />

                        {columns.map((column) => {
                          const isName =
                            column.key === 'name' ||
                            column.key === 'FileName' ||
                            column.key === 'fileName'
                          const value = isName
                            ? file.fileName || file.name
                            : getValue(file as any, column.key)

                          if (
                            column.key === 'status' ||
                            column.key === 'Status'
                          ) {
                            return (
                              <StatusPill key={column.key} status={value} />
                            )
                          }

                          return isName ? (
                            <button
                              className='truncate text-left text-[15px] font-bold text-gray-13 disabled:cursor-not-allowed disabled:opacity-60'
                              disabled={loadingPage}
                              key={column.key}
                              title={value}
                              type='button'
                              onClick={(event) => {
                                event.stopPropagation()
                                onOpenFile(file.id)
                              }}
                            >
                              {value}
                            </button>
                          ) : (
                            <span
                              className='truncate text-gray-10'
                              key={column.key}
                              title={value}
                            >
                              {value}
                            </span>
                          )
                        })}

                        <div className='relative flex justify-end'>
                          <button
                            className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40'
                            disabled={loadingPage}
                            type='button'
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleMenu('file', file.id)
                            }}
                          >
                            <DynamicIcon className='h-4 w-4' name='more' />
                          </button>

                          {openMenu?.type === 'file' &&
                            openMenu.id === file.id && (
                              <div
                                className='absolute top-9 right-0 z-50 w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-xl'
                                ref={menuRef}
                              >
                                <MenuItem
                                  icon='eye'
                                  label='View Details'
                                  onClick={() => {
                                    setOpenMenu(null)
                                    onOpenFile(file.id)
                                  }}
                                />
                                <MenuItem
                                  icon='edit'
                                  label='Edit Metadata'
                                  onClick={() => {
                                    setOpenMenu(null)
                                    onEditMetadata(file.id)
                                  }}
                                />
                                <MenuItem
                                  icon='bot'
                                  label='AI Summary'
                                  onClick={() => {
                                    setOpenMenu(null)
                                    onAiSummary(file.id)
                                  }}
                                />
                                <MenuItem
                                  icon='share'
                                  label='Share'
                                  onClick={() => {
                                    setOpenMenu(null)
                                    onShare(file.id)
                                  }}
                                />
                                <MenuItem
                                  icon='play'
                                  label='Start Workflow'
                                  onClick={() => {
                                    setOpenMenu(null)
                                    onWorkflow(file.id)
                                  }}
                                />
                                <div className='my-2 border-t border-gray-3' />
                                <MenuItem
                                  icon='trash'
                                  label='Delete'
                                  danger
                                  onClick={() => setOpenMenu(null)}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {!loading &&
        !loadingPage &&
        !loadingFolders &&
        !folders.length &&
        !files.length ? (
          <div className='flex h-full min-h-[320px] items-center justify-center bg-surface px-6 text-center'>
            <div>
              <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-3 shadow-sm'>
                <div className='flex h-14 w-14 items-center justify-center rounded-full bg-white'>
                  <DynamicIcon className='h-8 w-8 text-gray-10' name='folder' />
                </div>
              </div>

              <h3 className='mt-5 text-[16px] font-bold text-gray-13'>
                No repository items found
              </h3>

              <p className='mt-2 max-w-[460px] text-[14px] leading-6 font-medium text-gray-10'>
                This folder does not contain any folders or files yet. Upload
                documents or create a new folder to start organizing repository
                content.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {showFooter ? (
        <div className='shrink-0 border-t border-gray-3 bg-surface px-6 py-3 shadow-[0_-8px_22px_rgba(15,23,42,0.08)]'>
          <div className='flex min-h-[44px] items-center justify-between gap-4 text-sm'>
            <div className='font-semibold text-[#24285b]'>
              Showing {fromItem} - {toItem} of {totalCount} Files
            </div>

            <div className='flex items-center gap-3'>
              <span className='font-medium text-[#24285b]'>
                Files per page:
              </span>

              <PageSizeDropdown
                disabled={loadingPage}
                options={[5, 10, 20, 30, 50, 100, 0]}
                value={pageSize}
                onChange={(value) => onPageSizeChange?.(value)}
              />

              <button
                className='flex h-9 w-10 items-center justify-center rounded-lg border border-[#d8dcea] bg-surface text-[#9aa3bd] shadow-sm transition-all hover:bg-[#f7f8fc] hover:text-[#24285b] disabled:cursor-not-allowed disabled:opacity-45'
                disabled={currentPage <= 1 || loadingPage}
                title='Previous page'
                type='button'
                onClick={goPrevious}
              >
                <DynamicIcon
                  className='h-4 w-4 rotate-180'
                  name='chevronRight'
                />
              </button>

              <button
                className='flex h-9 w-10 items-center justify-center rounded-lg border border-[#d8dcea] bg-surface text-[#24285b] shadow-sm transition-all hover:bg-[#f7f8fc] disabled:cursor-not-allowed disabled:opacity-45'
                title='Next page'
                type='button'
                disabled={
                  (!hasMore && currentPage >= totalPages) || loadingPage
                }
                onClick={goNext}
              >
                <DynamicIcon className='h-4 w-4' name='chevronRight' />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FolderLoadMoreSkeleton({ gridTemplate }: { gridTemplate: string }) {
  return (
    <div className='border-b border-gray-3 bg-[#fbfcff]'>
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div
          className='grid items-center px-4 py-3'
          key={rowIndex}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className='h-5 w-5 animate-pulse rounded bg-[#e9ebf3]' />
          <span className='h-4 w-[68%] animate-pulse rounded bg-[#e9ebf3]' />
          <span className='h-4 w-[42%] animate-pulse rounded bg-[#e9ebf3]' />
          <span className='h-4 w-[52%] animate-pulse rounded bg-[#e9ebf3]' />
          <span className='ml-auto h-8 w-8 animate-pulse rounded-lg bg-[#e9ebf3]' />
        </div>
      ))}
      <div className='flex items-center justify-center gap-2 px-4 pt-1 pb-4 text-xs font-bold text-[#4f5b88]'>
        <span className='h-2 w-2 animate-pulse rounded-full bg-[#9aa8d9]' />
        Loading more folders...
      </div>
    </div>
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
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-all hover:bg-gray-2 ${danger ? 'text-red-9' : 'text-gray-13'}`}
      type='button'
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <DynamicIcon className='h-4 w-4 text-current' name={icon} />
      {label}
    </button>
  )
}

function PageSizeDropdown({
  disabled = false,
  options,
  value,
  onChange,
}: {
  disabled?: boolean
  options: number[]
  value: number
  onChange: (value: number) => void
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const closeDropdown = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeDropdown)
    return () => document.removeEventListener('mousedown', closeDropdown)
  }, [])

  const selectValue = (nextValue: number) => {
    setOpen(false)
    if (nextValue !== value) onChange(nextValue)
  }

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        className='flex h-9 items-center justify-between gap-3 rounded-lg border border-[#d8dcea] bg-surface px-3 text-sm font-medium text-[#24285b] shadow-sm transition-all hover:bg-[#f7f8fc] focus:border-[#9aa8d9] focus:ring-2 focus:ring-[#dbe2ff] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'
        disabled={disabled}
        type='button'
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value === 0 ? 'All' : value}</span>
        <DynamicIcon
          className={`h-4 w-4 text-[#7f89a8] transition-transform ${open ? 'rotate-180' : ''}`}
          name='chevronDown'
        />
      </button>

      {open && (
        <div className='absolute right-0 bottom-[46px] z-[1000] w-[74px] overflow-hidden rounded-xl border border-[#e1e5f0] bg-surface py-2 shadow-[0_10px_28px_rgba(15,23,42,0.16)]'>
          {options.map((option) => (
            <button
              className={`flex h-8 w-full items-center px-4 text-left text-sm font-medium transition-all hover:bg-[#f3f5fb] ${option === value ? 'bg-[#f3f5fb] text-[#24285b]' : 'text-[#24285b]'}`}
              key={option}
              type='button'
              onClick={() => selectValue(option)}
            >
              {option === 0 ? 'All' : option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TableSkeletonRows({
  columns,
  gridTemplate,
}: {
  columns: number
  gridTemplate: string
}) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div
          className='grid items-center border-b border-gray-3 px-4 py-3'
          key={rowIndex}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className='h-5 w-5 animate-pulse rounded bg-[#e9ebf3]' />
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <span
              className={`h-4 animate-pulse rounded bg-[#e9ebf3] ${columnIndex === 0 ? 'w-[70%]' : columnIndex % 2 === 0 ? 'w-[52%]' : 'w-[38%]'}`}
              key={columnIndex}
            />
          ))}
          <span className='ml-auto h-8 w-20 animate-pulse rounded-full bg-[#e9ebf3]' />
        </div>
      ))}
    </>
  )
}
