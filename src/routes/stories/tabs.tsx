import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/tabs')({
  component: RouteComponent,
})

function RouteComponent() {
  const [value, setValue] = useState<string | null>('tab1')

  return (
    <div>
      <StoryTitle>12. Tabs</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <Tabs value={value} onChange={setValue}>
          <Tab label='Home' value='tab1' />
          <Tab label='Users' value='tab2' />
          <Tab label='Settings' value='tab3' />
        </Tabs>

        <StorySubTitle>With Icon</StorySubTitle>
        <Tabs value={value} onChange={setValue}>
          <Tab icon='tabler:home' label='Home' value='tab1' />
          <Tab icon='tabler:users' label='Users' value='tab2' />
          <Tab icon='tabler:settings' label='Settings' value='tab3' />
        </Tabs>

        <StorySubTitle>Disabled</StorySubTitle>
        <Tabs value={value} onChange={setValue}>
          <Tab label='Home' value='tab1' />
          <Tab label='Users' value='tab2' disabled />
          <Tab label='Settings' value='tab3' />
        </Tabs>
      </div>
    </div>
  )
}
