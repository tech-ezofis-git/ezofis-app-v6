import { useLingui } from '@lingui/react/macro'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import cn from '@/utils/cn'
import type { IRequestMeta } from '../types'
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
  isAccountsPayable?: boolean
  metaData?: IRequestMeta
  setActiveTab: (val: string) => void
  setWorkflow: React.Dispatch<React.SetStateAction<Option | null>>
}

const Header = ({
  actionButtons,
  activeTab,
  allWorkflows,
  exceptionsCount,
  hideListTabs = false,
  isAccountsPayable = true,
  isLoading,
  metaData,
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

  console.log(allWorkflows)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6',
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
          {isAccountsPayable ? (
            <>
              <Tab
                label={isLoading ? t`Invoices` : t`Invoices (${inboxCount})`}
                value='Inbox'
              />
              <Tab
                value='Exceptions'
                label={
                  isLoading
                    ? t`Exceptions`
                    : t`Exceptions (${resolvedExceptionsCount})`
                }
              />
              <Tab
                value='Processed'
                label={
                  isLoading ? t`Processed` : t`Processed (${processedCount})`
                }
              />
            </>
          ) : (
            <>
              <Tab
                label={isLoading ? t`Inbox` : t`Inbox (${inboxCount})`}
                value='Inbox'
              />
              <Tab
                label={isLoading ? t`Sent` : t`Sent (${sentCount})`}
                value='Sent'
              />
              <Tab
                value='Closed'
                label={
                  isLoading ? t`Completed` : t`Completed (${completedCount})`
                }
              />
            </>
          )}
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
