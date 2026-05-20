import React, { useMemo } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Request } from '@/types/request'
// ✅ Menu UI
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import RequestStatusBadge from '@/components/common/RequestStatusBadge'
// import SummaryBadge from '@/components/common/SummaryBadge'
// import { generateDummySummary } from '@/pages/requests/utils/dummyData'
// import { motion, AnimatePresence } from 'framer-motion'
// import Icon from '@/components/base/icon/Icon'
// import cn from '@/utils/cn'
import {
  buildTableMeta,
  getFieldKey,
  getFieldLabel,
  isIgnorableField,
  isParentField,
  isTableType,
} from '@/pages/requests/utils/dynamicTable.utils'
import { safeParse } from '@/pages/requests/utils/workflow.utils'
import { formatDatetime } from '@/utils/dayjs'
import type { WorkflowOption } from '../../types'
import DynamicTableCell from './components/DynamicTableCell'
// ✅ Your generic FileSheet (React version)
// import FileSheet from '@/components/common/file-sheet/FileSheet'
// add this import near the top
import FileUploadCell from './components/FileUploadCell'
import WrapOnHoverCell from './components/WrapOnHoverCell'

const LINK_TEXT =
  'transition-colors cursor-pointer font-medium underline hover:text-gray-13 text-14'

const wrap = (content: React.ReactNode) => <WrapOnHoverCell value={content} />

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

const findPONumberInObject = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null

  const extractStringValue = (val: any): string | null => {
    if (val == null) return null
    if (typeof val === 'object') {
      const innerVal =
        val['Invoice Value'] ||
        val['InvoiceValue'] ||
        val['PO Value'] ||
        val['POValue'] ||
        val['value'] ||
        val['val']
      if (innerVal !== undefined) return extractStringValue(innerVal)
      return null
    }
    const str = String(val).trim()
    return str !== '' && str !== '-' && str.toUpperCase() !== 'N/A' ? str : null
  }

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase()
    const isStrictPOKey =
      lowerKey === 'po' ||
      lowerKey === 'po_number' ||
      lowerKey === 'ponumber' ||
      lowerKey === 'po number' ||
      lowerKey === 'purchase_order_number' ||
      lowerKey === 'purchaseorder_number' ||
      lowerKey === 'purchase order number' ||
      lowerKey === 'rxwlghillrremmrqlk9mj' ||
      lowerKey.includes('purchase order')

    if (isStrictPOKey) {
      if (
        !lowerKey.includes('value') &&
        !lowerKey.includes('amount') &&
        !lowerKey.includes('total') &&
        !lowerKey.includes('date') &&
        !lowerKey.includes('price')
      ) {
        const extracted = extractStringValue(obj[key])
        if (extracted && extracted !== '-' && extracted !== '') {
          return extracted
        }
      }
    }
  }

  return null
}

const extractPONumber = (row: any): string => {
  if (!row) return 'N/A'
  const agentData = row._agentData?.[0] || row._agentData || {}

  const fromForm =
    findPONumberInObject(row.formData?.fields) ||
    findPONumberInObject(row.formData)
  if (fromForm) return fromForm

  const fromAgentHeader = findPONumberInObject(
    agentData?.['Extracted Invoice JSON']?.invoice_header,
  )
  if (fromAgentHeader) return fromAgentHeader

  const fromPOMatching = findPONumberInObject(agentData?.po_matching)
  if (fromPOMatching) return fromPOMatching

  const fromAgent = findPONumberInObject(agentData)
  if (fromAgent) return fromAgent

  const fromSelected = findPONumberInObject(row)
  if (fromSelected) return fromSelected

  return 'N/A'
}

const extractDueDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}
  const val =
    row.dueDate ||
    row.due_date ||
    row.payment_terms?.due_date ||
    row.paymentTerms?.due_date ||
    row.paymentTerms?.dueDate ||
    row.formData?.fields?.['Due Date'] ||
    row.formData?.fields?.['due_date'] ||
    row.formData?.fields?.['Due_Date'] ||
    row.formData?.['Due Date'] ||
    row.formData?.['due_date'] ||
    row.formData?.['Due_Date'] ||
    agentData?.payment_terms?.due_date ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['Due Date'] ||
    agentData?.['Extracted Invoice JSON']?.invoice_header?.['due_date'] ||
    agentData?.po_matching?.due_date
  if (!val || val === '-') return '-'
  try {
    return formatDatetime(val as string, 'date')
  } catch {
    return String(val)
  }
}

