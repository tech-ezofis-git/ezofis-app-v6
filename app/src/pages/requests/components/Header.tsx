import { useLingui } from '@lingui/react/macro'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
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
    tooltip?: string
    variant?: any
    onClick: () => void
  }[]
  exceptionsCount?: number
  hideListTabs?: boolean
  metaData?: IRequestMeta
  tabs?: RequestTabDescriptor[]
  setActiveTab: (val: string) => void
  setWorkflow: React.Dispatch<React.SetStateAction<Option | null>>
}

const Header = ({
  actionButtons,
  activeTab,
  allWorkflows,
  exceptionsCount,
  hideListTabs = false,
  isLoading,
  metaData,
  tabs = [],
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

  // Only the first 3 tabs (by position) are wired to real data - Inbox/Sent
  // /Closed (or Exceptions/Processed for AP workflows). Anything past that
  // has no data source yet, so it always shows a 0 count.
  const countFor = (value: string) => {
    switch (value) {
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

  console.log(allWorkflows)

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
                isLoading ? tab.label : `${tab.label} (${countFor(tab.value)})`
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
        {actionButtons?.map((btn) => (
          <Button
            color={btn.color || 'primary'}
            disabled={btn.disabled}
            icon={btn.icon}
            key={btn.id}
            label={btn.label}
            size='lg'
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
