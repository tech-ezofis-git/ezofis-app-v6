import { createFileRoute } from '@tanstack/react-router'
import { Avatar, Indicator } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/indicator')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>9. Indicator</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <div className='flex items-center gap-4'>
          <Indicator offset={5}>
            <Avatar initials='CH' />
          </Indicator>
        </div>

        <StorySubTitle># Animated</StorySubTitle>
        <div className='flex items-center gap-4'>
          <Indicator offset={5} animate>
            <Avatar initials='CH' />
          </Indicator>
        </div>

        <StorySubTitle># Color</StorySubTitle>
        <div className='flex items-center gap-4'>
          <Indicator offset={5} animate>
            <Avatar initials='CH' />
          </Indicator>
          <Indicator color='red' offset={5} animate>
            <Avatar initials='CH' />
          </Indicator>
        </div>
      </div>
    </div>
  )
}