const extractPaymentTerms = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}

  const termObj = row.payment_terms || row.paymentTerms || {}
  let val =
    typeof termObj === 'object'
      ? termObj.payment_terms ||
        termObj.terms ||
        termObj.payment_term ||
        termObj.term
      : termObj
  if (val && val !== '-') return String(val)

  val = row.terms || row.payment_term || row.paymentTerms
  if (val && typeof val !== 'object' && val !== '-') return String(val)

  val =
    row.formData?.fields?.['Payment Terms'] ||
    row.formData?.fields?.['payment_terms'] ||
    row.formData?.fields?.['Terms'] ||
    row.formData?.fields?.['terms'] ||
    row.formData?.['Payment Terms'] ||
    row.formData?.['payment_terms'] ||
    row.formData?.['Terms'] ||
    row.formData?.['terms']
  if (val && val !== '-') return String(val)

  if (agentData) {
    const agentTermObj = agentData.payment_terms || {}
    val =
      typeof agentTermObj === 'object'
        ? agentTermObj.payment_terms ||
          agentTermObj.terms ||
          agentTermObj.payment_term ||
          agentTermObj.term
        : agentTermObj
    if (val && val !== '-') return String(val)

    const header = agentData['Extracted Invoice JSON']?.invoice_header || {}
    val =
      header['Payment Terms'] ||
      header['payment_terms'] ||
      header['Terms'] ||
      header['terms']
    if (val && val !== '-') return String(val)
  }

  return '-'
}
const extractInvoiceDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}

  // 1. Check dynamic field key 9F6tPVHoRnmONGx3kYJu2 in fields and row
  const fromForm9F =
    row.formData?.fields?.['9F6tPVHoRnmONGx3kYJu2'] ||
    row['9F6tPVHoRnmONGx3kYJu2']
  if (fromForm9F && fromForm9F !== '-') return String(fromForm9F).trim()

  // 2. Check general Invoice Date keys
  const exactKeys = [
    'Invoice Date',
    'invoice_date',
    'invoiceDate',
    'Date',
    'date',
    '9F6tPVHoRnmONGx3kYJu2',
  ]

  const extractVal = (val: any): string | null => {
    if (val == null) return null
    if (typeof val === 'object') {
      const inner =
        val['Invoice Value'] || val['value'] || val['val'] || val['text']
      return inner !== undefined ? String(inner).trim() : null
    }
    return String(val).trim()
  }

  const fields = row.formData?.fields || {}
  for (const key of exactKeys) {
    const v = extractVal(fields[key]) || extractVal(row[key])
    if (v && v !== '-' && v !== '') return v
  }

  // 3. Check agentData Extracted Invoice JSON
  const agentHeader =
    agentData?.['Extracted Invoice JSON']?.invoice_header || {}
  for (const key of exactKeys) {
    const v = extractVal(agentHeader[key])
    if (v && v !== '-' && v !== '') return v
  }

  // 4. Fallback to row.raisedAt or row.transaction_createdAt
  const raisedAt = row.raisedAt || row.transaction_createdAt || row.createdAt
  if (raisedAt) return String(raisedAt)

  return '-'
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
          <div className='flex min-w-0 items-center gap-2'>
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
            {row?.isDuplicateInvoice && (
              <RequestStatusBadge status='Duplicated' />
            )}
          </div>
        ),
        // sortingFn: 'alphanumeric',
      },
      // 2) Dummy Data Columns
      // {
      //   id: 'score',
      //   label: 'Match Score',
      //   size: 220,
      //   renderCell: (row: any) => {
      //     const summary = generateDummySummary(row.id || row.requestNo)
      //     return (
      //       <SummaryBadge
      //         icon={summary.score.icon}
      //         label={summary.score.shortText}
      //         theme={summary.score.theme as any}
      //         variant='outline'
      //       />
      //     )
      //   },
      // },
      // {
      //   id: 'decision',
      //   label: 'Decision',
      //   size: 220,
      //   renderCell: (row: any) => {
      //     const summary = generateDummySummary(row.id || row.requestNo)
      //     return (
      //       <SummaryBadge
      //         icon={summary.decision.icon}
      //         label={summary.decision.badgeText}
      //         theme={summary.decision.theme as any}
      //         variant='outline'
      //       />
      //     )
      //   },
      // },
      // {
      //   id: 'extraction',
      //   label: 'Line Items Matched',
      //   size: 220,
      //   renderCell: (row: any) => {
      //     const summary = generateDummySummary(row.id || row.requestNo)
      //     return (
      //       <SummaryBadge
      //         icon={summary.extraction.icon}
      //         label={summary.extraction.shortText}
      //         theme={summary.extraction.theme as any}
      //         variant='outline'
      //       />
      //     )
      //   },
      // },
      // {
      //   id: 'dueDate',
      //   label: 'Due Date',
      //   size: 220,
      //   renderCell: (row: any) => {
      //     const summary = generateDummySummary(row.id || row.requestNo)
      //     return (
      //       <SummaryBadge
      //         icon={summary.dueDate.icon}
      //         label={summary.dueDate.shortText}
      //         theme={summary.dueDate.theme as any}
      //         variant='outline'
      //       />
      //     )
      //   },
      // },
      ...(selectedItem
        ? [] // If a request is selected, hide all other columns
        : [
            {
              id: 'raisedBy',
              label: 'Raised By',

              size: 200,
              renderCell: (row: any) => (
                <WrapOnHoverCell
                  className='text-gray-600 text-xs'
                  value={row.raisedBy ?? '-'}
                />
              ),
            },
            {
              id: 'raisedAt',
              label: 'Raised On',

              size: 160,
              renderCell: (row: any) => (
                <WrapOnHoverCell
                  className='text-gray-600 text-xs'
                  value={
                    row.raisedAt
                      ? formatDatetime(row.raisedAt as string, 'datetime')
                      : '-'
                  }
                />
              ),
            },
            {
              // moved stage here
              id: 'stage',
              label: 'Stage',
              size: 140,
              renderCell: (row: any) => (
                <div className='min-w-0'>
                  <RequestStatusBadge status={row.stage as Request['status']} />
                </div>
              ),
            },
          ]),
    ]

    const form = resolveFormJson(workflow)
    if (!form) {
      columns.push(makeActionsColumn(onRowClick))
      return columns
    }

    const panels = Array.isArray((form as any).panels)
      ? (form as any).panels
      : []
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
      const controls =
        panel?.controlList || panel?.controllist || panel?.fields || []

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
              let rawVal =
                row[fieldKey] ??
                row.formData?.fields?.[fieldKey] ??
                row.formData?.[fieldKey]

              const lowerLabel = String(label || '').toLowerCase()
              const isPOField =
                lowerLabel.includes('po number') ||
                lowerLabel === 'po' ||
                lowerLabel === 'po_number'
              const isDueDateField =
                lowerLabel.includes('due date') || lowerLabel === 'due_date'
              const isTermsField =
                lowerLabel === 'terms' ||
                lowerLabel.includes('payment terms') ||
                lowerLabel === 'payment_term' ||
                lowerLabel === 'payment_terms'
              const isInvoiceDateField =
                lowerLabel.includes('invoice date') ||
                lowerLabel === 'invoice_date' ||
                fieldKey === '9F6tPVHoRnmONGx3kYJu2'

              if (isPOField) {
                const extracted = extractPONumber(row)
                if (extracted && extracted !== 'N/A') {
                  rawVal = extracted
                }
              } else if (isDueDateField) {
                const extracted = extractDueDate(row)
                if (extracted && extracted !== '-') {
                  rawVal = extracted
                }
              } else if (isTermsField) {
                const extracted = extractPaymentTerms(row)
                if (extracted && extracted !== '-') {
                  rawVal = extracted
                }
              } else if (isInvoiceDateField) {
                const extracted = extractInvoiceDate(row)
                if (extracted && extracted !== '-') {
                  rawVal = extracted
                }
              }

              if (rawVal === undefined || rawVal === null || rawVal === '') {
                return <WrapOnHoverCell value='-' />
              }

              if (isTableType(field.type)) {
                const tableParentId = field?.id
                const colMeta =
                  tableParentId !== undefined && tableParentId !== null
                    ? tableMetaByParentId.get(String(tableParentId))
                    : undefined

                return (
                  <span className='inline-flex items-center'>
                    <DynamicTableCell
                      colMeta={colMeta}
                      modalWidth={900}
                      rawVal={rawVal}
                      safeParse={safeParse}
                      title={String(label)}
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
                  return (
                    <WrapOnHoverCell
                      value={formatDatetime(rawVal as string, 'date')}
                    />
                  )

                case 'CURRENCY':
                  return (
                    <WrapOnHoverCell
                      value={
                        <span className='text-gray-900 font-medium'>
                          {String(rawVal)}
                        </span>
                      }
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
      columns.push(makeActionsColumn(onRowClick))
    }
    return columns
  }, [workflow, onRowClick, selectedItem])
}

function makeActionsColumn(
  onRowClick?: (row: any, tab: string) => void,
): Column {
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
        <div className='flex items-center justify-center'>
          <Menu
            position='bottom-end'
            width={200}
            target={
              <IconButton color='gray' icon='tabler:dots' variant='ghost' />
            }
          >
            <MenuItem
              icon='tabler:paperclip'
              label={attachmentsLabel}
              onClick={() => onRowClick && onRowClick(row, 'Attachments')}
            />
            <MenuItem
              icon='tabler:message-circle'
              label={commentsLabel}
              onClick={() => onRowClick && onRowClick(row, 'Comments')}
            />
            <MenuItem
              icon='tabler:history'
              label='History'
              onClick={() => onRowClick && onRowClick(row, 'History')}
            />
          </Menu>
        </div>
      )
    },
  } as Column
}
