import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/tabs')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | null>('tab1')

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Tabs</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        Tabs organize content into separate views that the user can navigate between. They are ideal for grouping related information while keeping the interface clean and focused. The component supports icons, disabled states, and primary/secondary color themes.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Tabs, import the core component and the Tab item:</p>
      <StoryCode>
        {`import Tabs from '@/components/base/tabs/Tabs'
import Tab from '@/components/base/tabs/Tab'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard horizontal tab list using unique <code>value</code> keys for state management.
          </p>
          <StoryCode>
            {`<Tabs value={value} onChange={setValue}>
  <Tab label='Account' value='tab1' />
  <Tab label='Security' value='tab2' />
</Tabs>`}
          </StoryCode>
          <div className='mt-6 ml-1'>
            <Tabs value={value} onChange={setValue}>
              <Tab label='Home' value='tab1' />
              <Tab label='Users' value='tab2' />
              <Tab label='Settings' value='tab3' />
            </Tabs>
          </div>
        </section>

        {/* Icons Section */}
        <section>
          <StorySubTitle>Tabs with Icons</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Enhance tab labels with meaningful icons for better visual recognition.
          </p>
          <StoryCode>
            {`<Tab icon='lucide:home' label='Home' value='tab1' />`}
          </StoryCode>
          <div className='mt-6 ml-1'>
            <Tabs value={value} onChange={setValue}>
              <Tab icon='lucide:home' label='Home' value='tab1' />
              <Tab icon='lucide:user' label='Users' value='tab2' />
              <Tab icon='lucide:settings' label='Settings' value='tab3' />
            </Tabs>
          </div>
        </section>

        {/* State/Color Section */}
        <section>
          <StorySubTitle>Interaction States & Colors</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Demonstrating disabled tabs and semantic color variants:
          </p>
          <div className='space-y-12 ml-1'>
            <div>
              <p className='text-13 font-medium text-gray-11 mb-4'>Disabled Items</p>
              <Tabs value={value} onChange={setValue}>
                <Tab label='Visible' value='tab1' />
                <Tab label='Unavailable' value='tab2' disabled />
                <Tab label='Visible' value='tab3' />
              </Tabs>
            </div>
            <div>
              <p className='text-13 font-medium text-gray-11 mb-4'>Primary Theme</p>
              <Tabs color='primary' value={value} onChange={setValue}>
                <Tab label='Overview' value='tab1' />
                <Tab label='Payments' value='tab2' />
              </Tabs>
            </div>
            <div>
              <p className='text-13 font-medium text-gray-11 mb-4'>Secondary Theme</p>
              <Tabs color='secondary' value={value} onChange={setValue}>
                <Tab label='System' value='tab1' />
                <Tab label='Logs' value='tab2' />
              </Tabs>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
