// @src/pages/requests/components/columns/dynamicTable/DynamicTableDataTable.tsx
import { useMemo } from 'react'
import type { TableColMeta } from '@/pages/requests/utils/dynamicTable.utils'
import { deriveRowKeys, toDisplayString } from '@/pages/requests/utils/dynamicTable.utils'
import WrapOnHoverCell from './WrapOnHoverCell'

type Props = {
    rows?: any[]
    colMeta?: TableColMeta[]
}

export default function DTModelTable({ rows, colMeta }: Props) {
    const safeRows = Array.isArray(rows) ? rows : []

    const { keys, labels } = useMemo(() => {
        const derived = colMeta?.length ? colMeta.map((c) => c.key) : deriveRowKeys(safeRows)
        const finalKeys = derived.length ? derived : ['Value']

        const map = new Map((colMeta ?? []).map((c) => [c.key, c.label]))
        const labels = finalKeys.map((k) => map.get(k) ?? k)

        return { keys: finalKeys, labels }
    }, [safeRows, colMeta])

    const primitiveMode = keys.length === 1 && keys[0] === 'Value'

    return (
        <div className="w-full">
            <div className="scrollbar w-full overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-left text-13">
                    <thead>
                        <tr>
                            {labels.map((lbl) => (
                                <th
                                    key={lbl}
                                    className="text-left text-xs font-medium text-gray-11 px-3 py-2.5 whitespace-nowrap border-b border-gray-3 bg-surface sticky top-0 z-10 min-w-[120px]"
                                >
                                    <div className="truncate" title={lbl}>
                                        {lbl}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {safeRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-3 last:border-b-0 hover:bg-gray-50">
                                {primitiveMode ? (
                                    <td className="px-3 py-2.5 align-top min-w-[120px]">
                                        <WrapOnHoverCell value={toDisplayString(row)} />
                                    </td>
                                ) : (
                                    keys.map((k) => (
                                        <td key={k} className="px-3 py-2.5 align-top min-w-[120px]">
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
