import { createFileRoute } from '@tanstack/react-router'
import { IconAI } from '@/components/base'
import { StorySubTitle, StoryTitle } from './-components'

export const Route = createFileRoute('/stories/ai-icon')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>17. AI Icon</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <IconAI className='size-9' />

        <StorySubTitle>Animated</StorySubTitle>
        <IconAI className='size-9' animate />
      </div>
    </div>
  )
}
