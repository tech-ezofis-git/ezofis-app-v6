import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import WorkflowRequest, {
  type WorkflowRequestSubmitted,
} from '../workflow-request/WorkflowRequest'

export interface SubWorkflowParentContext {
  /** Parent form controls (panels or flat fields) for the label pre-fill. */
  fields: any[]
  model: Record<string, unknown>
  /** Parent request number; empty while the parent is still a new request. */
  requestNo?: string
  workflowName?: string
}

interface Props {
  childWorkflow: any
  parent: SubWorkflowParentContext
  onClose: () => void
  onCreated: (child: WorkflowRequestSubmitted) => Promise<void> | void
}

// The child workflow's normal "New Request" form, shown in place of the
// parent request (inline, no overlay), pre-filled from the parent's fields
// that share a label. One level only: the child form doesn't offer its own
// "Initiate" button (same as V5).
const SubWorkflowRequest = ({
  childWorkflow,
  parent,
  onClose,
  onCreated,
}: Props) => {
  const { t } = useLingui()
  const parentLabel = parent.requestNo || t`the new request`
  const childName = String(childWorkflow?.name || 'Request')

  return (
    <div className='flex h-full min-h-0 w-full flex-col overflow-hidden'>
      <div className='animate-in fade-in slide-in-from-top-1 shrink-0 px-4 pt-3 duration-200'>
        <div className='flex items-center gap-3 rounded-xl border border-purple-5 bg-purple-4 px-4 py-3 text-13 text-gray-12'>
          <Icon className='size-5 shrink-0 text-purple-9' name='lucide:info' />
          <span className='min-w-0'>
            <strong className='font-semibold text-gray-13'>
              {t`Sub-process of ${parentLabel}`}
            </strong>
            {parent.workflowName ? ` · ${parent.workflowName}` : ''}
            {' — '}
            {t`fields with matching labels are pre-filled. It will be linked when you submit.`}
          </span>
        </div>
      </div>
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        <WorkflowRequest
          allowSubWorkflow={false}
          prefill={{ fields: parent.fields, model: parent.model }}
          title={t`New ${childName}`}
          workflow={childWorkflow}
          onClose={onClose}
          onSubmitted={onCreated}
        />
      </div>
    </div>
  )
}

export default SubWorkflowRequest
