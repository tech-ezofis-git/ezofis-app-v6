import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {

  createColumnHelper,

  getCoreRowModel,

  useReactTable,

} from '@tanstack/react-table'

import DataTable from '@/components/base/data-table/DataTable'

import type { FileItem, FolderItem, RepositoryFilePage } from '../types/folderTypes'

import type { DynamicRepositoryColumn } from '../api/folderApi'

import { DynamicIcon } from './icons'
import Pagination from '@/components/base/pagination/Pagination'



const HIDDEN_FILE_KEYS = new Set([

  'storageproviderid',

  'storageprovidercode',

  'hasfilepath',

])




type RowKind = 'folder' | 'file'



type FolderRow = {

  id: string

  name: string

  items: string

  modified: string

  raw: FolderItem

}



type FileRow = {

  id: string

  raw: FileItem

  [key: string]: any

}



type OpenMenuState = {

  type: RowKind

  id: string

} | null



type FolderTableDataTableSplitProps = {

  folders: FolderItem[]

  files: FileItem[]

  fileColumns?: DynamicRepositoryColumn[]

  loading?: boolean

  refreshing?: boolean

  error?: string

  filePage?: RepositoryFilePage

  loadingPage?: boolean

  loadingFolders?: boolean

  folderTotalCount?: number

  folderSearch?: string

  folderHasMore?: boolean

  onOpenFolder: (id: string) => void

  onOpenFile: (id: string) => void

  onEditMetadata: (id: string) => void

  onAiSummary: (id: string) => void

  onShare: (id: string) => void

  onWorkflow: (id: string) => void

  onPageChange?: (page: number, cursor?: string | null) => void

  onPageSizeChange?: (pageSize: number) => void

  onLoadMoreFolders?: () => void

  onReload?: () => void

}



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

  folders,

  files,

  fileColumns = [],

  loading = false,

  refreshing = false,

  error = '',

  filePage,

  loadingPage = false,

  loadingFolders = false,

  folderTotalCount,

  folderSearch = '',

  folderHasMore,

  onOpenFolder,

  onOpenFile,

  onEditMetadata,

  onAiSummary,

  onShare,

  onWorkflow,

  onPageChange,

  onPageSizeChange,

  onLoadMoreFolders,

  onReload,

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

      current?.type === type && current.id === id ? null : { type, id },

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

      <div className="flex h-full min-h-0 flex-col bg-surface">

        <div className="m-4 rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10">

          {error}

        </div>

      </div>

    )

  }
  const filesHave = files.length > 0 || loading || loadingPage


  return (

    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface animate-in fade-in duration-300">

      {(refreshing || loading) && !loadingPage && !loadingFolders ? (

        <div className="absolute left-0 right-0 top-0 z-30 h-1 overflow-hidden bg-[#edf0fb]">

          <div className="h-full w-1/3 animate-[ez-loading_1.1s_ease-in-out_infinite] rounded-full bg-primary-9" />

        </div>

      ) : null}



      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-surface p-3">

        <FolderDataTableSection

          folders={folders}

          folderSearch={folderSearch}

          loading={loading}

          loadingFolders={loadingFolders}

          loadingPage={loadingPage}

          effectiveFolderTotal={effectiveFolderTotal}

          hasMoreFolders={hasMoreFolders}
          hasFiles={filesHave}
          openMenu={openMenu}

          menuRef={menuRef}

          onOpenFolder={onOpenFolder}

          onLoadMoreFolders={onLoadMoreFolders}

          onToggleMenu={toggleMenu}

          onCloseMenu={closeMenu}

          onReload={onReload}

        />



        {folders.length< 10&&folders.length && files.length ? (

          <div className="relative flex shrink-0 items-center justify-center py-1">

            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gray-4" />

            <div className="relative z-10 flex items-center gap-2 rounded-full border border-gray-3 bg-surface px-4 py-1.5 text-xs font-bold text-gray-10 shadow-sm">

              <DynamicIcon name="fileText" className="h-4 w-4 text-gray-8" />

              <span className="rounded px-1.5 py-0.5 text-gray-8">FILES IN THIS FOLDER</span>

              <span className="h-px w-5 bg-gray-4" />

              <span className="text-gray-8">{files.length}</span>

            </div>

          </div>

        ) : null}



        {(files.length || loading || loadingPage) && folders.length < 10 ? (

          <FileDataTableSection
            files={files}
            foldersLength={folders.length}
            columns={visibleFileColumns}
            filePage={filePage}
            loading={loading}
            loadingPage={loadingPage}
            openMenu={openMenu}
            menuRef={menuRef}
            onOpenFile={onOpenFile}
            onEditMetadata={onEditMetadata}
            onAiSummary={onAiSummary}
            onShare={onShare}
            onWorkflow={onWorkflow}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onToggleMenu={toggleMenu}
            onCloseMenu={closeMenu}
            onReload={onReload}
          />) : null}



        {!loading && !loadingPage && !loadingFolders && !folders.length && !files.length ? (

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



function FolderDataTableSection({

  folders,

  hasFiles,

  folderSearch,

  loading,

  loadingFolders,

  loadingPage,


  hasMoreFolders,

  openMenu,

  menuRef,

  onOpenFolder,

  onLoadMoreFolders,

  onToggleMenu,

  onCloseMenu,

  onReload,

}: {

  folders: FolderItem[]

  hasFiles: boolean

  folderSearch: string

  loading: boolean

  loadingFolders: boolean

  loadingPage: boolean

  effectiveFolderTotal: number

  hasMoreFolders: boolean

  openMenu: OpenMenuState

  menuRef: React.RefObject<HTMLDivElement | null>

  onOpenFolder: (id: string) => void

  onLoadMoreFolders?: () => void

  onToggleMenu: (type: RowKind, id: string) => void

  onCloseMenu: () => void

  onReload?: () => void

}) {

  const folderScrollRef = useRef<HTMLDivElement | null>(null)

  const lastFolderScrollTopRef = useRef(0)

  const requestedFolderCountRef = useRef(0)



  const folderRows = useMemo<FolderRow[]>(

    () =>

      folders.map((folder) => ({

        id: folder.id,

        name: folder.title,

        items: folder.itemsText || '-',

        modified: folder.modifiedText || '-',

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

        id: 'name',

        header: 'Name',

        cell: ({ row }) => {

          const folder = row.original.raw



          return (

            <button

              type="button"

              disabled={loadingFolders || loadingPage}

              className="flex min-w-0 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"

              title={row.original.name}

              onClick={() => onOpenFolder(row.original.id)}

            >

              <DynamicIcon

                name={folder.iconKey || 'folder'}

                className="h-5 w-5 shrink-0 text-[#4f5b88]"

              />

              <span className="truncate font-bold text-gray-13">{row.original.name}</span>

            </button>

          )

        },

      }),

      folderColumnHelper.accessor('items', {

        id: 'items',

        header: 'Items',

        cell: ({ getValue }) => <span className="text-gray-10">{String(getValue() || '-')}</span>,

      }),

      folderColumnHelper.accessor('modified', {

        id: 'modified',

        header: 'Date Modified',

        cell: ({ getValue }) => <span className="text-gray-10">{String(getValue() || '-')}</span>,

      }),

      folderColumnHelper.display({

        id: 'actions',

        header: '',

        cell: ({ row }) => {

          const folderId = row.original.id



          return (

            <div className="relative flex justify-end">

              <button

                type="button"

                disabled={loadingFolders}

                onClick={(event) => {

                  event.stopPropagation()

                  onToggleMenu('folder', folderId)

                }}

                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 transition-all hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40"

              >

                <DynamicIcon name="more" className="h-4 w-4" />

              </button>



              {openMenu?.type === 'folder' && openMenu.id === folderId ? (

                <div

                  ref={menuRef}

                  className="absolute right-0 top-9 z-50 w-[200px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-xl"

                >

                  <ActionMenuItem icon="folder" label="Open" onClick={() => { onCloseMenu(); onOpenFolder(folderId) }} />

                  <ActionMenuItem icon="edit" label="Rename" onClick={onCloseMenu} />

                  <ActionMenuItem icon="share" label="Share" onClick={onCloseMenu} />

                  <div className="my-2 border-t border-gray-3" />

                  <ActionMenuItem icon="trash" label="Delete" danger onClick={onCloseMenu} />

                </div>

              ) : null}

            </div>

          )

        },

      }),

    ],

    [loadingFolders, loadingPage, menuRef, onCloseMenu, onOpenFolder, onToggleMenu, openMenu],

  )



  const folderTable = useReactTable({

    data: folderRows,

    columns: folderColumns,

    getCoreRowModel: getCoreRowModel(),

    getRowId: (row) => `folder-${row.id}`,

  })



  if (!folders.length && !folderSearch && !loadingFolders) return null


  const folderBodyMaxHeight = hasFiles && folders.length < 10
    ? `${Math.min(220, Math.max(96, folders.length * 56 + 52))}px`
    : 'calc(100vh - 220px)'

  return (

    <section className={hasFiles ? 'shrink-0 overflow-hidden' : 'flex min-h-0 flex-1 flex-col overflow-hidden'}>
      <DataTable

        table={folderTable}

        isLoading={loadingFolders && !folders.length}

        isReLoading={loadingFolders && folders.length > 0}

        pageSize={Math.max(5, folders.length || 5)}

        stickyHeader

        hideGrouping

        component={<div />}

        onReload={onReload || (() => undefined)}

        hasMore={hasMoreFolders}

        isLoadingMore={loadingFolders}

        onLoadMore={handleFolderScroll}

        tableBodyMaxHeight={folderBodyMaxHeight}

      />













    </section>

  )

}



function FileDataTableSection({
  files,
  columns,
  filePage,
  loading,
  loadingPage,
  openMenu,
  menuRef,
  foldersLength,
  onOpenFile,
  onEditMetadata,
  onAiSummary,
  onShare,
  onWorkflow,
  onPageChange,
  onPageSizeChange,
  onToggleMenu,
  onCloseMenu,
  onReload,
}: {
  files: FileItem[]
  columns: DynamicRepositoryColumn[]
  filePage?: RepositoryFilePage
  loading: boolean
  loadingPage: boolean
  openMenu: OpenMenuState
  menuRef: React.RefObject<HTMLDivElement | null>
  foldersLength: number
  onOpenFile: (id: string) => void
  onEditMetadata: (id: string) => void
  onAiSummary: (id: string) => void
  onShare: (id: string) => void
  onWorkflow: (id: string) => void
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onToggleMenu: (type: RowKind, id: string) => void
  onCloseMenu: () => void
  onReload?: () => void
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
          id: getFileId(file),
          raw: file,
          __name: getPrimaryFileName(file),
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
        id: column.key,
        header: column.label,
        cell: ({ row, getValue }) => {
          const fileId = row.original.id
          const value = String(getValue() || '-')

          if (index === 0) {
            return (
              <button
                type="button"
                className="flex min-w-0 items-center gap-3 text-left"
                title={value}
                onClick={() => onOpenFile(fileId)}
              >
                <DynamicIcon
                  name="fileText"
                  className="h-5 w-5 shrink-0 text-[#4f5b88]"
                />
                <span className="truncate font-semibold text-gray-13">
                  {value}
                </span>
              </button>
            )
          }

          return (
            <span
              className="block max-w-[260px] truncate text-gray-10"
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
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const fileId = row.original.id

          return (
            <div className="relative flex justify-end">
              <button
                type="button"
                disabled={loadingPage}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleMenu('file', fileId)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-13 transition-all hover:bg-gray-5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <DynamicIcon name="more" className="h-4 w-4" />
              </button>

              {openMenu?.type === 'file' && openMenu.id === fileId ? (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-9 z-50 w-[220px] overflow-hidden rounded-xl border border-gray-3 bg-surface py-2 shadow-xl"
                >
                  <ActionMenuItem
                    icon="eye"
                    label="View Details"
                    onClick={() => {
                      onCloseMenu()
                      onOpenFile(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon="edit"
                    label="Edit Metadata"
                    onClick={() => {
                      onCloseMenu()
                      onEditMetadata(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon="bot"
                    label="AI Summary"
                    onClick={() => {
                      onCloseMenu()
                      onAiSummary(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon="share"
                    label="Share"
                    onClick={() => {
                      onCloseMenu()
                      onShare(fileId)
                    }}
                  />
                  <ActionMenuItem
                    icon="play"
                    label="Start Workflow"
                    onClick={() => {
                      onCloseMenu()
                      onWorkflow(fileId)
                    }}
                  />

                  <div className="my-2 border-t border-gray-3" />

                  <ActionMenuItem
                    icon="trash"
                    label="Delete"
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
    data: fileRows,
    columns: fileColumns,
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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          table={fileTable}
          isLoading={loading || loadingPage}
          isReLoading={loadingPage}
          pageSize={pageSize}
          stickyHeader
          hideGrouping
          component={<div />}
          onReload={onReload || (() => undefined)}
          tableBodyMaxHeight={fileTableMaxHeight}
        />
      </div>

      {filePage ? (
        <Pagination
          itemLabel="Files"
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







function EmptyState() {

  return (

    <div className="flex h-full min-h-[320px] items-center justify-center bg-surface px-6 text-center">

      <div>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-3 shadow-sm">

          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white">

            <DynamicIcon name="folder" className="h-8 w-8 text-gray-10" />

          </div>

        </div>



        <h3 className="mt-5 text-[16px] font-bold text-gray-13">

          No repository items found

        </h3>



        <p className="mt-2 max-w-[460px] text-[14px] font-medium leading-6 text-gray-10">

          This folder does not contain any folders or files yet. Upload documents or create a new folder to start organizing repository content.

        </p>

      </div>

    </div>

  )

}











function ActionMenuItem({

  icon,

  label,

  danger = false,

  onClick,

}: {

  icon: string

  label: string

  danger?: boolean

  onClick: () => void

}) {

  return (

    <button

      type="button"

      onClick={(event) => {

        event.stopPropagation()

        onClick()

      }}

      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-all hover:bg-gray-2 ${danger ? 'text-red-9' : 'text-gray-13'

        }`}

    >

      <DynamicIcon name={icon} className="h-4 w-4 text-current" />

      {label}

    </button>

  )

}

