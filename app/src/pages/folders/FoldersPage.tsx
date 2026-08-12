import './styles/folderTokens.css'
import { FolderExplorer } from './components/FolderExplorer'
const FoldersPage = () => {
  return (
    <div className='ezofis-folder-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-sm text-gray-13'>
      <FolderExplorer />
    </div>
  )
}
FoldersPage.displayName = 'FoldersPage'
export default FoldersPage
