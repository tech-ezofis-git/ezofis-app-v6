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
  viewMode: 'table' | 'grid'
  workflow: Option | null
  exceptionsCount?: number
  metaData?: IRequestMeta
  setActiveTab: (val: string) => void
  setViewMode: (mode: 'table' | 'grid') => void
  setWorkflow: React.Dispatch<React.SetStateAction<Option | null>>
}

const Header = ({
  activeTab,
  allWorkflows,
  exceptionsCount,
  isLoading,
  metaData,
  viewMode,
  workflow,
  setActiveTab,
  setViewMode,
  setWorkflow,
}: Props) => {
  const openNewRequest = requestStore((state) => state.openNewRequest)
  const handleOpenRequest = () => {
    console.log('am running')
    openNewRequest('request')
  }
  const processedCount =
    Number(metaData?.completedCount ?? 0) + Number(metaData?.sentCount ?? 0)
  const inboxCount = Number(metaData?.inboxCount ?? 0)
  const resolvedExceptionsCount = exceptionsCount ?? 0

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
        <div className='flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] p-1'>
          <button
            className={`cursor-pointer rounded-md px-3 py-1.5 transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-surface text-[var(--primary-9)] shadow-sm'
                : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]'
            }`}
            onClick={() => setViewMode('grid')}
          >
            <Icon className='size-4.5' name='tabler:layout-grid' />
          </button>
          <button
            className={`cursor-pointer rounded-md px-3 py-1.5 transition-all duration-200 ${
              viewMode === 'table'
                ? 'bg-surface text-[var(--primary-9)] shadow-sm'
                : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]'
            }`}
            onClick={() => setViewMode('table')}
          >
            <Icon className='size-4.5' name='tabler:table' />
          </button>
        </div>
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
        <Button
          color='primary'
          icon='tabler:plus'
          label='New Request'
          size='lg'
          variant='solid'
          onClick={handleOpenRequest}
        />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header
