import InputSwitch from '@/components/base/inputs/InputSwitch'
import { isSubWorkflowIdSet } from '@/features/sub-workflow/utils/blockSettings'
import SubWorkflowPicker from '../common/SubWorkflowPicker'

interface Props {
  nodeData: Record<string, any>
  updateNodeData: (key: string, value: any) => void
}

// V5 "Workflow Initiator": lets the user working this step start a request
// in another workflow, linked to the current one as a sub-process. Saved on
// the block as `workflowInitiator` + `subWorkflowId`; export clears both
// when the switch is off or no workflow is picked.
export default function WorkflowInitiatorTab({
  nodeData,
  updateNodeData,
}: Props) {
  const enabled = Boolean(nodeData.workflowInitiator)
  const hasTarget = isSubWorkflowIdSet(nodeData.subWorkflowId)

  const handleToggle = (checked: boolean) => {
    updateNodeData('workflowInitiator', checked)
    if (!checked) {
      updateNodeData('subWorkflowId', 0)
      updateNodeData('subWorkflowName', '')
    }
  }

  return (
    <div className='space-y-3.5'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='text-13 font-medium text-gray-12'>Workflow Initiator</p>
          <p className='mt-0.5 text-xs text-gray-10'>
            Show an "Initiate" button on requests at this step that starts a
            linked request in another workflow.
          </p>
        </div>
        <InputSwitch checked={enabled} onChange={handleToggle} />
      </div>

      {enabled && (
        <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
          <SubWorkflowPicker
            description='Fields with the same label are pre-filled from this request.'
            error={hasTarget ? undefined : 'Select the workflow to initiate'}
            value={nodeData.subWorkflowId}
            valueName={nodeData.subWorkflowName}
            required
            onChange={(option) => {
              updateNodeData('subWorkflowId', option?.id ?? 0)
              updateNodeData('subWorkflowName', option?.name ?? '')
            }}
          />
        </div>
      )}
    </div>
  )
}
