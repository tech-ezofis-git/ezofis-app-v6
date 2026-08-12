import { createFileRoute } from '@tanstack/react-router'
import type { User } from '@/types/user'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import UserRoleBadge from '@/components/common/UserRoleBadge'
import { formatDatetime } from '@/utils/dayjs'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/table')({
  component: TableStory,
})

const rows: User[] = [
  {
    company: 'Twitterbridge',
    country: 'Tunisia',
    createdAt: '2025-01-08T06:37:44Z',
    department: 'Human Resources',
    dob: '1999-09-10T22:39:58Z',
    email: 'pmartinyuk0@issuu.com',
    firstName: 'Penn',
    gender: 'Female',
    id: 1,
    jobTitle: 'Compensation Analyst',
    lastName: 'Martinyuk',
    name: 'Penn Martinyuk',
    phone: '802 343 6596',
    role: 'Admin',
    updatedAt: '2024-08-16T18:00:17Z',
  },
  {
    company: 'Kanoodle',
    country: 'Morocco',
    createdAt: '2025-07-27T20:28:12Z',
    department: 'Human Resources',
    dob: '1992-04-07T10:41:20Z',
    email: 'tbawme1@issuu.com',
    firstName: 'Tallie',
    gender: 'Female',
    id: 2,
    jobTitle: 'Librarian',
    lastName: 'Bawme',
    name: 'Tallie Bawme',
    phone: '509 120 2293',
    role: 'Manager',
    updatedAt: '2025-05-27T18:08:24Z',
  },
  {
    company: 'Browseblab',
    country: 'Philippines',
    createdAt: '2024-12-17T22:33:18Z',
    department: 'Support',
    dob: '1981-10-30T05:11:39Z',
    email: 'jkarolowski2@bing.com',
    firstName: 'Joletta',
    gender: 'Male',
    id: 3,
    jobTitle: 'VP Marketing',
    lastName: 'Karolowski',
    name: 'Joletta Karolowski',
    phone: '302 728 0442',
    role: 'Admin',
    updatedAt: '2025-01-05T15:33:24Z',
  },
]

function TableStory() {
  return (
    <div className='max-w-6xl p-6'>
      <StoryTitle>Table</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The Table component provides a foundation for displaying large datasets
        in a structured, readable format. It follows a standard HTML table
        architecture but includes custom styling for headers, rows, and cells to
        ensure alignment with the design system.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Table, import the core component and its structural
        helpers:
      </p>
      <StoryCode>
        {`import Table from '@/components/base/table/Table'
import Thead from '@/components/base/table/Thead'
import Tbody from '@/components/base/table/Tbody'
import Tr from '@/components/base/table/Tr'
import Th from '@/components/base/table/Th'
import Td from '@/components/base/table/Td'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Standard Table</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Assemble a table using the atomic sub-components for maximum
            flexibility.
          </p>
          <StoryCode>
            {`<Table>
  <Thead>
    <Tr>
      <Th>Name</Th>
      <Th>Role</Th>
    </Tr>
  </Thead>
  <Tbody>
    <Tr>
      <Td>Penn Martinyuk</Td>
      <Td><UserRoleBadge role='Admin' /></Td>
    </Tr>
  </Tbody>
</Table>`}
          </StoryCode>
          <div className='mt-8 ml-1 overflow-hidden rounded-lg border border-gray-3'>
            <Table>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Gender</Th>
                  <Th>Country</Th>
                  <Th>Job Title</Th>
                  <Th>Created At</Th>
                </Tr>
              </Thead>

              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className='font-medium text-gray-13'>{row.name}</Td>
                    <Td>{row.email}</Td>
                    <Td>
                      <UserRoleBadge role={row.role} />
                    </Td>
                    <Td>{row.gender}</Td>
                    <Td>{row.country}</Td>
                    <Td>{row.jobTitle}</Td>
                    <Td>{formatDatetime(row.createdAt)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  )
}
