import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Pagination from '@/components/base/pagination/Pagination'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/pagination')({
  component: RouteComponent,
})

function RouteComponent() {
  const [page, setPage] = useState(5)
  const [pageSize, setPageSize] = useState(10)

  return (
    <div>
      <StoryTitle>13. Pagination</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <Pagination
          itemLabel='Users'
          page={page}
          pageSize={pageSize}
          totalItems={144}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

        <StorySubTitle>Hide page numbers</StorySubTitle>
        <Pagination
          itemLabel='Users'
          page={page}
          pageSize={pageSize}
          showPageNumbers={false}
          totalItems={144}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
