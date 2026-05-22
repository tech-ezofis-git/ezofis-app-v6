import './styles/folderTokens.css'
import { FolderExplorer } from './components/FolderExplorer'
const FoldersPage = () => {
  return (
    <div className='ezofis-folder-shell h-screen min-h-0 overflow-hidden bg-surface-secondary text-sm text-gray-13'>
      <FolderExplorer />
    </div>
  )
}
FoldersPage.displayName = 'FoldersPage'
export default FoldersPage
