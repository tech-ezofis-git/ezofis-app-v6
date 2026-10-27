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
      <div className='animate-in fade-in slide-in-from-top-1 flex shrink-0 items-center gap-2.5 border-b border-primary-4 bg-primary-2 px-4 py-2 text-[13px] text-primary-12 duration-200'>
        <Icon
          className='size-4 shrink-0 text-primary-9'
          name='lucide:git-branch-plus'
        />
        <span className='min-w-0 truncate'>
          {t`Sub-process of ${parentLabel}`}
          {parent.workflowName ? ` · ${parent.workflowName}` : ''}
          {' — '}
          <span className='text-primary-11'>
            {t`fields with matching labels are pre-filled. It will be linked when you submit.`}
          </span>
        </span>
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
