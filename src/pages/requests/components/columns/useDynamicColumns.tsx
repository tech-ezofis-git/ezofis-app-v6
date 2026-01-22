import React, { useMemo } from 'react'
import type { Column } from '@/components/base/data-table/types'
import { formatDatetime } from '@/utils/dayjs'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import { safeParse } from '@/pages/requests/utils/workflow.utils'
import type { WorkflowOption } from '../../types'
import type { Request } from '@/types/request'
import { generateDummySummary } from '@/pages/requests/utils/dummyData'
import SummaryBadge from '@/components/common/SummaryBadge'

import WrapOnHoverCell from './components/WrapOnHoverCell'
import DynamicTableCell from './components/DynamicTableCell'
import {
    buildTableMeta,
    getFieldKey,
    getFieldLabel,
    isIgnorableField,
    isParentField,
    isTableType,
} from '@/pages/requests/utils/dynamicTable.utils'

// ✅ Menu UI
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'

// ✅ Your generic FileSheet (React version)
// import FileSheet from '@/components/common/file-sheet/FileSheet'
// add this import near the top
import FileUploadCell from './components/FileUploadCell'


const LINK_TEXT =
    'transition-colors cursor-pointer font-medium underline hover:text-gray-13'

const wrap = (content: React.ReactNode) => (
    <WrapOnHoverCell value={content} />
)

const resolveFormJson = (workflow: WorkflowOption | null): any | null => {
    if (!workflow?.formJson) return null

    const raw = workflow.formJson

    if (typeof raw === 'string') {
        try {
            const parsed = safeParse(raw)
            return parsed || null
        } catch {
            return null
        }
    }

    return [raw]
}


