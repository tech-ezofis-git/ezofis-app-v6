// @src/pages/requests/components/columns/dynamicTable/DynamicTableCell.tsx
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import type { TableColMeta } from '@/pages/requests/utils/dynamicTable.utils'
import DynamicTableModal from './DynamicTableModal'

export default function DynamicTableCell({
    rawVal,
    title,
    colMeta,
    safeParse,
    modalWidth = 900,
}: {
    rawVal: any
    title: string
    colMeta?: TableColMeta[]
    safeParse: (v: any) => any
    modalWidth?: number | string
}) {
    const [opened, setOpened] = useState(false)

    return (
        <>
            <button
                type="button"
                className="inline-flex items-center cursor-pointer text-gray-11 hover:text-gray-12"
                onClick={(e) => {
                    e.stopPropagation()
                    setOpened(true)
                }}
                aria-label="Open table"
            >
                <Icon name="tabler:table" />
            </button>

            <DynamicTableModal
                opened={opened}
                onClose={() => setOpened(false)}
                title={title}
                rawVal={rawVal}
                colMeta={colMeta}
                safeParse={safeParse}
                width={modalWidth}
            />
        </>
    )
}
