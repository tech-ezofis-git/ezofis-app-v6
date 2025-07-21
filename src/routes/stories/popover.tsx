import { createFileRoute } from '@tanstack/react-router'
import { Button, Popover } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/popover')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>14. Popover</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <Popover
          position='bottom-start'
          target={<Button color='gray' label='Start' variant='outline' />}
          width={360}
        >
          <div className='p-4'>
            <h1 className='mb-2 font-poppins text-base font-semibold text-gray-900'>
              Get Started
            </h1>
            <p className='border-b border-gray-100 pb-4 text-balance text-gray-600 dark:border-gray-150'>
              Lorem ipsum dolor, sit amet consectetur adipisicing elit.
              Consequatur possimus cupiditate molestias dolore, quasi ipsam
              rerum.
            </p>
            <div className='flex items-center gap-2 pt-4'>
              <div className='flex-1 text-gray-500 dark:text-gray-550'>
                6 of 8
              </div>
              <Button
                className='hover:bg-gray-150'
                color='gray'
                label='Skip'
                variant='outline'
              />
              <Button label='Next' />
            </div>
          </div>
        </Popover>
      </div>
    </div>
  )
}
