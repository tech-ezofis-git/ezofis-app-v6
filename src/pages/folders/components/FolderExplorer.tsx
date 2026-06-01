import { useEffect, useRef, useState } from 'react'
import {
  decodeRepositoryNodeId,
  encodeRepositoryNodeId,
  folderApi,
  foldersToTreeNodes,
  type DynamicRepositoryColumn,
} from '../api/folderApi'
import type {
  AppView,
  ExplorerView,
  FileItem,
  FolderItem,
  RepositoryFilePage,
  TreeNode,
} from '../types/folderTypes'
import { ExplorerToolbar } from './ExplorerToolbar'
import { TreeSidebar } from './TreeSidebar'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'
import { FolderTable } from './FolderTable'
import { DocumentsListView } from './DocumentsListView'
import { DocumentDetailsView } from './DocumentDetailsView'
import { EditMetadataView } from './EditMetadataView'
import { AiSummaryView } from './AiSummaryView'
import { ShareView } from './ShareView'
import { StartWorkflowView } from './StartWorkflowView'

const DEFAULT_PAGE_SIZE = 50
const DEFAULT_FOLDER_PAGE_SIZE = 100
const FOLDER_SEARCH_DEBOUNCE_MS = 350

type FolderPageMeta = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
  nextCursor?: string | null
}

const updateTreeNode = (
  nodes: TreeNode[],
  id: string,
  updater: (node: TreeNode) => TreeNode
): TreeNode[] =>
  nodes.map((node) => {
    if (node.id === id) return updater(node)
    if (node.children?.length) {
      return { ...node, children: updateTreeNode(node.children, id, updater) }
    }
    return node
  })

const findPathToNode = (
  nodes: TreeNode[],
  targetId: string,
  path: string[] = []
): string[] => {
  for (const node of nodes) {
    const currentPath = [...path, node.id]
    if (node.id === targetId) return currentPath

    if (node.children?.length) {
      const childPath = findPathToNode(node.children, targetId, currentPath)
      if (childPath.length) return childPath
    }
  }
  return []
}

const findNodeById = (nodes: TreeNode[], targetId: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.id === targetId) return node
    if (node.children?.length) {
      const found = findNodeById(node.children, targetId)
      if (found) return found
    }
  }
  return null
}

const getChildIds = (node: TreeNode): string[] => {
  const children = node.children || []
  return children.flatMap((child) => [child.id, ...getChildIds(child)])
}


const getRepositoryIdFromFolder = (folderId: string) => {
  const decoded = decodeRepositoryNodeId(folderId)
  if (decoded?.kind === 'repository') return decoded.repositoryId
  if (decoded?.kind === 'browse') return decoded.repositoryId
  return ''
}

const getRepositoryRootNodeId = (folderId: string, tree: TreeNode[]) => {
  const decoded = decodeRepositoryNodeId(folderId)

  if (decoded?.kind === 'repository') return folderId

  if (decoded?.kind === 'browse') {
    return encodeRepositoryNodeId({
      kind: 'repository',
      repositoryId: decoded.repositoryId,
      label: decoded.repositoryName,
    })
  }

  const firstRepository = tree.find((node) => !node.isStatic)
  return firstRepository?.id || folderId
}


const getFolderPageMeta = (response: any): FolderPageMeta => {
  // Folder/group paging must be calculated only from the children API metadata.
  // Do not fallback to filePage here because file total and folder total are different.
  const candidate =
    response?.folderPage ||
    response?.foldersPage ||
    response?.groupPage ||
    response?.groups ||
    null

  const folderCount = response?.folders?.length || 0
  const pageSize = Number(candidate?.pageSize || DEFAULT_FOLDER_PAGE_SIZE)
  const totalCount = Number(candidate?.totalCount ?? folderCount)
  const page = Number(candidate?.page || 1)
  const totalPages = Math.max(1, Number(candidate?.totalPages || Math.ceil(totalCount / pageSize) || 1))

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    nextCursor: candidate?.nextCursor ?? null,
    hasMore: folderCount < totalCount && (page < totalPages || Boolean(candidate?.hasMore)),
  }
}

const mergeFoldersById = (current: FolderItem[], next: FolderItem[]) => {
  const map = new Map<string, FolderItem>()
  current.forEach((folder) => map.set(folder.id, folder))
  next.forEach((folder) => map.set(folder.id, folder))
  return Array.from(map.values())
}

