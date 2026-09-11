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
  const applyingDeepLinkRef = useRef(false)

  useEffect(() => {
    const { folderId, itemId, repositoryId } = deepLinkSearch || {}
    if (!repositoryId) return
    if (applyingDeepLinkRef.current) return
    if (tree.length === 0) return

    applyingDeepLinkRef.current = true

    const nodeId =
      folderId ||
      findRepositoryNodeId(tree, repositoryId) ||
      encodeRepositoryNodeId({
        kind: 'repository',
        label: 'Repository',
        repositoryId,
      })

    void openFolder(nodeId).then(() => {
      if (itemId) openDetailsFile(itemId)
      if (!globalThis.location?.pathname?.startsWith('/embed')) {
        void navigate({ replace: true, search: {}, to: '/folders' })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkSearch, tree])

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

  const openDetailsFile = useCallback(
    (fileId: string) => {
      setDetailsDocument(null)
      openFile(fileId)
    },
    [openFile],
  )

  const resolvedRepositoryId = String(
    selectedRepository?.id || getRepositoryIdFromFolder(activeFolder) || '',
  )
  const { permissions: folderPermissions } = useFolderSecurityPermissions(
    resolvedRepositoryId,
    activeFolder,
  )
  const canUpload = Boolean(
    activeFolder && resolvedRepositoryId && folderPermissions.upload,
  )
  const canIntelligentUpload = Boolean(canUpload && !isDemoAppOrigin())

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

  const currentRepositoryId = resolvedRepositoryId

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

  useEffect(() => {
    if (!pendingAskAiAction || pendingAskAiAction.target !== 'Repository') {
      return
    }
    if (applyingAskAiRef.current) return
    if (tree.length === 0) return
    if (loading || loadingPage) return

    applyingAskAiRef.current = true
    let cancelled = false

    const apply = async () => {
      try {
        const repoId = String(pendingAskAiAction.repositoryId || '').trim()
        const filters = pendingAskAiAction.filters || {}

        if (viewMode !== 'list') {
          changeViewMode('list')
          // viewMode change clears filters via explorer effect; retry after settle
          applyingAskAiRef.current = false
          return
        }

        if (
          repoId &&
          currentRepositoryId.toLowerCase() !== repoId.toLowerCase()
        ) {
          const treeNodeId = findRepositoryNodeId(tree, repoId)
          const nodeId =
            treeNodeId ||
            encodeRepositoryNodeId({
              kind: 'repository',
              label: pendingAskAiAction.repositoryLabel || 'Repository',
              repositoryId: repoId,
            })
          await openFolder(nodeId)
          // Folder switch clears filters; leave pending so effect re-runs.
          applyingAskAiRef.current = false
          return
        }

        await new Promise((resolve) => window.setTimeout(resolve, 120))
        if (cancelled) return

        setFileFilters(filters)
        setFileSearch(pendingAskAiAction.fileSearch?.trim() || '')

        if (pendingAskAiAction.openItemId?.trim()) {
          openDetailsFile(pendingAskAiAction.openItemId.trim())
        } else {
          setAppView('explorer')
        }
        clearPending()
      } finally {
        applyingAskAiRef.current = false
      }
    }

    void apply()
    return () => {
      cancelled = true
    }
  }, [
    changeViewMode,
    clearPending,
    currentRepositoryId,
    loading,
    loadingPage,
    openDetailsFile,
    openFolder,
    pendingAskAiAction,
    setAppView,
    setFileFilters,
    setFileSearch,
    tree,
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
        message: t`Select a repository before uploading.`,
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
            setFileFilters(filters)
            setFolderFilters(filters)
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
            setFileSearch(value)
            setFolderSearch(value)
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
        onFileFiltersChange={setFileFilters}
        onFileSearchChange={setFileSearch}
        onFilterMenuOpenChange={(id) => {
          if (id) beginFilterDefer()
          else commitFilterDefer()
        }}
        onFolderFiltersChange={setFolderFilters}
        onFolderSearchChange={setFolderSearch}
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
