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
  {
    company: 'Layo',
    country: 'Indonesia',
    createdAt: '2025-03-19T20:46:21Z',
    department: 'Training',
    dob: '1985-08-14T09:59:31Z',
    email: 'kmattys3@illinois.edu',
    firstName: 'Kory',
    gender: 'Other',
    id: 4,
    jobTitle: 'Paralegal',
    lastName: 'Mattys',
    name: 'Kory Mattys',
    phone: '125 684 1736',
    role: 'User',
    updatedAt: '2024-08-29T16:02:18Z',
  },
  {
    company: 'Voonder',
    country: 'Russia',
    createdAt: '2025-01-18T17:05:11Z',
    department: 'Training',
    dob: '1988-09-22T06:29:55Z',
    email: 'rraccio4@tripadvisor.com',
    firstName: 'Roldan',
    gender: 'Male',
    id: 5,
    jobTitle: 'Staff Accountant III',
    lastName: 'Raccio',
    name: 'Roldan Raccio',
    phone: '725 160 5746',
    role: 'Admin',
    updatedAt: '2025-06-05T11:52:35Z',
  },
  {
    company: 'Feedfish',
    country: 'Georgia',
    createdAt: '2024-08-22T23:54:40Z',
    department: 'Business Development',
    dob: '1995-08-26T14:10:06Z',
    email: 'kle5@ow.ly',
    firstName: 'Kevyn',
    gender: 'Other',
    id: 6,
    jobTitle: 'Legal Assistant',
    lastName: 'Le Breton',
    name: 'Kevyn Le Breton',
    phone: '317 302 6389',
    role: 'Manager',
    updatedAt: '2024-11-18T23:24:15Z',
  },
  {
    company: 'Tambee',
    country: 'France',
    createdAt: '2025-01-08T18:04:33Z',
    department: 'Support',
    dob: '1993-12-10T20:03:15Z',
    email: 'clattie6@imageshack.us',
    firstName: 'Cornelia',
    gender: 'Other',
    id: 7,
    jobTitle: 'Biostatistician III',
    lastName: 'Lattie',
    name: 'Cornelia Lattie',
    phone: '998 415 1046',
    role: 'User',
    updatedAt: '2025-01-09T03:03:21Z',
  },
  {
    company: 'Shuffletag',
    country: 'China',
    createdAt: '2025-05-25T00:53:24Z',
    department: 'Business Development',
    dob: '2000-07-25T02:39:37Z',
    email: 'mjunkinson7@latimes.com',
    firstName: 'Maximilian',
    gender: 'Female',
    id: 8,
    jobTitle: 'Financial Analyst',
    lastName: 'Junkinson',
    name: 'Maximilian Junkinson',
    phone: '777 284 3011',
    role: 'User',
    updatedAt: '2025-02-14T10:20:30Z',
  },
  {
    company: 'Trupe',
    country: 'China',
    createdAt: '2024-12-08T19:15:14Z',
    department: 'Support',
    dob: '1983-09-15T12:45:14Z',
    email: 'aboner8@hubpages.com',
    firstName: 'Alethea',
    gender: 'Other',
    id: 9,
    jobTitle: 'Product Engineer',
    lastName: 'Boner',
    name: 'Alethea Boner',
    phone: '247 536 1279',
    role: 'Admin',
    updatedAt: '2025-02-14T15:50:22Z',
  },
  {
    company: 'Youopia',
    country: 'Malaysia',
    createdAt: '2025-04-17T21:11:25Z',
    department: 'Services',
    dob: '1995-11-08T23:12:42Z',
    email: 'ebarstowk9@baidu.com',
    firstName: 'Evelyn',
    gender: 'Other',
    id: 10,
    jobTitle: 'Junior Executive',
    lastName: 'Barstowk',
    name: 'Evelyn Barstowk',
    phone: '975 637 9841',
    role: 'User',
    updatedAt: '2025-07-30T16:14:25Z',
  },
]

function TableStory() {
  return (
    <div>
      <StoryTitle>33. Table</StoryTitle>

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
              <Td>{row.name}</Td>
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
  )
}
