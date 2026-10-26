import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

type JsonValue = Record<string, unknown> | unknown[]

/**
 * A report cell's JSON object/array, or null. Run results arrive as text, so
 * only strings that start like JSON and parse to an object/array qualify.
 */
export const parseJsonValue = (value: unknown): JsonValue | null => {
  if (value && typeof value === 'object') return value as JsonValue
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text.startsWith('{') && !text.startsWith('[')) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/** "3 rows", "5 fields" — a short hint of what the table holds. */
const useJsonSummary = () => {
  const { t } = useLingui()
  return (value: JsonValue) => {
    if (Array.isArray(value)) {
      const count = value.length
      return count === 1 ? t`1 row` : t`${count} rows`
    }
    const count = Object.keys(value).length
    return count === 1 ? t`1 field` : t`${count} fields`
  }
}

interface CellButtonProps {
  value: JsonValue
  onClick: () => void
}

/** Table icon + size hint shown in place of a raw JSON cell. */
export const JsonCellButton = ({ value, onClick }: CellButtonProps) => {
  const { t } = useLingui()
  const summarize = useJsonSummary()
  return (
    <button
      className='inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-4 bg-surface px-2 py-0.5 text-12 font-medium text-primary-10 transition-colors hover:border-primary-6 hover:bg-primary-1 active:scale-95'
      title={t`View as table`}
      type='button'
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <Icon className='size-3.5' name='lucide:table-2' />
      {summarize(value)}
    </button>
  )
}

const renderScalar = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/** Cell content: scalars as text, nested objects/arrays as a nested table. */
const JsonCell = ({ value }: { value: unknown }) => {
  const nested = parseJsonValue(value)
  if (nested) return <JsonValueTable value={nested} nested />
  return <>{renderScalar(value)}</>
}

interface TableProps {
  value: JsonValue
  nested?: boolean
}

/**
 * Renders JSON as a table: an array of objects as rows × columns (union of
 * keys), an array of scalars as one column, an object as Field / Value rows.
 */
const JsonValueTable = ({ nested = false, value }: TableProps) => {
  const { t } = useLingui()

  let headers: string[]
  let rows: unknown[][]

  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isPlainObject)) {
      headers = [
        ...new Set(value.flatMap((item) => Object.keys(item as object))),
      ]
      rows = value.map((item) =>
        headers.map((key) => (item as Record<string, unknown>)[key]),
      )
    } else {
      headers = [t`Value`]
      rows = value.map((item) => [item])
    }
  } else {
    headers = [t`Field`, t`Value`]
    rows = Object.entries(value)
  }

  if (rows.length === 0) {
    return <span className='text-12 text-gray-9'>{t`No data`}</span>
  }

  return (
    <div
      className={cn(
        'ez-scrollbar overflow-auto rounded-lg border border-gray-3 bg-surface',
        nested && 'my-0.5',
      )}
    >
      <table className={cn('w-full', nested ? 'text-12' : 'text-13')}>
        <thead>
          <tr className='border-b border-gray-3 bg-gray-1'>
            {headers.map((header) => (
              <th
                className='px-3 py-2 text-left font-medium whitespace-nowrap text-gray-11'
                key={header}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr
              className='border-b border-gray-2 align-top transition-colors last:border-0 hover:bg-gray-1/60'
              key={rowIndex}
            >
              {cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    'px-3 py-2 text-gray-12',
                    // The Field column of an object table reads like a header.
                    !Array.isArray(value) && cellIndex === 0
                      ? 'font-medium whitespace-nowrap text-gray-11'
                      : 'whitespace-nowrap',
                  )}
                >
                  <JsonCell value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

JsonValueTable.displayName = 'JsonValueTable'
export default JsonValueTable
