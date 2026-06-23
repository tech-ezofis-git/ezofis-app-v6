import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  decodeRepositoryNodeId,
  folderApi,
  foldersToTreeNodes,
  type DynamicRepositoryColumn,
} from '../api/folderApi'
import type {
  AppView,
  ExplorerView,
  FileItem,
  FolderItem,
  RepositoryDetail,
  RepositoryFilePage,
  TreeNode,
} from '../types/folderTypes'
import type { BreadcrumbItem } from '../components/Breadcrumbs'
import {
  DEFAULT_FOLDER_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  FOLDER_SEARCH_DEBOUNCE_MS,
  findNodeById,
  findPathToNode,
  getChildIds,
  getFileId,
  getFolderPageMeta,
  getRepositoryIdFromFolder,
  getRepositoryRootNodeId,
  mergeFoldersById,
  syncTreeChildren,
  updateTreeNode,
  type FolderPageMeta,
} from '../utils/folderExplorerUtils'

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
const [refreshing, setRefreshing] = useState(false)
  const cursorByFolderRef = useRef<Record<string, Record<number, string | null>>>({})
  const requestSeqRef = useRef(0)
  const folderLoadLockRef = useRef(false)
  const lastRequestedFolderPageRef = useRef<Record<string, number>>({})

  const getSelectedFileRow = useCallback(
    (selectedFileId: string) =>
      files.find((file) => getFileId(file) === selectedFileId),
    [files],
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
      setSelectedRepository(null)
      setError(exception?.message || 'Unable to load repository details')
      return null
    }
  }

  const loadFolderContent = async ({
    folderId,
    page = 1,
    pageSizeValue = pageSize,
    cursor = null,
    syncTree = true,
    pageOnly = false,
    appendFolders = false,
    folderPageOnly = false,
  }: {
    folderId: string
    page?: number
    pageSizeValue?: number
    cursor?: string | null
    syncTree?: boolean
    pageOnly?: boolean
    appendFolders?: boolean
    folderPageOnly?: boolean
  }) => {
    const requestId = ++requestSeqRef.current

    if (folderPageOnly) setLoadingFolders(true)
    else if (pageOnly) setLoadingPage(true)
    else setLoading(true)

    setError('')

    try {
      const response = await folderApi.getFolderContent(folderId, {
        page,
        pageSize: pageSizeValue,
        cursor,
      })

      if (requestId !== requestSeqRef.current) return response

      const nextFolderPage = getFolderPageMeta(response)

      setBreadcrumbs(response.breadcrumbs)
      setFolders((previous) =>
        appendFolders
          ? mergeFoldersById(previous, response.folders || [])
          : response.folders || [],
      )
      setFiles((previous) =>
        folderPageOnly ? previous : response.files || [],
      )
      setFileColumns(response.fileColumns || [])
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
      if (requestId === requestSeqRef.current) {
        if (folderPageOnly) {
          setError('')
        } else {
          setBreadcrumbs([])
          setFolders([])
          setFiles([])
          setFileColumns([])
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
        page: 1,
        pageSize: DEFAULT_FOLDER_PAGE_SIZE,
      })
      setTree((previous) =>
        syncTreeChildren(previous, folderId, response.folders),
      )
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
    setFolderSearch('')
    loadSelectedRepository(activeFolder)
    loadFolderContent({
      folderId: activeFolder,
      page: 1,
      pageSizeValue: DEFAULT_FOLDER_PAGE_SIZE,
    }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, pageSize])

  useEffect(() => {
    if (!activeFolder) return

    const searchText = folderSearch.trim()
    const timer = window.setTimeout(async () => {
      folderLoadLockRef.current = false
      lastRequestedFolderPageRef.current[activeFolder] = 1
      setLoadingFolders(true)

      try {
        const response = await folderApi.getFolderChildren(activeFolder, {
          page: 1,
          pageSize: DEFAULT_FOLDER_PAGE_SIZE,
          search: searchText,
        })

        const nextFolders = response?.folders || []
        setFolders(nextFolders)
        setFolderPage(getFolderPageMeta(response))
        setTree((previous) =>
          syncTreeChildren(previous, activeFolder, nextFolders),
        )
      } catch (exception: any) {
        setError(exception?.message || 'Unable to search folders')
      } finally {
        setLoadingFolders(false)
      }
    }, FOLDER_SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderSearch])

  const openFolder = async (id: string) => {
    if (loading || loadingPage) return
    setActiveFolder(id)
    setAppView('explorer')
    await loadSelectedRepository(id)

    const path = findPathToNode(tree, id)
    setExpandedIds((previous) =>
      Array.from(new Set([...(path.length ? path : previous), id])),
    )

    await ensureTreeChildrenLoaded(id)
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
        page: nextPage,
        pageSize: effectivePageSize,
        search: folderSearch.trim(),
      })

      const incomingFolders = response?.folders || []
      const nextFolderPage = getFolderPageMeta(response)

      setFolders((previous) => mergeFoldersById(previous, incomingFolders))
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
      folderId: activeFolder,
      page: safePage,
      pageSizeValue: filePage?.pageSize || pageSize,
      cursor: cursor ?? cachedCursor ?? null,
      syncTree: false,
      pageOnly: true,
    }).catch(() => undefined)
  }

  const changePageSize = (nextPageSize: number) => {
    if (!activeFolder || loading || loadingPage) return
    setLoadingPage(true)
    setPageSize(nextPageSize)
    cursorByFolderRef.current[activeFolder] = { 1: null }
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
      folderId: activeFolder,
      page: filePage?.page || 1,
      pageSizeValue: filePage?.pageSize || pageSize,
      cursor: null,
      syncTree: true,
      pageOnly: false,
      appendFolders: false,
      folderPageOnly: false,
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
  filePage?.pageSize,
  pageSize,
])
  return {
    activeFolder,
    appView,
    breadcrumbs,
    canGoBackInExplorer,
    changePageSize,
    changeServerPage,
    changeViewMode,
    currentTitle,
    error,
    expandedIds,
    fileColumns,
    filePage,
    files,
    folderHasMore,
    folderPage,
    folderSearch,
    folders,
    getRepositoryIdFromFolder,
    getSelectedFileRow,
    goBackInExplorer,
    loadMoreFolders,
    loadSelectedRepository,
    loading,
    loadingFolders,
    loadingPage,
    openFile,
    openFileAction,
    openFolder,
    pageSize,
    repositoryNodes,
    selectedFile,
    selectedRepository,
    setAppView,
    setFolderSearch,
    setSelectedFile,
    toggleFolder,
    tree,
    treeLoadingId,
    viewMode,
    refreshData,
    refreshing,
  }
}

export type UseFolderExplorerReturn = ReturnType<typeof useFolderExplorer>
