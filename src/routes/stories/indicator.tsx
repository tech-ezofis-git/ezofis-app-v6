import { createFileRoute } from '@tanstack/react-router'
import Avatar from '@/components/base/Avatar'
import Indicator from '@/components/base/Indicator'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/indicator')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>9. Indicator</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <div className='flex items-center gap-4'>
          <Indicator offset={5}>
            <Avatar initials='CH' />
          </Indicator>
        </div>

        <StorySubTitle>Animated</StorySubTitle>
        <div className='flex items-center gap-4'>
          <Indicator offset={5} animate>
            <Avatar initials='CH' />
          </Indicator>
        </div>

        <StorySubTitle>Color</StorySubTitle>
        <div className='flex items-center gap-4'>
          <Indicator offset={5} animate>
            <Avatar initials='CH' />
          </Indicator>
          <Indicator color='secondary' offset={5} animate>
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
