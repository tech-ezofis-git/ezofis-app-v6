import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import type {
  FileItem,
  FolderItem,
  RepositoryFilePage,
} from '../types/folderTypes'
import { DynamicIcon } from './icons'

const HIDDEN_FILE_KEYS = new Set([
  'storageproviderid',

  'storageprovidercode',

  'hasfilepath',
])

type FileRow = {
  [key: string]: any

  id: string

  raw: FileItem
}

type FolderRow = {
  id: string

  items: string

  modified: string

  name: string

  raw: FolderItem
}

type FolderTableDataTableSplitProps = {
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

  refreshing?: boolean

  onAiSummary: (id: string) => void

  onEditMetadata: (id: string) => void

  onLoadMoreFolders?: () => void

  onOpenFile: (id: string) => void

  onOpenFolder: (id: string) => void

  onPageChange?: (page: number, cursor?: string | null) => void

  onPageSizeChange?: (pageSize: number) => void

  onReload?: () => void

  onShare: (id: string) => void

  onWorkflow: (id: string) => void
}

type OpenMenuState = {
  id: string

  type: RowKind
} | null

type RowKind = 'folder' | 'file'

const folderColumnHelper = createColumnHelper<FolderRow>()

const fileColumnHelper = createColumnHelper<FileRow>()

const isHiddenFileKey = (key: string) => HIDDEN_FILE_KEYS.has(key.toLowerCase())

const getFileId = (file: FileItem) => String((file as any).id ?? '')

const getRepositoryFieldValue = (row: any, sqlColumnName: string) => {
  if (!row || !sqlColumnName) return '-'

  const sources = [
    row,
    row.metadata,
    row.Metadata,
    row.fields,
    row.Fields,
    row.values,
    row.Values,
  ].filter((source) => source && typeof source === 'object')

  for (const source of sources) {
    const matchedKey = Object.keys(source).find(
      (key) => key.toLowerCase() === sqlColumnName.toLowerCase(),
    )

    const value = matchedKey ? source[matchedKey] : undefined
    if (value !== undefined && value !== null && value !== '') {
      return String(value)
    }
  }

  return '-'
}