export function FolderExplorer() {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [activeFolder, setActiveFolder] = useState('')
  const [viewMode, setViewModeState] = useState<ExplorerView>('grid')
  const [appView, setAppView] = useState<AppView>('explorer')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [fileColumns, setFileColumns] = useState<DynamicRepositoryColumn[]>([])
  const [filePage, setFilePage] = useState<RepositoryFilePage | undefined>(undefined)
  const [folderPage, setFolderPage] = useState<FolderPageMeta | undefined>(undefined)
  const [selectedFile, setSelectedFile] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPage, setLoadingPage] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [treeLoadingId, setTreeLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [folderSearch, setFolderSearch] = useState('')

  const cursorByFolderRef = useRef<Record<string, Record<number, string | null>>>({})
  const requestSeqRef = useRef(0)
  const folderLoadLockRef = useRef(false)
  const lastRequestedFolderPageRef = useRef<Record<string, number>>({})

  const syncTreeChildren = (folderId: string, childFolders: FolderItem[]) => {
    const childNodes = foldersToTreeNodes(childFolders)

    setTree((previous) =>
      updateTreeNode(previous, folderId, (node) => ({
        ...node,
        children: childNodes,
        hasChildren: childNodes.length > 0,
        isLoaded: true,
        isLoading: false,
      }))
    )
  }



  const rememberNextCursor = (
    folderId: string,
    currentPage: number,
    nextCursor?: string | null
  ) => {
    if (!cursorByFolderRef.current[folderId]) cursorByFolderRef.current[folderId] = { 1: null }
    if (nextCursor) cursorByFolderRef.current[folderId][currentPage + 1] = nextCursor
  }

  const resetCursorCache = (folderId: string) => {
    cursorByFolderRef.current[folderId] = { 1: null }
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

      // Ignore stale API responses when users click folders/pages quickly.
      if (requestId !== requestSeqRef.current) return response

      const nextFolderPage = getFolderPageMeta(response)

      setBreadcrumbs(response.breadcrumbs)
      setFolders((previous) =>
        appendFolders ? mergeFoldersById(previous, response.folders || []) : response.folders || []
      )
      setFiles((previous) => (folderPageOnly ? previous : response.files || []))
      setFileColumns(response.fileColumns || [])
      setFilePage(response.filePage)
      setFolderPage(nextFolderPage)

      if (folderPageOnly) {
        lastRequestedFolderPageRef.current[folderId] = nextFolderPage.page
      }

      if (response.filePage) {
        rememberNextCursor(folderId, response.filePage.page, response.filePage.nextCursor)
      }

      if (syncTree && !appendFolders) syncTreeChildren(folderId, response.folders || [])
      return response
    } catch (exception: any) {
      if (requestId === requestSeqRef.current) {
        if (folderPageOnly) {
          // Keep the existing folder rows mounted. Do not collapse the table if only the next folder page fails.
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
      updateTreeNode(previous, folderId, (item) => ({ ...item, isLoading: true }))
    )

    try {
      const response = await folderApi.getFolderContent(folderId, {
        page: 1,
        pageSize: DEFAULT_FOLDER_PAGE_SIZE,
      })
      syncTreeChildren(folderId, response.folders)
    } finally {
      setTreeLoadingId(null)
      setTree((previous) =>
        updateTreeNode(previous, folderId, (item) => ({ ...item, isLoading: false }))
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

        const firstRepository = response.find((node) => !node.isStatic) || response[0]
        if (firstRepository) {
          setActiveFolder(firstRepository.id)
          setExpandedIds([firstRepository.id])
          resetCursorCache(firstRepository.id)
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
    resetCursorCache(activeFolder)
    folderLoadLockRef.current = false
    lastRequestedFolderPageRef.current[activeFolder] = 1
    setFolderSearch('')
    loadFolderContent({ folderId: activeFolder, page: 1, pageSizeValue: DEFAULT_FOLDER_PAGE_SIZE }).catch(
      () => undefined
    )
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
        syncTreeChildren(activeFolder, nextFolders)
      } catch (exception: any) {
        setError(exception?.message || 'Unable to search folders')
      } finally {
        setLoadingFolders(false)
      }
    }, FOLDER_SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [folderSearch])

  const openFolder = async (id: string) => {
    if (loading || loadingPage) return
    setActiveFolder(id)
    setAppView('explorer')

    const path = findPathToNode(tree, id)
    setExpandedIds((previous) => Array.from(new Set([...(path.length ? path : previous), id])))

    await ensureTreeChildrenLoaded(id)
  }

  const toggleFolder = async (id: string) => {
    const node = findNodeById(tree, id)
    const shouldLoad = !expandedIds.includes(id)

    setExpandedIds((previous) => {
      const isOpen = previous.includes(id)

      if (isOpen) {
        const childIds = node ? getChildIds(node) : []
        return previous.filter((item) => item !== id && !childIds.includes(item))
      }

      const path = findPathToNode(tree, id)
      return Array.from(new Set([...previous, ...path, id]))
    })

    if (shouldLoad) await ensureTreeChildrenLoaded(id)
  }

  const loadMoreFolders = async () => {
    const totalFoldersFromApi = folderPage?.totalCount ?? folders.length
    const alreadyFetchedAllFolders = totalFoldersFromApi > 0 && folders.length >= totalFoldersFromApi

    if (
      !activeFolder ||
      loading ||
      loadingPage ||
      loadingFolders ||
      !folderPage?.hasMore ||
      alreadyFetchedAllFolders
    ) return

    // Hard lock is required because React state updates are async. Without this, one scroll event burst
    // can trigger multiple identical API calls before loadingFolders becomes true.
    if (folderLoadLockRef.current) return

    const effectivePageSize = folderPage.pageSize || DEFAULT_FOLDER_PAGE_SIZE
    const nextPage = Math.max(
      folderPage.page + 1,
      Math.floor(folders.length / effectivePageSize) + 1
    )

    const lastRequestedPage = lastRequestedFolderPageRef.current[activeFolder] || folderPage.page
    if (nextPage <= lastRequestedPage) return

    folderLoadLockRef.current = true
    lastRequestedFolderPageRef.current[activeFolder] = nextPage
    setLoadingFolders(true)

    try {
      // IMPORTANT: folder load-more must call only the folder/children API.
      // Do not call getFolderContent here because that function also triggers the file/items API.
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

      // Keep tree in sync without touching files/file pagination.
      setTree((previous) =>
        updateTreeNode(previous, activeFolder, (node) => ({
          ...node,
          children: foldersToTreeNodes(mergeFoldersById(folders, incomingFolders)),
          hasChildren: folders.length + incomingFolders.length > 0,
          isLoaded: true,
          isLoading: false,
        }))
      )
    } catch (exception: any) {
      setError('')
    } finally {
      setLoadingFolders(false)
      folderLoadLockRef.current = false
    }
  }

  const changeServerPage = async (targetPage: number, cursor?: string | null) => {
    if (!activeFolder || loadingPage) return

    const safePage = Math.max(1, Math.min(targetPage, filePage?.totalPages || targetPage))
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
    resetCursorCache(activeFolder)
  }

  const changeViewMode = (nextView: ExplorerView) => {
    if (nextView === 'list') {
      const rootNodeId = getRepositoryRootNodeId(activeFolder, tree)
      if (rootNodeId && rootNodeId !== activeFolder) {
        resetCursorCache(rootNodeId)
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

  if (appView === 'details') {
    return (
      <DocumentDetailsView
        repositoryId={getRepositoryIdFromFolder(activeFolder)}
        id={selectedFile}
        onBack={() => setAppView('explorer')}
        onEdit={() => setAppView('editMetadata')}
        onAiSummary={() => setAppView('aiSummary')}
        onShare={() => setAppView('share')}
        onWorkflow={() => setAppView('workflow')}
      />
    )
  }

  if (appView === 'editMetadata') return <EditMetadataView onBack={() => setAppView('details')} />
  if (appView === 'aiSummary') return <AiSummaryView onBack={() => setAppView('details')} />
  if (appView === 'share') return <ShareView onBack={() => setAppView('details')} />
  if (appView === 'workflow') return <StartWorkflowView onBack={() => setAppView('details')} />

  if (viewMode === 'list') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11">
        <ExplorerToolbar view={viewMode} setView={changeViewMode} />

        <DocumentsListView
          files={files}
          breadcrumbs={breadcrumbs}
          filePage={filePage}
          loading={loading}
          loadingPage={loadingPage}
          error={error}
          onBreadcrumbSelect={openFolder}
          onOpenFile={openFile}
          onPageChange={changeServerPage}
          onPageSizeChange={changePageSize}
          onEdit={() => setAppView('editMetadata')}
          onAiSummary={() => setAppView('aiSummary')}
          onShare={() => setAppView('share')}
          onWorkflow={() => setAppView('workflow')}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11">
      <ExplorerToolbar view={viewMode} setView={changeViewMode} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TreeSidebar
          tree={tree}
          activeId={activeFolder}
          expandedIds={expandedIds}
          onToggle={toggleFolder}
          onSelect={openFolder}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-secondary">
          <Breadcrumbs items={breadcrumbs} onSelect={openFolder} />

          <div className="ez-scrollbar min-h-0 flex-1 overflow-y-auto">
            <FolderTable
              folders={folders}
              files={files}
              fileColumns={fileColumns}
              filePage={filePage}
              loading={loading || Boolean(treeLoadingId)}
              loadingPage={loadingPage}
              loadingFolders={loadingFolders}
              folderTotalCount={folderPage?.totalCount}
              folderSearch={folderSearch}
              onFolderSearchChange={setFolderSearch}
              folderHasMore={Boolean(folderPage?.hasMore) && folders.length < Number(folderPage?.totalCount ?? 0)}
              error={error}
              onOpenFolder={openFolder}
              onOpenFile={openFile}
              onPageChange={changeServerPage}
              onPageSizeChange={changePageSize}
              onLoadMoreFolders={loadMoreFolders}
              onEditMetadata={(id) => {
                setSelectedFile(id)
                setAppView('editMetadata')
              }}
              onAiSummary={(id) => {
                setSelectedFile(id)
                setAppView('aiSummary')
              }}
              onShare={(id) => {
                setSelectedFile(id)
                setAppView('share')
              }}
              onWorkflow={(id) => {
                setSelectedFile(id)
                setAppView('workflow')
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
