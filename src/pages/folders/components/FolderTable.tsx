import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import type {
  FileItem,
  FolderItem,
  RepositoryFilePage,
} from '../types/folderTypes'
import { mergeFileExplorerFilters } from '../api/folderApi'
import { FOLDER_FILES_SECTION_MAX_FOLDERS } from '../utils/folderExplorerUtils'
import { getRepositoryFieldStringValue } from '../utils/repositoryFieldUtils'
import { filterFolderFiles, filterFolders } from './FolderFilterBar'
import { DynamicIcon } from './icons'
import { EllipsisText, StatusPill } from './Ui'

const HIDDEN_FILE_KEYS = new Set([
  'storageproviderid',

  'storageprovidercode',

  'hasfilepath',

  'status',
])

type FileRow = {
  [key: string]: any

  id: string

  raw: any
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

  fileFilters?: Record<string, string>

  filePage?: RepositoryFilePage

  files: FileItem[]

  folderContextFilters?: Record<string, string>

  folderFilters?: Record<string, string>

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

const folderColumnHelper = createColumnHelper<FolderRow>()

const fileColumnHelper = createColumnHelper<FileRow>()

type SplitViewMode = 'split' | 'folders-only' | 'files-only'

const SPLIT_DIVIDER_HEIGHT = 44
const FULL_PANEL_FOLDER_HEIGHT = 'calc(100vh - 248px)'
const FULL_PANEL_FILE_HEIGHT = 'calc(100vh - 300px)'

const isHiddenFileKey = (key: string) => HIDDEN_FILE_KEYS.has(key.toLowerCase())

const getFileId = (file: any) => String((file as any).id ?? '')

const getFileColumnSizing = (
  column: {
    dataType?: string
    key: string
    label: string
  },
  contentLength = 0,
) => {
  if (column.key === '__name') {
    return { maxSize: 340, minSize: 220, size: 260 }
  }

  if (column.key === '__status') {
    return { maxSize: 180, minSize: 110, size: 130 }
  }

  if (column.key === 'actions') {
    return { maxSize: 72, minSize: 56, size: 64 }
  }

  const dataType = String(column.dataType || '').toLowerCase()
  const key = column.key.toLowerCase()
  const label = column.label || column.key
  const labelWidth = Math.ceil(label.length * 8.5) + 40
  const contentWidth =
    Math.ceil(Math.max(contentLength, label.length) * 8.2) + 40

  if (
    dataType.includes('date') ||
    key.includes('date') ||
    dataType.includes('time')
  ) {
    return { maxSize: 200, minSize: 130, size: 160 }
  }

  if (
    ['currency', 'decimal', 'number', 'int', 'amount', 'money'].some(
      (token) => dataType.includes(token) || key.includes(token),
    )
  ) {
    return {
      maxSize: 200,
      minSize: 120,
      size: Math.min(Math.max(140, labelWidth, contentWidth), 200),
    }
  }

  return {
    maxSize: 420,
    minSize: 120,
    size: Math.min(Math.max(labelWidth, contentWidth, 140), 280),
  }
}

const getRepositoryFieldValue = (
  row: any,
  sqlColumnName: string,
  folderContextFilters: Record<string, string> = {},
) => {
  const value = getRepositoryFieldStringValue(
    row,
    sqlColumnName,
    folderContextFilters,
  )
  return value || '-'
}

export default function FolderTableDataTableSplit({
  error = '',

  fileColumns = [],

  fileFilters = {},

  filePage,

  files,

  folderContextFilters = {},

  folderFilters = {},

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
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{ startHeight: number; startY: number } | null>(
    null,
  )
  const pendingHeightRef = useRef<number | null>(null)
  const dragRafRef = useRef<number | null>(null)
  const [folderSectionHeight, setFolderSectionHeight] = useState<number | null>(
    null,
  )
  const [splitViewMode, setSplitViewMode] = useState<SplitViewMode>('split')
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)

  const visibleFileColumns = useMemo(
    () => fileColumns.filter((column) => !isHiddenFileKey(column.key)),

    [fileColumns],
  )

  const effectiveFolderTotal = folderTotalCount ?? folders.length

  const hasMoreFolders = Boolean(
    onLoadMoreFolders && folderHasMore && folders.length < effectiveFolderTotal,
  )

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
  const canResizeSplit =
    folders.length > 0 &&
    (files.length > 0 || loading || loadingPage) &&
    folders.length < FOLDER_FILES_SECTION_MAX_FOLDERS
  const defaultFolderBodyHeight = Math.min(
    220,
    Math.max(96, folders.length * 56 + 52),
  )
  const showFoldersPane = splitViewMode !== 'files-only'
  const showFilesPane = splitViewMode !== 'folders-only'
  const canExpandFolders = splitViewMode !== 'folders-only'
  const canExpandFiles = splitViewMode !== 'files-only'

  const getSplitBounds = useCallback(() => {
    const containerHeight = splitContainerRef.current?.clientHeight ?? 0
    const minFolderHeight = 72
    const minFileHeight = 120
    const maxFolderHeight = Math.max(
      minFolderHeight,
      containerHeight - SPLIT_DIVIDER_HEIGHT - minFileHeight,
    )
    return { maxFolderHeight, minFolderHeight }
  }, [])

  const clampFolderHeight = useCallback(
    (height: number) => {
      const { maxFolderHeight, minFolderHeight } = getSplitBounds()
      return Math.max(minFolderHeight, Math.min(maxFolderHeight, height))
    },
    [getSplitBounds],
  )

  const resolvedFolderBodyHeight = clampFolderHeight(
    folderSectionHeight ?? defaultFolderBodyHeight,
  )

  const resolveSplitModeFromHeight = useCallback(
    (height: number): SplitViewMode => {
      const { maxFolderHeight, minFolderHeight } = getSplitBounds()
      if (height <= minFolderHeight + 24) return 'files-only'
      if (height >= maxFolderHeight - 24) return 'folders-only'
      return 'split'
    },
    [getSplitBounds],
  )

  useEffect(() => {
    if (!canResizeSplit) {
      setFolderSectionHeight(null)
      setSplitViewMode('split')
    }
  }, [canResizeSplit])

  useEffect(() => {
    if (!isDraggingDivider) return

    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      pendingHeightRef.current = clampFolderHeight(
        dragState.startHeight + (event.clientY - dragState.startY),
      )

      if (dragRafRef.current) return
      dragRafRef.current = window.requestAnimationFrame(() => {
        const height = pendingHeightRef.current
        if (height === null) {
          dragRafRef.current = null
          return
        }

        const nextMode = resolveSplitModeFromHeight(height)
        setSplitViewMode(nextMode)
        if (nextMode === 'split') {
          setFolderSectionHeight(height)
        }
        dragRafRef.current = null
      })
    }

    const handleMouseUp = () => {
      setIsDraggingDivider(false)
      dragStateRef.current = null
      pendingHeightRef.current = null
      if (dragRafRef.current) {
        window.cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = null
      }
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      if (dragRafRef.current) {
        window.cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = null
      }
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [clampFolderHeight, isDraggingDivider, resolveSplitModeFromHeight])

  const beginDividerDrag = useCallback(
    (clientY: number) => {
      setSplitViewMode('split')
      setIsDraggingDivider(true)
      dragStateRef.current = {
        startHeight:
          splitViewMode === 'files-only'
            ? getSplitBounds().minFolderHeight
            : splitViewMode === 'folders-only'
              ? getSplitBounds().maxFolderHeight
              : resolvedFolderBodyHeight,
        startY: clientY,
      }
    },
    [getSplitBounds, resolvedFolderBodyHeight, splitViewMode],
  )

  const handleDividerMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (event.button !== 0) return
      if ((event.target as HTMLElement).closest('button')) return

      event.preventDefault()
      beginDividerDrag(event.clientY)
    },
    [beginDividerDrag],
  )

  return (
    <div className='animate-in fade-in relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface duration-300'>
      {(refreshing || loading) && !loadingPage && !loadingFolders ? (
        <div className='absolute top-0 right-0 left-0 z-30 h-1 overflow-hidden bg-[#edf0fb]'>
          <div className='h-full w-1/3 animate-[ez-loading_1.1s_ease-in-out_infinite] rounded-full bg-primary-9' />
        </div>
      ) : null}

      <div
        ref={splitContainerRef}
        className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-surface p-3 ${
          splitViewMode === 'split' ? 'gap-3' : 'gap-0'
        }`}
      >
        {showFoldersPane ? (
          <FolderDataTableSection
            effectiveFolderTotal={effectiveFolderTotal}
            folderFilters={folderFilters}
            folders={folders}
            folderSearch={folderSearch}
            hasFiles={filesHave}
            hasMoreFolders={hasMoreFolders}
            isExpanded={splitViewMode === 'folders-only'}
            loading={loading}
            loadingFolders={loadingFolders}
            loadingPage={loadingPage}
            folderBodyMaxHeight={
              splitViewMode === 'folders-only'
                ? FULL_PANEL_FOLDER_HEIGHT
                : `${resolvedFolderBodyHeight}px`
            }
            onLoadMoreFolders={onLoadMoreFolders}
            onOpenFolder={onOpenFolder}
            onReload={onReload}
          />
        ) : null}

        {canResizeSplit ? (
          <div
            style={{ height: SPLIT_DIVIDER_HEIGHT }}
            className={`relative flex shrink-0 touch-none items-center justify-center select-none ${
              isDraggingDivider
                ? 'cursor-grabbing bg-gray-3/40'
                : 'cursor-grab hover:bg-gray-3/30'
            }`}
            onMouseDown={handleDividerMouseDown}
          >
            <div className='pointer-events-none absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-gray-4' />

            <div className='relative z-10 flex items-center gap-2'>
              <div
                className='shrink-0'
                onMouseDown={(event) => event.stopPropagation()}
              >
                <IconButton
                  ariaLabel='Show folders only'
                  className='rounded-full bg-surface shadow-sm'
                  color='gray'
                  disabled={!canExpandFolders}
                  icon='lucide:chevron-up'
                  size='md'
                  tooltip='Show folders only'
                  variant='outline'
                  onClick={() => {
                    setSplitViewMode('folders-only')
                    setFolderSectionHeight(getSplitBounds().maxFolderHeight)
                  }}
                />
              </div>

              <div
                className={`flex items-center gap-2 rounded-full border border-gray-3 bg-surface px-4 py-1.5 text-xs font-bold text-gray-10 shadow-sm ${
                  isDraggingDivider ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                {splitViewMode === 'files-only' ? (
                  <>
                    <DynamicIcon
                      className='h-4 w-4 text-gray-8'
                      name='folder'
                    />
                    <span className='text-gray-8'>FOLDERS</span>
                    <span className='h-px w-5 bg-gray-4' />
                    <span className='text-gray-8'>{folders.length}</span>
                  </>
                ) : (
                  <>
                    <DynamicIcon
                      className='h-4 w-4 text-gray-8'
                      name='fileText'
                    />
                    <span className='text-gray-8'>FILES IN THIS FOLDER</span>
                    <span className='h-px w-5 bg-gray-4' />
                    <span className='text-gray-8'>{files.length}</span>
                  </>
                )}
              </div>

              <div
                className='shrink-0'
                onMouseDown={(event) => event.stopPropagation()}
              >
                <IconButton
                  ariaLabel='Show files only'
                  className='rounded-full bg-surface shadow-sm'
                  color='gray'
                  disabled={!canExpandFiles}
                  icon='lucide:chevron-down'
                  size='md'
                  tooltip='Show files only'
                  variant='outline'
                  onClick={() => {
                    setSplitViewMode('files-only')
                    setFolderSectionHeight(getSplitBounds().minFolderHeight)
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {showFilesPane &&
        (files.length || loading || loadingPage) &&
        folders.length < FOLDER_FILES_SECTION_MAX_FOLDERS ? (
          <FileDataTableSection
            columns={visibleFileColumns}
            fileFilters={fileFilters}
            filePage={filePage}
            files={files}
            folderContextFilters={folderContextFilters}
            folderFilters={folderFilters}
            foldersLength={folders.length}
            isExpanded={splitViewMode === 'files-only'}
            loading={loading}
            loadingPage={loadingPage}
            customFolderHeight={
              canResizeSplit && splitViewMode === 'split'
                ? resolvedFolderBodyHeight
                : undefined
            }
            onAiSummary={onAiSummary}
            onEditMetadata={onEditMetadata}
            onOpenFile={onOpenFile}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onReload={onReload}
            onShare={onShare}
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
  customFolderHeight,
  fileFilters = {},
  filePage,
  files,
  folderContextFilters = {},
  folderFilters = {},
  foldersLength,
  isExpanded = false,
  loading,
  loadingPage,
  onAiSummary,
  onEditMetadata,
  onOpenFile,
  onPageChange,
  onPageSizeChange,
  onReload,
  onShare,
  onWorkflow,
}: {
  columns: DynamicRepositoryColumn[]
  customFolderHeight?: number
  fileFilters?: Record<string, string>
  filePage?: RepositoryFilePage
  files: FileItem[]
  folderContextFilters?: Record<string, string>
  folderFilters?: Record<string, string>
  foldersLength: number
  isExpanded?: boolean
  loading: boolean
  loadingPage: boolean
  onAiSummary: (id: string) => void
  onEditMetadata: (id: string) => void
  onOpenFile: (id: string) => void
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onReload?: () => void
  onShare: (id: string) => void
  onWorkflow: (id: string) => void
}) {
  const mergedFileFilters = useMemo(
    () => mergeFileExplorerFilters(folderFilters, fileFilters),
    [folderFilters, fileFilters],
  )

  const filteredFiles = useMemo(
    () =>
      filterFolderFiles(
        files as Array<Record<string, unknown>>,
        mergedFileFilters,
        folderContextFilters,
      ),
    [folderContextFilters, files, mergedFileFilters],
  )

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
      filteredFiles.map((file) => {
        const row: FileRow = {
          __name: getPrimaryFileName(file),
          __status: String(
            (file as any)?.status ?? (file as any)?.Status ?? '',
          ),
          id: getFileId(file),
          raw: file,
        }

        columns.forEach((column) => {
          row[column.key] = getRepositoryFieldValue(
            file as any,
            column.key,
            folderContextFilters,
          )
        })

        return row
      }),
    [columns, filteredFiles, folderContextFilters],
  )

  const fileColumns = useMemo(() => {
    const normalColumns = columns.filter(
      (column) =>
        !hiddenFirstColumnKeys.includes(column.key) &&
        column.key.toLowerCase() !== 'status',
    )

    const resolvedColumns: DynamicRepositoryColumn[] = [
      {
        key: '__name',
        label: 'Name',
      } as DynamicRepositoryColumn,
      {
        key: '__status',
        label: 'Current Stage',
      } as DynamicRepositoryColumn,
      ...normalColumns,
    ]

    const dynamicColumns = resolvedColumns.map((column, index) => {
      const sizing = getFileColumnSizing(column)
      const isPinnedColumn = column.key === '__name'

      return fileColumnHelper.accessor((row) => row[column.key], {
        enableResizing: !isPinnedColumn,
        header: column.label,
        id: column.key,
        maxSize: sizing.maxSize,
        minSize: sizing.minSize,
        size: sizing.size,
        cell: ({ row, getValue }) => {
          const fileId = row.original.id
          const value = String(getValue() || '-')

          if (index === 0) {
            return (
              <button
                className='flex max-w-full min-w-0 items-center gap-3 text-left'
                type='button'
                onClick={() => onOpenFile(fileId)}
              >
                <DynamicIcon
                  className='h-5 w-5 shrink-0 text-[#4f5b88]'
                  name='fileText'
                />
                <EllipsisText
                  className='font-semibold text-gray-13'
                  lines={1}
                  value={value}
                />
              </button>
            )
          }

          if (column.key === '__status') {
            const status = String(getValue() || '').trim()
            if (!status) {
              return <span className='text-gray-10'>—</span>
            }
            return <StatusPill status={status} />
          }

          return <span className='text-gray-10'>{value}</span>
        },
      })
    })

    return [
      ...dynamicColumns,
      fileColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        maxSize: 72,
        meta: { headerAlign: 'right' as const },
        minSize: 56,
        size: 64,
        cell: ({ row }) => {
          const fileId = row.original.id

          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={220}
                withinPortal
                target={
                  <button
                    className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 transition-all hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40'
                    disabled={loadingPage}
                    type='button'
                  >
                    <DynamicIcon className='h-4 w-4' name='more' />
                  </button>
                }
              >
                <MenuItem
                  icon='lucide:eye'
                  label='View Details'
                  onClick={() => onOpenFile(fileId)}
                />
                <MenuItem
                  icon='lucide:pencil'
                  label='Edit Metadata'
                  onClick={() => onEditMetadata(fileId)}
                />
                <MenuItem
                  icon='lucide:bot'
                  label='AI Summary'
                  onClick={() => onAiSummary(fileId)}
                />
                <MenuItem
                  icon='lucide:share-2'
                  label='Share'
                  onClick={() => onShare(fileId)}
                />
                <MenuItem
                  icon='lucide:play'
                  label='Start Workflow'
                  onClick={() => onWorkflow(fileId)}
                />
                <MenuDivider />
                <MenuItem
                  className='text-red-9'
                  icon='lucide:trash-2'
                  iconClass='text-red-9'
                  label='Delete'
                />
              </Menu>
            </div>
          )
        },
      }),
    ]
  }, [
    columns,
    hiddenFirstColumnKeys,
    loadingPage,
    onAiSummary,
    onEditMetadata,
    onOpenFile,
    onShare,
    onWorkflow,
  ])

  const fileTable = useReactTable({
    columnResizeMode: 'onChange',
    columns: fileColumns,
    data: fileRows,
    defaultColumn: {
      enableResizing: true,
      enableSorting: true,
      maxSize: 480,
      minSize: 80,
    },
    enableColumnResizing: true,
    enableSorting: true,
    initialState: {
      columnPinning: {
        left: ['__name'],
        right: ['actions'],
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `file-${row.id}`,
    getSortedRowModel: getSortedRowModel(),
  })

  const currentPage = filePage?.page || 1
  const pageSize = filePage?.pageSize || 50
  const apiTotalCount = Number(filePage?.totalCount ?? 0)
  const totalCount =
    apiTotalCount > 0
      ? apiTotalCount
      : filePage?.hasMore
        ? Math.max(currentPage * pageSize + 1, filteredFiles.length)
        : Math.max(
            (currentPage - 1) * pageSize + filteredFiles.length,
            filteredFiles.length,
          )

  const showFiles =
    filteredFiles.length || files.length || loading || loadingPage

  if (!showFiles) return null

  const folderReservedHeight = isExpanded
    ? SPLIT_DIVIDER_HEIGHT + 24
    : foldersLength > 0
      ? (customFolderHeight ??
          Math.min(220, Math.max(96, foldersLength * 56 + 52))) + 84
      : 15

  const fileTableMaxHeight = isExpanded
    ? FULL_PANEL_FILE_HEIGHT
    : `calc(100vh - ${folderReservedHeight + 220}px)`

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
          isSticky
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

            if (nextPage === currentPage) return

            if (nextPage < currentPage) {
              onPageChange?.(nextPage, null)
              return
            }

            onPageChange?.(nextPage, filePage?.nextCursor || null)
          }}
          onPageSizeChange={(nextPageSize) => {
            if (loadingPage) return
            onPageSizeChange?.(nextPageSize)
          }}
        />
      ) : null}
    </section>
  )
}

