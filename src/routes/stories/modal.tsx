import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Modal from '@/components/base/Modal'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/modal')({
  component: RouteComponent,
})

function RouteComponent() {
  const [opened, setopened] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Modal</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Modal component is used to display focused content or workflows that require user interaction without leaving the current context. It is typically used for confirmations, forms, or detailed information displays.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Modal, import the core component and its layout helpers:</p>
      <StoryCode>
        {`import Modal from '@/components/base/Modal'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard modal structure involves a header, content area, and a footer with action buttons.
          </p>
          <StoryCode>
            {`const [opened, setOpened] = useState(false)

<Button label='Open Modal' onClick={() => setOpened(true)} />

<Modal opened={opened} onClose={() => setOpened(false)}>
  <OverlayHeader title='Settings' onClose={() => setOpened(false)} />
  <OverlayContent height='240px' hasFooter hasHeader>
    {/* Form or Info Content */}
  </OverlayContent>
  <OverlayFooter onCancel={() => setOpened(false)} onSave={() => setOpened(false)} />
</Modal>`}
          </StoryCode>
          <div className='mt-8 ml-1'>
            <Button
              color='gray'
              label='Launch Demo Modal'
              variant='outline'
              onClick={() => setopened(true)}
            />
            <Modal opened={opened} onClose={() => setopened(false)}>
              <OverlayHeader title='Demo Modal' onClose={() => setopened(false)} />
              <OverlayContent height='240px' hasFooter hasHeader>
                <div className='p-6 text-14 text-gray-11'>
                  This is the content area of the modal. You can place forms, tables, or any other components here.
                </div>
              </OverlayContent>
              <OverlayFooter
                onCancel={() => setopened(false)}
                onSave={() => setopened(false)}
              />
            </Modal>
          </div>
        </section>
      </div>
    </div>
  )
}
