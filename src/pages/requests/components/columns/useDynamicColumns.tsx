import React, { useMemo } from 'react'
import type { Column } from '@/components/base/data-table/types'
import { formatDatetime } from '@/utils/dayjs'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
import { safeParse } from '@/pages/requests/utils/workflow.utils'
import type { WorkflowOption } from '../../types'
import type { Request } from '@/types/request'
import { generateDummySummary } from '@/pages/requests/utils/dummyData'
import SummaryBadge from '@/components/common/SummaryBadge'
// import { motion, AnimatePresence } from 'framer-motion'
// import Icon from '@/components/base/icon/Icon'
// import cn from '@/utils/cn'

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
    'transition-colors cursor-pointer font-medium underline hover:text-gray-13 text-14'

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

// ✅ Local component for summary badges with hover cards
// const SummaryBadgeWithHover = ({ metric }: { metric: any }) => {
//     return (
//         <div className="relative group/icon">
//             <motion.div
//                 whileHover={{ scale: 1.05, y: -1 }}
//                 transition={{ type: 'spring', stiffness: 400, damping: 20 }}
//             >
//                 <SummaryBadge
//                     label={metric.badgeText || metric.shortText}
//                     icon={metric.icon}
//                     theme={metric.theme as any}
//                     variant="outline"
//                     className="cursor-default w-[160px]"
//                 />
//             </motion.div>

//             <AnimatePresence>
//                 <div className="absolute right-0 bottom-full mb-3 opacity-0 invisible group-hover/icon:opacity-100 group-hover/icon:visible transition-all duration-300 z-[100] pointer-events-none translate-y-2 group-hover/icon:translate-y-0">
//                     <motion.div
//                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
//                         whileInView={{ opacity: 1, y: 0, scale: 1 }}
//                         transition={{ type: 'spring', stiffness: 400, damping: 25 }}
//                         className="bg-white rounded-xl border border-[var(--gray-3)] shadow-xl p-4 min-w-[260px] overflow-hidden relative"
//                     >
//                         <div className={cn(
//                             "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -mr-16 -mt-16 pointer-events-none",
//                             metric.theme === 'green' ? 'bg-[var(--green-9)]' :
//                                 metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
//                                     metric.theme === 'red' ? 'bg-[var(--red-9)]' :
//                                         'bg-[var(--blue-9)]'
//                         )} />

//                         <div className="flex items-start justify-between mb-4 relative z-10">
//                             <div className="flex items-center gap-3">
//                                 <div className={cn(
//                                     "p-2 rounded-lg",
//                                     metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)]' :
//                                         metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)]' :
//                                             metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)]' :
//                                                 'bg-[var(--blue-2)] text-[var(--blue-11)]'
//                                 )}>
//                                     <Icon name={metric.icon} className="size-5" />
//                                 </div>
//                                 <div className="font-semibold text-[var(--gray-12)] text-13">
//                                     {metric.label}
//                                 </div>
//                             </div>
//                             <div className={cn(
//                                 "px-2 py-0.5 rounded-full text-11 font-medium border",
//                                 metric.theme === 'green' ? 'bg-[var(--green-2)] text-[var(--green-11)] border-[var(--green-4)]' :
//                                     metric.theme === 'orange' ? 'bg-[var(--orange-2)] text-[var(--orange-11)] border-[var(--orange-4)]' :
//                                         metric.theme === 'red' ? 'bg-[var(--red-2)] text-[var(--red-11)] border-[var(--red-4)]' :
//                                             'bg-[var(--blue-2)] text-[var(--blue-11)] border-[var(--blue-4)]'
//                             )}>
//                                 {metric.status}
//                             </div>
//                         </div>

//                         <div className="mb-4 relative z-10">
//                             <h4 className="text-24 font-bold text-[var(--gray-12)] tracking-tight">
//                                 {metric.value}
//                             </h4>
//                         </div>

//                         <div className="flex items-end justify-between relative z-10">
//                             <div className="flex flex-col gap-1.5 flex-1 mr-4">
//                                 <div className="flex items-center gap-1.5 text-[var(--gray-10)]">
//                                     <span className="text-12 font-medium">{metric.description}</span>
//                                     {metric.theme === 'red' && <Icon name="tabler:exclamation-circle" className="size-4 text-[var(--red-9)]" />}
//                                 </div>
//                                 <div className="h-1.5 w-full bg-[var(--gray-3)] rounded-full overflow-hidden">
//                                     <motion.div
//                                         initial={{ width: 0 }}
//                                         whileInView={{ width: `${metric.pct}%` }}
//                                         transition={{ duration: 0.5, delay: 0.1 }}
//                                         className={cn(
//                                             'h-full rounded-full',
//                                             metric.theme === 'green' ? 'bg-[var(--green-9)]' :
//                                                 metric.theme === 'orange' ? 'bg-[var(--orange-9)]' :
//                                                     metric.theme === 'red' ? 'bg-[var(--red-9)]' :
//                                                         'bg-[var(--blue-9)]'
//                                         )}
//                                     />
//                                 </div>
//                             </div>
//                             <motion.div
//                                 whileHover={{ x: 3 }}
//                                 className="flex items-center justify-center p-1.5 rounded-full bg-[var(--gray-2)] text-[var(--gray-10)]"
//                             >
//                                 <Icon name="tabler:chevron-right" className="size-4" />
//                             </motion.div>
//                         </div>
//                     </motion.div>
//                 </div>
//             </AnimatePresence>
//         </div>
//     )
// }

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

                const fieldKey = getFieldKey(field) // Uses encrypted jsonId if available
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