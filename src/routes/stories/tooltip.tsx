import { createFileRoute } from '@tanstack/react-router'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/tooltip')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Tooltip</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        Tooltips provide brief, informative descriptions when a user hovers over, focuses on, or clicks an element. They are essential for explaining icon-only buttons or providing additional context for specialized terminology.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Tooltip, import it from its location:</p>
      <StoryCode>
        {`import Tooltip from '@/components/base/Tooltip'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Wraps any component to show a text bubble on hover.
          </p>
          <StoryCode>
            {`<Tooltip content='Download archive' position='right'>
  <IconButton icon='lucide:download' variant='outline' />
</Tooltip>`}
          </StoryCode>
          <div className='ml-1 mt-6'>
            <Tooltip content='Download archive' position='right'>
              <IconButton color='gray' icon='lucide:download' variant='outline' />
            </Tooltip>
          </div>
        </section>

        {/* Colors Section */}
        <section>
          <StorySubTitle>Semantic Colors</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Customize the tooltip theme to match the context of the action:
          </p>
          <div className='flex flex-col items-start gap-3 ml-1'>
            <div className='flex items-center gap-12'>
              <div className='w-40'>
                <p className='text-13 font-medium mb-3'>Primary</p>
                <Tooltip color='primary' content='Primary Theme' position='right'>
                  <IconButton icon='lucide:download' variant='subtle' />
                </Tooltip>
              </div>
              <div className='w-40'>
                <p className='text-13 font-medium mb-3'>Secondary</p>
                <Tooltip color='secondary' content='Secondary Theme' position='right'>
                  <IconButton color='secondary' icon='lucide:download' variant='subtle' />
                </Tooltip>
              </div>
              <div className='w-40'>
                <p className='text-13 font-medium mb-3'>Error (Red)</p>
                <Tooltip color='red' content='Destructive Action' position='right'>
                  <IconButton color='red' icon='lucide:download' variant='subtle' />
                </Tooltip>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
