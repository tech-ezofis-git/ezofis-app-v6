import requestStore from '../../stores/useRequestStore'
import NewRequestFileUpload from './components/newrequest/FileUpload'
import Header from './components/newrequest/Header'
import PoSetupFlowPage from './components/newrequest/poFlow/PoSetupFlowPage'

interface Props {
  onClose: () => void
}

const NewRequestSheet = ({ onClose }: Props) => {
  const { newRequestMeta } = requestStore((state) => state)

  return (
    <div className='flex h-full flex-1 flex-col overflow-hidden bg-surface-muted'>
      {newRequestMeta != 'po' && (
        <Header
          title={newRequestMeta === 'po1x`' ? 'PO Setup' : 'New Request'}
          onClose={onClose}
        />
      )}

      {newRequestMeta === 'request' ? (
        <NewRequestFileUpload onClose={onClose} />
      ) : (
        <PoSetupFlowPage onClose={onClose} />
      )}
    </div>
  )
}

NewRequestSheet.displayName = 'NewRequestSheet'
export default NewRequestSheet
