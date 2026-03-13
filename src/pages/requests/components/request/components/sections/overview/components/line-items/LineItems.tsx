import { useMemo } from 'react'
import Badge from '@/components/base/Badge'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import Title from '@/components/base/Title'
import cn from '@/utils/cn'
// import Title from '@/components/base/Title'
interface Props {
  data: any
}

const LineItems = ({ data }: Props) => {
  // Transform the Agent 'debug' data into table rows
  const lineItems = useMemo(() => {
    const rawLines = data?.debug?.['Side-by-side Line Item matching'] || []

    return rawLines.map((line: any, index: number) => {
      // Helper to parse values "10 (Units)" -> 10
      // Adjust based on your actual data format
      const invoiceQty = line['Quantity']?.['Invoice Value'] || '-'
      const poQty = line['Quantity']?.['PO Value'] || '-'

      const invoicePrice = line['Unit Price']?.['Invoice Value'] || '-'
      const poPrice = line['Unit Price']?.['PO Value'] || '-'

      const itemDesc = line['Description']?.['Invoice Value'] || 'Unknown Item'

      const score = line['Line Score'] || 0
      let status = 'match'
      if (score < 100) status = 'mismatch'
      if (score < 50) status = 'critical'

      return {
        id: index + 1,
        name: itemDesc,
        price: {
          invoice: invoicePrice,
          po: poPrice,
        },
        quantity: {
          invoice: invoiceQty,
          po: poQty,
        },
        score: score,
        status: status,
      }
    })
  }, [data])

  if (lineItems.length === 0) return null

  return (
    <div>
      <Title
        className='mb-4'
        level={3}
        title='Line Items'
        description=' 3-way match validation: Invoice vs Purchase Order (PO) vs Goods Receipt
        Note (GRN)'
      />

      <div className='overflow-x-auto'>
        <Table>
          <Thead>
            <Tr>
              <Th rowSpan={2}>#</Th>
              <Th className='min-w-[200px]' rowSpan={2}>
                Item Description
              </Th>
              <Th className='text-center' colSpan={2}>
                Quantity
              </Th>
              <Th className='text-center' colSpan={2}>
                Unit Price
              </Th>
              <Th className='text-right' rowSpan={2}>
                Match Score
              </Th>
              <Th className='text-center' rowSpan={2}>
                Status
              </Th>
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
            {lineItems.map((item: any) => (
              <Tr key={item.id}>
                <Td>{item.id}</Td>

                <Td>
                  <div className='mb-1 font-medium text-gray-13'>{item.id}</div>
                  <div className='text-xs text-balance'>{item.name}</div>
                </Td>

                {/* Quantity */}
                <Td
                  className={cn('text-center font-medium', {
                    'bg-red-1 text-red-11':
                      item.quantity.invoice !== item.quantity.po &&
                      item.quantity.po !== '-',
                  })}
                >
                  {item.quantity.invoice}
                </Td>
                <Td className='text-center text-gray-11'>{item.quantity.po}</Td>

                {/* Price */}
                <Td
                  className={cn('text-center font-medium', {
                    'bg-red-1 text-red-11':
                      item.price.invoice !== item.price.po &&
                      item.price.po !== '-',
                  })}
                >
                  {item.price.invoice}
                </Td>
                <Td className='text-center text-gray-11'>{item.price.po}</Td>

                <Td className='text-right'>
                  <span
                    className={cn('font-bold', {
                      'text-green-11': item.score >= 90,
                      'text-orange-11': item.score >= 70 && item.score < 90,
                      'text-red-11': item.score < 70,
                    })}
                  >
                    {Number(item.score).toFixed(2)}%
                  </span>
                </Td>

                <Td className='text-center'>
                  <Badge
                    className='capitalize'
                    label={item.status === 'match' ? 'Match' : 'Review'}
                    color={
                      item.status === 'match'
                        ? 'green'
                        : item.status === 'mismatch'
                          ? 'orange'
                          : 'red'
                    }
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}

LineItems.displayName = 'LineItems'
export default LineItems
