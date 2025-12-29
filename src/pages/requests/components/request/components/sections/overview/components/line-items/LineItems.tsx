import { useMemo } from 'react'
import Badge from '@/components/base/Badge'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import cn from '@/utils/cn'

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
      <div className='mb-1 text-sm font-medium text-gray-13'>Line Item Matching</div>
      <div className='mb-4 text-sm text-gray-11'>
        Comparison between Extracted Invoice Data and Purchase Order Data.
      </div>

      <div className="overflow-x-auto">
        <Table>
          <Thead>
            <Tr>
              <Th rowSpan={2}>#</Th>
              <Th rowSpan={2} className="min-w-[200px]">Item Description</Th>
              <Th colSpan={2} className="text-center">Quantity</Th>
              <Th colSpan={2} className="text-center">Unit Price</Th>
              <Th rowSpan={2} className="text-right">Match Score</Th>
              <Th rowSpan={2} className="text-center">Status</Th>
            </Tr>

            <Tr>
              {/* Quantity Sub-headers */}
              {['Invoice', 'PO'].map((label) => (
                <Th
                  className='border-t-0 text-12 font-normal text-gray-11 text-center bg-gray-1'
                  key={`qty-${label}`}
                >
                  {label}
                </Th>
              ))}

              {/* Price Sub-headers */}
              {['Invoice', 'PO'].map((label) => (
                <Th
                  className='border-t-0 text-12 font-normal text-gray-11 text-center bg-gray-1'
                  key={`price-${label}`}
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
                  <div className='text-12 text-balance font-medium text-gray-13'>{item.name}</div>
                </Td>

                {/* Quantity */}
                <Td className={cn('text-center font-medium', {
                  'bg-red-1 text-red-11': item.quantity.invoice !== item.quantity.po && item.quantity.po !== '-'
                })}>
                  {item.quantity.invoice}
                </Td>
                <Td className='text-center text-gray-11'>
                  {item.quantity.po}
                </Td>

                {/* Price */}
                <Td className={cn('text-center font-medium', {
                  'bg-red-1 text-red-11': item.price.invoice !== item.price.po && item.price.po !== '-'
                })}>
                  {item.price.invoice}
                </Td>
                <Td className='text-center text-gray-11'>
                  {item.price.po}
                </Td>

                <Td className='text-right'>
                  <span className={cn('font-bold', {
                    'text-green-11': item.score >= 90,
                    'text-orange-11': item.score >= 70 && item.score < 90,
                    'text-red-11': item.score < 70
                  })}>
                    {Number(item.score).toFixed(2)}%
                  </span>
                </Td>

                <Td className="text-center">
                  <Badge
                    className='capitalize'
                    color={item.status === 'match' ? 'green' : item.status === 'mismatch' ? 'orange' : 'red'}
                    label={item.status === 'match' ? 'Match' : 'Review'}
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