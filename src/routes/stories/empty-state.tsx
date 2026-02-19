import { createFileRoute } from '@tanstack/react-router'
import EmptyState from '@/components/base/EmptyState'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/empty-state')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Empty State</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        Empty State components provide context and guidance when a page or section has no content to display. They are essential for a good user experience, helping users understand why a space is empty and what they can do next.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using EmptyState, import it from its location:</p>
      <StoryCode>
        {`import EmptyState from '@/components/base/EmptyState'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A comprehensive empty state with an icon, title, description, and primary/secondary actions.
          </p>
          <StoryCode>
            {`<EmptyState
  title='No results found'
  description='Try changing the search query or filter options.'
  icon='lucide:folder-search'
  primaryActionLabel='Reset Filters'
  secondaryActionLabel='Try Again'
/>`}
          </StoryCode>
          <div className='mt-8 p-12 bg-gray-1 border border-dashed border-gray-4 rounded-xl'>
            <EmptyState
              description='Try changing the search query or filter options.'
              icon='lucide:folder-search'
              primaryActionLabel='Reset Filters'
              secondaryActionLabel='Try Again'
              title='No results found'
            />
          </div>
        </section>
      </div>
    </div>
  )
}
