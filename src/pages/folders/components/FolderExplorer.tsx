import { useEffect, useState } from 'react'
import type {
  AppView,
  ExplorerView,
  FileItem,
  FolderItem,
  TreeNode,
} from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import { AiSummaryView } from './AiSummaryView'
import { Breadcrumbs } from './Breadcrumbs'
import { DocumentDetailsView } from './DocumentDetailsView'
import { DocumentsListView } from './DocumentsListView'
import { EditMetadataView } from './EditMetadataView'
import { ExplorerToolbar } from './ExplorerToolbar'
import { FolderTable } from './FolderTable'
import { ShareView } from './ShareView'
import { StartWorkflowView } from './StartWorkflowView'
import { TreeSidebar } from './TreeSidebar'

export function FolderExplorer() {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [activeFolder, setActiveFolder] = useState('by-supplier')
  const [viewMode, setViewMode] = useState<ExplorerView>('grid')
  const [appView, setAppView] = useState<AppView>('explorer')
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['EZOFIS'])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState('INV-2024-0891')

  useEffect(() => {
    folderApi.getTree().then(setTree)
  }, [])

  useEffect(() => {
    folderApi.getFolderContent(activeFolder).then((response) => {
      setBreadcrumbs(response.breadcrumbs)
      setFolders(response.folders)
      setFiles(response.files)
    })
  }, [activeFolder])

  const openFile = (id: string) => {
    setSelectedFile(id)
    setAppView('details')
  }

  if (appView === 'documents') {
    return (
      <DocumentsListView
        files={files}
        onAiSummary={() => setAppView('aiSummary')}
        onBack={() => setAppView('explorer')}
        onEdit={() => setAppView('editMetadata')}
        onOpenFile={openFile}
        onShare={() => setAppView('share')}
        onWorkflow={() => setAppView('workflow')}
      />
    )
  }

  if (appView === 'details')
    return (
      <DocumentDetailsView
        id={selectedFile}
        onAiSummary={() => setAppView('aiSummary')}
        onBack={() => setAppView('explorer')}
        onEdit={() => setAppView('editMetadata')}
        onShare={() => setAppView('share')}
        onWorkflow={() => setAppView('workflow')}
      />
    )
  if (appView === 'editMetadata')
    return <EditMetadataView onBack={() => setAppView('details')} />
  if (appView === 'aiSummary')
    return <AiSummaryView onBack={() => setAppView('details')} />
  if (appView === 'share')
    return <ShareView onBack={() => setAppView('details')} />
  if (appView === 'workflow')
    return <StartWorkflowView onBack={() => setAppView('details')} />

  if (viewMode === 'list') {
    return (
      <div className='flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11'>
        <ExplorerToolbar view={viewMode} setView={setViewMode} />
        <DocumentsListView
          files={files}
          onAiSummary={() => setAppView('aiSummary')}
          onBack={() => setViewMode('grid')}
          onEdit={() => setAppView('editMetadata')}
          onOpenFile={openFile}
          onShare={() => setAppView('share')}
          onWorkflow={() => setAppView('workflow')}
        />
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-surface-secondary text-sm text-gray-11'>
      <ExplorerToolbar view={viewMode} setView={setViewMode} />
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <TreeSidebar
          activeId={activeFolder}
          tree={tree}
          onSelect={setActiveFolder}
        />
        <main className='flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-secondary'>
          <Breadcrumbs items={breadcrumbs} />

          <div className='ez-scrollbar min-h-0 flex-1 overflow-y-auto'>
            <FolderTable
              files={files}
              folders={folders}
              onAiSummary={(id) => {
                setSelectedFile(id)
                setAppView('aiSummary')
              }}
              onEditMetadata={(id) => {
                setSelectedFile(id)
                setAppView('editMetadata')
              }}
              onOpenFile={openFile}
              onOpenFolder={setActiveFolder}
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

          <div className='flex h-9 shrink-0 items-center border-t border-gray-3 bg-surface-primary px-4 text-sm text-gray-10'>
            {folders.length + files.length} items
          </div>
        </main>
      </div>
    </div>
  )
}
