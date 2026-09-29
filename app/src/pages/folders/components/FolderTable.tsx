import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useLingui } from '@lingui/react/macro'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import Pagination from '@/components/base/pagination/Pagination'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import { isAccountsPayableFolder } from './DocumentsListView'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import {
  mergeFileExplorerFilters,
  getPagedData,
  toPage,
  toFileItem,
} from '../api/folderApi'
import { getRepositoryItems } from '../../../api/v6/folder/folder'
import type {
  FileItem,
  FolderItem,
  RepositoryFilePage,
} from '../types/folderTypes'
import {
  FOLDER_FILES_SECTION_MAX_FOLDERS,
  formatFolderModifiedDate,
} from '../utils/folderExplorerUtils'
import {
  getRepositoryFieldRawValue,
  getRepositoryFieldStringValue,
} from '../utils/repositoryFieldUtils'
import { EmptyFolderUploadDropzone } from './EmptyFolderUploadDropzone'
import { filterFolderFiles, filterFolders } from './FolderFilterBar'
import DynamicTableColumnCell, {
  isTableColumnType,
} from './DynamicTableColumnCell'
import { DynamicIcon } from './icons'
import Button from '@/components/base/button/Button'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import Tooltip from '@/components/base/Tooltip'
import {
  hasAllMandatoryFieldsFilled,
  isArchivedFile,
  isUnarchivedStageFile,
  StagedFileDeleteButton,
  StagedFileExportButton,
} from './StagedFileDeleteButton'
import {
  FileCategorySegmentedControl,
  type FileCategory,
} from './FileCategorySegmentedControl'
import { EllipsisText, StatusPill } from './Ui'
import cn from '@/utils/cn'

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

  createdBy: string

  raw: FolderItem
}

type FolderTableDataTableSplitProps = {
  repositoryId?: string

  error?: string

  fileColumns?: DynamicRepositoryColumn[]

  fileFilters?: Record<string, string>

  filePage?: RepositoryFilePage

  files: FileItem[]

  fileSearch?: string

  folderContextFilters?: Record<string, string>

  folderFilters?: Record<string, string>

  folderHasMore?: boolean

  folders: FolderItem[]

  folderSearch?: string

  folderTotalCount?: number

  hideFolderActions?: boolean

  loading?: boolean

  loadingFolders?: boolean

  loadingPage?: boolean

  refreshing?: boolean

  onAiSummary: (id: string) => void

  onEditMetadata?: (id: string) => void

  onLoadMoreFolders?: () => void

  onOpenFile: (id: string) => void

  onOpenFolder: (id: string) => void

  onDeleteFile?: (fileId: string) => Promise<void>

  onDeleteStagedFile?: (file: FileItem) => Promise<void>

  onDeleteStagedFiles?: (files: FileItem[]) => Promise<void>

  onExportStagedFile?: (file: FileItem) => Promise<void>

  onExportStagedFiles?: (files: FileItem[]) => Promise<void>

  onPageChange?: (page: number, cursor?: string | null) => void

  onPageSizeChange?: (pageSize: number) => void

  onReload?: () => void

  onShare: (id: string) => void

  onUpload?: () => void

  onUploadFile?: (files: File[]) => void

  permissions?: {
    delete?: boolean
    editMetadata?: boolean
    upload?: boolean
  }

  uploadDisabled?: boolean

  onWorkflow?: (id: string) => void
}

const folderColumnHelper = createColumnHelper<FolderRow>()

const fileColumnHelper = createColumnHelper<FileRow>()

type SplitViewMode = 'split' | 'folders-only' | 'files-only'

const SPLIT_DIVIDER_HEIGHT = 36
const FULL_PANEL_FOLDER_HEIGHT = 'calc(100vh - 248px)'
const FULL_PANEL_FILE_HEIGHT = 'calc(100vh - 300px)'

const getSplitFolderBodyHeight = (folderCount: number) =>
  Math.min(260, Math.max(48, folderCount * 40 + 40))

const EXPLORER_CELL_META = {
  className: 'align-middle',
  disableEllipsis: true,
}
const EXPLORER_VALUE_CLASS = 'text-sm font-normal leading-4 text-gray-12'
const EXPLORER_NAME_BUTTON_CLASS =
  'flex min-w-0 max-w-full items-start gap-1.5 text-left'
const EXPLORER_NAME_TEXT_WRAP_CLASS = 'min-w-0 flex-1'
const EXPLORER_NAME_TEXT_CLASS = 'text-sm font-normal leading-4 text-gray-12'
const EXPLORER_ICON_WRAP_CLASS =
  'inline-flex size-4 shrink-0 items-center justify-center pt-0.5'
const EXPLORER_ICON_CLASS = 'block size-4 text-[#4f5b88]'

function ExplorerValue({ value }: { value: string }) {
  return (
    <div className='min-w-0 max-w-full'>
      <EllipsisText
        className={EXPLORER_VALUE_CLASS}
        lines={1}
        value={value}
      />
    </div>
  )
}

const isHiddenFileKey = (key: string) => HIDDEN_FILE_KEYS.has(key.toLowerCase())

const getFileId = (file: any) =>
  String(
    (file as any)?.id ??
    (file as any)?.stageFileId ??
    (file as any)?.ItemId ??
    (file as any)?.itemId ??
    '',
  )

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
  const contentWidth = Math.ceil(Math.max(contentLength, label.length) * 8.2) + 40

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

  if (isTableColumnType(column.dataType)) {
    return { maxSize: 220, minSize: 110, size: 130 }
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
  const value = getRepositoryFieldRawValue(
    row,
    sqlColumnName,
    folderContextFilters,
  )
  if (value === undefined || value === null || value === '') return '-'
  return value
}

