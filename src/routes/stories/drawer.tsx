import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Drawer from '@/components/base/Drawer'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/drawer')({
  component: RouteComponent,
})

function RouteComponent() {
  const [opened, setOpened] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Drawer</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Drawer component is an off-canvas overlay that slides in from the side of the screen. It's often used for persistent navigation, filters, or complex side workflows that benefit from a vertically oriented content area.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Drawer, import the core component and its layout helpers:</p>
      <StoryCode>
        {`import Drawer from '@/components/base/Drawer'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard drawer typically includes a header for the title, a scrollable content area, and a pinned footer for actions.
          </p>
          <StoryCode>
            {`const [opened, setOpened] = useState(false)

<Button label='Open Drawer' onClick={() => setOpened(true)} />

<Drawer opened={opened} onClose={() => setOpened(false)}>
  <OverlayHeader title='User Profile' onClose={() => setOpened(false)} />
  <OverlayContent hasFooter hasHeader>
    {/* Profile Content */}
  </OverlayContent>
  <OverlayFooter onCancel={() => setOpened(false)} onSave={() => setOpened(false)} />
</Drawer>`}
          </StoryCode>
          <div className='mt-8 ml-1'>
            <Button
              color='gray'
              label='Launch Demo Drawer'
              variant='outline'
              onClick={() => setOpened(true)}
            />
            <Drawer opened={opened} onClose={() => setOpened(false)}>
              <OverlayHeader title='Demo Drawer' onClose={() => setOpened(false)} />
              <OverlayContent hasFooter hasHeader>
                <div className='p-6 text-14 text-gray-11'>
                  Drawers are excellent for deep-dive interactions where you want to keep the main view partially visible in the background.
                </div>
              </OverlayContent>
              <OverlayFooter
                onCancel={() => setOpened(false)}
                onSave={() => setOpened(false)}
              />
            </Drawer>
          </div>
        </section>
      </div>
    </div>
  )
}
