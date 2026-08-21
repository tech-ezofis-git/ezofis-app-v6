import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo } from 'react'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import requestStore from '../../stores/useRequestStore'
import { isAccountsPayableWorkflow } from '../../utils/workflow.utils'
import WorkflowRequest from '../workflow-request/WorkflowRequest'
import NewRequestFileUpload from './components/newrequest/FileUpload'
import Header from './components/newrequest/Header'
import PoSetupFlowPage from './components/newrequest/poFlow/PoSetupFlowPage'

interface Props {
  onClose: () => void
}

const NewRequestSheet = ({ onClose }: Props) => {
  const { t } = useLingui()
  const { newRequestMeta } = requestStore((state) => state)
  const rawWorkflow = requestStore((state) => state.rawWorkflowData)
  const setPlaygroundContext = usePlaygroundStore((state) => state.setContext)

  // Accounts Payable workflows keep using the existing "Intelligent AP
  // Agent" file upload flow below; every other workflow gets its form
  // rendered dynamically instead (see WorkflowRequest).
  const isAccountsPayable = isAccountsPayableWorkflow(rawWorkflow)

  const newRequestEndpoints = useMemo(
    () => [
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
    ],
    [],
  )

  useEffect(() => {
    setPlaygroundContext({ endpoints: newRequestEndpoints })
    return () => setPlaygroundContext(null)
  }, [newRequestEndpoints, setPlaygroundContext])

  return (
    <div className='flex h-full w-full min-w-0'>
      <div className='flex h-full flex-1 flex-col overflow-hidden bg-surface-muted'>
        {newRequestMeta !== 'po' && isAccountsPayable && (
          <Header title={t`New Request`} onClose={onClose} />
        )}

        {newRequestMeta === 'po' ? (
          <PoSetupFlowPage onClose={onClose} />
        ) : isAccountsPayable ? (
          <NewRequestFileUpload onClose={onClose} />
        ) : (
          <WorkflowRequest workflow={rawWorkflow} onClose={onClose} />
        )}
      </div>
    </div>
  )
}

NewRequestSheet.displayName = 'NewRequestSheet'
export default NewRequestSheet
