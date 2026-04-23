import { useMatches } from '@tanstack/react-router'
import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import requestStore from '@/pages/requests/stores/useRequestStore'
import useWorkflowStore from '@/pages/workflows/stores/useWorkflowStore'

const PageTitle = () => {
  const matches = useMatches()
  const { closeRequest, isRequestOpen, requestListTab, selectedWorkflow } =
    requestStore((state) => state)
  const { closeBuilder, isBuilderOpen } = useWorkflowStore((state) => state)
  const { isSetupStarted, isApSetUpCompleted } = setupStore((state) => state)

  const current = matches[matches.length - 1]
  const pageTitle = current?.staticData?.pageTitle ?? 'Untitled'

  if (isSetupStarted && !isApSetUpCompleted) {
    return <Title level={3} title='Accounts Payable Setup' />
  }

  if (isBuilderOpen) {
    return (
      <div className='flex items-center gap-3'>
        <button
          className='flex items-center text-gray-10 hover:text-gray-13'
          onClick={closeBuilder}
        >
          <Icon className='mr-2' name='lucide:arrow-left' />
          <Title level={3} title='Workflow Builder' />
        </button>
      </div>
    )
  }

  if (isRequestOpen && selectedWorkflow?.name) {
    const badgeColor =
      requestListTab === 'Sent'
        ? 'orange'
        : requestListTab === 'Closed'
          ? 'green'
          : 'blue'

    return (
      <div className='flex items-center gap-3 text-15/5 font-semibold text-gray-13'>
        <span
          className='hover:text-primary cursor-pointer hover:underline'
          onClick={closeRequest}
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
