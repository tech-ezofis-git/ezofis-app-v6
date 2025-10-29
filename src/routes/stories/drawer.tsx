import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Drawer from '@/components/base/Drawer'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/drawer')({
  component: RouteComponent,
})

function RouteComponent() {
  const [opened, setOpened] = useState(false)

  return (
    <div>
      <StoryTitle>5. Drawer</StoryTitle>

      <Button
        color='gray'
        label='Open'
        variant='outline'
        onClick={() => setOpened(true)}
      />
      <Drawer opened={opened} onClose={() => setOpened(false)}>
        <OverlayHeader title='Drawer' onClose={() => setOpened(false)} />
        <OverlayContent hasFooter hasHeader>
          <></>
        </OverlayContent>
        <OverlayFooter
          onCancel={() => setOpened(false)}
          onSave={() => setOpened(false)}
        />
      </Drawer>
    </div>
  )
}
