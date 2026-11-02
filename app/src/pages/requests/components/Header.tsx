import { useLingui } from '@lingui/react/macro'
import { useRef } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Skeleton from '@/components/base/Skeleton'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import type { IRequestMeta } from '../types'
import WorkflowSwitcher from './WorkflowSwitcher'

export type RequestTabDescriptor = { label: string; value: string }

interface Props {
  // New Props
  activeTab: string
  allWorkflows: Option[] | null
  isLoading: boolean
  workflow: Option | null
  actionButtons?: {
    color?: any
    disabled?: boolean
    icon?: string
    id: string
    label?: string
    loading?: boolean
    tooltip?: string
    variant?: any
    onClick: () => void
  }[]
  connectedWatchEmail?: string | null
  /** Counts or the list are reloading: keep showing the last counts. */
  countsRefreshing?: boolean
  exceptionsCount?: number
  hideListTabs?: boolean
  isConnectingWatchEmail?: boolean
  metaData?: IRequestMeta
  stageCounts?: Record<string, number>
  tabs?: RequestTabDescriptor[]
  /**
   * The picked workflow is still loading, so `tabs` still belong to the
   * previous one: show placeholders instead.
   */
  tabsLoading?: boolean
  totalStageCount?: number | null
  setActiveTab: (val: string) => void
  setWorkflow: React.Dispatch<React.SetStateAction<Option | null>>
  onCancelConnectWatchEmail?: () => void
  onReconnectWatchEmail?: () => void
  /** Switches to the All Workflows inbox. */
  onSelectAllWorkflows?: () => void
}

