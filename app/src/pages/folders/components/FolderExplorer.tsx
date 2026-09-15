import { useLingui } from '@lingui/react/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SettingsBreadcrumbItem } from '@/pages/settings/helpers/settingsBreadcrumbs'
import showToast from '@/components/base/toast/showToast'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import { encodeRepositoryNodeId } from '../api/folderApi'
import { useFolderExplorer } from '../hooks/useFolderExplorer'
import useFolderSecurityPermissions from '../hooks/useFolderSecurityPermissions'
import useFoldersTopbar from '../hooks/useFoldersTopbar'
import {
  findRepositoryNodeId,
  getRepositoryRootNodeId,
} from '../utils/folderExplorerUtils'
import { markFolderExplorerAskAiQuery } from '../utils/folderExplorerSession'
import { AiSummaryView } from './AiSummaryView'
import { DocumentDetailsView } from './DocumentDetailsView'
import { DocumentsListView } from './DocumentsListView'
import { EditMetadataView } from './EditMetadataView'
import { ExplorerToolbar } from './ExplorerToolbar'
import FolderTable from './FolderTable'
import IntelligentUploadView from './IntelligentUpload/IntelligentUploadView'
import { StartWorkflowView } from './StartWorkflowView'
import { TreeSidebar } from './TreeSidebar'
import Upload from './Upload/Upload'
import { isDemoAppOrigin } from '@/utils/origin'

