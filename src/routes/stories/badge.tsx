import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/badge')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>11. Badge</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <Badge label='Badge' />

        <StorySubTitle>Colors</StorySubTitle>
        <div className='flex items-center gap-2'>
          <Badge label='Badge' />
          <Badge color='primary' label='Badge' />
          <Badge color='red' label='Badge' />
          <Badge color='orange' label='Badge' />
          <Badge color='yellow' label='Badge' />
          <Badge color='green' label='Badge' />
          <Badge color='blue' label='Badge' />
          <Badge color='violet' label='Badge' />
          <Badge color='pink' label='Badge' />
        </div>
      </div>
    </div>
  )
}