export default function FolderTableDataTableSplit({
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

  refreshing = false,

  onAiSummary,

  onEditMetadata,

  onLoadMoreFolders,

  onOpenFile,

  onOpenFolder,

  onPageChange,

  onPageSizeChange,

  onReload,

  onShare,

  onWorkflow,
}: FolderTableDataTableSplitProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenuState>(null)

  const menuRef = useRef<HTMLDivElement | null>(null)

  const visibleFileColumns = useMemo(
    () => fileColumns.filter((column) => !isHiddenFileKey(column.key)),

    [fileColumns],
  )

  const effectiveFolderTotal = folderTotalCount ?? folders.length

  const hasMoreFolders = Boolean(
    onLoadMoreFolders && folderHasMore && folders.length < effectiveFolderTotal,
  )

  const closeMenu = () => setOpenMenu(null)

  const toggleMenu = (type: RowKind, id: string) => {
    setOpenMenu((current) =>
      current?.type === type && current.id === id ? null : { id, type },
    )
  }

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  if (error) {
    return (
      <div className='flex h-full min-h-0 flex-col bg-surface'>
        <div className='m-4 rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10'>
          {error}
        </div>
      </div>
    )
  }
  const filesHave = files.length > 0 || loading || loadingPage

  return (
    <div className='animate-in fade-in relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface duration-300'>
      {(refreshing || loading) && !loadingPage && !loadingFolders ? (
        <div className='absolute top-0 right-0 left-0 z-30 h-1 overflow-hidden bg-[#edf0fb]'>
          <div className='h-full w-1/3 animate-[ez-loading_1.1s_ease-in-out_infinite] rounded-full bg-primary-9' />
        </div>
      ) : null}

      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-surface p-3'>
        <FolderDataTableSection
          effectiveFolderTotal={effectiveFolderTotal}
          folders={folders}
          folderSearch={folderSearch}
          hasFiles={filesHave}
          hasMoreFolders={hasMoreFolders}
          loading={loading}
          loadingFolders={loadingFolders}
          loadingPage={loadingPage}
          menuRef={menuRef}
          openMenu={openMenu}
          onCloseMenu={closeMenu}
          onLoadMoreFolders={onLoadMoreFolders}
          onOpenFolder={onOpenFolder}
          onReload={onReload}
          onToggleMenu={toggleMenu}
        />

        {folders.length < 10 && folders.length && files.length ? (
          <div className='relative flex shrink-0 items-center justify-center py-1'>
            <div className='absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-gray-4' />

            <div className='relative z-10 flex items-center gap-2 rounded-full border border-gray-3 bg-surface px-4 py-1.5 text-xs font-bold text-gray-10 shadow-sm'>
              <DynamicIcon className='h-4 w-4 text-gray-8' name='fileText' />

              <span className='rounded px-1.5 py-0.5 text-gray-8'>
                FILES IN THIS FOLDER
              </span>

              <span className='h-px w-5 bg-gray-4' />

              <span className='text-gray-8'>{files.length}</span>
            </div>
          </div>
        ) : null}

        {(files.length || loading || loadingPage) && folders.length < 10 ? (
          <FileDataTableSection
            columns={visibleFileColumns}
            filePage={filePage}
            files={files}
            foldersLength={folders.length}
            loading={loading}
            loadingPage={loadingPage}
            menuRef={menuRef}
            openMenu={openMenu}
            onAiSummary={onAiSummary}
            onCloseMenu={closeMenu}
            onEditMetadata={onEditMetadata}
            onOpenFile={onOpenFile}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onReload={onReload}
            onShare={onShare}
            onToggleMenu={toggleMenu}
            onWorkflow={onWorkflow}
          />
        ) : null}

        {!loading &&
        !loadingPage &&
        !loadingFolders &&
        !folders.length &&
        !files.length ? (
          <EmptyState />
        ) : null}
      </div>

      <style>{`

        @keyframes ez-loading {

          0% { transform: translateX(-120%); }

          50% { transform: translateX(140%); }

          100% { transform: translateX(320%); }

        }

      `}</style>
    </div>
  )
}

