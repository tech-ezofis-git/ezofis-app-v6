import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Popover from '@/components/base/Popover'
import StoryCode from './-components/StoryCode'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/popover')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Popover</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Popover component is a floating container used to display contextual information or simple interactive menus when a trigger element is clicked. Unlike Tooltips, Popovers are typically triggered by clicks and can contain rich HTML content.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Popover, import it from its location:</p>
      <StoryCode>
        {`import Popover from '@/components/base/Popover'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <div className='w-full max-w-xl'>
            <p className='text-14 text-gray-11 mb-4'>
              Use the <code>target</code> prop to define the trigger element and place your content as <code>children</code>:
            </p>
            <StoryCode>
              {`<Popover
  position='bottom-start'
  target={<Button label='Click Me' variant='outline' />}
  width={360}
>
  <div className='p-4'>
    <h3>Popover Content</h3>
    <p>Contextual information goes here.</p>
  </div>
</Popover>`}
            </StoryCode>
            <div className='mt-8 ml-1'>
              <Popover
                position='bottom-start'
                target={<Button color='gray' label='Open Popover' variant='outline' />}
                width={360}
              >
                <div className='p-4'>
                  <h1 className='mb-2 text-15 font-semibold text-gray-13'>
                    Get Started
                  </h1>
                  <p className='text-gray border-b border-gray-3 pb-4 text-13 text-balance'>
                    Popovers are great for walk-throughs, small forms, or detailed descriptions that don't quite need a full modal.
                  </p>
                  <div className='flex items-center gap-2 pt-4'>
                    <div className='flex-1 text-13 text-gray-10'>Step 6 of 8</div>
                    <Button color='gray' label='Skip' size='md' variant='outline' />
                    <Button label='Next' size='md' />
                  </div>
                </div>
              </Popover>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
