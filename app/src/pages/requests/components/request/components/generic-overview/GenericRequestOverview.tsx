import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import WorkflowFormRenderer from '@/pages/requests/components/workflow-request/WorkflowFormRenderer'
import Attachments from '../sections/attachment/Attachments'
import Comments from '../sections/comment/Comments'
import History from '../sections/history/History'

interface Props {
  rawWorkflowData: any
  selectedItem: any
}

const safeParseFormData = (formData: unknown): Record<string, any> => {
  if (!formData) return {}
  if (typeof formData === 'object') {
    return (formData as any).fields || formData || {}
  }
  if (typeof formData === 'string') {
    try {
      const parsed = JSON.parse(formData)
      return parsed?.fields || parsed || {}
    } catch {
      return {}
    }
  }
  return {}
}

type TabId = 'overview' | 'history' | 'attachments' | 'comments'

// Generic (non-Accounts-Payable) request detail: the submitted form
// rendered read-only with the same component used to compose it in New
// Request, plus History/Attachments/Comments — the same tabs the AP detail
// view has, using the existing workflow-agnostic components for those.
const GenericRequestOverview = ({ rawWorkflowData, selectedItem }: Props) => {
  const { t } = useLingui()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const panels = useMemo(
    () => rawWorkflowData?.formJson?.panels || [],
    [rawWorkflowData],
  )
  const formModel = useMemo(
    () => safeParseFormData(selectedItem?.formData),
    [selectedItem],
  )

  const workflowId = rawWorkflowData?.id
  const instanceId = selectedItem?.workflowInstanceId || selectedItem?.processId
  const processId = selectedItem?.processId
  const repositoryId = rawWorkflowData?.repositoryId

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='border-b border-gray-3 px-6'>
        <Tabs
          color='primary'
          tabClassName='py-3'
          value={activeTab}
          onChange={(val) => setActiveTab(val as TabId)}
        >
          <Tab label={t`Overview`} value='overview' />
          <Tab label={t`History`} value='history' />
          <Tab label={t`Attachments`} value='attachments' />
          <Tab label={t`Comments`} value='comments' />
        </Tabs>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        {activeTab === 'overview' && (
          <WorkflowFormRenderer
            formModel={formModel}
            panels={panels}
            viewOnly
            onFieldChange={() => {}}
          />
        )}
        {activeTab === 'history' && (
          <div className='h-full overflow-y-auto px-6 py-4'>
            <History
              enabled
              instanceId={instanceId}
              processId={processId}
              workflowId={workflowId}
            />
          </div>
        )}
        {activeTab === 'attachments' && (
          <div className='h-full overflow-y-auto px-6 py-4'>
            <Attachments
              enabled
              instanceId={instanceId}
              processId={processId}
              repositoryId={repositoryId}
              workflowId={workflowId}
            />
          </div>
        )}
        {activeTab === 'comments' && (
          <div className='h-full overflow-hidden px-6 py-4'>
            <Comments
              enabled
              instanceId={instanceId}
              processId={processId}
              workflowId={workflowId}
            />
          </div>
        )}
      </div>
    </div>
  )
}

GenericRequestOverview.displayName = 'GenericRequestOverview'
export default GenericRequestOverview
