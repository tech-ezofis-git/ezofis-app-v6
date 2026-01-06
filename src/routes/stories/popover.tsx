import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Popover from '@/components/base/Popover'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/popover')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>14. Popover</StoryTitle>

      <Popover
        position='bottom-start'
        target={<Button color='gray' label='Open' variant='outline' />}
        width={360}
      >
        <div className='p-4'>
          <h1 className='mb-2 text-15 font-semibold text-gray-13'>
            Get Started
          </h1>
          <p className='text-gray border-b border-gray-3 pb-4 text-13 text-balance'>
            Lorem ipsum dolor, sit amet consectetur adipisicing elit.
            Consequatur possimus cupiditate molestias dolore, quasi ipsam rerum.
          </p>
          <div className='flex items-center gap-2 pt-4'>
            <div className='flex-1 text-13 text-gray-10'>6 of 8</div>
            <Button color='gray' label='Skip' size='md' variant='outline' />
            <Button label='Next' size='md' />
          </div>
        </div>
      </Popover>
    </div>
  )
}
