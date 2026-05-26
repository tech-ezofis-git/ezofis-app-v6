import type { ExplorerView } from '../types/folderTypes'
import { DynamicIcon } from './icons'
import { Button, IconButton } from './Ui'

type ExplorerToolbarProps = {
  view: ExplorerView
  onBack?: () => void
  onDownload?: () => void
  onForward?: () => void
  onNewFolder?: () => void
  onRefresh?: () => void
  onUpload?: () => void
  setView: (view: ExplorerView) => void
}

export function ExplorerToolbar({
  view,
  setView,
  onBack,
  onForward,
  onNewFolder,
  onRefresh,
  onUpload,
}: ExplorerToolbarProps) {
  return (
    <div className='flex h-[56px] shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-5'>
      <div className='flex items-center gap-3'>
        <IconButton
          className='rotate-180'
          icon='chevronRight'
          onClick={onBack}
        />

        <IconButton icon='chevronRight' onClick={onForward} />

        <IconButton icon='refresh' onClick={onRefresh} />

        <span className='mx-1 h-6 w-px bg-gray-3' />

        <Button
          className='border-transparent shadow-none'
          type='button'
          onClick={onUpload}
        >
          <DynamicIcon name='upload' />
          Upload
        </Button>

        <Button
          className='border-transparent shadow-none'
          type='button'
          onClick={onNewFolder}
        >
          <DynamicIcon name='folderPlus' />
          New Folder
        </Button>

        {/* <Button
          type="button"
          onClick={onDownload}
          className="border-transparent shadow-none"
        >
          <DynamicIcon name="download" />
          Download
        </Button> */}
      </div>

      <div className='flex rounded-lg bg-gray-2 p-1'>
        <IconButton
          active={view === 'list'}
          icon='list'
          onClick={() => setView('list')}
        />

        <IconButton
          active={view === 'grid'}
          icon='grid'
          onClick={() => setView('grid')}
        />
      </div>
    </div>
  )
}
