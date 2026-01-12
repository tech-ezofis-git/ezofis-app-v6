// import { useState } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import type { IRequestMeta } from '../types'
import requestStore from "../stores/useRequestStore"
interface Props {
  workflow: Option | null
  allWorkflows: Option[] | null
  setWorkflow: React.Dispatch<React.SetStateAction<Option | null>>
  isLoading: Boolean
  metaData?: IRequestMeta
  // New Props
  activeTab: string
  setActiveTab: (val: string) => void
}


const Header = ({
  isLoading,
  allWorkflows,
  setWorkflow,
  workflow,
  metaData,
  activeTab,
  setActiveTab
}: Props) => {
  // const [value, setValue] = useState<string | null>('Inbox')
  // const [workflow, setWorkflow] = useState<Option | null>({
  //   disabled: false,
  //   id: 1,
  //   name: 'Accounts Payable',
  // })

  const openNewRequest = requestStore((state) => state.openNewRequest)
  const handleOpenRequest = () => {
    console.log("am running")
    openNewRequest("request")
  }
  return (
    <div className='flex flex-wrap items-center justify-between gap-6 border-b border-gray-3 px-6 md:px-8'>
      <Tabs color='primary' value={activeTab} onChange={(val) => setActiveTab(val as string)} >
        <Tab label={`Inbox ${isLoading ? "" : `(${metaData?.inboxCount ?? 0})`}`} value='Inbox' />
        <Tab label={`Sent ${isLoading ? "" : `(${metaData?.sentCount ?? 0})`}`} value='Sent' />
        <Tab label={`Closed ${isLoading ? "" : `(${metaData?.completedCount ?? 0})`}`} value='Closed' />
      </Tabs>

      <div className='flex items-center gap-2'>
        <InputSelect
          leftSection={<Icon className='text-gray-10' name='tabler:replace' />}
          options={allWorkflows && allWorkflows?.length > 0 ? allWorkflows : []}
          // size='sm'
          value={workflow}
          width={240}
          searchable
          onChange={setWorkflow}
        />
        <Button icon='tabler:plus' label='New Request' onClick={handleOpenRequest} />
      </div>
    </div>
  )
}

Header.displayName = 'Header'
export default Header