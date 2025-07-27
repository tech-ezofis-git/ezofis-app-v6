import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Drawer from '@/components/base/Drawer'
import OverlayFooter from '@/components/base/overlay/OverlayFooter'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import { StoryTitle } from './-components'

export const Route = createFileRoute('/stories/drawer')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isOpened, setIsOpened] = useState(false)

  return (
    <div>
      <StoryTitle>5. Drawer</StoryTitle>

      <Button
        color='gray'
        label='Open'
        variant='outline'
        onClick={() => setIsOpened(true)}
      />
      <Drawer isOpened={isOpened} onClose={() => setIsOpened(false)}>
        <OverlayHeader title='Drawer' onClose={() => setIsOpened(false)} />
        <div style={{ height: 'calc(100vh - 136px)' }}></div>
        <OverlayFooter
          onCancel={() => setIsOpened(false)}
          onSave={() => setIsOpened(false)}
        />
      </Drawer>
    </div>
  )
}