const Header = ({
  actionButtons,
  activeTab,
  allWorkflows,
  connectedWatchEmail,
  countsRefreshing = false,
  exceptionsCount,
  hideListTabs = false,
  isConnectingWatchEmail,
  isLoading,
  metaData,
  stageCounts,
  tabs = [],
  tabsLoading = false,
  totalStageCount,
  workflow,
  setActiveTab,
  setWorkflow,
  onCancelConnectWatchEmail,
  onReconnectWatchEmail,
  onSelectAllWorkflows,
}: Props) => {
  const { t } = useLingui()
  const processedCount =
    Number(metaData?.completedCount ?? 0) + Number(metaData?.sentCount ?? 0)
  const inboxCount = Number(metaData?.inboxCount ?? 0)
  const sentCount = Number(metaData?.sentCount ?? 0)
  const completedCount = Number(metaData?.completedCount ?? 0)
  const resolvedExceptionsCount = exceptionsCount ?? 0

  // Last counts shown per workflow + tab, so a tab switch doesn't flash 0
  // (or another stale value) before the fresh numbers arrive.
  const shownCountsRef = useRef<Record<string, number>>({})
  const displayCountFor = (tab: RequestTabDescriptor) => {
    const key = `${workflow?.id ?? ''}:${tab.value}`
    const fresh = countFor(tab)
    const previous = shownCountsRef.current[key]
    if (countsRefreshing) return previous
    shownCountsRef.current[key] = fresh
    return fresh
  }
  // No count yet for a workflow that was just opened: show the label alone
  // rather than the previous workflow's number.
  const labelFor = (tab: RequestTabDescriptor) => {
    if (isLoading) return tab.label
    const count = displayCountFor(tab)
    return count === undefined ? tab.label : `${tab.label} (${count})`
  }

  const countFor = (tab: RequestTabDescriptor) => {
    if (stageCounts) {
      if (tab.value in stageCounts) return stageCounts[tab.value]
      if (tab.label in stageCounts) return stageCounts[tab.label]
    }
    switch (tab.value) {
      case 'Closed':
        return completedCount
      case 'Exceptions':
        return resolvedExceptionsCount
      case 'Inbox':
        return inboxCount
      case 'Processed':
        return processedCount
      case 'Sent':
        return sentCount
      default:
        return 0
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-6 border-b border-gray-3 px-4 [&>*:last-child]:ml-auto',
        hideListTabs ? 'py-2.5' : '',
      )}
    >
      {onSelectAllWorkflows ? (
        // Back to the inbox across every workflow.
        <button
          className='group/back -mr-2 flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-gray-4 bg-surface pr-3.5 pl-2.5 text-13 font-medium text-gray-12 transition-colors hover:border-primary-7 hover:text-primary-11 active:scale-95'
          type='button'
          onClick={onSelectAllWorkflows}
        >
          <Icon
            className='size-4 transition-transform duration-200 group-hover/back:-translate-x-0.5'
            name='tabler:chevron-left'
          />
          {t`All Workflows`}
        </button>
      ) : null}
      {hideListTabs ? (
        <p className='text-15 font-semibold text-gray-13'>{t`Process Overview`}</p>
      ) : tabsLoading ? (
        <div aria-busy='true' className='flex items-center gap-6 py-3.5'>
          {[0, 1, 2].map((index) => (
            <Skeleton className='h-4 w-20' key={index} />
          ))}
        </div>
      ) : (
        // Plain text tabs with a primary underline on the active one; the
        // list scrolls sideways instead of wrapping on narrow screens.
        <div className='-mb-px max-w-full min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <Tabs
            color='primary'
            listClassName='flex-nowrap'
            tabClassName='shrink-0 !rounded-none !border-b-2 !bg-transparent py-3.5 whitespace-nowrap'
            value={activeTab}
            onChange={(val) => setActiveTab(val as string)}
          >
            {tabs.map((tab) => (
              <Tab key={tab.value} label={labelFor(tab)} value={tab.value} />
            ))}
          </Tabs>
        </div>
      )}

      <div className='flex items-center gap-2'>
        <WorkflowSwitcher
          isAllWorkflows={false}
          value={workflow}
          workflows={allWorkflows || []}
          onSelect={setWorkflow}
          onSelectAll={() => onSelectAllWorkflows?.()}
        />
        {connectedWatchEmail && (
          <div
            className='flex items-center gap-1.5 rounded-lg border border-green-4 bg-green-2 px-3 py-1.5 text-13 font-medium text-green-11 shadow-2xs'
            title={connectedWatchEmail}
          >
            <Icon
              className='size-4 text-green-9'
              name='tabler:circle-check-filled'
            />
            <span className='font-semibold text-green-12'>{t`Connected`}</span>
            {isConnectingWatchEmail ? (
              <div className='ml-1 flex items-center gap-1'>
                <Tooltip content={t`Connecting...`} position='bottom'>
                  <span className='inline-flex size-5 items-center justify-center text-green-11'>
                    <Icon
                      className='size-3.5 animate-spin'
                      name='tabler:refresh'
                    />
                  </span>
                </Tooltip>
                {onCancelConnectWatchEmail && (
                  <Tooltip content={t`Cancel reconnect`} position='bottom'>
                    <button
                      aria-label={t`Cancel reconnect`}
                      className='inline-flex size-5 items-center justify-center rounded text-gray-10 transition-all hover:bg-red-2 hover:text-red-11 active:scale-95'
                      type='button'
                      onClick={onCancelConnectWatchEmail}
                    >
                      <Icon className='size-3.5' name='tabler:x' />
                    </button>
                  </Tooltip>
                )}
              </div>
            ) : (
              onReconnectWatchEmail && (
                <Tooltip content={t`Reconnect watch email`} position='bottom'>
                  <button
                    aria-label={t`Reconnect`}
                    className='ml-1 inline-flex size-5 items-center justify-center rounded text-green-10 transition-all hover:bg-green-3 hover:text-green-12 active:scale-95'
                    type='button'
                    onClick={onReconnectWatchEmail}
                  >
                    <Icon className='size-3.5' name='tabler:refresh' />
                  </button>
                </Tooltip>
              )
            )}
          </div>
        )}
        {actionButtons?.map((btn) => (
          <Button
            color={btn.color || 'primary'}
            disabled={btn.disabled || btn.loading}
            icon={btn.icon}
            key={btn.id}
            label={btn.label}
            loading={btn.loading}
            size='lg'
            title={btn.tooltip}
            variant={btn.variant || 'solid'}
            onClick={btn.onClick}
          />
        ))}
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
