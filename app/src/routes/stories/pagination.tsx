import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Pagination from '@/components/base/pagination/Pagination'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/pagination')({
  component: RouteComponent,
})

function RouteComponent() {
  const [page, setPage] = useState(5)
  const [pageSize, setPageSize] = useState(10)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Pagination</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Pagination component allows users to navigate through large datasets
        by dividing them into manageable chunks or pages. It provides controls
        for changing the current page and adjusting the number of items
        displayed per page.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Pagination, import it from its location:
      </p>
      <StoryCode>
        {`import Pagination from '@/components/base/pagination/Pagination'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A comprehensive pagination control with page numbers, page size
            selector, and item count.
          </p>
          <StoryCode>
            {`<Pagination
  itemLabel='Users'
  page={page}
  pageSize={pageSize}
  totalItems={144}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>`}
          </StoryCode>
          <div className='mt-8 rounded-lg border border-gray-3 bg-gray-1 p-4'>
            <Pagination
              itemLabel='Users'
              page={page}
              pageSize={pageSize}
              totalItems={144}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </section>

        {/* Compact Section */}
        <section>
          <StorySubTitle>Simplified View</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Toggle <code>showPageNumbers={'{false}'}</code> to display only the
            previous/next buttons and metadata.
          </p>
          <StoryCode>
            {`<Pagination
  showPageNumbers={false}
  totalItems={144}
  /* ...other props */
/>`}
          </StoryCode>
          <div className='mt-8 rounded-lg border border-gray-3 bg-gray-1 p-4'>
            <Pagination
              itemLabel='Records'
              page={page}
              pageSize={pageSize}
              showPageNumbers={false}
              totalItems={144}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
