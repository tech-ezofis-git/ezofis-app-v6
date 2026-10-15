import { useLingui } from '@lingui/react/macro'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import type { IRequestMeta } from '../types'

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
  exceptionsCount?: number
  hideListTabs?: boolean
  isConnectingWatchEmail?: boolean
  metaData?: IRequestMeta
  onCancelConnectWatchEmail?: () => void
  onReconnectWatchEmail?: () => void
  stageCounts?: Record<string, number>
  tabs?: RequestTabDescriptor[]
  totalStageCount?: number | null
  setActiveTab: (val: string) => void
  setWorkflow: React.Dispatch<React.SetStateAction<Option | null>>
}

const Header = ({
  actionButtons,
  activeTab,
  allWorkflows,
  connectedWatchEmail,
  exceptionsCount,
  hideListTabs = false,
  isConnectingWatchEmail,
  isLoading,
  metaData,
  onCancelConnectWatchEmail,
  onReconnectWatchEmail,
  stageCounts,
  tabs = [],
  totalStageCount,
  workflow,
  setActiveTab,
  setWorkflow,
}: Props) => {
  const { t } = useLingui()
  const processedCount =
    Number(metaData?.completedCount ?? 0) + Number(metaData?.sentCount ?? 0)
  const inboxCount = Number(metaData?.inboxCount ?? 0)
  const sentCount = Number(metaData?.sentCount ?? 0)
  const completedCount = Number(metaData?.completedCount ?? 0)
  const resolvedExceptionsCount = exceptionsCount ?? 0

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
        'flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-4',
        hideListTabs ? 'py-2.5' : '',
      )}
    >
      {hideListTabs ? (
        <p className='text-15 font-semibold text-gray-13'>{t`Process Overview`}</p>
      ) : (
        <Tabs
          color='primary'
          tabClassName='py-3.5'
          value={activeTab}
          onChange={(val) => setActiveTab(val as string)}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                isLoading ? tab.label : `${tab.label} (${countFor(tab)})`
              }
            />
          ))}
        </Tabs>
      )}

      <div className='flex items-center gap-2'>
        <InputSelect
          className='border-[var(--gray-3)] transition-colors hover:border-[var(--primary-3)]'
          options={allWorkflows && allWorkflows?.length > 0 ? allWorkflows : []}
          value={workflow}
          width={220}
          searchable
          leftSection={
            <Icon className='text-[var(--gray-10)]' name='tabler:replace' />
          }
          onChange={setWorkflow}
        />
        {connectedWatchEmail && (
          <div
            className='flex items-center gap-1.5 rounded-lg border border-green-4 bg-green-2 px-3 py-1.5 text-13 font-medium text-green-11 shadow-2xs'
            title={connectedWatchEmail}
          >
            <Icon className='size-4 text-green-9' name='tabler:circle-check-filled' />
            <span className='font-semibold text-green-12'>{t`Connected`}</span>
            {isConnectingWatchEmail ? (
              <div className='ml-1 flex items-center gap-1'>
                <Tooltip content={t`Connecting...`} position='bottom'>
                  <span className='inline-flex size-5 items-center justify-center text-green-11'>
                    <Icon className='size-3.5 animate-spin' name='tabler:refresh' />
                  </span>
                </Tooltip>
                {onCancelConnectWatchEmail && (
                  <Tooltip content={t`Cancel reconnect`} position='bottom'>
                    <button
                      type='button'
                      aria-label={t`Cancel reconnect`}
                      className='inline-flex size-5 items-center justify-center rounded text-gray-10 hover:bg-red-2 hover:text-red-11 active:scale-95 transition-all'
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
                    type='button'
                    aria-label={t`Reconnect`}
                    className='ml-1 inline-flex size-5 items-center justify-center rounded text-green-10 hover:bg-green-3 hover:text-green-12 active:scale-95 transition-all'
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
