import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import StatusPill from '@/pages/reports/components/StatusPill'
import type { ReportFieldSetting } from '../../types'
import type { PreviewColumn } from '../../utils/previewSampleData'
import { sampleValue } from '../../utils/previewSampleData'
import { resolveFieldStatus } from '../../utils/resolveFieldStatus'

export type {
  PreviewColumn,
  PreviewSampleType,
} from '../../utils/previewSampleData'

interface Props {
  columns: PreviewColumn[]
  /** When given, highlighted (status) columns render as colored pills. */
  fieldSettings?: Record<string, ReportFieldSetting>
  /** Live rows to show (default 5). */
  maxRows?: number
  /** When set, isLoading/rows come from the live POST /preview call; when
   * unset (e.g. the legacy domain-field path with no real backing table)
   * the table falls back to synthetic sample data. */
  isLive?: boolean
  isLoading?: boolean
  rowCount?: number
  rows?: Record<string, string>[]
}

/**
 * Preview of the report table as currently configured. Backed by a live
 * POST /report-builder/preview call when the source form is known
 * (`isLive`); otherwise falls back to synthetic sample data so users still
 * see the shape of the table.
 */
const FieldsPreviewTable = ({
  columns,
  fieldSettings,
  isLive = false,
  isLoading = false,
  maxRows = 5,
  rowCount = 3,
  rows,
}: Props) => {
  const { t } = useLingui()

  const renderLiveCell = (column: PreviewColumn, row: Record<string, string>) => {
    const status = resolveFieldStatus(fieldSettings?.[column.id], row)
    if (status) return <StatusPill color={status.color} label={status.label || '-'} />
    return row[column.label] ?? row[column.id] ?? '-'
  }

  if (columns.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-4 py-10 text-center'>
        <Icon className='size-5 text-gray-7' name='lucide:table' />
        <p className='text-12 text-gray-9'>{t`Add fields to see a live preview of the report table.`}</p>
      </div>
    )
  }

  const liveRows = rows?.slice(0, maxRows)

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
          {isLive ? (
            isLoading ? (
              <tr>
                <td
                  className='px-3 py-6 text-center text-12 text-gray-9'
                  colSpan={columns.length}
                >
                  {t`Loading preview...`}
                </td>
              </tr>
            ) : !liveRows || liveRows.length === 0 ? (
              <tr>
                <td
                  className='px-3 py-6 text-center text-12 text-gray-9'
                  colSpan={columns.length}
                >
                  {t`No matching rows.`}
                </td>
              </tr>
            ) : (
              liveRows.map((row, index) => (
                <tr
                  className='border-b border-gray-2 last:border-0'
                  key={index}
                >
                  {columns.map((column) => (
                    <td
                      className='px-3 py-2 whitespace-nowrap text-gray-12'
                      key={column.id}
                    >
                      {renderLiveCell(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )
          ) : (
            Array.from({ length: rowCount }).map((_, row) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

FieldsPreviewTable.displayName = 'FieldsPreviewTable'
export default FieldsPreviewTable
