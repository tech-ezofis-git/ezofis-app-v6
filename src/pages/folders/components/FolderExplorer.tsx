import { ExplorerToolbar } from './ExplorerToolbar'
import { TreeSidebar } from './TreeSidebar'
import FolderTable from './FolderTable'
import { DocumentsListView } from './DocumentsListView'
import { DocumentDetailsView } from './DocumentDetailsView'
import { EditMetadataView } from './EditMetadataView'
import { AiSummaryView } from './AiSummaryView'
import { ShareView } from './ShareView'
import { StartWorkflowView } from './StartWorkflowView'
import { useFolderExplorer } from '../hooks/useFolderExplorer'
import Upload from './Upload/Upload'

export function FolderExplorer() {
  const {
    activeFolder,
    appView,
    breadcrumbs,
    changePageSize,
    changeServerPage,
    changeViewMode,
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
    loadMoreFolders,
    loading,
    loadingFolders,
    loadingPage,
    openFile,
    openFileAction,
    openFolder,
    selectedFile,
    setAppView,
    setFolderSearch,
    toggleFolder,
    tree,
    viewMode,
    selectedRepository,
    refreshData,
    refreshing,
  } = useFolderExplorer()

  const isBusy = loading || loadingPage || refreshing

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

  if (appView === 'editMetadata') {
    return (
      <EditMetadataView
        onBack={() => setAppView(selectedFile ? 'details' : 'explorer')}
        fileColumns={fileColumns}
        fileData={getSelectedFileRow(selectedFile)}
        onSave={(values) => {
          console.log('save metadata', {
            repositoryId: getRepositoryIdFromFolder(activeFolder),
            itemId: selectedFile,
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
        repositoryId={selectedRepository?.id || 0}
        repositoryData={selectedRepository}
        onBack={() => setAppView('explorer')}
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
      <div className="flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11">
        <ExplorerToolbar
          view={viewMode}
          setView={changeViewMode}
          items={breadcrumbs}
          onSelect={openFolder}
          onUpload={handleUpload}
          folderSearch={folderSearch}
          onFolderSearchChange={setFolderSearch}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          disabled={isBusy}
        />

        <DocumentsListView
          files={files}
          fileColumns={fileColumns}
          breadcrumbs={breadcrumbs}
          filePage={filePage}
          loading={loading}
          refreshing={refreshing}
          loadingPage={loadingPage}
          error={error}
          folderSearch={folderSearch}
          onFolderSearchChange={setFolderSearch}
          onBreadcrumbSelect={openFolder}
          onOpenFile={openFile}
          onPageChange={changeServerPage}
          onPageSizeChange={changePageSize}
          onEdit={(id) => openFileAction(id, 'editMetadata')}
          onAiSummary={(id) => openFileAction(id, 'aiSummary')}
          onShare={(id) => openFileAction(id, 'share')}
          onWorkflow={(id) => openFileAction(id, 'workflow')}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11">
      <ExplorerToolbar
        view={viewMode}
        setView={changeViewMode}
        items={breadcrumbs}
        onSelect={openFolder}
        onUpload={handleUpload}
        folderSearch={folderSearch}
        onFolderSearchChange={setFolderSearch}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        disabled={isBusy}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TreeSidebar
          tree={tree}
          activeId={activeFolder}
          expandedIds={expandedIds}
          onToggle={toggleFolder}
          onSelect={openFolder}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-secondary">
          <div className="ez-scrollbar min-h-0 flex-1 overflow-y-auto">
            <FolderTable
              folders={folders}
              files={files}
              fileColumns={fileColumns}
              filePage={filePage}
              loading={loading}
              refreshing={refreshing}
              loadingPage={loadingPage}
              loadingFolders={loadingFolders}
              folderTotalCount={folderPage?.totalCount}
              folderSearch={folderSearch}
              folderHasMore={folderHasMore}
              onOpenFolder={openFolder}
              onOpenFile={openFile}
              onPageChange={changeServerPage}
              onPageSizeChange={changePageSize}
              onLoadMoreFolders={loadMoreFolders}
              onEditMetadata={(id) => openFileAction(id, 'editMetadata')}
              onAiSummary={(id) => openFileAction(id, 'aiSummary')}
              onShare={(id) => openFileAction(id, 'share')}
              onWorkflow={(id) => openFileAction(id, 'workflow')}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
