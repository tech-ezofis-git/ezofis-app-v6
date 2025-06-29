import { createFileRoute } from '@tanstack/react-router'
import { IconButton, Tooltip } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/tooltip')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>3. Tooltip</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Tooltip content='Default' position='right'>
            <IconButton
              color='gray'
              icon='tabler:cloud-download'
              variant='outline'
            />
          </Tooltip>
        </div>

        <StorySubTitle># Colors</StorySubTitle>
        <div className='flex flex-col items-start gap-4'>
          <Tooltip color='primary' content='Primary' position='right'>
            <IconButton icon='tabler:cloud-download' variant='subtle' />
          </Tooltip>
          <Tooltip color='red' content='Red' position='right'>
            <IconButton
              color='red'
              icon='tabler:cloud-download'
              variant='subtle'
            />
          </Tooltip>
          <Tooltip content='Gray' position='right'>
            <IconButton
              color='gray'
              icon='tabler:cloud-download'
              variant='subtle'
            />
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
