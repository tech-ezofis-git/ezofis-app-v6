import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Drawer, OverlayFooter, OverlayHeader } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/drawer')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isOpened, setIsOpened] = useState(false)

  return (
    <div>
      <StoryTitle>5. Drawer</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <Button label='Open' onClick={() => setIsOpened(true)} />
        <Drawer isOpened={isOpened} onClose={() => setIsOpened(false)}>
          <OverlayHeader title='Drawer' onClose={() => setIsOpened(false)} />
          <div style={{ height: 'calc(100vh - 120px)' }}></div>
          <OverlayFooter
            onCancel={() => setIsOpened(false)}
            onSave={() => setIsOpened(false)}
          />
        </Drawer>
      </div>
    </div>
  )
}
