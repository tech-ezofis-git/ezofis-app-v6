import { useFolderExplorer } from '../hooks/useFolderExplorer'
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
    error,
    expandedIds,
    fileColumns,
    filePage,
    files,
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
    setFolderSearch,
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
      <div className='flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11'>
        <ExplorerToolbar
          disabled={isBusy}
          folderSearch={folderSearch}
          items={breadcrumbs}
          refreshing={refreshing}
          view={viewMode}
          setView={changeViewMode}
          onFolderSearchChange={setFolderSearch}
          onRefresh={handleRefresh}
          onSelect={openFolder}
          onUpload={handleUpload}
        />

        <DocumentsListView
          breadcrumbs={breadcrumbs}
          error={error}
          fileColumns={fileColumns}
          filePage={filePage}
          files={files}
          folderSearch={folderSearch}
          loading={loading}
          loadingPage={loadingPage}
          refreshing={refreshing}
          onAiSummary={(id) => openFileAction(id, 'aiSummary')}
          onBreadcrumbSelect={openFolder}
          onEdit={(id) => openFileAction(id, 'editMetadata')}
          onFolderSearchChange={setFolderSearch}
          onOpenFile={openFile}
          onPageChange={changeServerPage}
          onPageSizeChange={changePageSize}
          onShare={(id) => openFileAction(id, 'share')}
          onWorkflow={(id) => openFileAction(id, 'workflow')}
        />
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11'>
      <ExplorerToolbar
        disabled={isBusy}
        folderSearch={folderSearch}
        items={breadcrumbs}
        refreshing={refreshing}
        view={viewMode}
        setView={changeViewMode}
        onFolderSearchChange={setFolderSearch}
        onRefresh={handleRefresh}
        onSelect={openFolder}
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
              filePage={filePage}
              files={files}
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