export const useDynamicColumns = (
    workflow: WorkflowOption | null,
    onRowClick: (item: any, tab: string) => void,
    selectedItem: any,
    /**
     * ✅ Optional: provide a real preview URL builder for your backend
     * Example: (file) => `/api/workflow/files/preview/${file.repositoryId}/${file.id}`
     */
    //getFilePreviewUrl?: (file: UploadedFile, row: any) => string,
) => {
    return useMemo(() => {
        const columns: Column[] = [
            {
                id: 'requestNo',
                label: 'Request No',
                size: 200,
                renderCell: (row: any) => (
                    <div className="flex items-center gap-2 min-w-0">
                        <WrapOnHoverCell
                            value={
                                <span
                                    className={LINK_TEXT}
                                    onClick={(e) => {
                                        e?.stopPropagation?.()
                                        onRowClick && onRowClick(row, 'Overview')
                                    }}
                                >
                                    {row.requestNo ?? '-'}
                                </span>
                            }
                        />
                        {row?.isDuplicateInvoice && <RequestStatusBadge status="Duplicated" />}
                    </div>
                ),
                // sortingFn: 'alphanumeric',


            },
            // 2) Dummy Data Columns
            {
                id: 'score',
                label: 'Match Score',
                size: 220,
                renderCell: (row: any) => {
                    const summary = generateDummySummary(row.id || row.requestNo)
                    return (
                        <SummaryBadge
                            label={summary.score.shortText}
                            icon={summary.score.icon}
                            theme={summary.score.theme as any}
                            variant="outline"
                        />
                    )
                }
            },
            {
                id: 'decision',
                label: 'Decision',
                size: 220,
                renderCell: (row: any) => {
                    const summary = generateDummySummary(row.id || row.requestNo)
                    return (
                        <SummaryBadge
                            label={summary.decision.badgeText}
                            icon={summary.decision.icon}
                            theme={summary.decision.theme as any}
                            variant="outline"
                        />
                    )
                }
            },
            {
                id: 'extraction',
                label: 'Line Items Matched',
                size: 220,
                renderCell: (row: any) => {
                    const summary = generateDummySummary(row.id || row.requestNo)
                    return (
                        <SummaryBadge
                            label={summary.extraction.shortText}
                            icon={summary.extraction.icon}
                            theme={summary.extraction.theme as any}
                            variant="outline"
                        />
                    )
                }
            },
            {
                id: 'dueDate',
                label: 'Due Date',
                size: 220,
                renderCell: (row: any) => {
                    const summary = generateDummySummary(row.id || row.requestNo)
                    return (
                        <SummaryBadge
                            label={summary.dueDate.shortText}
                            icon={summary.dueDate.icon}
                            theme={summary.dueDate.theme as any}
                            variant="outline"
                        />
                    )
                }
            },
            ...(selectedItem
                ? []  // If a request is selected, hide all other columns
                : [
                    {
                        id: 'raisedBy',
                        label: 'Raised By',

                        size: 200,
                        renderCell: (row: any) => (
                            <WrapOnHoverCell value={row.raisedBy ?? '-'} className="text-sm text-gray-700" />
                        ),
                    },
                    {
                        id: 'raisedAt',
                        label: 'Raised On',

                        size: 160,
                        renderCell: (row: any) => (
                            <WrapOnHoverCell
                                value={row.raisedAt ? formatDatetime(row.raisedAt as string, 'datetime') : '-'}
                            />
                        ),
                    },
                    { // moved stage here
                        id: 'stage',
                        label: 'Stage',
                        size: 140,
                        renderCell: (row: any) => (
                            <div className="min-w-0">
                                <RequestStatusBadge status={row.stage as Request['status']} />
                            </div>
                        ),
                    },])
        ]

        const form = resolveFormJson(workflow)
        if (!form) {
            columns.push(makeActionsColumn(onRowClick))
            return columns
        }

        const panels = Array.isArray((form as any).panels) ? (form as any).panels : []
        const secondaryPanels = Array.isArray((form as any).secondaryPanels)
            ? (form as any).secondaryPanels
            : []
        const rootPanels = Array.isArray(form) ? form : [form]

        const allPanels = [...rootPanels, ...panels, ...secondaryPanels]
        if (!allPanels.length) {
            columns.push(makeActionsColumn(onRowClick))
            return columns
        }

        const tableMetaByParentId = buildTableMeta(allPanels)

        allPanels.forEach((panel: any) => {
            const controls = panel?.controlList || panel?.controllist || panel?.fields || []

            controls.forEach((field: any) => {
                if (isIgnorableField(field)) return
                if (!isParentField(field)) return

                const fieldKey = getFieldKey(field)
                if (!fieldKey) return

                const label = getFieldLabel(field)

                if (!selectedItem) {
                    columns.push({
                        id: fieldKey,
                        label,
                        size: 200,
                        renderCell: (row: any) => {
                            const rawVal = row[fieldKey] ?? row.formData?.[fieldKey]

                            if (rawVal === undefined || rawVal === null || rawVal === '') {
                                return <WrapOnHoverCell value="-" />
                            }

                            if (isTableType(field.type)) {
                                const tableParentId = field?.id
                                const colMeta =
                                    tableParentId !== undefined && tableParentId !== null
                                        ? tableMetaByParentId.get(String(tableParentId))
                                        : undefined

                                return (
                                    <span className="inline-flex items-center">
                                        <DynamicTableCell
                                            rawVal={rawVal}
                                            title={String(label)}
                                            colMeta={colMeta}
                                            safeParse={safeParse}
                                            modalWidth={900}
                                        />
                                    </span>
                                )
                            }

                            const type = String(field.type ?? '').toUpperCase()

                            switch (type) {
                                case 'FILE_UPLOAD': {
                                    // ✅ OPEN FILESHEET MODAL HERE
                                    return wrap(<FileUploadCell rawVal={rawVal} row={row} />)

                                }

                                case 'DATE':
                                    return <WrapOnHoverCell value={formatDatetime(rawVal as string, 'date')} />

                                case 'CURRENCY':
                                    return (
                                        <WrapOnHoverCell
                                            value={<span className="font-medium text-gray-900">{String(rawVal)}</span>}
                                        />
                                    )

                                case 'NUMBER':
                                    return <WrapOnHoverCell value={String(rawVal)} />

                                default:
                                    return <WrapOnHoverCell value={String(rawVal)} />
                            }
                        },
                    } as Column)
                }
            })
        })

        if (!selectedItem) {
            columns.push(makeActionsColumn(onRowClick));
        }
        return columns
    }, [workflow, onRowClick, selectedItem])
}

function makeActionsColumn(onRowClick?: (row: any, tab: string) => void): Column {
    return {
        className: 'p-1',
        hideHeader: true,
        id: 'actions',
        isDisplayColumn: true,
        label: 'Actions',
        size: 40,
        renderCell: (row: any) => {
            const attachmentCount = Number(row?.attachmentCount ?? 0)
            const commentsCount = Number(row?.commentsCount ?? 0)

            const attachmentsLabel =
                attachmentCount > 0 ? `Attachments (${attachmentCount})` : 'Attachments'
            const commentsLabel =
                commentsCount > 0 ? `Comments (${commentsCount})` : 'Comments'

            return (
                <div className="flex items-center justify-center">
                    <Menu
                        position="bottom-end"
                        width={200}
                        target={<IconButton color="gray" icon="tabler:dots" variant="ghost" />}
                    >
                        <MenuItem
                            icon="tabler:paperclip"
                            label={attachmentsLabel}
                            onClick={() => onRowClick && onRowClick(row, 'Attachments')}
                        />
                        <MenuItem
                            icon="tabler:message-circle"
                            label={commentsLabel}
                            onClick={() => onRowClick && onRowClick(row, 'Comments')}
                        />
                        <MenuItem
                            icon="tabler:history"
                            label="History"
                            onClick={() => onRowClick && onRowClick(row, 'History')}
                        />
                    </Menu>
                </div>
            )
        },
    } as Column
}