function ActionMenuItem({
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
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-all hover:bg-gray-2 ${
        danger ? 'text-red-9' : 'text-gray-13'
      }`}
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

function EmptyState() {
  return (
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
  )
}

function FileDataTableSection({
  columns,
  filePage,
  files,
  foldersLength,
  loading,
  loadingPage,
  menuRef,
  openMenu,
  onAiSummary,
  onCloseMenu,
  onEditMetadata,
  onOpenFile,
  onPageChange,
  onPageSizeChange,
  onReload,
  onShare,
  onToggleMenu,
  onWorkflow,
}: {
  columns: DynamicRepositoryColumn[]
  filePage?: RepositoryFilePage
  files: FileItem[]
  foldersLength: number
  loading: boolean
  loadingPage: boolean
  menuRef: React.RefObject<HTMLDivElement | null>
  openMenu: OpenMenuState
  onAiSummary: (id: string) => void
  onCloseMenu: () => void
  onEditMetadata: (id: string) => void
  onOpenFile: (id: string) => void
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onReload?: () => void
  onShare: (id: string) => void
  onToggleMenu: (type: RowKind, id: string) => void
  onWorkflow: (id: string) => void
}) {
  const getPrimaryFileName = (file: any) => {
    return (
      file?.fileName ||
      file?.FileName ||
      file?.name ||
      file?.Name ||
      file?.InvoiceNumber ||
      file?.invoiceNumber ||
      file?.InvoiceNo ||
      file?.invoiceNo ||
      file?.['Invoice No'] ||
      file?.DocumentName ||
      file?.documentName ||
      '-'
    )
  }

  const hiddenFirstColumnKeys = [
    'filename',
    'fileName',
    'FileName',
    'name',
    'Name',
    'InvoiceNumber',
    'invoiceNumber',
    'InvoiceNo',
    'invoiceNo',
    'Invoice No',
    'DocumentName',
    'documentName',
  ]

  const fileRows = useMemo<FileRow[]>(
    () =>
      files.map((file) => {
        const row: FileRow = {
          __name: getPrimaryFileName(file),
          id: getFileId(file),
          raw: file,
        }

        columns.forEach((column) => {
          row[column.key] = getRepositoryFieldValue(file as any, column.key)
        })

        return row
      }),
    [columns, files],
  )

  const fileColumns = useMemo(() => {
    const normalColumns = columns.filter(
      (column) => !hiddenFirstColumnKeys.includes(column.key),
    )

    const resolvedColumns: DynamicRepositoryColumn[] = [
      {
        key: '__name',
        label: 'Name',
      } as DynamicRepositoryColumn,
      ...normalColumns,
    ]

    const dynamicColumns = resolvedColumns.map((column, index) =>
      fileColumnHelper.accessor((row) => row[column.key], {
        header: column.label,
        id: column.key,
        cell: ({ row, getValue }) => {
          const fileId = row.original.id
          const value = String(getValue() || '-')

          if (index === 0) {
            return (
              <button
                className='flex min-w-0 items-center gap-3 text-left'
                title={value}
                type='button'
                onClick={() => onOpenFile(fileId)}
              >
                <DynamicIcon
                  className='h-5 w-5 shrink-0 text-[#4f5b88]'
                  name='fileText'
                />
                <span className='truncate font-semibold text-gray-13'>
                  {value}
                </span>
              </button>
            )
          }

          return (
            <span
              className='block max-w-[260px] truncate text-gray-10'
              title={value}
            >
              {value}
            </span>
          )
        },
      }),
    )

    return [
      ...dynamicColumns,
      fileColumnHelper.display({
        header: '',
        id: 'actions',
        cell: ({ row }) => {
          const fileId = row.original.id

          return (
            <div className='relative flex justify-end'>
              <button
                className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 transition-all hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40'
                disabled={loadingPage}
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleMenu('file', fileId)
                }}
              >
                <DynamicIcon className='h-4 w-4' name='more' />
              </button>

              {openMenu?.type === 'file' && openMenu.id === fileId ? (
                <div
                  className='absolute top-9 right-0 z-50 w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-xl'
                  ref={menuRef}
                >
                  <ActionMenuItem
                    icon='eye'
                    label='View Details'
                    onClick={() => {
                      onCloseMenu()
                      onOpenFile(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon='edit'
                    label='Edit Metadata'
                    onClick={() => {
                      onCloseMenu()
                      onEditMetadata(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon='bot'
                    label='AI Summary'
                    onClick={() => {
                      onCloseMenu()
                      onAiSummary(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon='share'
                    label='Share'
                    onClick={() => {
                      onCloseMenu()
                      onShare(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon='play'
                    label='Start Workflow'
                    onClick={() => {
                      onCloseMenu()
                      onWorkflow(fileId)
                    }}
                  />

                  <div className='my-2 border-t border-gray-3' />

                  <ActionMenuItem
                    icon='trash'
                    label='Delete'
                    danger
                    onClick={onCloseMenu}
                  />
                </div>
              ) : null}
            </div>
          )
        },
      }),
    ]
  }, [
    columns,
    hiddenFirstColumnKeys,
    loadingPage,
    menuRef,
    onAiSummary,
    onCloseMenu,
    onEditMetadata,
    onOpenFile,
    onShare,
    onToggleMenu,
    onWorkflow,
    openMenu,
  ])

  const fileTable = useReactTable({
    columns: fileColumns,
    data: fileRows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `file-${row.id}`,
  })

  const currentPage = filePage?.page || 1
  const pageSize = filePage?.pageSize || 50
  const totalCount = filePage?.totalCount || files.length

  const showFiles = files.length || loading || loadingPage

  if (!showFiles) return null

  const folderReservedHeight =
    foldersLength > 0
      ? Math.min(220, Math.max(96, foldersLength * 56 + 52)) + 84
      : 15

  const fileTableMaxHeight = `calc(100vh - ${folderReservedHeight + 220}px)`

  return (
    <section className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='min-h-0 flex-1 overflow-hidden'>
        <DataTable
          component={<div />}
          isLoading={loading || loadingPage}
          isReLoading={loadingPage}
          pageSize={pageSize}
          table={fileTable}
          tableBodyMaxHeight={fileTableMaxHeight}
          hideGrouping
          stickyHeader
          onReload={onReload || (() => undefined)}
        />
      </div>

      {filePage ? (
        <Pagination
          itemLabel='Files'
          page={currentPage}
          pageSize={pageSize}
          showPageNumbers={false}
          totalItems={totalCount}
          onPageChange={(nextPage) => {
            if (loadingPage) return

            if (nextPage < currentPage) {
              onPageChange?.(nextPage, null)
              return
            }

            if (nextPage > currentPage) {
              onPageChange?.(nextPage, filePage?.nextCursor || null)
            }
          }}
          onPageSizeChange={(nextPageSize) => {
            onPageSizeChange?.(nextPageSize)
          }}
        />
      ) : null}
    </section>
  )
}

function FolderDataTableSection({
  folders,

  folderSearch,

  hasFiles,

  hasMoreFolders,

  loading,

  loadingFolders,

  loadingPage,

  menuRef,

  openMenu,

  onCloseMenu,

  onLoadMoreFolders,

  onOpenFolder,

  onReload,

  onToggleMenu,
}: {
  effectiveFolderTotal: number

  folders: FolderItem[]

  folderSearch: string

  hasFiles: boolean

  hasMoreFolders: boolean

  loading: boolean

  loadingFolders: boolean

  loadingPage: boolean

  menuRef: React.RefObject<HTMLDivElement | null>

  openMenu: OpenMenuState

  onCloseMenu: () => void

  onLoadMoreFolders?: () => void

  onOpenFolder: (id: string) => void

  onReload?: () => void

  onToggleMenu: (type: RowKind, id: string) => void
}) {
  const folderScrollRef = useRef<HTMLDivElement | null>(null)

  const lastFolderScrollTopRef = useRef(0)

  const requestedFolderCountRef = useRef(0)

  const folderRows = useMemo<FolderRow[]>(
    () =>
      folders.map((folder) => ({
        id: folder.id,

        items: folder.itemsText || '-',

        modified: folder.modifiedText || '-',

        name: folder.title,

        raw: folder,
      })),

    [folders],
  )

  const loadNextFolderBatch = useCallback(() => {
    if (loadingFolders || loadingPage || loading || !hasMoreFolders) return

    onLoadMoreFolders?.()
  }, [hasMoreFolders, loading, loadingFolders, loadingPage, onLoadMoreFolders])

  const handleFolderScroll = useCallback(() => {
    if (requestedFolderCountRef.current !== folders.length) {
      requestedFolderCountRef.current = folders.length

      loadNextFolderBatch()
    }
  }, [folders.length, hasMoreFolders, loadNextFolderBatch, loadingFolders])

  useEffect(() => {
    if (folderScrollRef.current) folderScrollRef.current.scrollTop = 0

    lastFolderScrollTopRef.current = 0

    requestedFolderCountRef.current = 0
  }, [folders[0]?.id])

  useEffect(() => {
    if (!loadingFolders) requestedFolderCountRef.current = 0
  }, [loadingFolders, folders.length])

  const folderColumns = useMemo(
    () => [
      folderColumnHelper.accessor('name', {
        header: 'Name',

        id: 'name',

        cell: ({ row }) => {
          const folder = row.original.raw

          return (
            <button
              className='flex min-w-0 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60'
              disabled={loadingFolders || loadingPage}
              title={row.original.name}
              type='button'
              onClick={() => onOpenFolder(row.original.id)}
            >
              <DynamicIcon
                className='h-5 w-5 shrink-0 text-[#4f5b88]'
                name={folder.iconKey || 'folder'}
              />

              <span className='truncate font-bold text-gray-13'>
                {row.original.name}
              </span>
            </button>
          )
        },
      }),

      folderColumnHelper.accessor('items', {
        header: 'Items',

        id: 'items',

        cell: ({ getValue }) => (
          <span className='text-gray-10'>{String(getValue() || '-')}</span>
        ),
      }),

      folderColumnHelper.accessor('modified', {
        header: 'Date Modified',

        id: 'modified',

        cell: ({ getValue }) => (
          <span className='text-gray-10'>{String(getValue() || '-')}</span>
        ),
      }),

      folderColumnHelper.display({
        header: '',

        id: 'actions',

        cell: ({ row }) => {
          const folderId = row.original.id

          return (
            <div className='relative flex justify-end'>
              <button
                className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 transition-all hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40'
                disabled={loadingFolders}
                type='button'
                onClick={(event) => {
                  event.stopPropagation()

                  onToggleMenu('folder', folderId)
                }}
              >
                <DynamicIcon className='h-4 w-4' name='more' />
              </button>

              {openMenu?.type === 'folder' && openMenu.id === folderId ? (
                <div
                  className='absolute top-9 right-0 z-50 w-[200px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-xl'
                  ref={menuRef}
                >
                  <ActionMenuItem
                    icon='folder'
                    label='Open'
                    onClick={() => {
                      onCloseMenu()
                      onOpenFolder(folderId)
                    }}
                  />

                  <ActionMenuItem
                    icon='edit'
                    label='Rename'
                    onClick={onCloseMenu}
                  />

                  <ActionMenuItem
                    icon='share'
                    label='Share'
                    onClick={onCloseMenu}
                  />

                  <div className='my-2 border-t border-gray-3' />

                  <ActionMenuItem
                    icon='trash'
                    label='Delete'
                    danger
                    onClick={onCloseMenu}
                  />
                </div>
              ) : null}
            </div>
          )
        },
      }),
    ],

    [
      loadingFolders,
      loadingPage,
      menuRef,
      onCloseMenu,
      onOpenFolder,
      onToggleMenu,
      openMenu,
    ],
  )

  const folderTable = useReactTable({
    columns: folderColumns,

    data: folderRows,

    getCoreRowModel: getCoreRowModel(),

    getRowId: (row) => `folder-${row.id}`,
  })

  if (!folders.length && !folderSearch && !loadingFolders) return null

  const folderBodyMaxHeight =
    hasFiles && folders.length < 10
      ? `${Math.min(220, Math.max(96, folders.length * 56 + 52))}px`
      : 'calc(100vh - 220px)'

  return (
    <section
      className={
        hasFiles
          ? 'shrink-0 overflow-hidden'
          : 'flex min-h-0 flex-1 flex-col overflow-hidden'
      }
    >
      <DataTable
        component={<div />}
        hasMore={hasMoreFolders}
        isLoading={loadingFolders && !folders.length}
        isLoadingMore={loadingFolders}
        isReLoading={loadingFolders && folders.length > 0}
        pageSize={Math.max(5, folders.length || 5)}
        table={folderTable}
        tableBodyMaxHeight={folderBodyMaxHeight}
        hideGrouping
        stickyHeader
        onLoadMore={handleFolderScroll}
        onReload={onReload || (() => undefined)}
      />
    </section>
  )
}
