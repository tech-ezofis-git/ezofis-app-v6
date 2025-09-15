import { createFileRoute } from '@tanstack/react-router'
import Badge from '@/components/base/Badge'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

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
        <div className='flex flex-wrap items-center gap-2'>
          <Badge label='Badge' />
          <Badge color='blue' label='Badge' />
          <Badge color='bronze' label='Badge' />
          <Badge color='cyan' label='Badge' />
          <Badge color='gold' label='Badge' />
          <Badge color='green' label='Badge' />
          <Badge color='indigo' label='Badge' />
          <Badge color='orange' label='Badge' />
          <Badge color='pink' label='Badge' />
          <Badge color='purple' label='Badge' />
          <Badge color='red' label='Badge' />
          <Badge color='teal' label='Badge' />
          <Badge color='violet' label='Badge' />
          <Badge color='yellow' label='Badge' />
        </div>
      </div>
    </div>
  )
}
