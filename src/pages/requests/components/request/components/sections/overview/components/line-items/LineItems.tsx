import type { ILineItem } from '@/pages/requests/types'
import Badge from '@/components/base/Badge'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import Title from '@/components/base/Title'
import cn from '@/utils/cn'

const lineItems: ILineItem[] = [
  {
    id: 'Acme-1',
    name: 'Ballpoint Pens (Blue, Pack of 12)',
    price: {
      invoice: 45.5,
      po: 45.5,
    },
    quantity: {
      grn: 10,
      invoice: 8,
      po: 10,
    },
    status: 'mismatch',
    total: 455.0,
    variance: '2 (quantity)',
  },
  {
    id: 'Acme-2',
    name: 'A4 Copy Paper (500 sheets/ream)',
    price: {
      invoice: 120.0,
      po: 120.0,
    },
    quantity: {
      grn: 50,
      invoice: 50,
      po: 50,
    },
    status: 'match',
    total: 6000.0,
    variance: '-',
  },
  {
    id: 'Acme-3',
    name: 'Sticky Notes 3x3 (Yellow, 100 sheets)',
    price: {
      invoice: 20.0,
      po: 18.75,
    },
    quantity: {
      grn: 25,
      invoice: 25,
      po: 25,
    },
    status: 'mismatch',
    total: 500.0,
    variance: '$1.25 (price)',
  },
]

const LineItems = () => {
  return (
    <div>
      <Title
        className='mb-4'
        level={3}
        title='Line Items'
        description=' 3-way match validation: Invoice vs Purchase Order (PO) vs Goods Receipt
        Note (GRN)'
      />

      <Table>
        <Thead>
          <Tr>
            <Th rowSpan={2}>#</Th>
            <Th rowSpan={2}>Item</Th>
            <Th colSpan={3}>Quantity</Th>
            <Th colSpan={2}>Price</Th>
            <Th rowSpan={2}>Total</Th>
            <Th rowSpan={2}>Variance</Th>
            <Th rowSpan={2}>Status</Th>
          </Tr>

          <Tr>
            {['Invoice', 'PO', 'GRN'].map((label) => (
              <Th
                className='border-t-0 text-xs font-normal text-gray-11 first:rounded-none first:border-l-0 last:rounded-none'
                key={label}
              >
                {label}
              </Th>
            ))}

            {['Invoice', 'PO'].map((label) => (
              <Th
                className='border-t-0 text-xs/5 font-normal text-gray-11 first:rounded-none first:border-l-0 last:rounded-none'
                key={label}
              >
                {label}
              </Th>
            ))}
          </Tr>
        </Thead>

        <Tbody>
          {lineItems.map((item, index) => (
            <Tr key={item.id}>
              <Td>{index + 1}</Td>

              <Td>
                <div className='mb-1 font-medium text-gray-13'>{item.id}</div>
                <div className='text-xs text-balance'>{item.name}</div>
              </Td>

              <Td
                className={cn('font-medium text-nowrap text-gray-13', {
                  'bg-red-1 font-semibold text-red-11':
                    item.quantity.invoice !== item.quantity.po,
                })}
              >
                {item.quantity.invoice}
              </Td>
              <Td className='font-medium text-nowrap text-gray-13'>
                {item.quantity.po}
              </Td>
              <Td className='font-medium text-nowrap text-gray-13'>
                {item.quantity.grn}
              </Td>

              <Td
                className={cn('font-medium text-nowrap text-gray-13', {
                  'bg-red-1 font-semibold text-red-11':
                    item.price.invoice !== item.price.po,
                })}
              >
                ${item.price.invoice}
              </Td>
              <Td className='font-medium text-nowrap text-gray-13'>
                ${item.price.po}
              </Td>

              <Td className='text-nowrap'>${item.total}</Td>

              <Td>{item.variance}</Td>

              <Td>
                <Badge
                  className='capitalize'
                  color={item.status === 'match' ? 'green' : 'red'}
                  label={item.status}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  )
}

LineItems.displayName = 'LineItems'
export default LineItems
