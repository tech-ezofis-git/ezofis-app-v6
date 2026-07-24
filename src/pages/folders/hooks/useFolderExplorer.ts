import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BreadcrumbItem } from '../components/Breadcrumbs'
import type {
  AppView,
  ExplorerView,
  FileItem,
  FolderItem,
  RepositoryDetail,
  RepositoryFilePage,
  TreeNode,
} from '../types/folderTypes'
import {
  decodeRepositoryNodeId,
  type DynamicRepositoryColumn,
  folderApi,
  foldersToTreeNodes,
  getFolderContextFilters,
} from '../api/folderApi'
import {
  DEFAULT_FOLDER_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  buildFilterOptionsCacheFromData,
  findNodeById,
  findPathToNode,
  FOLDER_SEARCH_DEBOUNCE_MS,
  mergeFolderFilterOptionsCache,
  type FolderPageMeta,
  getChildIds,
  getFileId,
  getFolderPageMeta,
  getRepositoryIdFromFolder,
  getRepositoryRootNodeId,
  mergeFoldersById,
  syncTreeChildren,
  updateTreeNode,
} from '../utils/folderExplorerUtils'

export type UseFolderExplorerReturn = ReturnType<typeof useFolderExplorer>

export function useFolderExplorer() {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [activeFolder, setActiveFolder] = useState('')
  const [selectedRepository, setSelectedRepository] =
    useState<RepositoryDetail | null>(null)
  const [viewMode, setViewModeState] = useState<ExplorerView>('grid')
  const [appView, setAppView] = useState<AppView>('explorer')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [fileColumns, setFileColumns] = useState<DynamicRepositoryColumn[]>([])
  const [filePage, setFilePage] = useState<RepositoryFilePage | undefined>()
  const [folderPage, setFolderPage] = useState<FolderPageMeta | undefined>()
  const [selectedFile, setSelectedFile] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPage, setLoadingPage] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [treeLoadingId, setTreeLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [folderSearch, setFolderSearch] = useState('')
  const [fileSearch, setFileSearch] = useState('')
  const [fileFilters, setFileFiltersState] = useState<Record<string, string>>({})
  const [folderFilters, setFolderFiltersState] = useState<Record<string, string>>({})
  const [folderFilterOptionSource, setFolderFilterOptionSource] = useState<
    FolderItem[]
  >([])
  const [filterOptionsCache, setFilterOptionsCache] = useState<
    Record<string, { label: string; value: string }[]>
  >({})
  const [currentFolderGroupField, setCurrentFolderGroupField] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const cursorByFolderRef = useRef<
    Record<string, Record<number, string | null>>
  >({})
  const requestSeqRef = useRef(0)
  const folderLoadLockRef = useRef(false)
  const lastRequestedFolderPageRef = useRef<Record<string, number>>({})
  const pageSizeRef = useRef(pageSize)
  const fileFiltersRef = useRef(fileFilters)
  const folderFiltersRef = useRef(folderFilters)
  const folderSearchRef = useRef(folderSearch)
  const fileSearchRef = useRef(fileSearch)
  const skipFilterReloadRef = useRef(false)
  const skipSearchReloadRef = useRef(false)
  const deferFilterApiRef = useRef(false)
  const deferFilterSnapshotRef = useRef('')

  pageSizeRef.current = pageSize
  fileFiltersRef.current = fileFilters
  folderFiltersRef.current = folderFilters
  folderSearchRef.current = folderSearch
  fileSearchRef.current = fileSearch

  const getFilterSnapshot = () =>
    JSON.stringify({
      file: fileFiltersRef.current,
      folder: folderFiltersRef.current,
    })

  const setFileFilters = useCallback((next: Record<string, string>) => {
    fileFiltersRef.current = next
    setFileFiltersState(next)
  }, [])

  const setFolderFilters = useCallback((next: Record<string, string>) => {
    folderFiltersRef.current = next
    setFolderFiltersState(next)
  }, [])

  const hasActiveFolderBrowseQuery = (
    nextFolderFilters: Record<string, string> = folderFiltersRef.current,
    nextFolderSearch = folderSearchRef.current,
  ) =>
    Object.values(nextFolderFilters).some(Boolean) ||
    Boolean(nextFolderSearch.trim())

  const syncFolderFilterOptionSource = (
    incomingFolders: FolderItem[] = [],
    {
      append = false,
      folderFilters: nextFolderFilters = folderFiltersRef.current,
      folderSearch: nextFolderSearch = folderSearchRef.current,
    }: {
      append?: boolean
      folderFilters?: Record<string, string>
      folderSearch?: string
    } = {},
  ) => {
    if (hasActiveFolderBrowseQuery(nextFolderFilters, nextFolderSearch)) return

    setFolderFilterOptionSource((previous) =>
      append
        ? mergeFoldersById(previous, incomingFolders)
        : incomingFolders,
    )
  }

  const syncFilterOptionsCache = ({
    columns = [],
    files = [],
    folders = [],
  }: {
    columns?: DynamicRepositoryColumn[]
    files?: FileItem[]
    folders?: FolderItem[]
  }) => {
    if (!folders.length && !files.length) return

    const hasActiveFilters =
      Object.values(fileFiltersRef.current).some(Boolean) ||
      Object.values(folderFiltersRef.current).some(Boolean)

    // Keep baseline cache for currently saved filters; don't merge filtered results.
    if (hasActiveFilters) return

    const extracted = buildFilterOptionsCacheFromData({
      columns,
      files: files as Array<Record<string, any>>,
      folders,
    })

    setFilterOptionsCache((previous) =>
      mergeFolderFilterOptionsCache(previous, extracted),
    )
  }

  const getSelectedFileRow = useCallback(
    (selectedFileId: string) =>
      files.find((file) => getFileId(file) === selectedFileId),
    [files],
  )

  const folderContextFilters = useMemo(
    () => getFolderContextFilters(activeFolder),
    [activeFolder],
  )

  const loadSelectedRepository = async (folderId: string) => {
    const decoded = decodeRepositoryNodeId(folderId)

    if (!decoded || decoded.kind === 'static') {
      setSelectedRepository(null)
      return null
    }

    const repositoryId = decoded.repositoryId

    try {
      const repository = await folderApi.getRepositoryFullData(repositoryId)
      setSelectedRepository(repository as RepositoryDetail)
      return repository
    } catch (exception: any) {
      const isCanceled =
        exception?.code === 'ERR_CANCELED' ||
        exception?.name === 'CanceledError' ||
        /cancel/i.test(String(exception?.message || ''))

      if (isCanceled) return null

      setSelectedRepository(null)
      setError(exception?.message || 'Unable to load repository details')
      return null
    }
  }

  const loadFolderContent = async ({
    appendFolders = false,
    cursor = null,
    folderId,
    folderPageOnly = false,
    folderFilters,
    fileFilters,
    includeFiles,
    listAllFiles,
    page = 1,
    pageOnly = false,
    pageSizeValue = pageSize,
    folderSearch,
    fileSearch,
    syncTree = true,
  }: {
    appendFolders?: boolean
    cursor?: string | null
    folderId: string
    folderPageOnly?: boolean
    folderFilters?: Record<string, string>
    fileFilters?: Record<string, string>
    includeFiles?: boolean
    listAllFiles?: boolean
    page?: number
    pageOnly?: boolean
    pageSizeValue?: number
    folderSearch?: string
    fileSearch?: string
    syncTree?: boolean
  }) => {
    const requestId = ++requestSeqRef.current

    if (folderPageOnly) setLoadingFolders(true)
    else if (pageOnly) setLoadingPage(true)
    else setLoading(true)

    setError('')

    try {
      const response = await folderApi.getFolderContent(folderId, {
        cursor,
        folderFilters: folderFilters ?? folderFiltersRef.current,
        fileFilters: fileFilters ?? fileFiltersRef.current,
        includeFiles,
        listAllFiles: listAllFiles ?? viewMode === 'list',
        page,
        pageSize: pageSizeValue,
        folderSearch:
          folderSearch !== undefined
            ? folderSearch
            : folderSearchRef.current.trim() || undefined,
        fileSearch:
          fileSearch !== undefined
            ? fileSearch
            : fileSearchRef.current.trim() || undefined,
      })

      if (requestId !== requestSeqRef.current) return response

      const nextFolderPage = getFolderPageMeta(response)

      setBreadcrumbs(response.breadcrumbs)
      setFolders((previous) =>
        appendFolders
          ? mergeFoldersById(previous, response.folders || [])
          : response.folders || [],
      )
      syncFolderFilterOptionSource(response.folders || [], {
        append: appendFolders,
        folderFilters: folderFilters ?? folderFiltersRef.current,
        folderSearch:
          folderSearch !== undefined
            ? folderSearch
            : folderSearchRef.current,
      })
      syncFilterOptionsCache({
        columns: response.fileColumns || [],
        files: folderPageOnly ? [] : response.files || [],
        folders: response.folders || [],
      })
      setFiles((previous) => (folderPageOnly ? previous : response.files || []))
      setFileColumns(response.fileColumns || [])
      setCurrentFolderGroupField(response.currentFolderGroupField || '')
      setFilePage(response.filePage)
      setFolderPage(nextFolderPage)

      if (folderPageOnly) {
        lastRequestedFolderPageRef.current[folderId] = nextFolderPage.page
      }

      if (response.filePage) {
        if (!cursorByFolderRef.current[folderId]) {
          cursorByFolderRef.current[folderId] = { 1: null }
        }
        if (response.filePage.nextCursor) {
          cursorByFolderRef.current[folderId][response.filePage.page + 1] =
            response.filePage.nextCursor
        }
      }

      if (syncTree && !appendFolders) {
        setTree((previous) =>
          syncTreeChildren(previous, folderId, response.folders || []),
        )
      }

      return response
    } catch (exception: any) {
      const isCanceled =
        exception?.code === 'ERR_CANCELED' ||
        exception?.name === 'CanceledError' ||
        /cancel/i.test(String(exception?.message || ''))

      // Aborted duplicate requests must not wipe explorer state.
      if (isCanceled) return undefined

      if (requestId === requestSeqRef.current) {
        if (folderPageOnly) {
          setError('')
        } else {
          setBreadcrumbs([])
          setFolders([])
          setFiles([])
          setFileColumns([])
          setCurrentFolderGroupField('')
          setFilePage(undefined)
          setFolderPage(undefined)
          setError(exception?.message || 'Unable to load folder content')
        }
      }
      throw exception
    } finally {
      if (requestId === requestSeqRef.current) {
        setLoading(false)
        setLoadingPage(false)
        setLoadingFolders(false)
        if (folderPageOnly) folderLoadLockRef.current = false
      }
    }
  }

  const ensureTreeChildrenLoaded = async (folderId: string) => {
    const node = findNodeById(tree, folderId)
    if (!node || !node.hasChildren || node.isLoaded) return

    setTreeLoadingId(folderId)
    setTree((previous) =>
      updateTreeNode(previous, folderId, (item) => ({
        ...item,
        isLoading: true,
      })),
    )

    try {
      const response = await folderApi.getFolderContent(folderId, {
        includeFiles: false,
        page: 1,
        pageSize: DEFAULT_FOLDER_PAGE_SIZE,
      })
      setTree((previous) =>
        syncTreeChildren(previous, folderId, response.folders),
      )
    } catch {
      // Ignore failures here (including aborted duplicate children calls).
      // Selecting a folder reloads content via the activeFolder effect.
    } finally {
      setTreeLoadingId(null)
      setTree((previous) =>
        updateTreeNode(previous, folderId, (item) => ({
          ...item,
          isLoading: false,
        })),
      )
    }
  }

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await folderApi.getTree()
        if (!mounted) return

        setTree(response)

        const firstRepository =
          response.find((node) => !node.isStatic) || response[0]
        if (firstRepository) {
          setActiveFolder(firstRepository.id)
          setExpandedIds([firstRepository.id])
          cursorByFolderRef.current[firstRepository.id] = { 1: null }
        }
      } catch (exception: any) {
        if (!mounted) return
        setError(exception?.message || 'Unable to load repositories')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    bootstrap()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!activeFolder) return
    cursorByFolderRef.current[activeFolder] = { 1: null }
    folderLoadLockRef.current = false
    lastRequestedFolderPageRef.current[activeFolder] = 1
    skipFilterReloadRef.current = true
    skipSearchReloadRef.current = true
    setFolderSearch('')
    setFileSearch('')
    setFileFilters({})
    setFolderFilters({})
    setFolderFilterOptionSource([])
    setFilterOptionsCache({})
    loadSelectedRepository(activeFolder)
    loadFolderContent({
      folderId: activeFolder,
      folderFilters: {},
      fileFilters: {},
      listAllFiles: viewMode === 'list',
      page: 1,
      pageSizeValue: pageSizeRef.current,
      folderSearch: '',
      fileSearch: '',
    }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, viewMode])

  useEffect(() => {
    if (!activeFolder) return

    if (skipSearchReloadRef.current) {
      skipSearchReloadRef.current = false
      return
    }

    const timer = window.setTimeout(async () => {
      cursorByFolderRef.current[activeFolder] = { 1: null }
      folderLoadLockRef.current = false
      lastRequestedFolderPageRef.current[activeFolder] = 1

      try {
        await loadFolderContent({
          folderId: activeFolder,
          folderFilters: folderFiltersRef.current,
          fileFilters: fileFiltersRef.current,
          listAllFiles: viewMode === 'list',
          page: 1,
          pageSizeValue: pageSizeRef.current,
          folderSearch: folderSearch.trim(),
          fileSearch: fileSearch.trim(),
          syncTree: viewMode === 'grid',
        })
      } catch (exception: any) {
        setError(
          exception?.message ||
            (viewMode === 'list'
              ? 'Unable to search files'
              : 'Unable to search folders'),
        )
      }
    }, FOLDER_SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderSearch, fileSearch])

  useEffect(() => {
    if (!activeFolder) return

    if (skipFilterReloadRef.current) {
      skipFilterReloadRef.current = false
      return
    }

    // Multi-select: keep local filtering while menu is open; API runs on close.
    if (deferFilterApiRef.current) return

    cursorByFolderRef.current[activeFolder] = { 1: null }
    folderLoadLockRef.current = false
    lastRequestedFolderPageRef.current[activeFolder] = 1

    loadFolderContent({
      folderId: activeFolder,
      folderFilters,
      fileFilters,
      listAllFiles: viewMode === 'list',
      page: 1,
      pageSizeValue: pageSizeRef.current,
      folderSearch: folderSearchRef.current.trim(),
      fileSearch: fileSearchRef.current.trim(),
      syncTree: viewMode === 'grid',
    }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileFilters, folderFilters])

  const beginFilterDefer = useCallback(() => {
    deferFilterApiRef.current = true
    deferFilterSnapshotRef.current = getFilterSnapshot()
  }, [])

  const commitFilterDefer = useCallback(() => {
    if (!deferFilterApiRef.current) return

    // Wait one tick so the last checkbox selection is in refs before commit.
    queueMicrotask(() => {
      if (!deferFilterApiRef.current) return
      deferFilterApiRef.current = false

      if (getFilterSnapshot() === deferFilterSnapshotRef.current) return

      if (!activeFolder) return

      cursorByFolderRef.current[activeFolder] = { 1: null }
      folderLoadLockRef.current = false
      lastRequestedFolderPageRef.current[activeFolder] = 1

      loadFolderContent({
        folderId: activeFolder,
        folderFilters: folderFiltersRef.current,
        fileFilters: fileFiltersRef.current,
        listAllFiles: viewMode === 'list',
        page: 1,
        pageSizeValue: pageSizeRef.current,
        folderSearch: folderSearchRef.current.trim(),
        fileSearch: fileSearchRef.current.trim(),
        syncTree: viewMode === 'grid',
      }).catch(() => undefined)
    })
  }, [activeFolder, viewMode])

  const openFolder = async (id: string) => {
    if (loading || loadingPage) return
    if (id === activeFolder) {
      setAppView('explorer')
      return
    }

    // Selection only — content + repository details load in the activeFolder
    // effect. Calling ensureTreeChildrenLoaded / loadSelectedRepository here
    // fired a duplicate browse/children request; axios aborted the first and
    // the aborted load cleared the explorer to an empty state.
    setActiveFolder(id)
    setAppView('explorer')

    const path = findPathToNode(tree, id)
    setExpandedIds((previous) =>
      Array.from(new Set([...(path.length ? path : previous), id])),
    )
  }

  const toggleFolder = async (id: string) => {
    const node = findNodeById(tree, id)
    const shouldLoad = !expandedIds.includes(id)

    setExpandedIds((previous) => {
      const isOpen = previous.includes(id)

      if (isOpen) {
        const childIds = node ? getChildIds(node) : []
        return previous.filter(
          (item) => item !== id && !childIds.includes(item),
        )
      }

      const path = findPathToNode(tree, id)
      return Array.from(new Set([...previous, ...path, id]))
    })

    if (shouldLoad) await ensureTreeChildrenLoaded(id)
  }

  const loadMoreFolders = async () => {
    const totalFoldersFromApi = folderPage?.totalCount ?? folders.length
    const alreadyFetchedAllFolders =
      totalFoldersFromApi > 0 && folders.length >= totalFoldersFromApi

    if (
      !activeFolder ||
      loading ||
      loadingPage ||
      loadingFolders ||
      !folderPage?.hasMore ||
      alreadyFetchedAllFolders
    )
      return

    if (folderLoadLockRef.current) return

    const effectivePageSize = folderPage.pageSize || DEFAULT_FOLDER_PAGE_SIZE
    const nextPage = Math.max(
      folderPage.page + 1,
      Math.floor(folders.length / effectivePageSize) + 1,
    )

    const lastRequestedPage =
      lastRequestedFolderPageRef.current[activeFolder] || folderPage.page
    if (nextPage <= lastRequestedPage) return

    folderLoadLockRef.current = true
    lastRequestedFolderPageRef.current[activeFolder] = nextPage
    setLoadingFolders(true)

    try {
      const response = await folderApi.getFolderChildren(activeFolder, {
        folderFilters: folderFiltersRef.current,
        page: nextPage,
        pageSize: effectivePageSize,
        folderSearch: folderSearch.trim(),
      })

      const incomingFolders = response?.folders || []
      const nextFolderPage = getFolderPageMeta(response)

      setFolders((previous) => mergeFoldersById(previous, incomingFolders))
      syncFolderFilterOptionSource(incomingFolders, {
        append: true,
        folderFilters: folderFiltersRef.current,
        folderSearch: folderSearchRef.current,
      })
      syncFilterOptionsCache({
        folders: incomingFolders,
      })
      setFolderPage(nextFolderPage)
      lastRequestedFolderPageRef.current[activeFolder] = nextFolderPage.page

      setTree((previous) =>
        updateTreeNode(previous, activeFolder, (node) => ({
          ...node,
          children: foldersToTreeNodes(
            mergeFoldersById(folders, incomingFolders),
          ),
          hasChildren: folders.length + incomingFolders.length > 0,
          isLoaded: true,
          isLoading: false,
        })),
      )
    } catch {
      setError('')
    } finally {
      setLoadingFolders(false)
      folderLoadLockRef.current = false
    }
  }

  const changeServerPage = async (
    targetPage: number,
    cursor?: string | null,
  ) => {
    if (!activeFolder || loadingPage) return

    const safePage = Math.max(
      1,
      Math.min(targetPage, filePage?.totalPages || targetPage),
    )
    const cachedCursor = cursorByFolderRef.current[activeFolder]?.[safePage]

    await loadFolderContent({
      cursor: cursor ?? cachedCursor ?? null,
      folderId: activeFolder,
      folderFilters: folderFiltersRef.current,
      fileFilters: fileFiltersRef.current,
      listAllFiles: viewMode === 'list',
      page: safePage,
      pageOnly: true,
      pageSizeValue: pageSizeRef.current,
      folderSearch: folderSearchRef.current.trim() || undefined,
      fileSearch: fileSearchRef.current.trim() || undefined,
      syncTree: false,
    }).catch(() => undefined)
  }

  const changePageSize = (nextPageSize: number) => {
    if (!activeFolder || loadingPage) return

    pageSizeRef.current = nextPageSize
    setPageSize(nextPageSize)
    cursorByFolderRef.current[activeFolder] = { 1: null }

    void loadFolderContent({
      cursor: null,
      folderId: activeFolder,
      folderFilters: folderFiltersRef.current,
      fileFilters: fileFiltersRef.current,
      listAllFiles: viewMode === 'list',
      page: 1,
      pageOnly: true,
      pageSizeValue: nextPageSize,
      folderSearch: folderSearchRef.current.trim() || undefined,
      fileSearch: fileSearchRef.current.trim() || undefined,
      syncTree: false,
    }).catch(() => undefined)
  }

  const changeViewMode = (nextView: ExplorerView) => {
    if (nextView === 'list') {
      const rootNodeId = getRepositoryRootNodeId(activeFolder, tree)
      if (rootNodeId && rootNodeId !== activeFolder) {
        cursorByFolderRef.current[rootNodeId] = { 1: null }
        setActiveFolder(rootNodeId)
      }
    }

    setViewModeState(nextView)
    setAppView('explorer')
  }

  const openFile = (id: string) => {
    setSelectedFile(id)
    setAppView('details')
  }

  const openFileAction = (id: string, view: AppView) => {
    setSelectedFile(id)
    setAppView(view)
  }

  const goBackInExplorer = () => {
    if (breadcrumbs.length > 1) {
      const parent = breadcrumbs[breadcrumbs.length - 2]
      openFolder(parent.id)
      return
    }
    const root = tree.find((node) => !node.isStatic) || tree[0]
    if (root && root.id !== activeFolder) {
      openFolder(root.id)
    }
  }

  const currentTitle = useMemo(() => {
    if (breadcrumbs.length) return breadcrumbs[breadcrumbs.length - 1].label
    const node = findNodeById(tree, activeFolder)
    return node?.title || 'Folders'
  }, [breadcrumbs, tree, activeFolder])

  const canGoBackInExplorer = useMemo(() => {
    if (breadcrumbs.length > 1) return true
    const root = tree.find((node) => !node.isStatic) || tree[0]
    return Boolean(root && root.id !== activeFolder)
  }, [breadcrumbs, tree, activeFolder])

  const folderHasMore = useMemo(
    () =>
      Boolean(folderPage?.hasMore) &&
      folders.length < Number(folderPage?.totalCount ?? 0),
    [folderPage, folders.length],
  )

  const repositoryNodes = useMemo(
    () => tree.filter((node) => !node.isStatic),
    [tree],
  )

  const refreshData = useCallback(async () => {
    if (!activeFolder || refreshing) return

    setRefreshing(true)
    setLoading(true)
    setError('')

    try {
      cursorByFolderRef.current[activeFolder] = { 1: null }
      folderLoadLockRef.current = false
      lastRequestedFolderPageRef.current[activeFolder] = 1

      await loadSelectedRepository(activeFolder)

      await loadFolderContent({
        appendFolders: false,
        cursor: null,
        folderId: activeFolder,
        folderPageOnly: false,
        folderFilters: folderFiltersRef.current,
        fileFilters: fileFiltersRef.current,
        listAllFiles: viewMode === 'list',
        page: filePage?.page || 1,
        pageOnly: false,
        pageSizeValue: pageSizeRef.current,
        folderSearch: folderSearchRef.current.trim() || undefined,
        fileSearch: fileSearchRef.current.trim() || undefined,
        syncTree: true,
      })
    } catch {
      // error already handled inside loadFolderContent
    } finally {
      setRefreshing(false)
    }
  }, [
    activeFolder,
    refreshing,
    filePage?.page,
    viewMode,
  ])
  return {
    activeFolder,
    appView,
    breadcrumbs,
    beginFilterDefer,
    canGoBackInExplorer,
    changePageSize,
    changeServerPage,
    changeViewMode,
    commitFilterDefer,
    currentFolderGroupField,
    currentTitle,
    error,
    expandedIds,
    fileColumns,
    fileFilters,
    filePage,
    files,
    fileSearch,
    folderContextFilters,
    folderFilters,
    folderFilterOptionSource,
    filterOptionsCache,
    folderHasMore,
    folderPage,
    folders,
    folderSearch,
    goBackInExplorer,
    loading,
    loadingFolders,
    loadingPage,
    loadMoreFolders,
    loadSelectedRepository,
    openFile,
    openFileAction,
    openFolder,
    pageSize,
    refreshData,
    refreshing,
    repositoryNodes,
    selectedFile,
    selectedRepository,
    toggleFolder,
    tree,
    treeLoadingId,
    viewMode,
    getRepositoryIdFromFolder,
    getSelectedFileRow,
    setAppView,
    setFileFilters,
    setFileSearch,
    setFolderFilters,
    setFolderSearch,
    setSelectedFile,
  }
}
