// @src/pages/requests/components/columns/dynamicTable/DynamicTableDataTable.tsx
import { useMemo } from 'react'
import type { TableColMeta } from '@/pages/requests/utils/dynamicTable.utils'
import {
  deriveRowKeys,
  toDisplayString,
} from '@/pages/requests/utils/dynamicTable.utils'
import WrapOnHoverCell from './WrapOnHoverCell'

type Props = {
  colMeta?: TableColMeta[]
  rows?: any[]
}

export default function DTModelTable({ colMeta, rows }: Props) {
  const safeRows = Array.isArray(rows) ? rows : []

  const { keys, labels } = useMemo(() => {
    const derived = colMeta?.length
      ? colMeta.map((c) => c.key)
      : deriveRowKeys(safeRows)
    const finalKeys = derived.length ? derived : ['Value']

    const map = new Map((colMeta ?? []).map((c) => [c.key, c.label]))
    const labels = finalKeys.map((k) => map.get(k) ?? k)

    return { keys: finalKeys, labels }
  }, [safeRows, colMeta])

  const primitiveMode = keys.length === 1 && keys[0] === 'Value'

  return (
    <div className='w-full'>
      <div className='scrollbar w-full overflow-x-auto'>
        <table className='w-full border-separate border-spacing-0 text-left text-13'>
          <thead>
            <tr>
              {labels.map((lbl) => (
                <th
                  className='sticky top-0 z-10 min-w-[120px] border-b border-gray-3 bg-surface px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-gray-11'
                  key={lbl}
                >
                  <div className='truncate' title={lbl}>
                    {lbl}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {safeRows.map((row, idx) => (
              <tr
                className='hover:bg-surface-hover border-b border-gray-3 last:border-b-0'
                key={idx}
              >
                {primitiveMode ? (
                  <td className='min-w-[120px] px-3 py-2.5 align-top'>
                    <WrapOnHoverCell value={toDisplayString(row)} />
                  </td>
                ) : (
                  keys.map((k) => (
                    <td className='min-w-[120px] px-3 py-2.5 align-top' key={k}>
                      <WrapOnHoverCell value={toDisplayString(row?.[k])} />
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
