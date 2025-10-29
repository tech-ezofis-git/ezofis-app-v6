import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Modal from '@/components/base/Modal'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/modal')({
  component: RouteComponent,
})

function RouteComponent() {
  const [opened, setopened] = useState(false)

  return (
    <div>
      <StoryTitle>6. Modal</StoryTitle>

      <Button
        color='gray'
        label='Open'
        variant='outline'
        onClick={() => setopened(true)}
      />
      <Modal opened={opened} onClose={() => setopened(false)}>
        <OverlayHeader title='Modal' onClose={() => setopened(false)} />
        <OverlayContent height='240px' hasFooter hasHeader>
          <></>
        </OverlayContent>
        <OverlayFooter
          onCancel={() => setopened(false)}
          onSave={() => setopened(false)}
        />
      </Modal>
    </div>
  )
}
