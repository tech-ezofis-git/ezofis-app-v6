import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Pagination } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/pagination')({
  component: RouteComponent,
})

function RouteComponent() {
  const [active, setActive] = useState(5)

  return (
    <div>
      <StoryTitle>13. Pagination</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <div className='border-t border-gray-100 pt-4'>
          <Pagination
            itemLabel='Users'
            totalRows={144}
            value={active}
            onChange={setActive}
          />
        </div>
      </div>
    </div>
  )
}