function FolderDataTableSection({
  folderBodyMaxHeight,
  folderFilters = {},
  folders,
  folderSearch,

  hasFiles,

  hasMoreFolders,

  isExpanded = false,

  loading,

  loadingFolders,

  loadingPage,

  onLoadMoreFolders,

  onOpenFolder,

  onReload,
}: {
  effectiveFolderTotal: number
  folderBodyMaxHeight?: string
  folderFilters?: Record<string, string>
  folders: FolderItem[]

  folderSearch: string

  hasFiles: boolean

  hasMoreFolders: boolean

  isExpanded?: boolean

  loading: boolean

  loadingFolders: boolean

  loadingPage: boolean

  onLoadMoreFolders?: () => void

  onOpenFolder: (id: string) => void

  onReload?: () => void
}) {
  const folderScrollRef = useRef<HTMLDivElement | null>(null)

  const lastFolderScrollTopRef = useRef(0)

  const requestedFolderCountRef = useRef(0)

  const filteredFolders = useMemo(
    () => filterFolders(folders, folderFilters),
    [folderFilters, folders],
  )

  const folderRows = useMemo<FolderRow[]>(
    () =>
      filteredFolders.map((folder) => ({
        id: folder.id,

        items: folder.itemsText || '-',

        modified: folder.modifiedText || '-',

        name: folder.title,

        raw: folder,
      })),

    [filteredFolders],
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
        maxSize: 360,
        minSize: 200,
        size: 280,
        cell: ({ row }) => {
          const folder = row.original.raw

          return (
            <button
              className='flex max-w-full min-w-0 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60'
              disabled={loadingFolders || loadingPage}
              type='button'
              onClick={() => onOpenFolder(row.original.id)}
            >
              <DynamicIcon
                className='h-5 w-5 shrink-0 text-[#4f5b88]'
                name={folder.iconKey || 'folder'}
              />

              <EllipsisText
                className='font-bold text-gray-13'
                lines={1}
                value={row.original.name}
              />
            </button>
          )
        },
      }),

      folderColumnHelper.accessor('items', {
        header: 'Items',
        id: 'items',
        maxSize: 140,
        minSize: 100,
        size: 120,
        cell: ({ getValue }) => (
          <span className='text-gray-10'>{String(getValue() || '-')}</span>
        ),
      }),

      folderColumnHelper.accessor('modified', {
        header: 'Date Modified',
        id: 'modified',
        maxSize: 180,
        minSize: 130,
        size: 150,
        cell: ({ getValue }) => (
          <span className='text-gray-10'>{String(getValue() || '-')}</span>
        ),
      }),

      folderColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        maxSize: 72,
        minSize: 56,
        size: 64,

        cell: ({ row }) => {
          const folderId = row.original.id

          return (
            <div
              className='flex justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                width={200}
                withinPortal
                target={
                  <button
                    className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 transition-all hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40'
                    disabled={loadingFolders}
                    type='button'
                  >
                    <DynamicIcon className='h-4 w-4' name='more' />
                  </button>
                }
              >
                <MenuItem
                  icon='lucide:folder'
                  label='Open'
                  onClick={() => onOpenFolder(folderId)}
                />
                <MenuItem icon='lucide:pencil' label='Rename' />
                <MenuItem icon='lucide:share-2' label='Share' />
                <MenuDivider />
                <MenuItem
                  className='text-red-9'
                  icon='lucide:trash-2'
                  iconClass='text-red-9'
                  label='Delete'
                />
              </Menu>
            </div>
          )
        },
      }),
    ],

    [loadingFolders, loadingPage, onOpenFolder],
  )

  const folderTable = useReactTable({
    columns: folderColumns,
    data: folderRows,
    defaultColumn: {
      enableSorting: true,
    },
    enableSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `folder-${row.id}`,
    getSortedRowModel: getSortedRowModel(),
  })

  if (!folders.length && !folderSearch && !loadingFolders) return null

  const resolvedFolderBodyMaxHeight =
    folderBodyMaxHeight ||
    (hasFiles && folders.length < FOLDER_FILES_SECTION_MAX_FOLDERS
      ? `${Math.min(220, Math.max(96, folders.length * 56 + 52))}px`
      : 'calc(100vh - 220px)')

  return (
    <section
      className={
        isExpanded || !hasFiles
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
          : 'shrink-0 overflow-hidden'
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
        tableBodyMaxHeight={resolvedFolderBodyMaxHeight}
        hideGrouping
        stickyHeader
        onLoadMore={handleFolderScroll}
        onReload={onReload || (() => undefined)}
      />
    </section>
  )
}
