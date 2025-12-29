
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import type { TableColMeta } from '@/pages/requests/utils/dynamicTable.utils'
import { normalizeTablePayload, toDisplayString } from '@/pages/requests/utils/dynamicTable.utils'
import DTModelTable from "./DTModelTable"

export default function DynamicTableModal({
    opened,
    onClose,
    title,
    rawVal,
    colMeta,
    safeParse,
    width = 900,
}: {
    opened: boolean
    onClose: () => void
    title: string
    rawVal: any
    colMeta?: TableColMeta[]
    safeParse: (v: any) => any
    width?: number | string
}) {
    const { rows, meta } = normalizeTablePayload(safeParse, rawVal)

    return (
        <Modal opened={opened} onClose={onClose} width={width}>
            <div className="flex items-center justify-between border-b border-gray-3 px-6 py-3 md:px-8">
                <div className="font-medium">{title}</div>
                <button
                    type="button"
                    className="text-gray-11 hover:text-gray-12"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <Icon name="tabler:x" />
                </button>
            </div>

            <div className="px-6 md:px-8 py-4">
                {!rows?.length ? (
                    <div className="text-sm text-gray-11">No table data available.</div>
                ) : (
                    <div className="flex flex-col rounded-lg bg-primary shadow">
                        <div className="flex-1 p-2 max-h-[65vh] overflow-auto">
                            <DTModelTable rows={rows} colMeta={colMeta} />
                        </div>
                    </div>
                )}

                {/* Safety fallback: if payload is object but rows not detected */}
                {(!rows?.length && meta) ? (
                    <div className="mt-3 text-xs text-gray-12 whitespace-pre-wrap break-words border border-gray-200 rounded-md p-3 max-h-[40vh] overflow-auto">
                        {toDisplayString(meta)}
                    </div>
                ) : null}
            </div>
        </Modal>
    )
}
