import { createFileRoute } from '@tanstack/react-router'
import { Highlight } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/highlight')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>16. Highlight</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <div className='w-96'>
          <Highlight words={['elit', 'omnis']}>
            Lorem ipsum dolor sit omnis, consectetur adipisicing elit. Culpa vel
            et autem asperiores ipsa impedit quod ut omnis at sed. Nemo totam in
            repellat iusto doloribus elit unde maiores nam.
          </Highlight>
        </div>
      </div>
    </div>
  )
}
