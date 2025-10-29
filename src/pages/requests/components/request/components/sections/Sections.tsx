import { useState } from 'react'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import Form from './form/Form'
import Overview from './overview/Overview'

const Sections = () => {
  const [value, setValue] = useState<string | null>('Overview')

  return (
    <>
      <div className='border-b border-gray-3 px-6'>
        <Tabs color='primary' value={value} onChange={setValue}>
          <Tab label='Overview' value='Overview' />
          <Tab label='Form' value='Form' />
          <Tab label='Attachments' value='Attachments' />
          <Tab label='Comments' value='Comments' />
          <Tab label='History' value='History' />
        </Tabs>
      </div>

      {value === 'Overview' && <Overview />}
      {value === 'Form' && <Form />}
    </>
  )
}

Sections.displayName = 'Sections'
export default Sections
