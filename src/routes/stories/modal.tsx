import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Modal, OverlayFooter, OverlayHeader } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/modal')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isOpened, setIsOpened] = useState(false)

  return (
    <div>
      <StoryTitle>6. Modal</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <Button label='Open' onClick={() => setIsOpened(true)} />
        <Modal isOpened={isOpened} onClose={() => setIsOpened(false)}>
          <OverlayHeader title='Modal' onClose={() => setIsOpened(false)} />
          <div className='h-40'></div>
          <OverlayFooter
            onCancel={() => setIsOpened(false)}
            onSave={() => setIsOpened(false)}
          />
        </Modal>
      </div>
    </div>
  )
}
