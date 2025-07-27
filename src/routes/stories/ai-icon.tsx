import { createFileRoute } from '@tanstack/react-router'
import AIIcom from '@/components/base/AIIcon'
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
        <AIIcom className='size-9' />

        <StorySubTitle>Animated</StorySubTitle>
        <AIIcom className='size-9' animate />
      </div>
    </div>
  )
}
