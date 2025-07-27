import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Popover from '@/components/base/Popover'
import { StoryTitle } from './-components'

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
          <h1 className='mb-2 font-poppins text-base font-semibold text-gray-900'>
            Get Started
          </h1>
          <p className='border-b border-gray-600/10 pb-4 text-balance text-gray-600'>
            Lorem ipsum dolor, sit amet consectetur adipisicing elit.
            Consequatur possimus cupiditate molestias dolore, quasi ipsam rerum.
          </p>
          <div className='flex items-center gap-2 pt-4'>
            <div className='flex-1 text-gray-500'>6 of 8</div>
            <Button color='gray' label='Skip' variant='outline' />
            <Button label='Next' />
          </div>
        </div>
      </Popover>
    </div>
  )
}
