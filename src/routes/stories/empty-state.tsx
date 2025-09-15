import { createFileRoute } from '@tanstack/react-router'
import EmptyState from '@/components/base/EmptyState'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/empty-state')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>38. Empty State</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <EmptyState
          description='Try changing the search query or filter options.'
          icon='tabler:database-search'
          primaryActionLabel='Reset Filters'
          secondaryActionLabel='Try Again'
          title='No results found'
        />
      </div>
    </div>
  )
}
