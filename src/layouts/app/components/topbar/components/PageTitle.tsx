import { useMatches } from '@tanstack/react-router'
import Title from '@/components/base/Title'
import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'
import requestStore from '@/pages/requests/stores/useRequestStore'
import useWorkflowStore from '@/pages/workflows/stores/useWorkflowStore'

const PageTitle = () => {
  const matches = useMatches()
  const { isRequestOpen, selectedWorkflow, requestListTab, closeRequest } = requestStore((state) => state)
  const { isBuilderOpen, closeBuilder } = useWorkflowStore((state) => state)
  const current = matches[matches.length - 1]
  const pageTitle = current?.staticData?.pageTitle ?? 'Untitled'

  if (isBuilderOpen) {
    return (
      <div className='flex items-center gap-3'>
        <button onClick={closeBuilder} className='flex items-center text-gray-10 hover:text-gray-13'>
          <Icon name='lucide:arrow-left' className='mr-2' />
          <Title level={3} title='Workflow Builder' />
        </button>
      </div>
    )
  }

  if (isRequestOpen && selectedWorkflow?.name) {
    const badgeColor =
      requestListTab === 'Sent' ? 'orange' :
        requestListTab === 'Closed' ? 'green' :
          'blue';

    return (
      <div className='flex items-center gap-3 text-15/5 font-semibold text-gray-13'>
        <span
          onClick={closeRequest}
          className='cursor-pointer hover:underline hover:text-primary'
        >
          {selectedWorkflow.name}
        </span>
        <Badge color={badgeColor} label={requestListTab || 'Inbox'} />
      </div>
    )
  }

  return (
    <div className='flex items-center gap-4'>
      <Title level={3} title={pageTitle} />
    </div>
  )
}

PageTitle.displayName = 'PageTitle'
export default PageTitle