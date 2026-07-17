import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import type { IRequestMeta } from '../types'
import requestStore from '../stores/useRequestStore'
interface Props {
  // New Props
  activeTab: string
  allWorkflows: Option[] | null
  isLoading: boolean
  workflow: Option | null
  exceptionsCount?: number
  metaData?: IRequestMeta
  setActiveTab: (val: string) => void
  setWorkflow: React.Dispatch<React.SetStateAction<Option | null>>
  actionButtons?: {
    id: string;
    label?: string;
    icon?: string;
    color?: any;
    variant?: any;
    onClick: () => void;
    disabled?: boolean;
    tooltip?: string;
  }[];
}

const Header = ({
  activeTab,
  allWorkflows,
  exceptionsCount,
  isLoading,
  metaData,
  workflow,
  setActiveTab,
  setWorkflow,
  actionButtons,
}: Props) => {
  const processedCount =
    Number(metaData?.completedCount ?? 0) + Number(metaData?.sentCount ?? 0)
  const inboxCount = Number(metaData?.inboxCount ?? 0)
  const resolvedExceptionsCount = exceptionsCount ?? 0


  console.log(allWorkflows)

  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6 md:px-8'>
      <Tabs
        color='primary'
        tabClassName='py-3.5'
        value={activeTab}
        onChange={(val) => setActiveTab(val as string)}
      >
        <Tab
          label={isLoading ? 'Invoices' : `Invoices (${inboxCount})`}
          value='Inbox'
        />
        <Tab
          value='Exceptions'
          label={
            isLoading ? 'Exceptions' : `Exceptions (${resolvedExceptionsCount})`
          }
        />
        <Tab
          label={isLoading ? 'Processed' : `Processed (${processedCount})`}
          value='Processed'
        />
      </Tabs>

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
            key={btn.id}
            color={btn.color || 'primary'}
            icon={btn.icon}
            label={btn.label}
            size='lg'
            variant={btn.variant || 'solid'}
            onClick={btn.onClick}
            disabled={btn.disabled}
          />
        ))}
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
