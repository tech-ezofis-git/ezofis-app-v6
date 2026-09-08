import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import type { PreviewColumn } from '../../utils/previewSampleData'
import { sampleValue } from '../../utils/previewSampleData'

export type {
  PreviewColumn,
  PreviewSampleType,
} from '../../utils/previewSampleData'

interface Props {
  columns: PreviewColumn[]
  rowCount?: number
}

/**
 * Read-only, synthetic-data preview of the report table as currently
 * configured — mirrors column labels/order from the field picker so users
 * can see the shape of their report without needing live row data.
 */
const FieldsPreviewTable = ({ columns, rowCount = 3 }: Props) => {
  const { t } = useLingui()

  if (columns.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-4 py-10 text-center'>
        <Icon className='size-5 text-gray-7' name='lucide:table' />
        <p className='text-12 text-gray-9'>{t`Add fields to see a live preview of the report table.`}</p>
      </div>
    )
  }

  return (
    <div className='ez-scrollbar overflow-x-auto rounded-lg border border-gray-3'>
      <table className='w-full text-13'>
        <thead>
          <tr className='border-b border-gray-3 bg-gray-1'>
            {columns.map((column) => (
              <th
                className='px-3 py-2 text-left font-medium whitespace-nowrap text-gray-11'
                key={column.id}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, row) => (
            <tr className='border-b border-gray-2 last:border-0' key={row}>
              {columns.map((column) => (
                <td
                  className='px-3 py-2 whitespace-nowrap text-gray-12'
                  key={column.id}
                >
                  {sampleValue(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

FieldsPreviewTable.displayName = 'FieldsPreviewTable'
export default FieldsPreviewTable