export function FolderExplorer() {
  const { i18n, t } = useLingui()
  const {
    activeFolder,
    appView,
    beginFilterDefer,
    breadcrumbs,
    changePageSize,
    changeServerPage,
    changeViewMode,
    commitFilterDefer,
    currentFolderGroupField,
    error,
    expandedIds,
    fileColumns,
    fileFilters,
    filePage,
    files,
    fileSearch,
    filterOptionsCache,
    folderContextFilters,
    folderFilterOptionSource,
    folderFilters,
    folderHasMore,
    folderPage,
    folders,
    folderSearch,
    itemFilterFields,
    loading,
    loadingFolders,
    loadingPage,
    loadMoreFolders,
    openFile,
    openFileAction,
    openFolder,
    refreshData,
    refreshing,
    repositoryNodes,
    selectedFile,
    selectedRepository,
    selectFolder,
    toggleFolder,
    tree,
    viewMode,
    getRepositoryIdFromFolder,
    getSelectedFileRow,
    setAppView,
    setFileFilters,
    setFileSearch,
    setFolderFilters,
    setFolderSearch,
  } = useFolderExplorer()

  const isBusy = loading || loadingPage || refreshing
  const navigate = useNavigate()
  const deepLinkSearch: any = useSearch({ strict: false })
  const applyingDeepLinkRef = useRef<string | null>(null)

  const pendingAskAiAction = useAskAiActionStore((state) => state.pending)
  const setPageContext = useAskAiActionStore((state) => state.setPageContext)
  const clearPending = useAskAiActionStore((state) => state.clearPending)
  const applyingAskAiRef = useRef(false)
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)
  const [pendingOpenShare, setPendingOpenShare] = useState(false)
  const [detailsDocument, setDetailsDocument] = useState<{
    id: string
    repositoryId: string
  } | null>(null)
  const folderBeforeUploadRef = useRef('')

  const resolveUploadReturnFolder = useCallback(
    (folderId: string) => {
      if (!folderId) return ''
      // List view repository dropdown only matches repository root nodes.
      if (viewMode === 'list') {
        return getRepositoryRootNodeId(folderId, tree) || folderId
      }
      return folderId
    },
    [tree, viewMode],
  )

  const exitUpload = useCallback(() => {
    const sourceFolder = folderBeforeUploadRef.current || activeFolder
    const folderToSelect = resolveUploadReturnFolder(sourceFolder)

    setPendingUploadFile(null)

    if (folderToSelect) selectFolder(folderToSelect)
    else setAppView('explorer')
  }, [activeFolder, resolveUploadReturnFolder, selectFolder, setAppView])

  const openShareForFile = useCallback(
    (fileId: string) => {
      setPendingOpenShare(true)
      setDetailsDocument(null)
      openFileAction(fileId, 'details')
    },
    [openFileAction],
  )

  /** Prefer an explicit repositoryId (Ask AI / deep-link) so workspace fetch
   *  does not depend on activeFolder having finished switching. */
  const openDetailsFile = useCallback(
    (fileId: string, repositoryId?: string) => {
      const trimmedId = String(fileId || '').trim()
      if (!trimmedId) return
      const trimmedRepo = String(repositoryId || '').trim()
      if (trimmedRepo) {
        setDetailsDocument({ id: trimmedId, repositoryId: trimmedRepo })
      } else {
        setDetailsDocument(null)
      }
      openFile(trimmedId)
    },
    [openFile],
  )

  const resolvedRepositoryId = String(
    selectedRepository?.id || getRepositoryIdFromFolder(activeFolder) || '',
  )
  const currentRepositoryId = resolvedRepositoryId

  const selectRepositoryById = useCallback(
    (repositoryId: string, label = 'Repository') => {
      const repoId = String(repositoryId || '').trim()
      if (!repoId) return false
      if (currentRepositoryId.toLowerCase() === repoId.toLowerCase()) {
        return false
      }
      const nodeId =
        findRepositoryNodeId(tree, repoId) ||
        encodeRepositoryNodeId({
          kind: 'repository',
          label,
          repositoryId: repoId,
        })
      // selectFolder bypasses openFolder's loading guard.
      selectFolder(nodeId)
      return true
    },
    [currentRepositoryId, selectFolder, tree],
  )

  // Deep-link: /folders?repositoryId&itemId (Global Search + Ask AI).
  useEffect(() => {
    const { folderId, itemId, repositoryId } = deepLinkSearch || {}
    const repoId = String(repositoryId || '').trim()
    const openItemId = String(itemId || '').trim()
    const folderKey = String(folderId || '').trim()
    const deepLinkKey = `${repoId}|${openItemId}|${folderKey}`

    if (!repoId && !folderKey) {
      applyingDeepLinkRef.current = null
      return
    }
    if (tree.length === 0) return
    if (applyingDeepLinkRef.current === deepLinkKey) return

    applyingDeepLinkRef.current = deepLinkKey

    const nodeId =
      folderKey ||
      findRepositoryNodeId(tree, repoId) ||
      (repoId
        ? encodeRepositoryNodeId({
            kind: 'repository',
            label: 'Repository',
            repositoryId: repoId,
          })
        : '')

    if (nodeId && nodeId !== activeFolder) {
      selectFolder(nodeId)
    }

    if (openItemId) {
      openDetailsFile(openItemId, repoId || undefined)
    }

    if (!globalThis.location?.pathname?.startsWith('/embed')) {
      void navigate({ replace: true, search: {}, to: '/folders' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkSearch, tree.length])

  const { permissions: folderPermissions } = useFolderSecurityPermissions(
    resolvedRepositoryId,
    activeFolder,
  )
  const canUpload = Boolean(
    activeFolder && resolvedRepositoryId && folderPermissions.upload,
  )
  const canIntelligentUpload = Boolean(!isDemoAppOrigin())

  useEffect(() => {
    if (appView === 'Upload' && !folderPermissions.upload) {
      exitUpload()
    }
    if (appView === 'editMetadata' && !folderPermissions.editMetadata) {
      setAppView(selectedFile ? 'details' : 'explorer')
    }
  }, [
    appView,
    exitUpload,
    folderPermissions.editMetadata,
    folderPermissions.upload,
    selectedFile,
    setAppView,
  ])

  useEffect(() => {
    setPageContext({
      actionFrom: 'Repository',
      specificId: currentRepositoryId,
    })
    return () => {
      const latest = useAskAiActionStore.getState().pageContext
      if (latest?.actionFrom === 'Repository') {
        useAskAiActionStore.getState().clearContext()
      }
    }
  }, [currentRepositoryId, setPageContext])

  // Ask AI / Global Search pending: switch repo, apply search/filters, open file.
  useEffect(() => {
    if (!pendingAskAiAction || pendingAskAiAction.target !== 'Repository') {
      applyingAskAiRef.current = false
      return
    }
    if (applyingAskAiRef.current) return
    if (tree.length === 0) return
    // Wait for folder content settle after a repo switch, otherwise search/filter
    // writes get wiped by the activeFolder effect.
    if (loading || loadingPage) return

    applyingAskAiRef.current = true

    const repoId = String(pendingAskAiAction.repositoryId || '').trim()
    const legacyMetaKeys = new Set([
      'repo',
      'repository',
      'repositoryid',
      'repositoryname',
      'workspace',
      'workspaceid',
    ])
    let fileSearch = pendingAskAiAction.fileSearch?.trim() || ''
    const filters = Object.fromEntries(
      Object.entries(pendingAskAiAction.filters || {}).flatMap(
        ([key, value]) => {
          const normalized = key.toLowerCase().replace(/[\s_-]/g, '')
          if (normalized === 'search') {
            if (!fileSearch) {
              fileSearch = String(value || '').trim()
            }
            return []
          }
          if (legacyMetaKeys.has(normalized)) return []
          return [[key, value]]
        },
      ),
    )

    if (viewMode !== 'list') {
      changeViewMode('list')
      applyingAskAiRef.current = false
      return
    }

    if (
      selectRepositoryById(
        repoId,
        pendingAskAiAction.repositoryLabel || 'Repository',
      )
    ) {
      applyingAskAiRef.current = false
      return
    }

    const fromAskAi = Boolean(pendingAskAiAction.ephemeral)
    if (fromAskAi) {
      markFolderExplorerAskAiQuery()
    }
    setFileFilters(filters, { fromAskAi })
    setFileSearch(fileSearch, { fromAskAi })
    setFolderSearch(fileSearch, { fromAskAi })

    const openItemId = pendingAskAiAction.openItemId?.trim() || ''
    if (openItemId) {
      openDetailsFile(openItemId, repoId || undefined)
    }

    clearPending()
    applyingAskAiRef.current = false
  }, [
    changeViewMode,
    clearPending,
    loading,
    loadingPage,
    openDetailsFile,
    pendingAskAiAction,
    selectRepositoryById,
    setFileFilters,
    setFileSearch,
    setFolderSearch,
    tree.length,
    viewMode,
  ])

  const handleBreadcrumbNavigate = useCallback(
    (key: string) => {
      if (appView === 'Upload') {
        setPendingUploadFile(null)
      }

      if (key === 'folders-root') {
        if (appView === 'Upload') {
          selectFolder('')
          setAppView('explorer')
        } else {
          void openFolder('')
        }
        return
      }

      if (appView === 'Upload') selectFolder(key)
      else void openFolder(key)
    },
    [appView, openFolder, selectFolder, setAppView, tree],
  )

  const foldersTopbar = useMemo(() => {
    const pathItems = breadcrumbs.map((item) => ({
      key: item.id,
      label: item.label,
    }))

    const items: SettingsBreadcrumbItem[] = [
      {
        key: 'folders-root',
        label: t`Folders`,
      },
      ...pathItems,
    ]

    if (appView === 'Upload') {
      items.push({ label: t`Upload` })
    }
    if (appView === 'intelligentUpload') {
      items.push({ label: t`Intelligent Upload & Classify` })
    }

    return {
      items,
      onNavigate: handleBreadcrumbNavigate,
    }
  }, [appView, breadcrumbs, handleBreadcrumbNavigate, i18n.locale, t])

  useFoldersTopbar(foldersTopbar)

  const handleIntelligentUpload = () => {
    if (isDemoAppOrigin()) return
    if (!resolvedRepositoryId) {
      showToast({
        message: t`Select a folder before uploading.`,
        variant: 'error',
      })
      return
    }
    setAppView('intelligentUpload')
  }

  const handleUpload = () => {
    if (!resolvedRepositoryId) {
      showToast({
        message: t`Select a repository before uploading.`,
        variant: 'error',
      })
      return
    }
    folderBeforeUploadRef.current = activeFolder
    setPendingUploadFile(null)
    setAppView('Upload')
  }

  const handleUploadFile = (file: File) => {
    if (!resolvedRepositoryId) {
      showToast({
        message: t`Select a repository before uploading.`,
        variant: 'error',
      })
      return
    }
    folderBeforeUploadRef.current = activeFolder
    setPendingUploadFile(file)
    setAppView('Upload')
  }

  const handleRefresh = async () => {
    if (isBusy) return

    /**
     * refreshData should set refreshing=true inside useFolderExplorer.
     * Example inside hook:
     *
     * const refreshData = async () => {
     *   try {
     *     setRefreshing(true)
     *     await loadFolderData({ reset: true })
     *   } finally {
     *     setRefreshing(false)
     *   }
     * }
     */
    await refreshData()
  }

  if (appView === 'details') {
    const detailsId = detailsDocument?.id || selectedFile
    const detailsRepositoryId =
      detailsDocument?.repositoryId ||
      String(
        getRepositoryIdFromFolder(activeFolder) || selectedRepository?.id || '',
      )

    return (
      <DocumentDetailsView
        autoOpenShare={pendingOpenShare}
        id={detailsId}
        permissions={folderPermissions}
        repositoryId={detailsRepositoryId}
        onAiSummary={() => setAppView('aiSummary')}
        onBack={() => {
          setPendingOpenShare(false)
          setDetailsDocument(null)
          setAppView('explorer')
        }}
        onEdit={
          folderPermissions.editMetadata
            ? () => setAppView('editMetadata')
            : undefined
        }
        onOpenRelatedDocument={({
          id: relatedId,
          repositoryId: relatedRepoId,
        }) => {
          setPendingOpenShare(false)
          setDetailsDocument({
            id: relatedId,
            repositoryId: relatedRepoId,
          })
          openFileAction(relatedId, 'details')
        }}
        onShareOpened={() => setPendingOpenShare(false)}
        onWorkflow={() => setAppView('workflow')}
      />
    )
  }

  if (appView === 'editMetadata') {
    return (
      <EditMetadataView
        fileColumns={fileColumns}
        fileData={getSelectedFileRow(selectedFile)}
        onBack={() => setAppView(selectedFile ? 'details' : 'explorer')}
        onSave={(values) => {
          console.log('save metadata', {
            itemId: selectedFile,
            repositoryId: getRepositoryIdFromFolder(activeFolder),
            values,
          })
        }}
      />
    )
  }

  if (appView === 'Upload') {
    return (
      <Upload
        folderId={activeFolder}
        initialFile={pendingUploadFile}
        repositoryData={selectedRepository}
        repositoryId={resolvedRepositoryId || null}
        onBack={exitUpload}
        onSuccess={refreshData}
      />
    )
  }

  if (appView === 'intelligentUpload') {
    if (isDemoAppOrigin()) {
      setAppView('explorer')
      return null
    }

    const candidateRepos = repositoryNodes.map((node) => ({
      id: String(getRepositoryIdFromFolder(node.id) || node.id),
      name: node.title,
    }))

    return (
      <IntelligentUploadView
        candidateRepositories={candidateRepos}
        repositoryId={resolvedRepositoryId || null}
        onBack={() => setAppView('explorer')}
        onDone={async () => {
          setAppView('explorer')
          await refreshData()
        }}
      />
    )
  }

  if (appView === 'aiSummary') {
    console.log(
      'appView === aiSummary',
      selectedFile,
      getSelectedFileRow(selectedFile),
    )
    const currentFileName = getSelectedFileRow(selectedFile)?.fileName
    return (
      <AiSummaryView
        currentFileName={currentFileName}
        itemId={selectedFile}
        repositoryId={String(
          selectedRepository?.id ||
            getRepositoryIdFromFolder(activeFolder) ||
            '',
        )}
        onBack={() => setAppView(selectedFile ? 'details' : 'explorer')}
      />
    )
  }

  if (appView === 'workflow') {
    return <StartWorkflowView onBack={() => setAppView('details')} />
  }

  const displayFolders = activeFolder
    ? folders
    : (repositoryNodes.map((node) => ({
        createdByName: node.createdByName || '-',
        iconKey: node.iconKey || 'folder',
        id: node.id,
        itemsText: node.fileCount !== undefined ? String(node.fileCount) : '-',
        modifiedText: node.createdAtUtc || '-',
        title: node.title,
      })) as any[])

  const displayFiles = activeFolder ? files : []

  if (viewMode === 'list') {
    return (
      <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-sm text-gray-11'>
        <DocumentsListView
          activeRepositoryId={activeFolder}
          breadcrumbs={breadcrumbs}
          currentFolderGroupField={currentFolderGroupField}
          error={error}
          fileColumns={fileColumns}
          fileFilters={fileFilters}
          filePage={filePage}
          files={displayFiles}
          filterOptionsCache={filterOptionsCache}
          folderContextFilters={folderContextFilters}
          folderFilterOptionSource={folderFilterOptionSource}
          folders={displayFolders}
          itemFilterFields={itemFilterFields}
          loading={loading}
          loadingPage={loadingPage}
          permissions={folderPermissions}
          refreshing={refreshing}
          repositories={repositoryNodes}
          repositoryId={resolvedRepositoryId}
          searchQuery={fileSearch}
          uploadDisabled={!canUpload}
          view={viewMode}
          setView={changeViewMode}
          onAiSummary={(id) => openFileAction(id, 'aiSummary')}
          onBreadcrumbSelect={openFolder}
          onEdit={
            folderPermissions.editMetadata
              ? (id) => openFileAction(id, 'editMetadata')
              : undefined
          }
          onFilterMenuOpenChange={(id) => {
            if (id) beginFilterDefer()
            else commitFilterDefer()
          }}
          onFiltersChange={(filters) => {
            setFileFilters(filters, { manual: true })
            setFolderFilters(filters, { manual: true })
          }}
          onIntelligentUpload={
            canIntelligentUpload ? handleIntelligentUpload : undefined
          }
          onOpenFile={openDetailsFile}
          onPageChange={changeServerPage}
          onPageSizeChange={changePageSize}
          onRefresh={handleRefresh}
          onRepositoryChange={openFolder}
          onSearchChange={(value) => {
            setFileSearch(value, { manual: true })
            setFolderSearch(value, { manual: true })
          }}
          onShare={openShareForFile}
          onUpload={canUpload ? handleUpload : undefined}
          onUploadFile={canUpload ? handleUploadFile : undefined}
          onWorkflow={(id) => openFileAction(id, 'workflow')}
        />
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11'>
      <ExplorerToolbar
        currentFolderGroupField={currentFolderGroupField}
        disabled={isBusy}
        fileColumns={fileColumns}
        fileFilters={fileFilters}
        files={files}
        fileSearch={fileSearch}
        filterOptionsCache={filterOptionsCache}
        folderContextFilters={folderContextFilters}
        folderFilterOptionSource={folderFilterOptionSource}
        folderFilters={folderFilters}
        folders={displayFolders}
        folderSearch={folderSearch}
        itemFilterFields={itemFilterFields}
        loading={loading}
        loadingFolders={loadingFolders}
        loadingPage={loadingPage}
        refreshing={refreshing}
        repositoryId={resolvedRepositoryId}
        view={viewMode}
        setView={changeViewMode}
        onFileFiltersChange={(filters) => {
          setFileFilters(filters, { manual: true })
        }}
        onFileSearchChange={(value) => {
          setFileSearch(value, { manual: true })
        }}
        onFilterMenuOpenChange={(id) => {
          if (id) beginFilterDefer()
          else commitFilterDefer()
        }}
        onFolderFiltersChange={(filters) => {
          setFolderFilters(filters, { manual: true })
        }}
        onFolderSearchChange={(value) => {
          setFolderSearch(value, { manual: true })
        }}
        onIntelligentUpload={
          canIntelligentUpload ? handleIntelligentUpload : undefined
        }
        onRefresh={handleRefresh}
        onUpload={canUpload ? handleUpload : undefined}
      />

      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <TreeSidebar
          activeId={activeFolder}
          expandedIds={expandedIds}
          tree={tree}
          onSelect={openFolder}
          onToggle={toggleFolder}
        />

        <main className='flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-secondary'>
          <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto'>
            <FolderTable
              fileColumns={fileColumns}
              fileFilters={fileFilters}
              filePage={filePage}
              files={displayFiles}
              fileSearch={fileSearch}
              folderContextFilters={folderContextFilters}
              folderFilters={folderFilters}
              folderHasMore={activeFolder ? folderHasMore : false}
              folders={displayFolders}
              folderSearch={folderSearch}
              hideFolderActions={!activeFolder}
              loading={loading}
              loadingFolders={loadingFolders}
              loadingPage={loadingPage}
              permissions={folderPermissions}
              refreshing={refreshing}
              uploadDisabled={!canUpload}
              folderTotalCount={
                activeFolder ? folderPage?.totalCount : displayFolders.length
              }
              onAiSummary={(id) => openFileAction(id, 'aiSummary')}
              onEditMetadata={
                folderPermissions.editMetadata
                  ? (id) => openFileAction(id, 'editMetadata')
                  : undefined
              }
              onLoadMoreFolders={loadMoreFolders}
              onOpenFile={openDetailsFile}
              onOpenFolder={openFolder}
              onPageChange={changeServerPage}
              onPageSizeChange={changePageSize}
              onShare={openShareForFile}
              onUpload={canUpload ? handleUpload : undefined}
              onUploadFile={canUpload ? handleUploadFile : undefined}
              onWorkflow={(id) => openFileAction(id, 'workflow')}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
