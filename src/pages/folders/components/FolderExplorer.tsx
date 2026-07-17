import { useCallback, useMemo } from 'react'
import { useFolderExplorer } from '../hooks/useFolderExplorer'
import useFoldersTopbar from '../hooks/useFoldersTopbar'
import { AiSummaryView } from './AiSummaryView'
import { DocumentDetailsView } from './DocumentDetailsView'
import { DocumentsListView } from './DocumentsListView'
import { EditMetadataView } from './EditMetadataView'
import { ExplorerToolbar } from './ExplorerToolbar'
import FolderTable from './FolderTable'
import { ShareView } from './ShareView'
import { StartWorkflowView } from './StartWorkflowView'
import { TreeSidebar } from './TreeSidebar'
import Upload from './Upload/Upload'

export function FolderExplorer() {
  const {
    activeFolder,
    appView,
    breadcrumbs,
    changePageSize,
    changeServerPage,
    changeViewMode,
    currentFolderGroupField,
    error,
    expandedIds,
    fileColumns,
    fileFilters,
    filePage,
    files,
    fileSearch,
    folderContextFilters,
    folderFilters,
    folderHasMore,
    folderPage,
    folders,
    folderSearch,
    loading,
    loadingFolders,
    loadingPage,
    loadMoreFolders,
    openFile,
    openFileAction,
    openFolder,
    refreshData,
    refreshing,
    selectedFile,
    selectedRepository,
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

  const handleBreadcrumbNavigate = useCallback(
    (key: string) => {
      if (key === 'folders-root') {
        const root = tree.find((node) => !node.isStatic) || tree[0]
        if (root) void openFolder(root.id)
        return
      }

      void openFolder(key)
    },
    [openFolder, tree],
  )

  const foldersTopbar = useMemo(() => {
    const pathItems = breadcrumbs.map((item) => ({
      key: item.id,
      label: item.label,
    }))

    return {
      items: [
        {
          key: pathItems.length ? 'folders-root' : undefined,
          label: 'Folders',
        },
        ...pathItems,
      ],
      onNavigate: handleBreadcrumbNavigate,
    }
  }, [breadcrumbs, handleBreadcrumbNavigate])

  useFoldersTopbar(foldersTopbar)

  const handleUpload = () => {
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
    return (
      <DocumentDetailsView
        id={selectedFile}
        repositoryId={getRepositoryIdFromFolder(activeFolder)}
        onAiSummary={() => setAppView('aiSummary')}
        onBack={() => setAppView('explorer')}
        onEdit={() => setAppView('editMetadata')}
        onShare={() => setAppView('share')}
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
        repositoryData={selectedRepository}
        repositoryId={selectedRepository?.id || 0}
        onBack={() => setAppView('explorer')}
        onSuccess={refreshData}
      />
    )
  }

  if (appView === 'aiSummary') {
    return <AiSummaryView onBack={() => setAppView('details')} />
  }

  if (appView === 'share') {
    return <ShareView onBack={() => setAppView('details')} />
  }

  if (appView === 'workflow') {
    return <StartWorkflowView onBack={() => setAppView('details')} />
  }

  if (viewMode === 'list') {
    return (
      <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-sm text-gray-11'>
        <DocumentsListView
          breadcrumbs={breadcrumbs}
          currentFolderGroupField={currentFolderGroupField}
          error={error}
          fileColumns={fileColumns}
          fileFilters={fileFilters}
          filePage={filePage}
          files={files}
          folderContextFilters={folderContextFilters}
          loading={loading}
          loadingPage={loadingPage}
          refreshing={refreshing}
          searchQuery={fileSearch}
          view={viewMode}
          onAiSummary={(id) => openFileAction(id, 'aiSummary')}
          onBreadcrumbSelect={openFolder}
          onEdit={(id) => openFileAction(id, 'editMetadata')}
          onFiltersChange={setFileFilters}
          onOpenFile={openFile}
          onPageChange={changeServerPage}
          onPageSizeChange={changePageSize}
          onRefresh={handleRefresh}
          onSearchChange={setFileSearch}
          onShare={(id) => openFileAction(id, 'share')}
          onUpload={handleUpload}
          onWorkflow={(id) => openFileAction(id, 'workflow')}
          setView={changeViewMode}
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
        folderContextFilters={folderContextFilters}
        folderFilters={folderFilters}
        folders={folders}
        folderSearch={folderSearch}
        loading={loading}
        loadingFolders={loadingFolders}
        loadingPage={loadingPage}
        refreshing={refreshing}
        view={viewMode}
        setView={changeViewMode}
        onFileFiltersChange={setFileFilters}
        onFolderFiltersChange={setFolderFilters}
        onFolderSearchChange={setFolderSearch}
        onFileSearchChange={setFileSearch}
        onRefresh={handleRefresh}
        onUpload={handleUpload}
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
              files={files}
              folderContextFilters={folderContextFilters}
              folderFilters={folderFilters}
              folderHasMore={folderHasMore}
              folders={folders}
              folderSearch={folderSearch}
              folderTotalCount={folderPage?.totalCount}
              loading={loading}
              loadingFolders={loadingFolders}
              loadingPage={loadingPage}
              refreshing={refreshing}
              onAiSummary={(id) => openFileAction(id, 'aiSummary')}
              onEditMetadata={(id) => openFileAction(id, 'editMetadata')}
              onLoadMoreFolders={loadMoreFolders}
              onOpenFile={openFile}
              onOpenFolder={openFolder}
              onPageChange={changeServerPage}
              onPageSizeChange={changePageSize}
              onShare={(id) => openFileAction(id, 'share')}
              onWorkflow={(id) => openFileAction(id, 'workflow')}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
