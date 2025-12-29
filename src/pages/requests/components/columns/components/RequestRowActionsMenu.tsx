// @src/pages/requests/components/RequestRowActionsMenu.tsx

import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import cn from '@/utils/cn'

type Props<RowType = any> = {
    row: RowType
    onAttachments: (row: RowType) => void
    onComments: (row: RowType) => void
    onHistory: (row: RowType) => void
    /** Optional: if your API gives this, we’ll show it. Otherwise we hide the badge. */
    getHistoryCount?: (row: RowType) => number | undefined | null
    /** Optional: override how counts are read */
    getAttachmentCount?: (row: RowType) => number | undefined | null
    getCommentsCount?: (row: RowType) => number | undefined | null
}

function CountBadge({ value }: { value: number }) {
    return (
        <span
            className={cn(
                'ml-auto inline-flex min-w-[22px] items-center justify-center',
                'rounded-full bg-gray-3 px-2 py-0.5 text-[10px] font-semibold text-gray-12',
            )}
        >
            {value}
        </span>
    )
}

function MenuLabel({
    text,
    count,
}: {
    text: string
    count?: number | null
}) {
    const showCount = typeof count === 'number' && Number.isFinite(count)
    return (
        <div className="flex w-full items-center gap-2">
            <span className="truncate">{text}</span>
            {showCount ? <CountBadge value={count!} /> : null}
        </div>
    )
}

export default function RequestRowActionsMenu<RowType = any>({
    row,
    onAttachments,
    onComments,
    onHistory,
    getHistoryCount,
    getAttachmentCount,
    getCommentsCount,
}: Props<RowType>) {
    const attachmentCount =
        getAttachmentCount?.(row) ?? (row as any)?.attachmentCount ?? 0
    const commentsCount =
        getCommentsCount?.(row) ?? (row as any)?.commentsCount ?? 0

    // v5 doesn’t expose this on list rows; keep optional for your API evolution
    const historyCount = getHistoryCount?.(row) ?? (row as any)?.historyCount

    return (
        <div className="flex items-center justify-center">
            <Menu
                position="bottom-end"
                width={200}
                target={<IconButton color="gray" icon="tabler:dots" variant="ghost" />}
            >
                <MenuItem
                    icon="tabler:paperclip"
                    label={<MenuLabel text="Attachments" count={attachmentCount} /> as any}
                    onClick={() => onAttachments(row)}
                />
                <MenuItem
                    icon="tabler:message-circle"
                    label={<MenuLabel text="Comments" count={commentsCount} /> as any}
                    onClick={() => onComments(row)}
                />
                <MenuItem
                    icon="tabler:history"
                    label={<MenuLabel text="History" count={historyCount} /> as any}
                    onClick={() => onHistory(row)}
                />
            </Menu>
        </div>
    )
}
