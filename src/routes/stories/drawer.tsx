import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Drawer from '@/components/base/Drawer'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/drawer')({
  component: RouteComponent,
})

function RouteComponent() {
  const [opened, setopened] = useState(false)

  return (
    <div>
      <StoryTitle>5. Drawer</StoryTitle>

      <Button
        color='gray'
        label='Open'
        variant='outline'
        onClick={() => setopened(true)}
      />
      <Drawer opened={opened} onClose={() => setopened(false)}>
        <OverlayHeader title='Drawer' onClose={() => setopened(false)} />
        <div style={{ height: 'calc(100vh - 120px)' }}></div>
        <OverlayFooter
          onCancel={() => setopened(false)}
          onSave={() => setopened(false)}
        />
      </Drawer>
    </div>
  )
}
