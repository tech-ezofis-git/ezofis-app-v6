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

  const workflowJson = useMemo(() => {
    if (!rawWorkflow) return null
    if (rawWorkflow.workflowJson) {
      return typeof rawWorkflow.workflowJson === 'string'
        ? JSON.parse(rawWorkflow.workflowJson)
        : rawWorkflow.workflowJson
    }
    if (rawWorkflow.flowJson) {
      return typeof rawWorkflow.flowJson === 'string'
        ? JSON.parse(rawWorkflow.flowJson)
        : rawWorkflow.flowJson
    }
    return rawWorkflow
  }, [rawWorkflow])

  const newRequestEndpoints = useMemo(
    () => [
      {
        apiPath: `/api/v6/workflows/${rawWorkflow?.id || 'AP'}/start`,
        description:
          'Create a new Accounts Payable request by uploading an invoice or selecting a sample document.',
        id: 'create_ap_request',
        method: 'POST',
        requestPayload: {
          context: '',
          envType: 'trial',
          file: {
            fileName: 'INV-2026-6001.pdf',
            sizeBytes: 1245000,
            type: 'application/pdf',
          },
          workflowId: rawWorkflow?.id,
          workflowName: rawWorkflow?.name || 'Accounts Payable',
        },
        responsePayload: {
          apAgentJobId: 'JOB-9921',
          instanceId: 'INST-2026-8801',
          message: 'Accounts Payable request initiated successfully',
          status: 'INITIATED',
          success: true,
          transactionId: 'TX-3301-AP',
        },
        title: 'Start AP Workflow API',
      },
      {
        apiPath: `/api/v6/workflows/${rawWorkflow?.id || 'AP'}/definition`,
        description:
          'Accounts Payable Workflow JSON definition including steps, rules, and form bindings.',
        id: 'ap_workflow_json',
        method: 'GET',
        requestPayload: null,
        responsePayload: (workflowJson || rawWorkflow || {}) as Record<
          string,
          unknown
        >,
        title: 'Accounts Payable Workflow JSON',
      },
    ],
    [rawWorkflow, workflowJson],
  )

  useEffect(() => {
    setPlaygroundContext({
      actionName: 'Accounts Payable New Request',
      description: `Accounts Payable Workflow (ID: ${rawWorkflow?.id || 'AP'}) — Create Request & Process Invoices`,
      endpoints: newRequestEndpoints,
      payload: {
        rawWorkflow,
        workflowId: rawWorkflow?.id,
        workflowJson: workflowJson || rawWorkflow,
      },
    })
    return () => setPlaygroundContext(null)
  }, [newRequestEndpoints, rawWorkflow, workflowJson, setPlaygroundContext])

  return (
    <div className='flex h-full w-full min-w-0'>
      <div className='flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-surface-muted'>
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
