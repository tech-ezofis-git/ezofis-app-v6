import { createFileRoute } from '@tanstack/react-router'
import Alert from '@/components/base/Alert'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/Alert')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>39. Alert</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <Alert text='Lorem ipsum dolar sit amit.' />

        <StorySubTitle>Green</StorySubTitle>
        <Alert text='Lorem ipsum dolar sit amit.' variant='green' />

        <StorySubTitle>Red</StorySubTitle>
        <Alert text='Lorem ipsum dolar sit amit.' variant='red' />
      </div>
    </div>
  )
}
