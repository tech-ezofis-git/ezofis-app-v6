import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import ApiPlayground from '@/components/playground/ApiPlayground'
import requestStore from '../../stores/useRequestStore'
import NewRequestFileUpload from './components/newrequest/FileUpload'
import Header from './components/newrequest/Header'
import PoSetupFlowPage from './components/newrequest/poFlow/PoSetupFlowPage'

interface Props {
  onClose: () => void
}

const NewRequestSheet = ({ onClose }: Props) => {
  const { t } = useLingui()
  const { newRequestMeta } = requestStore((state) => state)
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false)

  const newRequestEndpoints = [
    {
      apiPath: '/api/v6/requests',
      description: 'Create a new document request programmatically.',
      id: 'create_request',
      method: 'POST',
      requestPayload: {
        metadata: {
          department: 'Finance',
        },
        priority: 'high',
        title: 'New Request',
        type: 'invoice',
      },
      responsePayload: {
        message: 'Request created successfully',
        status: 'Draft',
        success: true,
        transactionId: 'REQ-NEW-12345',
      },
      title: 'Create Request API',
    },
    // {
    //   id: 'list_master_data',
    //   title: 'List Master Data API',
    //   description: 'Retrieve reference data lists (vendors, GL codes, etc.) for populating creation forms.',
    //   method: 'GET',
    //   apiPath: '/api/v6/master-data',
    //   requestPayload: null,
    //   responsePayload: {
    //     success: true,
    //     data: {
    //       vendors: [
    //         { id: 'V-1', name: 'Silverline Auto Parts' },
    //         { id: 'V-2', name: 'Acme Corp' }
    //       ],
    //       glCodes: [
    //         { code: 'GL-1000', description: 'Office Supplies' },
    //         { code: 'GL-2000', description: 'Software Subscriptions' }
    //       ]
    //     }
    //   }
    // }
  ]

  return (
    <div className='flex h-full w-full min-w-0'>
      <div className='flex h-full flex-1 flex-col overflow-hidden bg-surface-muted'>
        {newRequestMeta !== 'po' && (
          <Header
            title={t`New Request`}
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
