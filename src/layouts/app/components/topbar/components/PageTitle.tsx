import { useQuery } from '@tanstack/react-query'
import { useMatches, useParams } from '@tanstack/react-router'
import formApi from '@/api/form/form'
import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'
import useDashboardStore from '@/pages/dashboard/stores/useDashboardStore'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import useFoldersTopbarStore from '@/pages/folders/stores/useFoldersTopbarStore'
import requestStore from '@/pages/requests/stores/useRequestStore'
import SettingsBreadcrumbs from '@/pages/settings/components/SettingsBreadcrumbs'
import useSettingsTopbarStore from '@/pages/settings/stores/useSettingsTopbarStore'
import useWorkflowStore from '@/pages/workflows/stores/useWorkflowStore'

const PageTitle = () => {
  const matches = useMatches()
  const { closeRequest, isRequestOpen, requestListTab, selectedWorkflow } =
    requestStore((state) => state)
  const { closeBuilder, isBuilderOpen } = useWorkflowStore((state) => state)
  const { role, setRole } = useDashboardStore()
  const isApSetUpCompleted = useSetupStore((state) => state.isApSetUpCompleted)
  const settingsBreadcrumbs = useSettingsTopbarStore(
    (state) => state.breadcrumbs,
  )
  const settingsNavigate = useSettingsTopbarStore((state) => state.onNavigate)
  const foldersBreadcrumbs = useFoldersTopbarStore((state) => state.breadcrumbs)
  const foldersNavigate = useFoldersTopbarStore((state) => state.onNavigate)

  const current = matches[matches.length - 1]
  const isFormEntriesRoute = current?.routeId === '/_app/forms_/$formId/entries'

  const { formId } = useParams({ strict: false }) as any
  const { data: formData } = useQuery({
    enabled: !!formId && isFormEntriesRoute,
    queryKey: ['forms', 'detail', formId],
    queryFn: async () => {
      const { data, error } = await formApi.getFormDataById(formId)
      if (error) throw new Error(error)
      return data
    },
  })

  const formName = formData?._json?.settings?.general?.name || formData?.name
  const rawPageTitle =
    isFormEntriesRoute && formName
      ? formName
      : (current?.staticData?.pageTitle ?? 'Untitled')
  const pageTitle = rawPageTitle.replace(/\s*\(Embed\)$/i, '')

  const isSettingsRoute =
    current?.routeId === '/_app/settings' ||
    current?.routeId === '/embed/settings' ||
    pageTitle === 'Settings'
  const isFoldersRoute =
    current?.routeId === '/_app/folders' ||
    current?.routeId === '/embed/folders' ||
    pageTitle === 'Folders'

  const renderContent = () => {
    const isRequestsRoute =
      current?.routeId === '/_app/requests' ||
      current?.routeId === '/embed/requests' ||
      pageTitle === 'Requests'
    const isWorkflowsRoute =
      current?.routeId === '/_app/workflows' ||
      current?.routeId === '/embed/workflows' ||
      pageTitle === 'Workflows'

    if (isWorkflowsRoute && isBuilderOpen) {
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

    if (isRequestsRoute && isRequestOpen && selectedWorkflow?.name) {
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

    if (isSettingsRoute && settingsBreadcrumbs.length) {
      return (
        <SettingsBreadcrumbs
          items={settingsBreadcrumbs}
          onNavigate={settingsNavigate}
        />
      )
    }

    if (isFoldersRoute && foldersBreadcrumbs.length) {
      return (
        <SettingsBreadcrumbs
          items={foldersBreadcrumbs}
          onNavigate={foldersNavigate}
        />
      )
    }

    return (
      <div className='flex items-center gap-4'>
        <Title level={3} title={pageTitle} />
        {pageTitle === 'Dashboard' && isApSetUpCompleted && (
          <div className='flex gap-0.5 rounded-lg border border-border-default bg-gray-2 p-1 dark:bg-gray-12'>
            <button
              className={`cursor-pointer rounded-md px-3.5 py-1 text-12 font-semibold transition-all duration-150 ${
                role === 'management'
                  ? 'bg-primary-9 text-white shadow-sm'
                  : 'text-gray-11 hover:bg-gray-3 hover:text-gray-13 dark:hover:bg-gray-10'
              }`}
              onClick={() => setRole('management')}
            >
              Management
            </button>
            <button
              className={`cursor-pointer rounded-md px-3.5 py-1 text-12 font-semibold transition-all duration-150 ${
                role === 'ap'
                  ? 'bg-primary-9 text-white shadow-sm'
                  : 'text-gray-11 hover:bg-gray-3 hover:text-gray-13 dark:hover:bg-gray-10'
              }`}
              onClick={() => setRole('ap')}
            >
              AP Team
            </button>
          </div>
        )}
      </div>
    )
  }

  return renderContent()
}

PageTitle.displayName = 'PageTitle'
export default PageTitle