export default function FolderTableDataTableSplit({
  error = '',

  fileColumns = [],

  fileFilters = {},

  filePage,

  files,

  fileSearch = '',

  folderContextFilters = {},

  folderFilters = {},

  folderHasMore,

  folders,

  folderSearch = '',

  folderTotalCount,

  hideFolderActions = false,

  loading = false,

  loadingFolders = false,

  loadingPage = false,

  refreshing = false,

  onAiSummary,

  onEditMetadata,

  onLoadMoreFolders,

  onOpenFile,

  onOpenFolder,

  onDeleteFile,

  onDeleteStagedFile,

  onDeleteStagedFiles,

  onExportStagedFile,

  onExportStagedFiles,

  onPageChange,

  onPageSizeChange,

  onReload,

  onShare,

  onUpload,

  onUploadFile,

  permissions,

  uploadDisabled = false,

  onWorkflow,

  repositoryId,
}: FolderTableDataTableSplitProps) {
  const { t } = useLingui()
  const [splitViewMode, setSplitViewMode] = useState<SplitViewMode>('split')
  const [fileCategory, setFileCategory] = useState<'all' | 'staged' | 'archived'>('all')

  const [archivedCount, setArchivedCount] = useState<number>(0)
  const [archivedFiles, setArchivedFiles] = useState<FileItem[]>([])
  const [archivedFilePage, setArchivedFilePage] = useState<RepositoryFilePage | undefined>(undefined)
  const [loadingArchived, setLoadingArchived] = useState<boolean>(false)

  const fetchArchivedFileList = useCallback(
    async (targetPage = 1, targetPageSize = 50) => {
      if (!repositoryId) return
      setLoadingArchived(true)
      try {
        const response = await getRepositoryItems({
          id: repositoryId,
          filters: {},
          page: targetPage,
          pageSize: targetPageSize,
          skipTotal: false,
          sortBy: 'id',
          sortOrder: 'desc',
        })
        if (response && !response.error && response.data) {
          const rawFiles = getPagedData<Record<string, any>>(response.data)
          const mappedFiles = rawFiles.map(toFileItem)
          const pageMeta = toPage(response.data)
          setArchivedFiles(mappedFiles)
          setArchivedFilePage(pageMeta)
          setArchivedCount(pageMeta.totalCount ?? mappedFiles.length)
        }
      } catch (err) {
        console.error('Failed to load archived file list:', err)
      } finally {
        setLoadingArchived(false)
      }
    },
    [repositoryId],
  )

  useEffect(() => {
    if (repositoryId) {
      void fetchArchivedFileList(1, 50)
    } else {
      setArchivedCount(0)
      setArchivedFiles([])
      setArchivedFilePage(undefined)
    }
  }, [repositoryId, refreshing, fetchArchivedFileList])

  const stagedCount = useMemo(
    () => files.filter(isUnarchivedStageFile).length,
    [files],
  )
  const effectiveArchivedCount = useMemo(() => {
    if (archivedCount > 0) return archivedCount
    if (filePage?.totalCount !== undefined && filePage.totalCount > 0) {
      return filePage.totalCount
    }
    return files.filter(isArchivedFile).length
  }, [archivedCount, filePage?.totalCount, files])

  const allCount = useMemo(
    () => stagedCount + effectiveArchivedCount,
    [stagedCount, effectiveArchivedCount],
  )

  useEffect(() => {
    if (stagedCount <= 0 && fileCategory !== 'all') {
      setFileCategory('all')
    }
  }, [stagedCount, fileCategory])

  const activeDisplayFiles = useMemo(() => {
    if (fileCategory === 'staged') {
      return files.filter(isUnarchivedStageFile)
    }
    if (fileCategory === 'archived') {
      return archivedFiles.length > 0
        ? archivedFiles
        : files.filter(isArchivedFile)
    }
    if (archivedFiles.length > 0 && files.filter(isArchivedFile).length === 0) {
      return [...files.filter(isUnarchivedStageFile), ...archivedFiles]
    }
    return files
  }, [files, fileCategory, archivedFiles])

  const activeDisplayFilePage = useMemo(() => {
    if (fileCategory === 'archived' && archivedFilePage) {
      return archivedFilePage
    }
    return filePage
  }, [fileCategory, archivedFilePage, filePage])

  const handleFilePageChange = useCallback(
    (page: number, cursor?: string | null) => {
      if (fileCategory === 'archived') {
        void fetchArchivedFileList(
          page,
          activeDisplayFilePage?.pageSize || 50,
        )
      } else {
        onPageChange?.(page, cursor)
      }
    },
    [fileCategory, fetchArchivedFileList, activeDisplayFilePage?.pageSize, onPageChange],
  )

  const handleFilePageSizeChange = useCallback(
    (nextPageSize: number) => {
      if (fileCategory === 'archived') {
        void fetchArchivedFileList(1, nextPageSize)
      } else {
        onPageSizeChange?.(nextPageSize)
      }
    },
    [fileCategory, fetchArchivedFileList, onPageSizeChange],
  )

  const handleReload = useCallback(() => {
    if (fileCategory === 'archived') {
      void fetchArchivedFileList(
        activeDisplayFilePage?.page || 1,
        activeDisplayFilePage?.pageSize || 50,
      )
    }
    onReload?.()
  }, [fileCategory, fetchArchivedFileList, activeDisplayFilePage?.page, activeDisplayFilePage?.pageSize, onReload])

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
  const filesHave =
    files.length > 0 ||
    loading ||
    loadingPage ||
    effectiveArchivedCount > 0 ||
    archivedFiles.length > 0 ||
    loadingArchived

  const canResizeSplit =
    folders.length > 0 &&
    (files.length > 0 ||
      loading ||
      loadingPage ||
      effectiveArchivedCount > 0 ||
      archivedFiles.length > 0 ||
      loadingArchived)
  const showFoldersPane = splitViewMode !== 'files-only'
  const showFilesPane = splitViewMode !== 'folders-only'
  const isSplitView = splitViewMode === 'split'

  useEffect(() => {
    if (!canResizeSplit) {
      setSplitViewMode('split')
    }
  }, [canResizeSplit])

  const handleLeftViewClick = useCallback(() => {
    setSplitViewMode((prev) => {
      if (prev === 'split') return 'files-only'
      if (prev === 'files-only') return 'folders-only'
      return 'files-only'
    })
  }, [])

  const handleRightViewClick = useCallback(() => {
    setSplitViewMode((prev) => (prev === 'split' ? 'folders-only' : 'split'))
  }, [])

  const leftViewLabel =
    splitViewMode === 'files-only' ? t`Show folders only` : t`Show files only`
  const rightViewLabel = isSplitView
    ? t`Show folders only`
    : t`Show both folders and files`

  const renderSplitDivider = () => (
    <div
      className='relative my-2 flex shrink-0 items-center justify-center select-none'
      style={{ height: SPLIT_DIVIDER_HEIGHT }}
    >
      <div className='pointer-events-none absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-gray-4' />

      <div className='relative z-10 flex items-center gap-2'>
        <IconButton
          ariaLabel={leftViewLabel}
          className='rounded-full bg-surface shadow-sm'
          color='gray'
          icon='lucide:chevron-up'
          size='sm'
          tooltip={leftViewLabel}
          variant='outline'
          onClick={handleLeftViewClick}
        />

        {stagedCount > 0 ? (
          <FileCategorySegmentedControl
            activeCategory={fileCategory}
            allCount={allCount}
            archivedCount={effectiveArchivedCount}
            stagedCount={stagedCount}
            onChange={(cat) => {
              setFileCategory(cat)
              if (cat === 'archived' && archivedFiles.length === 0 && repositoryId) {
                void fetchArchivedFileList(1, 50)
              }
              if (splitViewMode === 'folders-only') {
                setSplitViewMode('split')
              }
            }}
          />
        ) : (
          <div className='inline-flex items-center gap-2 rounded-full border border-gray-3 bg-surface px-3.5 py-1 text-xs font-normal leading-none text-gray-10 shadow-sm'>
            {splitViewMode === 'files-only' ? (
              <>
                <DynamicIcon
                  className='block size-3.5 shrink-0 text-gray-8'
                  name='folder'
                />
                <span className='leading-none text-gray-8'>{t`FOLDERS`}</span>
                <span className='rounded-full bg-gray-4 px-1.5 py-0.5 text-[10px] font-medium leading-none text-gray-11'>
                  {folders.length}
                </span>
              </>
            ) : (
              <>
                <DynamicIcon
                  className='block size-3.5 shrink-0 text-gray-8'
                  name='fileText'
                />
                <span className='leading-none text-gray-8'>{t`FILES IN THIS FOLDER`}</span>
                <span className='rounded-full bg-gray-4 px-1.5 py-0.5 text-[10px] font-medium leading-none text-gray-11'>
                  {allCount > 0 ? allCount : files.length}
                </span>
              </>
            )}
          </div>
        )}

        <IconButton
          ariaLabel={rightViewLabel}
          className='rounded-full bg-surface shadow-sm'
          color='gray'
          icon='lucide:chevron-down'
          size='sm'
          tooltip={rightViewLabel}
          variant='outline'
          onClick={handleRightViewClick}
        />
      </div>
    </div>
  )

  return (
    <div className='animate-in fade-in relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface duration-300'>
      {(refreshing || loading) && !loadingPage && !loadingFolders ? (
        <div className='absolute top-0 right-0 left-0 z-30 h-1 overflow-hidden bg-[#edf0fb]'>
          <div className='h-full origin-left animate-[ez-loading-fill_4s_ease-in-out_infinite] rounded-full bg-primary-9' />
        </div>
      ) : null}

      <div className='flex min-h-0 flex-1 flex-col gap-0 overflow-hidden bg-surface px-3 sm:px-6 pt-2 pb-1'>
        {showFoldersPane ? (
          <FolderDataTableSection
            folderBodyMaxHeight={
              splitViewMode === 'folders-only' || !canResizeSplit
                ? FULL_PANEL_FOLDER_HEIGHT
                : isSplitView
                  ? `${getSplitFolderBodyHeight(folders.length)}px`
                  : undefined
            }
            effectiveFolderTotal={effectiveFolderTotal}
            folderFilters={folderFilters}
            folders={folders}
            folderSearch={folderSearch}
            hasFiles={filesHave}
            hasMoreFolders={hasMoreFolders}
            hideFolderActions={hideFolderActions}
            isExpanded={splitViewMode === 'folders-only' || !canResizeSplit}
            isSplitView={canResizeSplit && isSplitView}
            loading={loading}
            loadingFolders={loadingFolders}
            loadingPage={loadingPage}
            onLoadMoreFolders={onLoadMoreFolders}
            onOpenFolder={onOpenFolder}
            onReload={onReload}
            rowSize={hideFolderActions ? 'default' : 'compact'}
          />
        ) : null}

        {canResizeSplit && isSplitView ? renderSplitDivider() : null}

        {showFilesPane &&
          (activeDisplayFiles.length > 0 ||
            files.length > 0 ||
            loading ||
            loadingPage ||
            loadingArchived ||
            fileCategory === 'archived') ? (
          <FileDataTableSection
            columns={visibleFileColumns}
            fileCategory={fileCategory}
            fileFilters={fileFilters}
            filePage={activeDisplayFilePage}
            files={activeDisplayFiles}
            fileSearch={fileSearch || folderSearch}
            folderContextFilters={folderContextFilters}
            folderFilters={folderFilters}
            foldersLength={folders.length}
            footerDivider={
              canResizeSplit && splitViewMode === 'files-only'
                ? renderSplitDivider()
                : undefined
            }
            isExpanded={splitViewMode === 'files-only'}
            isSplitView={isSplitView}
            loading={loading || loadingArchived}
            loadingPage={loadingPage}
            onAiSummary={onAiSummary}
            onEditMetadata={onEditMetadata}
            onOpenFile={onOpenFile}
            onPageChange={handleFilePageChange}
            onPageSizeChange={handleFilePageSizeChange}
            onReload={handleReload}
            onShare={onShare}
            onWorkflow={onWorkflow}
            onDeleteFile={onDeleteFile}
            onDeleteStagedFile={onDeleteStagedFile}
            onDeleteStagedFiles={onDeleteStagedFiles}
            onExportStagedFile={onExportStagedFile}
            onExportStagedFiles={onExportStagedFiles}
            permissions={permissions}
          />
        ) : null}

        {canResizeSplit &&
          !isSplitView &&
          splitViewMode !== 'files-only' ? (
          renderSplitDivider()
        ) : null}

        {!loading &&
          !loadingPage &&
          !loadingFolders &&
          !folders.length &&
          !files.length ? (
          <EmptyState
            onUpload={onUpload}
            onUploadFile={onUploadFile}
            uploadDisabled={uploadDisabled}
          />
        ) : null}
      </div>

      <style>{`
        @keyframes ez-loading-fill {
          0% {
            transform: scaleX(0);
          }
          80% {
            transform: scaleX(1);
          }
          100% {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  )
}

function EmptyState({
  onUpload,
  onUploadFile,
  uploadDisabled = false,
}: {
  onUpload?: () => void
  onUploadFile?: (files: File[]) => void
  uploadDisabled?: boolean
}) {
  const { t } = useLingui()
  return (
    <div className='flex h-full min-h-[320px] items-center justify-center bg-surface px-6 text-center'>
      <div className='flex w-full max-w-3xl flex-col items-center'>
        <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-3 shadow-sm'>
          <div className='flex h-14 w-14 items-center justify-center rounded-full bg-white'>
            <DynamicIcon className='h-8 w-8 text-gray-10' name='folder' />
          </div>
        </div>

        <h3 className='mt-5 text-[16px] font-bold text-gray-13'>
          {t`No repository items found`}
        </h3>

        <p className='mt-2 max-w-[460px] text-[14px] leading-6 font-medium text-gray-10'>
          {t`This folder does not contain any folders or files yet.`}
        </p>

        {onUpload && (
          <button
            className='mt-4 flex items-center gap-2 rounded-xl bg-[var(--primary-9)] px-4 py-2 text-[13px] font-bold text-white shadow-xs transition-all hover:bg-[var(--primary-10)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
            disabled={uploadDisabled}
            type='button'
            onClick={onUpload}
          >
            <Icon className='size-4' name='tabler:upload' />
            {t`Upload Documents`}
          </button>
        )}
      </div>
    </div>
  )
}

function FileDataTableSection({
  columns,
  fileCategory = 'all',
  fileFilters = {},
  filePage,
  files,
  fileSearch = '',
  folderContextFilters = {},
  folderFilters = {},
  foldersLength,
  footerDivider,
  isExpanded = false,
  isSplitView = false,
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
  onDeleteFile,
  onDeleteStagedFile,
  onDeleteStagedFiles,
  onExportStagedFile,
  onExportStagedFiles,
  permissions,
}: {
  columns: DynamicRepositoryColumn[]
  fileCategory?: 'all' | 'staged' | 'archived'
  fileFilters?: Record<string, string>
  filePage?: RepositoryFilePage
  files: FileItem[]
  fileSearch?: string
  folderContextFilters?: Record<string, string>
  folderFilters?: Record<string, string>
  foldersLength: number
  footerDivider?: ReactNode
  isExpanded?: boolean
  isSplitView?: boolean
  loading: boolean
  loadingPage: boolean
  onAiSummary: (id: string) => void
  onEditMetadata?: (id: string) => void
  onOpenFile: (id: string) => void
  onPageChange?: (page: number, cursor?: string | null) => void
  onPageSizeChange?: (pageSize: number) => void
  onReload?: () => void
  onShare: (id: string) => void
  onWorkflow?: (id: string) => void
  onDeleteFile?: (fileId: string) => Promise<void>
  onDeleteStagedFile?: (file: FileItem) => Promise<void>
  onDeleteStagedFiles?: (files: FileItem[]) => Promise<void>
  onExportStagedFile?: (file: FileItem) => Promise<void>
  onExportStagedFiles?: (files: FileItem[]) => Promise<void>
  permissions?: {
    delete?: boolean
    editMetadata?: boolean
  }
}) {
  const { t } = useLingui()
  const [selectedStagedIds, setSelectedStagedIds] = useState<string[]>([])
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null)
  const [isDeletingFile, setIsDeletingFile] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false)
  const [isBulkExporting, setIsBulkExporting] = useState(false)
  const [isBulkExportConfirmOpen, setIsBulkExportConfirmOpen] = useState(false)

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
        fileSearch,
      ),
    [folderContextFilters, files, mergedFileFilters, fileSearch],
  )

  const stagedFilesList = useMemo(
    () => (filteredFiles as FileItem[]).filter(isUnarchivedStageFile),
    [filteredFiles],
  )
  const hasStagedFiles = stagedFilesList.length > 0

  const validSelectedStagedFiles = useMemo(() => {
    const idSet = new Set(selectedStagedIds)
    return stagedFilesList.filter((f) => idSet.has(getFileId(f as any)))
  }, [stagedFilesList, selectedStagedIds])

  const selectedStagedCount = validSelectedStagedFiles.length

  const canBulkExport = useMemo(
    () =>
      validSelectedStagedFiles.length > 0 &&
      validSelectedStagedFiles.every((file) =>
        hasAllMandatoryFieldsFilled(file, columns, folderContextFilters),
      ),
    [columns, folderContextFilters, validSelectedStagedFiles],
  )

  const getPrimaryFileName = (file: any) => {
    const direct =
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
      file?.documentName
    if (direct) return String(direct)

    const fromFields =
      getRepositoryFieldStringValue(file, 'name') ||
      getRepositoryFieldStringValue(file, 'Name') ||
      getRepositoryFieldStringValue(file, 'fileName') ||
      getRepositoryFieldStringValue(file, 'FileName') ||
      getRepositoryFieldStringValue(file, 'documentName') ||
      getRepositoryFieldStringValue(file, 'DocumentName')
    if (fromFields) return fromFields

    return '-'
  }

  const hiddenFirstColumnKeys = [
    'filename',
    'fileName',
    'FileName',
    'name',
    'Name',
  ]

  const primaryNameCol = useMemo(
    () => columns.find((col) => hiddenFirstColumnKeys.includes(col.key)),
    [columns],
  )

  const fileRows = useMemo<FileRow[]>(
    () =>
      filteredFiles.map((file) => {
        const nameVal = primaryNameCol
          ? getRepositoryFieldValue(
            file as any,
            primaryNameCol.key,
            folderContextFilters,
          )
          : ''

        const row: FileRow = {
          __name:
            nameVal && nameVal !== '-'
              ? nameVal
              : getPrimaryFileName(file),
          __status: String(
            (file as any)?.status ??
            (file as any)?.Status ??
            '',
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
    [columns, filteredFiles, folderContextFilters, primaryNameCol],
  )

  const fileColumns = useMemo(() => {
    const isAPFolder = isAccountsPayableFolder(
      folderContextFilters?.repositoryId || folderContextFilters?.repositoryTitle,
      undefined,
      filteredFiles,
    )

    const normalColumns = columns.filter(
      (column) =>
        !hiddenFirstColumnKeys.includes(column.key) &&
        column.key.toLowerCase() !== 'status',
    )

    const resolvedColumns: DynamicRepositoryColumn[] = [
      {
        key: '__name',
        label: primaryNameCol?.label || t`Name`,
      } as DynamicRepositoryColumn,
      ...(isAPFolder
        ? [
          {
            key: '__status',
            label: t`Current Stage`,
          } as DynamicRepositoryColumn,
        ]
        : []),
      ...normalColumns,
    ]

    const dynamicColumns = resolvedColumns.map((column, index) => {
      const sizing = getFileColumnSizing(column)
      const isPinnedColumn = column.key === '__name'

      return fileColumnHelper.accessor((row) => row[column.key], {
        enableResizing: !isPinnedColumn,
        header: () => <EllipsisText lines={1} value={column.label} />,
        id: column.key,
        maxSize: sizing.maxSize,
        meta: EXPLORER_CELL_META,
        minSize: sizing.minSize,
        size: sizing.size,
        cell: ({ row, getValue }) => {
          const fileId = row.original.id
          const value = String(getValue() || '-')

          if (index === 0) {
            const fileName = value !== '-' ? value : row.original.name || row.original.fileName || ''
            const iconName = getFileIcon(fileName)

            return (
              <button
                className={EXPLORER_NAME_BUTTON_CLASS}
                type='button'
                onClick={() => onOpenFile(fileId)}
              >
                <span className={EXPLORER_ICON_WRAP_CLASS}>
                  <Icon
                    className='size-4 shrink-0'
                    name={iconName}
                  />
                </span>
                <span className={EXPLORER_NAME_TEXT_WRAP_CLASS}>
                  <EllipsisText
                    className={EXPLORER_NAME_TEXT_CLASS}
                    lines={1}
                    value={value}
                  />
                </span>
              </button>
            )
          }

          if (column.key === '__status') {
            const status = String(getValue() || '').trim()
            if (!status) {
              return <span className={EXPLORER_VALUE_CLASS}>—</span>
            }
            return <StatusPill status={status} />
          }

          if (isTableColumnType(column.dataType)) {
            const rawVal = row.original[column.key] ?? getValue()
            return (
              <DynamicTableColumnCell
                rawVal={rawVal}
                title={column.label || column.key}
              />
            )
          }

          return <ExplorerValue value={value} />
        },
      })
    })

    const selectionColumn = [
      fileColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: () => {
          const isAllSelected =
            filteredFiles.length > 0 &&
            validSelectedStagedFiles.length === filteredFiles.length
          const isIndeterminate =
            validSelectedStagedFiles.length > 0 && !isAllSelected

          return (
            <div
              className='flex w-full items-center justify-center'
              onClick={(e) => e.stopPropagation()}
            >
              <InputCheckbox
                aria-label={t`Select all files`}
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedStagedIds(
                      filteredFiles.map((f) => getFileId(f as any)),
                    )
                  } else {
                    setSelectedStagedIds([])
                  }
                }}
              />
            </div>
          )
        },
        id: 'select',
        maxSize: 48,
        meta: {
          className: '!px-0 !pl-0 !pr-0 text-center',
          headerClassName: '!px-0 !pl-0 !pr-0 text-center',
          headerAlign: 'center' as const,
          disableEllipsis: true,
        },
        minSize: 48,
        size: 48,
        cell: ({ row }) => {
          const fileId = row.original.id
          const isChecked = selectedStagedIds.includes(fileId)

          return (
            <div
              className='flex w-full items-center justify-center'
              onClick={(e) => e.stopPropagation()}
            >
              <InputCheckbox
                aria-label={t`Select file`}
                checked={isChecked}
                onChange={(checked) => {
                  setSelectedStagedIds((prev) =>
                    checked
                      ? prev.includes(fileId)
                        ? prev
                        : [...prev, fileId]
                      : prev.filter((id) => id !== fileId),
                  )
                }}
              />
            </div>
          )
        },
      }),
    ]

    return [
      ...selectionColumn,
      ...dynamicColumns,
      fileColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'actions',
        maxSize: 96,
        meta: { ...EXPLORER_CELL_META, headerAlign: 'right' as const },
        minSize: 56,
        size: 80,
        cell: ({ row }) => {
          const fileId = row.original.id
          const file = row.original.raw as FileItem

          if (isUnarchivedStageFile(file)) {
            const canExport = hasAllMandatoryFieldsFilled(
              file,
              columns,
              folderContextFilters,
            )

            return (
              <div
                className='flex items-center justify-end gap-1'
                onClick={(event) => event.stopPropagation()}
              >
                {canExport && onExportStagedFile ? (
                  <StagedFileExportButton
                    disabled={loadingPage || isBulkExporting || isBulkDeleting}
                    fileName={String(file.name || row.original.__name || t`this file`)}
                    onExport={() => onExportStagedFile(file)}
                  />
                ) : null}
                {onDeleteStagedFile ? (
                  <StagedFileDeleteButton
                    disabled={loadingPage || isBulkExporting || isBulkDeleting}
                    fileName={String(file.name || row.original.__name || t`this file`)}
                    onDelete={() => onDeleteStagedFile(file)}
                  />
                ) : null}
              </div>
            )
          }

          return (
            <div
              className='flex items-center justify-end'
              onClick={(event) => event.stopPropagation()}
            >
              <Menu
                position='bottom-end'
                withinPortal
                width={220}
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
                  label={t`View Details`}
                  onClick={() => onOpenFile(fileId)}
                />
                {onEditMetadata && permissions?.editMetadata !== false ? (
                  <MenuItem
                    icon='lucide:pencil'
                    label={t`Edit Metadata`}
                    onClick={() => onEditMetadata(fileId)}
                  />
                ) : null}
                <MenuItem
                  icon='lucide:bot'
                  label={t`AI Summary`}
                  onClick={() => onAiSummary(fileId)}
                />
                <MenuItem
                  icon='lucide:share-2'
                  label={t`Share`}
                  onClick={() => onShare(fileId)}
                />
                {onWorkflow ? (
                  <MenuItem
                    icon='lucide:play'
                    label={t`Start Workflow`}
                    onClick={() => onWorkflow(fileId)}
                  />
                ) : null}
                {permissions?.delete !== false ? (
                  <>
                    <MenuDivider />
                    <MenuItem
                      className='text-red-9'
                      icon='lucide:trash-2'
                      iconClass='text-red-9'
                      label={t`Delete`}
                      onClick={() => setConfirmDeleteFileId(fileId)}
                    />
                  </>
                ) : null}
              </Menu>
            </div>
          )
        },
      }),
    ]
  }, [
    columns,
    folderContextFilters,
    filteredFiles,
    hasStagedFiles,
    stagedFilesList,
    validSelectedStagedFiles,
    selectedStagedIds,
    hiddenFirstColumnKeys,
    primaryNameCol,
    loadingPage,
    isBulkDeleting,
    isBulkExporting,
    onAiSummary,
    onDeleteStagedFile,
    onExportStagedFile,
    onEditMetadata,
    onOpenFile,
    onShare,
    onWorkflow,
    permissions,
    t,
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => `file-${row.id}`,
    initialState: {
      columnPinning: {
        left: ['select', '__name'],
        right: ['actions'],
      },
    },
  })

  const currentPage = filePage?.page || 1
  const pageSize = filePage?.pageSize || 50
  const apiTotalCount = Number(filePage?.totalCount ?? 0)
  const isStagedCategory = fileCategory === 'staged'
  const totalCount =
    isStagedCategory
      ? filteredFiles.length
      : apiTotalCount > 0
        ? apiTotalCount
        : filePage?.hasMore
          ? Math.max(currentPage * pageSize + 1, filteredFiles.length)
          : Math.max(
            (currentPage - 1) * pageSize + filteredFiles.length,
            filteredFiles.length,
          )

  const showFiles = filteredFiles.length || files.length || loading || loadingPage

  if (!showFiles) return null

  const folderReservedHeight =
    isExpanded
      ? SPLIT_DIVIDER_HEIGHT + 24
      : isSplitView
        ? getSplitFolderBodyHeight(foldersLength) + SPLIT_DIVIDER_HEIGHT + 32
        : foldersLength > 0
          ? Math.min(220, Math.max(96, foldersLength * 56 + 52)) + 84
          : 15

  const fileTableMaxHeight = isExpanded
    ? FULL_PANEL_FILE_HEIGHT
    : `calc(100vh - ${folderReservedHeight + 200}px)`

  return (
    <section className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      {selectedStagedCount > 0 && (onDeleteStagedFiles || onExportStagedFiles) ? (
        <div className='animate-in fade-in slide-in-from-top-1 flex shrink-0 items-center justify-between border-b border-gray-4 bg-gray-2 px-4 py-2 text-xs duration-200'>
          <div className='flex items-center gap-2.5'>
            <span className='inline-flex items-center justify-center rounded-full bg-primary-9 px-2 py-0.5 text-[11px] font-semibold text-white'>
              {selectedStagedCount}
            </span>
            <span className='font-medium text-gray-12'>
              {selectedStagedCount === 1
                ? t`1 staged file selected`
                : t`${selectedStagedCount} staged files selected`}
            </span>
            <button
              className='text-[12px] font-medium text-gray-10 underline hover:text-gray-13'
              type='button'
              onClick={() => setSelectedStagedIds([])}
            >
              {t`Deselect all`}
            </button>
          </div>
          <div className='flex items-center gap-2'>
            {canBulkExport && onExportStagedFiles ? (
              <Tooltip content={t`Export selected staged files`} position='top'>
                <Button
                  color='primary'
                  disabled={isBulkExporting || isBulkDeleting}
                  loading={isBulkExporting}
                  size='xs'
                  onClick={() => setIsBulkExportConfirmOpen(true)}
                >
                  <Icon className='size-3.5' name='tabler:file-export' />
                  {t`Export Selected (${selectedStagedCount})`}
                </Button>
              </Tooltip>
            ) : null}
            {onDeleteStagedFiles ? (
              <Tooltip content={t`Delete selected staged files`} position='top'>
                <Button
                  color='red'
                  disabled={isBulkDeleting || isBulkExporting}
                  loading={isBulkDeleting}
                  size='xs'
                  onClick={() => setIsBulkConfirmOpen(true)}
                >
                  <DynamicIcon className='size-3.5' name='trash' />
                  {t`Delete Selected (${selectedStagedCount})`}
                </Button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className='min-h-0 flex-1 overflow-hidden'>
        <DataTable
          hideActionBar
          isLoading={(loading || loadingPage) && filteredFiles.length === 0}
          isReLoading={loadingPage || (loading && filteredFiles.length > 0)}
          pageSize={pageSize}
          rowSize='compact'
          table={fileTable}
          tableBodyMaxHeight={fileTableMaxHeight}
          hideGrouping
          isSticky
          stickyHeader
          onReload={onReload || (() => undefined)}
        />
      </div>

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Export`}
        description={
          selectedStagedCount === 1
            ? t`Are you sure you want to export 1 selected staged file?`
            : t`Are you sure you want to export ${selectedStagedCount} selected staged files?`
        }
        isConfirming={isBulkExporting}
        opened={isBulkExportConfirmOpen}
        title={t`Export staged files`}
        variant='default'
        onCancel={() => {
          if (!isBulkExporting) setIsBulkExportConfirmOpen(false)
        }}
        onConfirm={async () => {
          setIsBulkExporting(true)
          try {
            await onExportStagedFiles?.(validSelectedStagedFiles)
            setSelectedStagedIds([])
            setIsBulkExportConfirmOpen(false)
          } catch {
            // error handled by caller toast
          } finally {
            setIsBulkExporting(false)
          }
        }}
      />

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Delete`}
        description={
          selectedStagedCount === 1
            ? t`Are you sure you want to delete 1 selected staged file?`
            : t`Are you sure you want to delete ${selectedStagedCount} selected staged files?`
        }
        isConfirming={isBulkDeleting}
        opened={isBulkConfirmOpen}
        title={t`Delete staged files`}
        variant='danger'
        onCancel={() => {
          if (!isBulkDeleting) setIsBulkConfirmOpen(false)
        }}
        onConfirm={async () => {
          setIsBulkDeleting(true)
          try {
            await onDeleteStagedFiles?.(validSelectedStagedFiles)
            setSelectedStagedIds([])
            setIsBulkConfirmOpen(false)
          } catch {
            // error handled by caller toast
          } finally {
            setIsBulkDeleting(false)
          }
        }}
      />

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Delete`}
        description={t`Are you sure you want to delete this document? This action cannot be undone.`}
        isConfirming={isDeletingFile}
        opened={Boolean(confirmDeleteFileId)}
        title={t`Delete Document`}
        variant='danger'
        onCancel={() => {
          if (!isDeletingFile) setConfirmDeleteFileId(null)
        }}
        onConfirm={async () => {
          if (!confirmDeleteFileId || isDeletingFile) return
          setIsDeletingFile(true)
          try {
            await onDeleteFile?.(confirmDeleteFileId)
            setConfirmDeleteFileId(null)
          } catch {
            // error handled by caller toast
          } finally {
            setIsDeletingFile(false)
          }
        }}
      />

      {footerDivider}

      {filePage && !isStagedCategory ? (
        <div className='shrink-0 px-3 sm:px-6 pt-3 pb-2'>
          <Pagination
            itemLabel={t`Files`}
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
        </div>
      ) : null}
    </section>
  )
}

