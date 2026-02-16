import { createFileRoute } from '@tanstack/react-router'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/scroll-area')({
  component: RouteComponent,
})

function RouteComponent() {
  const content = (
    <div className='space-y-6 pr-2 py-2'>
      <p className='text-14 text-gray-12'>
        Tooltips provide brief, informative descriptions when a user hovers over, focuses on, or clicks an element. They are essential for explaining icon-only buttons or providing additional context for specialized terminology.
      </p>
      <p className='text-14 text-gray-12'>
        The ScrollArea component provides a custom-styled scrollbar experience that remains consistent across different browsers and operating systems. It is built on top of Radix UI primitives for accessibility and reliability.
      </p>
      <p className='text-14 text-gray-12'>
        In modern web applications, default browser scrollbars can often look out of place or break the aesthetic consistency of a professional dashboard. Using a dedicated ScrollArea ensures a polished look while maintaining native performance.
      </p>
    </div>
  )

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>ScrollArea</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The ScrollArea component provides a customizable and accessible scrolling container. It replaces native scrollbars with a cross-browser consistent design, supporting both vertical and horizontal scrolling with optional visibility controls.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using ScrollArea, import it from its location:</p>
      <StoryCode>
        {`import ScrollArea from '@/components/base/scroll-area/ScrollArea'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard vertical scroll area with a fixed height.
          </p>
          <StoryCode>
            {`<ScrollArea className='w-full' height='240px'>
  {/* Long content here */}
</ScrollArea>`}
          </StoryCode>
          <div className='mt-8 p-4 bg-gray-1 border border-gray-3 rounded-xl w-fit'>
            <ScrollArea className='w-80' height='240px'>
              {content}
            </ScrollArea>
          </div>
        </section>

        {/* Multi-axis Section */}
        <section>
          <StorySubTitle>Multi-axis Scrolling (XY)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Toggle the <code>scrollbars</code> prop to 'xy' to enable both vertical and horizontal scrolling when content overflows in both directions.
          </p>
          <StoryCode>
            {`<ScrollArea height='240px' scrollbars='xy' width='320px'>
  <div className='w-[640px]'>
    {/* Very wide content */}
  </div>
</ScrollArea>`}
          </StoryCode>
          <div className='mt-8 p-4 bg-gray-1 border border-gray-3 rounded-xl w-fit'>
            <ScrollArea height='240px' scrollbars='xy' width='320px'>
              <div className='w-[640px]'>
                {content}
                {content}
              </div>
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  )
}
