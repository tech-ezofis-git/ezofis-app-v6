import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useMatches, useParams } from '@tanstack/react-router'
import formApi from '@/api/form/form'
import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import useDmsSetupStore from '@/pages/dashboard/workflows/document-repository/stores/useDmsSetupStore'
import {
  openApSetupPreview,
  openDmsSetupPreview,
} from '@/pages/dashboard/workflows/setupPreview'
import useFoldersTopbarStore from '@/pages/folders/stores/useFoldersTopbarStore'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { localizeRequestListTab } from '@/pages/requests/utils/localizeRequestUi'
import SettingsBreadcrumbs from '@/pages/settings/components/SettingsBreadcrumbs'
import useSettingsTopbarStore from '@/pages/settings/stores/useSettingsTopbarStore'
import useWorkflowStore from '@/pages/workflows/stores/useWorkflowStore'
import cn from '@/utils/cn'

const PageTitle = () => {
  const { i18n, t } = useLingui()
  const matches = useMatches()
  const { closeRequest, isRequestOpen, requestListTab, selectedWorkflow } =
    requestStore((state) => state)
  const { closeBuilder, isBuilderOpen } = useWorkflowStore((state) => state)
  const isApSetupStarted = useSetupStore((state) => state.isSetupStarted)
  const isDmsSetupStarted = useDmsSetupStore((state) => state.isSetupStarted)
  const settingsBreadcrumbs = useSettingsTopbarStore(
    (state) => state.breadcrumbs,
  )
  const settingsNavigate = useSettingsTopbarStore((state) => state.onNavigate)
  const foldersBreadcrumbs = useFoldersTopbarStore((state) => state.breadcrumbs)
  const foldersNavigate = useFoldersTopbarStore((state) => state.onNavigate)

  const routeMatches = matches ?? []
  const current = routeMatches.at(-1)
  const routeId = String(current?.routeId ?? '')
  const isFormEntriesRoute = routeId === '/_app/forms_/$formId/entries'
  const isSettingsRoute =
    routeId === '/_app/settings' || routeId === '/embed/settings'
  const isFoldersRoute =
    routeId === '/_app/folders' || routeId === '/embed/folders'
  const isRequestsRoute =
    routeId === '/_app/requests' || routeId === '/embed/requests'
  const isWorkflowsRoute =
    routeId === '/_app/workflows' || routeId === '/embed/workflows'
  const isDashboardRoute =
    routeId === '/_app/' ||
    routeId === '/_app' ||
    routeId === '/embed/dashboard' ||
    routeId === '/embed'

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
  const rawPageTitle = String(current?.staticData?.pageTitle ?? '')

  const localizedPageTitle = (() => {
    if (isFormEntriesRoute && formName) return formName

    switch (rawPageTitle) {
      case 'Dashboard':
        return t`Dashboard`
      case 'Requests':
        return t`Requests`
      case 'Folders':
        return t`Folders`
      case 'Workflows':
        return t`Workflows`
      case 'Forms':
        return t`Forms`
      case 'Form Entries':
        return t`Form Entries`
      case 'Settings':
        return t`Settings`
      case 'Reports':
        return t`Reports`
      case 'Tasks':
        return t`Tasks`
      case 'Trash':
        return t`Trash`
      case 'Help Center':
        return t`Help Center`
      case 'Form Builder':
        return t`Form Builder`
      case 'Workflow Builder':
        return t`Workflow Builder`
      case 'My Account':
        return t`My Account`
      case 'Sign In':
        return t`Sign In`
      case 'Sign Up':
        return t`Sign Up`
      case 'Forgot Password':
        return t`Forgot Password`
      case 'Reset Password':
        return t`Reset Password`
      case 'On Boarding':
        return t`On Boarding`
      case 'Portals':
        return t`Portals`
      case 'Playground':
        return t`Playground`
      case 'Mobile Preview':
        return t`Mobile Preview`
      default:
        return rawPageTitle || t`Untitled`
    }
  })()

  const activeSetupPreview = isDmsSetupStarted
    ? 'dms'
    : isApSetupStarted
      ? 'ap'
      : null
  const isSetupMode = Boolean(activeSetupPreview)
  const showSetupSwitcher =
    (isDashboardRoute || rawPageTitle === 'Dashboard') && isSetupMode

  const renderContent = () => {
    if (isWorkflowsRoute && isBuilderOpen) {
      return (
        <div className='flex items-center gap-3'>
          <button
            className='flex items-center text-gray-10 hover:text-gray-13'
            onClick={closeBuilder}
          >
            <Icon className='mr-2' name='lucide:arrow-left' />
            <Title level={3} title={t`Workflow Builder`} />
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
          <Badge
            color={badgeColor}
            label={
              requestListTab
                ? localizeRequestListTab(i18n, requestListTab)
                : t`Inbox`
            }
          />
        </div>
      )
    }

    if (isSettingsRoute && settingsBreadcrumbs?.length) {
      return (
        <SettingsBreadcrumbs
          items={settingsBreadcrumbs}
          onNavigate={settingsNavigate}
        />
      )
    }

    const isFormsListRoute = routeId === '/_app/forms'
    if (
      (isFormsListRoute || isWorkflowsRoute) &&
      settingsBreadcrumbs.length > 1
    ) {
      return (
        <SettingsBreadcrumbs
          items={settingsBreadcrumbs}
          onNavigate={settingsNavigate}
        />
      )
    }

    if (isFoldersRoute && foldersBreadcrumbs?.length) {
      return (
        <SettingsBreadcrumbs
          items={foldersBreadcrumbs}
          onNavigate={foldersNavigate}
        />
      )
    }

    return (
      <div className='flex items-center gap-4'>
        <Title level={3} title={localizedPageTitle} />
        {showSetupSwitcher && (
          <div className='flex gap-0.5 rounded-lg border border-border-default bg-gray-2 p-1 dark:bg-gray-12'>
            <button
              type='button'
              className={cn(
                'cursor-pointer rounded-md px-3.5 py-1 text-12 font-semibold transition-all duration-150',
                activeSetupPreview === 'ap'
                  ? 'bg-primary-9 text-white shadow-sm'
                  : 'text-gray-11 hover:bg-gray-3 hover:text-gray-13 dark:hover:bg-gray-10',
              )}
              onClick={openApSetupPreview}
            >
              AP Setup
            </button>
            <button
              type='button'
              className={cn(
                'cursor-pointer rounded-md px-3.5 py-1 text-12 font-semibold transition-all duration-150',
                activeSetupPreview === 'dms'
                  ? 'bg-primary-9 text-white shadow-sm'
                  : 'text-gray-11 hover:bg-gray-3 hover:text-gray-13 dark:hover:bg-gray-10',
              )}
              onClick={openDmsSetupPreview}
            >
              DMS Folder
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
