import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Pagination from '@/components/base/pagination/Pagination'
import { StoryTitle } from './-components'

export const Route = createFileRoute('/stories/pagination')({
  component: RouteComponent,
})

function RouteComponent() {
  const [active, setActive] = useState(5)

  return (
    <div>
      <StoryTitle>13. Pagination</StoryTitle>

      <div className='border-t border-gray-600/10 pt-4'>
        <Pagination
          itemLabel='Users'
          totalRows={144}
          value={active}
          onChange={setActive}
        />
      </div>
    </div>
  )
}
