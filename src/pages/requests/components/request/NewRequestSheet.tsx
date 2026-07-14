import { useState } from 'react'
import requestStore from '../../stores/useRequestStore'
import NewRequestFileUpload from './components/newrequest/FileUpload'
import Header from './components/newrequest/Header'
import PoSetupFlowPage from './components/newrequest/poFlow/PoSetupFlowPage'
import ApiPlayground from '@/components/playground/ApiPlayground'

interface Props {
  onClose: () => void
}

const NewRequestSheet = ({ onClose }: Props) => {
  const { newRequestMeta } = requestStore((state) => state)
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false)

  const newRequestEndpoints = [
    {
      id: 'create_request',
      title: 'Create Request API',
      description: 'Create a new document request programmatically.',
      method: 'POST',
      apiPath: '/api/v6/requests',
      requestPayload: {
        title: 'New Request',
        type: 'invoice',
        priority: 'high',
        metadata: {
          department: 'Finance'
        }
      },
      responsePayload: {
        success: true,
        message: 'Request created successfully',
        transactionId: 'REQ-NEW-12345',
        status: 'Draft'
      }
    },
    {
      id: 'list_master_data',
      title: 'List Master Data API',
      description: 'Retrieve reference data lists (vendors, GL codes, etc.) for populating creation forms.',
      method: 'GET',
      apiPath: '/api/v6/master-data',
      requestPayload: null,
      responsePayload: {
        success: true,
        data: {
          vendors: [
            { id: 'V-1', name: 'Silverline Auto Parts' },
            { id: 'V-2', name: 'Acme Corp' }
          ],
          glCodes: [
            { code: 'GL-1000', description: 'Office Supplies' },
            { code: 'GL-2000', description: 'Software Subscriptions' }
          ]
        }
      }
    }
  ]

  return (
    <div className='flex h-full w-full min-w-0'>
      <div className='flex h-full flex-1 flex-col overflow-hidden bg-surface-muted'>
        {newRequestMeta !== 'po' && (
          <Header 
            title='New Request' 
            onClose={onClose} 
            onOpenPlayground={() => setIsPlaygroundOpen(true)} 
          />
        )}

        {newRequestMeta === 'po' ? (
          <PoSetupFlowPage onClose={onClose} />
        ) : (
          <NewRequestFileUpload onClose={onClose} />
        )}
      </div>

      {isPlaygroundOpen && (
        <div className='animate-in slide-in-from-right flex h-full w-full min-w-[320px] shrink-0 flex-col overflow-hidden border-l border-[var(--gray-3)] bg-surface duration-300 ease-in-out lg:w-[350px]'>
          <ApiPlayground
            endpoints={newRequestEndpoints}
            onClose={() => setIsPlaygroundOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

NewRequestSheet.displayName = 'NewRequestSheet'
export default NewRequestSheet