export function FolderDataTableSection({
  folderBodyMaxHeight,
  folders,
  folderFilters = {},
  folderSearch,

  hasFiles,

  hasMoreFolders,

  hideFolderActions = false,

  isExpanded = false,

  isSplitView = false,

  loading,

  loadingFolders,

  loadingPage,

  onLoadMoreFolders,

  onOpenFolder,

  onReload,

  rowSize = 'compact',
}: {
  folderBodyMaxHeight?: string
  effectiveFolderTotal: number
  folderFilters?: Record<string, string>
  folders: FolderItem[]

  folderSearch: string

  hasFiles: boolean

  hasMoreFolders: boolean

  hideFolderActions?: boolean

  isExpanded?: boolean

  isSplitView?: boolean

  loading: boolean

  loadingFolders: boolean

  loadingPage: boolean

  onLoadMoreFolders?: () => void

  onOpenFolder: (id: string) => void

  onReload?: () => void

  rowSize?: 'compact' | 'comfortable' | 'default'
}) {
  const { t } = useLingui()
  const folderScrollRef = useRef<HTMLDivElement | null>(null)

  const lastFolderScrollTopRef = useRef(0)

  const requestedFolderCountRef = useRef(0)

  const filteredFolders = useMemo(
    () => filterFolders(folders, folderFilters, folderSearch),
    [folderFilters, folders, folderSearch],
  )

  const folderRows = useMemo<FolderRow[]>(
    () =>
      filteredFolders.map((folder) => ({
        id: folder.id,

        items: folder.itemsText || '-',

        modified: formatFolderModifiedDate(folder.modifiedText),

        name: folder.title,

        createdBy: folder.createdByName || '-',

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
        header: () => <EllipsisText lines={1} value={t`Name`} />,
        id: 'name',
        maxSize: 360,
        meta: EXPLORER_CELL_META,
        minSize: 200,
        size: 280,
        cell: ({ row }) => {
          const folder = row.original.raw

          return (
            <button
              className={`${EXPLORER_NAME_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={loadingFolders || loadingPage}
              type='button'
              onClick={() => onOpenFolder(row.original.id)}
            >
              <span className={EXPLORER_ICON_WRAP_CLASS}>
                <DynamicIcon
                  className={EXPLORER_ICON_CLASS}
                  name={folder.iconKey || 'folder'}
                />
              </span>

              <span className={EXPLORER_NAME_TEXT_WRAP_CLASS}>
                <EllipsisText
                  className={EXPLORER_NAME_TEXT_CLASS}
                  lines={1}
                  value={row.original.name}
                />
              </span>
            </button>
          )
        },
      }),

      folderColumnHelper.accessor('items', {
        header: () => <EllipsisText lines={1} value={t`Files`} />,
        id: 'items',
        maxSize: 140,
        meta: EXPLORER_CELL_META,
        minSize: 100,
        size: 120,
        cell: ({ getValue }) => {
          const raw = String(getValue() || '-').trim()
          if (raw === '-' || raw === '') return <ExplorerValue value='-' />
          const num = Number(raw)
          const displayText = !isNaN(num) ? String(num) : raw
          return <ExplorerValue value={displayText} />
        },
      }),

      folderColumnHelper.accessor('modified', {
        header: () => <EllipsisText lines={1} value={t`Date Modified`} />,
        id: 'modified',
        maxSize: 180,
        meta: EXPLORER_CELL_META,
        minSize: 130,
        size: 150,
        cell: ({ getValue }) => (
          <ExplorerValue value={String(getValue() || '-')} />
        ),
      }),

      folderColumnHelper.accessor('createdBy', {
        header: () => <EllipsisText lines={1} value={t`Created By`} />,
        id: 'createdBy',
        maxSize: 180,
        meta: EXPLORER_CELL_META,
        minSize: 130,
        size: 150,
        cell: ({ getValue }) => (
          <ExplorerValue value={String(getValue() || '-')} />
        ),
      }),

      ...(hideFolderActions
        ? []
        : [
          folderColumnHelper.display({
            enableResizing: false,
            enableSorting: false,
            header: '',
            id: 'actions',
            maxSize: 72,
            meta: EXPLORER_CELL_META,
            minSize: 56,
            size: 64,

            cell: ({ row }) => {
              const folderId = row.original.id

              return (
                <div
                  className='flex items-center justify-end'
                  onClick={(event) => event.stopPropagation()}
                >
                  <Menu
                    position='bottom-end'
                    withinPortal
                    width={200}
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
                      label={t`Open`}
                      onClick={() => onOpenFolder(folderId)}
                    />
                    <MenuItem icon='lucide:pencil' label={t`Rename`} />
                    <MenuItem icon='lucide:share-2' label={t`Share`} />
                    <MenuDivider />
                    <MenuItem
                      className='text-red-9'
                      icon='lucide:trash-2'
                      iconClass='text-red-9'
                      label={t`Delete`}
                    />
                  </Menu>
                </div>
              )
            },
          }),
        ]),
    ],

    [hideFolderActions, loadingFolders, loadingPage, onOpenFolder, t],
  )

  const folderTable = useReactTable({
    columns: folderColumns,
    data: folderRows,
    defaultColumn: {
      enableSorting: true,
    },
    enableSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => `folder-${row.id}`,
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
        isExpanded
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
          : isSplitView
            ? 'shrink-0 overflow-hidden'
            : hasFiles
              ? 'shrink-0 overflow-hidden'
              : 'flex min-h-0 flex-1 flex-col overflow-hidden'
      }
    >
      <DataTable
        hideActionBar
        hasMore={hasMoreFolders}
        isLoading={loadingFolders && !folders.length}
        isLoadingMore={loadingFolders}
        isReLoading={loadingFolders && folders.length > 0}
        pageSize={Math.max(5, folders.length || 5)}
        rowSize={rowSize || 'compact'}
        table={folderTable}
        tableBodyMaxHeight={resolvedFolderBodyMaxHeight}
        hideGrouping
        stickyHeader
        onLoadMore={handleFolderScroll}
        onReload={onReload || (() => undefined)}
        onRowClick={(row) => onOpenFolder(row.original.id)}
      />
    </section>
  )
}
