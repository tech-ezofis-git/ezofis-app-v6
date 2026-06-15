/* eslint-disable @typescript-eslint/no-explicit-any */
import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core'
import {
  CreditCard,
  FileText,
  HistoryIcon,
  Layers,
  ListFilter,
  MessageCircle,
  Package,
  Paperclip,
  Plus,
  Store,
  Trash2,
  Wallet,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import BarLoader from '@/components/base/BarLoader'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import { useAttachments } from '@/pages/requests/hooks/useAttachments'
import { useComments } from '@/pages/requests/hooks/useComments'
import requestStore from '@/pages/requests/stores/useRequestStore'
import '@react-pdf-viewer/core/lib/styles/index.css'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { buildFieldMetaMap } from '../../../Request'
import Attachments from '../attachment/Attachments'
import Comments from '../comment/Comments'
import History from '../history/History'

// --- Helpers ---

const getStatusStyles = (statusType: string) => {
  switch (statusType) {
    case 'success':
      return 'bg-[var(--green-1)] text-[var(--green-9)]'
    case 'warning':
      return 'bg-[var(--orange-1)] text-[var(--orange-9)]'
    default:
      return 'bg-[var(--gray-1)] text-[var(--gray-11)]'
  }
}

const getStatusBorderStyles = (statusType: string) => {
  switch (statusType) {
    case 'success':
      return 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
    case 'warning':
      return 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
    default:
      return 'border-[var(--gray-3)] bg-[var(--gray-1)] text-[var(--gray-11)]'
  }
}

const updateValueInStructure = (obj: any, pathKey: string, val: any) => {
  if (
    obj[pathKey] &&
    typeof obj[pathKey] === 'object' &&
    'Invoice Value' in obj[pathKey]
  ) {
    obj[pathKey] = { ...obj[pathKey], 'Invoice Value': val }
  } else {
    obj[pathKey] = val
  }
}

const getRawVal = (obj: any, pathKey: string) => {
  if (
    obj[pathKey] &&
    typeof obj[pathKey] === 'object' &&
    'Invoice Value' in obj[pathKey]
  ) {
    return obj[pathKey]['Invoice Value']
  }
  return obj[pathKey]
}

const cleanKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('number', 'no')
    .replace('num', 'no')
    .replace('amt', 'amount')
    .replace('val', 'value')

const matchKeysLoosely = (key1: string, key2: string): boolean => {
  return cleanKey(key1) === cleanKey(key2)
}

const getFieldMatch = (key: string, sideBySideFields: any[]) => {
  if (!sideBySideFields || !Array.isArray(sideBySideFields)) return null

  const k = cleanKey(key)

  // 1. Exact clean match
  let match = sideBySideFields.find((f: any) => cleanKey(f.Field || '') === k)
  if (match) return match

  // 2. Specific close alias mapping
  const mappings: Record<string, string[]> = {
    currency: ['currency'],
    invoiceamount: [
      'totaldue',
      'invoiceamount',
      'totalamount',
      'amount',
      'total_due',
    ],
    ponumber: ['ponumber', 'pono', 'purchaseorder'],
    suppliername: ['suppliername', 'vendorname', 'supplier', 'vendor'],
    totaldue: [
      'totaldue',
      'invoiceamount',
      'totalamount',
      'amount',
      'total_due',
    ],
    vendorname: ['suppliername', 'vendorname', 'supplier', 'vendor'],
  }

  const targets = mappings[k]
  if (targets) {
    match = sideBySideFields.find((f: any) => {
      const fk = cleanKey(f.Field || '')
      return targets.includes(fk)
    })
    if (match) return match
  }

  return null
}

const getLineItemAmount = (item: any): any => {
  return item.Amount?.['Invoice Value'] ?? item.total ?? item.amount ?? 0
}

const FIELD_KEYS_MAP: Record<string, string[]> = {
  amount: ['Amount', 'total', 'amount'],
  description: ['Description', 'description'],
  price: ['Price', 'rate', 'unit_price'],
  quantity: ['Quantity', 'quantity'],
}

const updateItemField = (item: any, fieldKey: string, value: any) => {
  const fields = FIELD_KEYS_MAP[fieldKey]
  if (!fields) return
  for (const key of fields) {
    if (key in item) {
      updateValueInStructure(item, key, value)
    }
  }
}

const recalculateItemAmount = (item: any) => {
  const qtyVal = item.Quantity?.['Invoice Value'] ?? item.quantity
  const priceVal = item.Price?.['Invoice Value'] ?? item.rate ?? item.unit_price

  const qtyNum = Number.parseFloat(String(qtyVal).replace(/[^0-9.-]+/g, ''))
  const priceNum = Number.parseFloat(String(priceVal).replace(/[^0-9.-]+/g, ''))

  if (!Number.isNaN(qtyNum) && !Number.isNaN(priceNum)) {
    const calculatedAmount = qtyNum * priceNum
    const formattedAmount = calculatedAmount.toFixed(2)
    if ('Amount' in item)
      updateValueInStructure(item, 'Amount', formattedAmount)
    if ('total' in item) updateValueInStructure(item, 'total', formattedAmount)
    if ('amount' in item)
      updateValueInStructure(item, 'amount', formattedAmount)
  }
}

const getMimeTypeFromBase64 = (base64: string): string => {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  return 'application/pdf'
}

const formatBase64Url = (base64: string, mimeType: string): string => {
  return base64.startsWith('data:')
    ? base64
    : `data:${mimeType};base64,${base64}`
}

// --- Components ---

const AnalysisCard = ({
  icon: Icon,
  isLoading = false,
  status,
  statusType = 'success',
  title,
  value,
}: any) => (
  <div className='flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-[var(--gray-3)] bg-surface p-2.5 transition-colors hover:bg-[var(--gray-1)]'>
    <div className='flex items-center justify-between'>
      <div
        className={cn(
          'shrink-0 rounded p-1.5 transition-colors',
          getStatusStyles(statusType),
        )}
      >
        <Icon className='h-3.5 w-3.5' />
      </div>
      {isLoading ? (
        <div className='h-5 w-14 animate-pulse rounded bg-[var(--gray-3)]' />
      ) : (
        <div
          className={cn(
            'shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-semibold',
            getStatusBorderStyles(statusType),
          )}
        >
          {status}
        </div>
      )}
    </div>
    <div className='mt-0.5 flex min-w-0 flex-col gap-0.5'>
      <span className='text-[11px] leading-none font-semibold tracking-tight text-[var(--gray-11)]'>
        {title}
      </span>
      {isLoading ? (
        <div className='mt-1 h-4 w-24 animate-pulse rounded bg-[var(--gray-3)]' />
      ) : (
        <span
          className='text-[13px] leading-tight font-semibold text-[var(--gray-13)]'
          title={value}
        >
          {value || '---'}
        </span>
      )}
    </div>
  </div>
)

const getRecommendationMeta = (rec?: string) => {
  const r = String(rec || '').toUpperCase()
  if (r === 'APPROVE_TRANSACTION' || r === 'APPROVE') {
    return {
      bg: 'bg-[var(--green-1)]/50',
      chip: 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]',
      icon: 'tabler:check',
      label: 'Approve',
    }
  }
  if (r === 'REJECT_TRANSACTION' || r === 'REJECT') {
    return {
      bg: 'bg-[var(--red-1)]/50',
      chip: 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
      icon: 'tabler:x',
      label: 'Reject Transaction',
    }
  }
  return {
    bg: 'bg-[var(--gray-1)]/50',
    chip: 'border-[var(--gray-3)] bg-[var(--gray-1)] text-[var(--gray-11)]',
    icon: 'tabler:dots',
    label: 'No Action',
  }
}

const BackOrderCard = ({
  backOrder,
  isLoading,
  onClick,
}: {
  backOrder: any
  isLoading?: boolean
  onClick: () => void
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const missingCount = backOrder?.missing_qty_by_item?.length || 0
  const recommendation = backOrder?.recommendation || 'NO_ACTION'
  const recMeta = getRecommendationMeta(recommendation)

  return (
    <div
      className='relative flex min-w-0 flex-1 cursor-pointer flex-col gap-1.5 rounded-xl border border-[var(--orange-3)] bg-[var(--orange-1)]/30 p-2.5 transition-all hover:bg-[var(--orange-1)]/50'
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className='flex items-center justify-between'>
        <div className='shrink-0 rounded bg-[var(--orange-2)] p-1.5 text-[var(--orange-9)]'>
          <Icon className='h-3.5 w-3.5' name='tabler:truck-delivery' />
        </div>
        {isLoading ? (
          <div className='h-5 w-14 animate-pulse rounded bg-[var(--orange-3)]' />
        ) : (
          <div className='shrink-0 rounded-md border border-[var(--orange-3)] bg-[var(--orange-1)] px-2 py-0.5 text-[9px] font-semibold text-[var(--orange-10)]'>
            Shortage Risk
          </div>
        )}
      </div>
      <div className='mt-0.5 flex min-w-0 flex-col gap-0.5'>
        <span className='text-[11px] leading-none font-semibold tracking-tight text-[var(--orange-10)]'>
          Back Order Detected
        </span>
        {isLoading ? (
          <div className='mt-1 h-4 w-24 animate-pulse rounded bg-[var(--orange-3)]' />
        ) : (
          <span className='text-[13px] leading-tight font-semibold text-[var(--orange-11)]'>
            {missingCount} item{missingCount !== 1 ? 's' : ''} short
          </span>
        )}
      </div>

      {/* Hover reason popup */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className='absolute top-full left-0 z-[100] mt-2 w-[280px] rounded-xl border border-[var(--orange-3)] bg-surface p-3 shadow-xl backdrop-blur-md'
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-1.5 border-b border-[var(--gray-2)] pb-1.5'>
                <Icon
                  className='h-4 w-4 animate-pulse text-[var(--orange-9)]'
                  name='tabler:alert-triangle'
                />
                <span className='text-[12px] font-bold text-[var(--gray-13)]'>
                  Back Order Recommendation
                </span>
              </div>
              <div className='flex flex-col gap-1.5 text-left'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-[10px] font-semibold text-[var(--gray-11)]'>
                    Recommendation:
                  </span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] font-bold',
                      recMeta.chip,
                    )}
                  >
                    {recMeta.label}
                  </span>
                </div>
                <p className='text-[11px] leading-relaxed text-[var(--gray-12)]'>
                  Orchestrator flagged shortage risk on {missingCount} line item
                  {missingCount !== 1 ? 's' : ''}. Verification matching is
                  below threshold.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const FormCard = ({
  highlight = false,
  icon: Icon,
  label,
  matchScore,
  options = [],
  poValue,
  type = 'text',
  value,
  onChange,
}: any) => {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      onChange?.(localValue)
    }
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleBlur()
    if (e.key === 'Escape') {
      setLocalValue(value)
      setIsEditing(false)
    }
  }

  let inputElement = null
  if (type === 'date') {
    inputElement = (
      <InputDate
        className='w-full font-semibold'
        value={localValue}
        onChange={(val: any) => setLocalValue(val)}
      />
    )
  } else if (type === 'dropdown') {
    inputElement = (
      <InputSelect
        className='w-full font-semibold'
        options={options}
        value={localValue}
        onChange={(val: any) => {
          setLocalValue(val)
          setTimeout(handleBlur, 0)
        }}
      />
    )
  } else {
    inputElement = (
      <input
        className='w-full border-none bg-transparent p-0 text-[13px] font-semibold text-[var(--gray-13)] placeholder:font-normal focus:ring-0 focus:outline-none'
        placeholder={`Enter ${label}...`}
        type='text'
        value={localValue === '-' ? '' : localValue}
        autoFocus
        onBlur={handleBlur}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    )
  }

  if (isEditing) {
    return (
      <div
        className={cn(
          'group flex items-start gap-3 rounded-lg border border-[var(--primary-3)] bg-surface p-3 shadow-sm ring-1 ring-[var(--primary-3)]/20',
        )}
      >
        <div
          className={cn(
            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)] transition-colors group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]',
            highlight && 'bg-[var(--green-9)]/10 text-[var(--green-9)]',
          )}
        >
          <Icon className='h-3.5 w-3.5' />
        </div>
        <div className='min-w-0 flex-1'>
          <p className='mb-0.5 text-[10px] font-semibold text-[var(--gray-11)]'>
            {label}
          </p>
          <div className='animate-in fade-in zoom-in-95 duration-200'>
            {inputElement}
            {matchScore !== undefined && (
              <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                {matchScore === 100 ? (
                  <span className='inline-flex items-center gap-1 rounded border border-[var(--green-3)] bg-[var(--green-1)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[var(--green-9)] uppercase'>
                    ✓ PO Match
                  </span>
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase',
                      matchScore >= 50
                        ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                        : 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
                    )}
                  >
                    ⚠ PO: {poValue || 'N/A'} ({matchScore}% match)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type='button'
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-none border-transparent bg-transparent p-3 text-left transition-all hover:border-[var(--gray-3)] hover:bg-surface hover:shadow-sm focus:ring-1 focus:ring-[var(--primary-3)]/50 focus:outline-none',
      )}
      onClick={() => setIsEditing(true)}
    >
      <div
        className={cn(
          'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)] transition-colors group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]',
          highlight && 'bg-[var(--green-9)]/10 text-[var(--green-9)]',
        )}
      >
        <Icon className='h-3.5 w-3.5' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='mb-0.5 text-[10px] font-semibold text-[var(--gray-11)]'>
          {label}
        </p>
        <p
          className={cn(
            'text-[13px] leading-tight font-semibold text-[var(--gray-13)] transition-colors group-hover:text-[var(--primary-9)]',
            highlight && 'text-[var(--green-9)]',
            value === '-' && 'font-medium text-[var(--gray-9)]',
          )}
        >
          {value}
        </p>
        {matchScore !== undefined && (
          <div className='mt-1 flex flex-wrap items-center gap-1.5'>
            {matchScore === 100 ? (
              <span className='inline-flex items-center gap-1 rounded border border-[var(--green-3)] bg-[var(--green-1)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[var(--green-9)] uppercase'>
                ✓ PO Match
              </span>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase',
                  matchScore >= 50
                    ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                    : 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
                )}
              >
                ⚠ PO: {poValue || 'N/A'} ({matchScore}% match)
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

const SummarySkeleton = () => (
  <div className='flex-1 animate-pulse space-y-6 overflow-y-auto px-4 pb-8'>
    <div className='space-y-5 rounded-xl border border-[var(--gray-3)]/10 bg-surface p-6 shadow-sm'>
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-4'>
          <div className='h-12 w-12 rounded-xl bg-[var(--gray-2)]' />
          <div className='space-y-2'>
            <div className='h-3 w-24 rounded bg-[var(--gray-2)]' />
            <div className='h-5 w-40 rounded bg-[var(--gray-2)]' />
          </div>
        </div>
        <div className='h-7 w-20 rounded-full bg-[var(--gray-2)]' />
      </div>
      <div className='h-20 w-full rounded-xl bg-[var(--gray-1)]' />
    </div>
    <div className='grid grid-cols-2 gap-4'>
      {[1, 2, 3, 4].map((i) => (
        <div
          className='space-y-3 rounded-xl border border-[var(--gray-3)]/10 bg-surface p-4'
          key={i}
        >
          <div className='h-3 w-16 rounded bg-[var(--gray-2)]' />
          <div className='h-5 w-28 rounded bg-[var(--gray-2)]' />
        </div>
      ))}
    </div>
  </div>
)

// --- Main App ---

const Overview = (props: any) => {
  const {
    agentData,
    allowedLabels,
    formDefinition,
    formModel,
    isProcessing,
    processId,
    repositoryId,
    selectedItem,
    selectedWorkflow,
    transactionId,
    workflowId,
    setFormModel,
  } = props

  // Mock backorder data for design preview
  const mockBackOrder = useMemo(
    () => ({
      detected: true,
      missing_qty_by_item: [
        {
          amount: 573.0,
          description: 'Phone (Shortage)',
          invoice_qty: 7,
          po_line_id: 'POL-1002-4',
          po_qty: 10,
          price: 191.0,
          reason: 'BACKORDER',
          remaining: 3,
        },
        {
          amount: 300.0,
          description: 'Router (Shortage)',
          invoice_qty: 4,
          po_line_id: 'POL-1002-1',
          po_qty: 6,
          price: 150.0,
          reason: 'BACKORDER',
          remaining: 2,
        },
      ],
      recommendation: 'REJECT_TRANSACTION',
    }),
    [],
  )

  const backOrder = useMemo(() => {
    return agentData?.back_order || agentData?.backorder || mockBackOrder
  }, [agentData, mockBackOrder])

  const hasBackOrder =
    !!backOrder &&
    backOrder.detected === true &&
    (backOrder.missing_qty_by_item?.length ?? 0) > 0

  const processingProcesses = requestStore((state) => state.processingProcesses)
  const matchingProc = useMemo(() => {
    return processingProcesses.find(
      (p) =>
        String(p.processId || p.id) ===
        String(selectedItem?.processId || selectedItem?.id),
    )
  }, [processingProcesses, selectedItem])

  const isCurrentlyProcessing =
    isProcessing !== undefined
      ? isProcessing
      : !!matchingProc || selectedItem?.isProcessing

  const [activeTab, setActiveTab] = useState(
    hasBackOrder ? 'back_order' : 'summary',
  )
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const { data: attachmentData } = useAttachments(workflowId, processId, true)
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useComments(workflowId, processId, true)

  const [lineItems, setLineItems] = useState<any[]>([])

  const tableFieldKey = useMemo(() => {
    const metaMap = buildFieldMetaMap(selectedWorkflow, formDefinition)
    const foundEntry = Object.entries(formModel || {}).find(([key, _]) => {
      const meta = Array.from(metaMap.values()).find((m) => m.label === key)
      if (meta) {
        const type = String(meta.type).toUpperCase()
        return type === 'TABLE' || type === 'DYNAMIC_TABLE'
      }
      return false
    })
    return foundEntry ? foundEntry[0] : null
  }, [formModel, selectedWorkflow, formDefinition])

  const rawLineItems = useMemo(() => {
    if (
      tableFieldKey &&
      Array.isArray(formModel[tableFieldKey]) &&
      formModel[tableFieldKey].length > 0
    ) {
      return formModel[tableFieldKey]
    }
    return (
      agentData?.debug?.['Side-by-side Line Item matching'] ||
      agentData?.line_items ||
      agentData?.['Extracted Invoice JSON']?.invoice_items ||
      []
    )
  }, [agentData, formModel, tableFieldKey])

  useEffect(() => {
    if (rawLineItems && rawLineItems.length > 0) {
      const cloned = structuredClone(rawLineItems)
      let counter = 0
      const formatted = cloned.map((item: any) => {
        if (!item._id) {
          item._id = `li-${Date.now()}-${counter++}`
        }

        const formatVal2Dec = (val: any) => {
          if (val === undefined || val === null || val === '') return ''
          const num = Number.parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
          return Number.isNaN(num) ? val : num.toFixed(2)
        }

        // Format Price/Rate
        if ('Price' in item)
          updateValueInStructure(
            item,
            'Price',
            formatVal2Dec(getRawVal(item, 'Price')),
          )
        if ('rate' in item)
          updateValueInStructure(
            item,
            'rate',
            formatVal2Dec(getRawVal(item, 'rate')),
          )
        if ('unit_price' in item)
          updateValueInStructure(
            item,
            'unit_price',
            formatVal2Dec(getRawVal(item, 'unit_price')),
          )

        // Format Amount
        if ('Amount' in item)
          updateValueInStructure(
            item,
            'Amount',
            formatVal2Dec(getRawVal(item, 'Amount')),
          )
        if ('total' in item)
          updateValueInStructure(
            item,
            'total',
            formatVal2Dec(getRawVal(item, 'total')),
          )
        if ('amount' in item)
          updateValueInStructure(
            item,
            'amount',
            formatVal2Dec(getRawVal(item, 'amount')),
          )

        return item
      })
      setLineItems(formatted)
    } else {
      setLineItems([])
    }
  }, [rawLineItems])

  const syncLineItemsToFormModel = (updatedItems: any[]) => {
    const sanitizeItems = (items: any[]) => {
      return items.map(({ _id, ...rest }) => rest)
    }
    const sanitized = sanitizeItems(updatedItems)
    const newGrandTotal = sanitized.reduce((sum: number, it: any) => {
      const val = getLineItemAmount(it)
      const num = Number.parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
      return sum + (Number.isNaN(num) ? 0 : num)
    }, 0)

    setFormModel?.((prevForm: any) => {
      const nextForm = { ...prevForm }

      if (agentData?.debug?.['Side-by-side Line Item matching']) {
        if (!nextForm.debug) nextForm.debug = { ...agentData.debug }
        nextForm.debug['Side-by-side Line Item matching'] = sanitized
      }
      if (agentData?.line_items) {
        nextForm.line_items = sanitized
      }
      if (agentData?.['Extracted Invoice JSON']?.invoice_items) {
        if (!nextForm['Extracted Invoice JSON']) {
          nextForm['Extracted Invoice JSON'] = {
            ...agentData['Extracted Invoice JSON'],
          }
        }
        nextForm['Extracted Invoice JSON'].invoice_items = sanitized
      }

      if (tableFieldKey) {
        nextForm[tableFieldKey] = sanitized
      }

      const formattedGrandTotal = newGrandTotal.toFixed(2)

      Object.keys(nextForm).forEach((k) => {
        const lk = k.toLowerCase()
        if (
          lk === 'invoice amount' ||
          lk === 'invoice_amount' ||
          lk === 'total due' ||
          lk === 'total_due' ||
          lk === 'total' ||
          lk === 'total_amount'
        ) {
          nextForm[k] = formattedGrandTotal
        }
      })

      return nextForm
    })
  }

  const handleLineItemChange = (
    index: number,
    fieldKey: string,
    value: any,
  ) => {
    setLineItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }

      updateItemField(item, fieldKey, value)

      // Automatically recalculate amount if quantity or price changed
      if (fieldKey === 'quantity' || fieldKey === 'price') {
        recalculateItemAmount(item)
      }

      updated[index] = item
      syncLineItemsToFormModel(updated)
      return updated
    })
  }

  const handleAddItem = () => {
    const newItem = {
      _id: `li-${Date.now()}-${Math.random()}`,
      Amount: { 'Invoice Value': '' },
      amount: '',
      Description: { 'Invoice Value': '' },
      description: '',
      Price: { 'Invoice Value': '' },
      Quantity: { 'Invoice Value': '' },
      quantity: '',
      rate: '',
      total: '',
      unit_price: '',
    }

    setLineItems((prev) => {
      const updated = [...prev, newItem]
      syncLineItemsToFormModel(updated)
      return updated
    })
  }

  const handleRemoveItem = (indexToRemove: number) => {
    setLineItems((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove)
      syncLineItemsToFormModel(updated)
      return updated
    })
  }

  const { session } = authUserStore.getState()
  const tenantId = session?.tenantId
  const userId = session?.id

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<string | null>(null)
  const [isViewerLoading, setIsViewerLoading] = useState(false)
  const [scale, setScale] = useState(1)
  const viewerRef = useRef<any>(null)

  const toolbarPluginInstance = useMemo(
    () => ({
      install: (pluginFunctions: any) => {
        viewerRef.current = pluginFunctions
      },
      onZoom: (e: any) => {
        setScale(e.scale)
      },
    }),
    [],
  )

  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header

  useEffect(() => {
    if (invoiceHeader) {
      setFormModel?.((prev: any) => {
        const merged = { ...prev }

        for (const key of Object.keys(invoiceHeader)) {
          const existingKey = Object.keys(prev).find((k) =>
            matchKeysLoosely(k, key),
          )
          if (existingKey) {
            const val = prev[existingKey]
            if (!val || val === '-' || val === '') {
              merged[existingKey] = invoiceHeader[key]
            }
          }
        }
        return merged
      })
    }
  }, [invoiceHeader, setFormModel])

  useEffect(() => {
    // Reset viewer state when request changes
    setSelectedFile(null)
    setPreviewUrl(null)
    setActiveTab(hasBackOrder ? 'back_order' : 'summary')
  }, [processId, transactionId, hasBackOrder])

  useEffect(() => {
    if (attachmentData && attachmentData.length > 0 && !selectedFile) {
      setSelectedFile(attachmentData[0])
    }
  }, [attachmentData, selectedFile])

  useEffect(() => {
    let activeUrl: string | null = null
    const fetchFile = async () => {
      const localUrl =
        selectedFile?._localFileUrl ||
        selectedItem?._localFileUrl ||
        selectedFile?.localUrl ||
        selectedItem?.localUrl
      if (localUrl) {
        setPreviewUrl(localUrl)
        setFileType(
          selectedFile?.type || selectedItem?.type || 'application/pdf',
        )
        setIsViewerLoading(false)
        return
      }

      const repoId = String(
        selectedFile?.repositoryId ||
          selectedItem?.repositoryId ||
          repositoryId ||
          '',
      ).trim()
      const itemId = String(
        selectedFile?.id || selectedItem?.itemId || '',
      ).trim()

      if (
        !repoId ||
        !itemId ||
        repoId === 'undefined' ||
        itemId === 'undefined'
      )
        return

      setIsViewerLoading(true)
      try {
        const isUuid = (val: string) =>
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            val,
          )

        if (isUuid(repoId) && isUuid(itemId)) {
          const response = await fileApi.viewBinaryV6(repoId, itemId)
          if (response?.data instanceof Blob) {
            const mimeType = response.data.type || 'application/pdf'
            const url = URL.createObjectURL(response.data)
            activeUrl = url
            setPreviewUrl(url)
            setFileType(mimeType)
          }
        } else {
          const rId = Number(repoId)
          if (!Number.isNaN(rId) && rId > 0) {
            const tId = tenantId ? Number(tenantId) : 2
            const uId = userId ? String(userId) : '2'
            const response = await fileApi.viewBinary(
              tId,
              uId,
              rId,
              Number(itemId) || selectedFile?.id,
              2,
            )

            const base64 = response?.data?.file || response?.data
            if (typeof base64 === 'string') {
              const mimeType = getMimeTypeFromBase64(base64)
              const url = formatBase64Url(base64, mimeType)
              setPreviewUrl(url)
              setFileType(mimeType)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching file:', error)
      } finally {
        setIsViewerLoading(false)
      }
    }
    fetchFile()
    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl)
      }
    }
  }, [selectedFile, repositoryId, selectedItem, tenantId, userId])

  const handleFieldChange = (key: string, value: string) => {
    setFormModel?.((prev: any) => ({ ...prev, [key]: value }))
  }

  const getFieldType = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('date')) return 'date'
    if (l.includes('currency') || l.includes('status')) return 'dropdown'
    return 'text'
  }

  const getOptions = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('currency'))
      return [
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' },
        { label: 'GBP', value: 'GBP' },
        { label: 'INR', value: 'INR' },
        { label: 'AED', value: 'AED' },
      ]
    return []
  }

  const getFieldIcon = (label: string) => {
    const l = label.toLowerCase()
    if (l.includes('supplier') || l.includes('vendor')) return Store
    if (l.includes('invoice') || l.includes('number')) return ListFilter
    if (l.includes('date')) return HistoryIcon
    if (l.includes('total') || l.includes('amount') || l.includes('value'))
      return Wallet
    if (l.includes('currency')) return CreditCard
    return FileText
  }

  let previewContent = null
  if (previewUrl) {
    if (fileType === 'application/pdf') {
      previewContent = (
        <Worker workerUrl='https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js'>
          <div className='group relative h-full w-full overflow-hidden'>
            <Viewer
              defaultScale={SpecialZoomLevel.PageWidth}
              fileUrl={previewUrl}
              plugins={[toolbarPluginInstance]}
            />
            <div className='absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-[var(--gray-3)] bg-surface/90 px-4 py-2 opacity-0 shadow-2xl backdrop-blur-sm transition-all duration-300 group-hover:opacity-100'>
              <button
                className='p-1 hover:text-[var(--primary-9)]'
                onClick={() => viewerRef.current?.zoom(scale - 0.1)}
              >
                <Icon className='size-5' name='lucide:zoom-out' />
              </button>
              <span className='min-w-[40px] text-center text-[12px] font-semibold'>
                {Math.round(scale * 100)}%
              </span>
              <button
                className='p-1 hover:text-[var(--primary-9)]'
                onClick={() => viewerRef.current?.zoom(scale + 0.1)}
              >
                <Icon className='size-5' name='lucide:zoom-in' />
              </button>
            </div>
          </div>
        </Worker>
      )
    } else {
      previewContent = (
        <div className='flex h-full w-full items-center justify-center p-4'>
          <img
            alt='Preview'
            className='max-h-full max-w-full rounded-xl border object-contain shadow-2xl'
            src={previewUrl}
          />
        </div>
      )
    }
  } else if (!isViewerLoading) {
    previewContent = (
      <div className='flex h-full flex-col items-center justify-center p-6 text-center'>
        <Icon
          className='mb-4 size-12 text-[var(--gray-4)]'
          name='tabler:file-off'
        />
        <p className='text-[15px] font-semibold text-[var(--gray-11)]'>
          No document preview available
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden font-sans'>
      <div className='flex min-h-0 flex-1 overflow-hidden'>
        {/* Left Side - Document Viewer (40% Width) */}
        <div className='relative flex w-[40%] flex-col overflow-hidden border-r border-[var(--gray-3)]'>
          {isViewerLoading && (
            <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--gray-1)]'>
              <BarLoader />
              <p className='text-xs font-bold tracking-widest text-[var(--gray-10)] uppercase'>
                Loading Preview...
              </p>
            </div>
          )}

          {previewContent}
        </div>

        {/* Right Side - Analysis & Data (60% Width) */}
        <div className='flex flex-1 flex-col bg-[var(--gray-1)]'>
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            {!selectedItem || Object.keys(selectedItem).length === 0 ? (
              <SummarySkeleton />
            ) : (
              <div className='flex h-full flex-col overflow-hidden'>
                <div className='shrink-0 space-y-4 p-4'>
                  {(() => {
                    const poVal =
                      formModel?.['PO Number'] ||
                      formModel?.['PO No'] ||
                      formModel?.['po_number'] ||
                      formModel?.['poNumber'] ||
                      formModel?.['po_no'] ||
                      formModel?.['pono'] ||
                      formModel?.['Purchase Order'] ||
                      formModel?.['RXwLGHILLrreMmRqlk9mj']
                    const poCard = (
                      <AnalysisCard
                        icon={Paperclip}
                        isLoading={isCurrentlyProcessing}
                        title='PO Matching'
                        status={
                          poVal && poVal !== '-' && poVal !== 'N/A'
                            ? 'Matched'
                            : 'Not Matched'
                        }
                        statusType={
                          poVal && poVal !== '-' && poVal !== 'N/A'
                            ? 'success'
                            : 'warning'
                        }
                        value={
                          poVal && poVal !== '-' && poVal !== 'N/A'
                            ? `${poVal}`
                            : 'No PO Found'
                        }
                      />
                    )

                    const duplicateCard = (
                      <AnalysisCard
                        icon={Layers}
                        isLoading={isCurrentlyProcessing}
                        title='Duplicate Detection'
                        status={
                          agentData?.duplicate_check?.status || 'No Duplicate'
                        }
                        statusType={
                          agentData?.duplicate_check?.status === 'Duplicate'
                            ? 'warning'
                            : 'success'
                        }
                        value={
                          agentData?.duplicate_check?.message ||
                          'No duplicates detected'
                        }
                      />
                    )

                    const glDetails = agentData?.gl_matching?.account || ''
                    const glCard = (
                      <AnalysisCard
                        icon={ListFilter}
                        isLoading={isCurrentlyProcessing}
                        status={agentData?.gl_matching?.status || 'Matched'}
                        statusType='success'
                        title='GL Account Matching'
                        value={glDetails}
                      />
                    )

                    const supplierDetails =
                      formModel?.['Supplier ID'] ||
                      formModel?.['SupplierCode'] ||
                      formModel?.['Supplier Code'] ||
                      formModel?.['supplier_id'] ||
                      formModel?.['Vendor ID'] ||
                      formModel?.['vendor_id'] ||
                      ''

                    const supplierCard = (
                      <AnalysisCard
                        icon={Store}
                        isLoading={isCurrentlyProcessing}
                        status={supplierDetails ? 'Verified' : 'Not Verified'}
                        statusType='success'
                        title='Supplier Verification'
                        value={supplierDetails}
                      />
                    )

                    const backOrderCard = (
                      <BackOrderCard
                        backOrder={backOrder}
                        isLoading={isCurrentlyProcessing}
                        onClick={() => setActiveTab('back_order')}
                      />
                    )

                    const cardsToRender = []
                    cardsToRender.push(poCard)
                    cardsToRender.push(duplicateCard)

                    const otherCards = []
                    if (glDetails) {
                      otherCards.push(glCard)
                    }
                    if (supplierDetails) {
                      otherCards.push(supplierCard)
                    }
                    if (hasBackOrder) {
                      otherCards.push(backOrderCard)
                    }

                    // Fill remaining slots up to 4 total cards with extra summary cards from JSON if we have space!
                    if (otherCards.length < 2) {
                      if (agentData?.payment_terms?.raw) {
                        const termsMeta = agentData.payment_terms
                        const termsStatus = termsMeta.normalized?.net_days
                          ? `Net ${termsMeta.normalized.net_days}`
                          : 'Terms'
                        const termsValue = termsMeta.due_date
                          ? `Due ${termsMeta.due_date}`
                          : termsMeta.raw
                        otherCards.push(
                          <AnalysisCard
                            icon={CreditCard}
                            isLoading={isCurrentlyProcessing}
                            status={termsStatus}
                            statusType='success'
                            title='Payment Terms'
                            value={termsValue}
                          />,
                        )
                      }
                    }

                    if (otherCards.length < 2) {
                      if (agentData?.supplier_validation?.status) {
                        const sVal = agentData.supplier_validation
                        const sStatus = sVal.status
                        const sValMsg =
                          sVal.mismatch?.length > 0
                            ? sVal.mismatch.join(', ')
                            : 'Active Vendor'
                        otherCards.push(
                          <AnalysisCard
                            icon={Store}
                            isLoading={isCurrentlyProcessing}
                            status={sStatus}
                            title='Supplier Status'
                            value={sValMsg}
                            statusType={
                              sStatus === 'ACTIVE' ? 'success' : 'warning'
                            }
                          />,
                        )
                      }
                    }

                    if (otherCards.length < 2) {
                      if (agentData?.matter_validation?.status) {
                        const mVal = agentData.matter_validation
                        const mStatus =
                          mVal.status === 'NOT_PRESENT'
                            ? 'Missing'
                            : mVal.status
                        const mReason =
                          mVal.validation_details?.reason || 'No Matter ID'
                        otherCards.push(
                          <AnalysisCard
                            icon={FileText}
                            isLoading={isCurrentlyProcessing}
                            status={mStatus}
                            title='Matter Validation'
                            value={mReason}
                            statusType={
                              mVal.status === 'NOT_PRESENT'
                                ? 'warning'
                                : 'success'
                            }
                          />,
                        )
                      }
                    }

                    // Fallbacks if we still have less than 2 other cards (e.g. GL and Supplier are empty, and no extra API data)
                    if (otherCards.length < 2) {
                      if (
                        !otherCards.some(
                          (c) => c.props.title === 'GL Account Matching',
                        )
                      ) {
                        otherCards.push(glCard)
                      }
                    }
                    if (otherCards.length < 2) {
                      if (
                        !otherCards.some(
                          (c) => c.props.title === 'Supplier Verification',
                        )
                      ) {
                        otherCards.push(supplierCard)
                      }
                    }

                    // Push the top 2 (or more) other cards to cardsToRender
                    otherCards
                      .slice(0, Math.max(2, otherCards.length))
                      .forEach((c) => cardsToRender.push(c))

                    return (
                      <div
                        className={cn(
                          'grid gap-3',
                          cardsToRender.length === 5
                            ? 'grid-cols-5'
                            : 'grid-cols-4',
                        )}
                      >
                        {cardsToRender}
                      </div>
                    )
                  })()}
                </div>

                <div className='sticky top-0 z-10 shrink-0 border-b border-[var(--gray-3)] px-6 pt-2'>
                  <div className='flex items-center gap-8'>
                    {[
                      ...(hasBackOrder
                        ? [
                            {
                              icon: Package,
                              id: 'back_order',
                              label: 'Back Order',
                            },
                          ]
                        : []),
                      {
                        icon: FileText,
                        id: 'summary',
                        label: 'Extracted Data',
                      },
                      { icon: Layers, id: 'line_items', label: 'Line Items' },
                      {
                        icon: Paperclip,
                        id: 'attachments',
                        label: 'Attachments',
                      },
                      {
                        icon: MessageCircle,
                        id: 'comments',
                        label: 'Comments',
                      },
                      { icon: HistoryIcon, id: 'history', label: 'History' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        className={cn(
                          '-mb-[2px] flex items-center gap-2 border-b-2 pb-4 text-[11px] font-semibold transition-all',
                          activeTab === tab.id
                            ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                            : 'border-transparent text-[var(--gray-11)]',
                        )}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <tab.icon className='h-4 w-4' />
                        {tab.label}
                        {tab.id === 'attachments' &&
                          attachmentData?.length > 0 && (
                            <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                              {attachmentData.length}
                            </span>
                          )}
                        {tab.id === 'line_items' &&
                          (agentData?.debug?.['Side-by-side Line Item matching']
                            ?.length > 0 ||
                            agentData?.line_items?.length > 0 ||
                            agentData?.['Extracted Invoice JSON']?.invoice_items
                              ?.length > 0) && (
                            <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                              {agentData?.debug?.[
                                'Side-by-side Line Item matching'
                              ]?.length ||
                                agentData?.line_items?.length ||
                                agentData?.['Extracted Invoice JSON']
                                  ?.invoice_items?.length}
                            </span>
                          )}
                        {tab.id === 'comments' &&
                          commentsData &&
                          commentsData.length > 0 && (
                            <span className='rounded bg-[var(--gray-2)] px-1.5 py-0.5 text-[10px] text-[var(--gray-11)]'>
                              {commentsData.length}
                            </span>
                          )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='flex min-h-0 flex-1 flex-col'>
                  {activeTab === 'back_order' && hasBackOrder && (
                    <div className='animate-in fade-in slide-in-from-left-4 flex-1 space-y-4 overflow-y-auto p-4 duration-300'>
                      {/* 2. Items Table */}
                      <div className='overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm'>
                        <div className='flex items-center justify-between border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            <Icon
                              className='size-4 text-[var(--orange-9)]'
                              name='tabler:package'
                            />
                            <span className='text-xs font-bold text-[var(--gray-12)]'>
                              Missing Quantities Details
                            </span>
                          </div>
                          <span className='rounded border border-[var(--orange-3)] bg-[var(--orange-1)] px-2 py-0.5 text-[10px] font-bold text-[var(--orange-10)]'>
                            {backOrder?.missing_qty_by_item?.length || 0} Line
                            Items Impacted
                          </span>
                        </div>

                        <div className='overflow-x-auto'>
                          <table className='w-full border-collapse text-left text-xs'>
                            <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]'>
                              <tr className='text-[10px] font-bold tracking-wider text-[var(--gray-9)] uppercase'>
                                <th className='px-4 py-3'>Description</th>
                                <th className='px-4 py-3 text-center'>
                                  PO Qty
                                </th>
                                <th className='px-4 py-3 text-center'>
                                  Inv Qty
                                </th>
                                <th className='px-4 py-3 text-center'>
                                  Missing
                                </th>
                                <th className='px-4 py-3 text-center'>Price</th>
                                <th className='px-4 py-3 text-center'>
                                  Remaining Value
                                </th>
                                <th className='px-4 py-3 text-center'>
                                  Reason
                                </th>
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-[var(--gray-2)] bg-surface'>
                              {backOrder?.missing_qty_by_item?.map(
                                (row: any, idx: number) => {
                                  const desc =
                                    row.description?.trim() || 'Unmapped item'
                                  const invQty = row.invoice_qty ?? '-'
                                  const price = row.price ?? 0
                                  const remainingVal =
                                    row.amount ?? price * row.remaining
                                  const reason = row.reason || 'BACKORDER'

                                  return (
                                    <tr
                                      className='transition-colors hover:bg-[var(--gray-1)]'
                                      key={idx}
                                    >
                                      <td className='px-4 py-3 font-semibold text-[var(--gray-13)]'>
                                        <div>{desc}</div>
                                        {row.po_line_id && (
                                          <div className='text-[10px] font-medium text-[var(--gray-9)]'>
                                            PO Line: {row.po_line_id}
                                          </div>
                                        )}
                                      </td>
                                      <td className='px-4 py-3 text-center font-medium text-[var(--gray-11)]'>
                                        {row.po_qty}
                                      </td>
                                      <td className='px-4 py-3 text-center font-medium text-[var(--gray-11)]'>
                                        {invQty}
                                      </td>
                                      <td className='px-4 py-3 text-center font-bold text-[var(--orange-10)]'>
                                        {row.remaining}
                                      </td>
                                      <td className='px-4 py-3 text-center font-medium text-[var(--gray-11)]'>
                                        {typeof price === 'number'
                                          ? `$${price.toFixed(2)}`
                                          : '-'}
                                      </td>
                                      <td className='px-4 py-3 text-center font-bold text-[var(--teal-9)]'>
                                        {typeof remainingVal === 'number'
                                          ? `$${remainingVal.toFixed(2)}`
                                          : '-'}
                                      </td>
                                      <td className='px-4 py-3 text-center'>
                                        <span className='inline-flex items-center gap-1 rounded border border-[var(--orange-3)] bg-[var(--orange-1)] px-2 py-0.5 text-[9px] font-bold text-[var(--orange-10)]'>
                                          {reason}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                },
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'summary' && (
                    <div className='grid flex-1 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto p-4'>
                      {isCurrentlyProcessing
                        ? Array.from({ length: 8 }).map((_, idx) => {
                            const labels = [
                              'Supplier Name',
                              'Invoice Number',
                              'Invoice Date',
                              'Invoice Amount',
                              'PO Number',
                              'Payment Terms',
                              'Currency',
                              'Tax Amount',
                            ]
                            const icons = [
                              Store,
                              ListFilter,
                              HistoryIcon,
                              Wallet,
                              Paperclip,
                              HistoryIcon,
                              CreditCard,
                              Wallet,
                            ]
                            const label = labels[idx]
                            const IconComp = icons[idx]
                            return (
                              <div
                                className='flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left'
                                key={idx}
                              >
                                <div className='mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)]'>
                                  <IconComp className='h-3.5 w-3.5' />
                                </div>
                                <div className='min-w-0 flex-1 space-y-1.5'>
                                  <p className='text-[10px] leading-none font-semibold text-[var(--gray-11)]'>
                                    {label}
                                  </p>
                                  <div className='h-4 w-28 animate-pulse rounded bg-[var(--gray-3)]' />
                                </div>
                              </div>
                            )
                          })
                        : Object.entries(formModel || {})
                            .filter(([key, val]) => {
                              if (typeof val === 'object' && val !== null)
                                return false
                              if (typeof val === 'string') {
                                const trimmed = val.trim()
                                if (
                                  trimmed.startsWith('[') &&
                                  trimmed.endsWith(']')
                                )
                                  return false
                                if (
                                  trimmed.startsWith('{') &&
                                  trimmed.endsWith('}')
                                )
                                  return false
                              }
                              return !allowedLabels || allowedLabels.has(key)
                            })
                            .map(([key, val]) => {
                              const fieldMatch = getFieldMatch(
                                key,
                                agentData?.debug?.[
                                  'Side-by-side Field Matching'
                                ] || [],
                              )
                              return (
                                <FormCard
                                  icon={getFieldIcon(key)}
                                  key={key}
                                  label={key}
                                  matchScore={fieldMatch?.Score}
                                  options={getOptions(key)}
                                  poValue={fieldMatch?.['PO Value']}
                                  type={getFieldType(key)}
                                  value={val || '-'}
                                  highlight={
                                    key.toLowerCase().includes('total') ||
                                    key.toLowerCase().includes('due')
                                  }
                                  onChange={(newVal: string) =>
                                    handleFieldChange(key, newVal)
                                  }
                                />
                              )
                            })}
                    </div>
                  )}

                  {activeTab === 'line_items' && (
                    <div className='flex-1 overflow-y-auto p-4'>
                      <div className='overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm'>
                        <table className='w-full border-collapse text-left text-xs'>
                          <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-1)]'>
                            <tr>
                              <th className='px-3 py-2 text-[11px] font-semibold text-[var(--gray-11)]'>
                                Description
                              </th>
                              <th className='w-[70px] px-3 py-2 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                Qty
                              </th>
                              <th className='w-[100px] px-3 py-2 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                Rate
                              </th>
                              <th className='w-[120px] px-3 py-2 text-right text-[11px] font-semibold text-[var(--gray-11)]'>
                                Total Amount
                              </th>
                              <th className='w-[44px] p-1 text-center'>
                                <button
                                  className='inline-flex cursor-pointer items-center justify-center rounded border border-[var(--primary-4)] bg-[var(--primary-2)] p-1 text-[var(--primary-11)] transition-all hover:bg-[var(--primary-3)] hover:text-[var(--primary-12)] active:scale-95'
                                  title='Add New Item'
                                  type='button'
                                  onClick={handleAddItem}
                                >
                                  <Plus className='h-3.5 w-3.5' />
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-[var(--gray-2)]'>
                            {isCurrentlyProcessing
                              ? Array.from({ length: 3 }).map((_, idx) => (
                                  <tr
                                    className='group transition-colors'
                                    key={idx}
                                  >
                                    <td className='px-3 py-3'>
                                      <div className='h-4 w-5/6 animate-pulse rounded bg-[var(--gray-3)]' />
                                    </td>
                                    <td className='w-[70px] px-3 py-3'>
                                      <div className='ml-auto h-4 w-8 animate-pulse rounded bg-[var(--gray-3)]' />
                                    </td>
                                    <td className='w-[100px] px-3 py-3'>
                                      <div className='ml-auto h-4 w-12 animate-pulse rounded bg-[var(--gray-3)]' />
                                    </td>
                                    <td className='w-[120px] px-3 py-3'>
                                      <div className='ml-auto h-4 w-16 animate-pulse rounded bg-[var(--gray-3)]' />
                                    </td>
                                    <td className='w-[44px]' />
                                  </tr>
                                ))
                              : lineItems.map((item: any, index: number) => {
                                  const descVal =
                                    item.Description?.['Invoice Value'] ??
                                    item.description ??
                                    ''
                                  const qtyVal =
                                    item.Quantity?.['Invoice Value'] ??
                                    item.quantity ??
                                    ''
                                  const priceVal =
                                    item.Price?.['Invoice Value'] ??
                                    item.rate ??
                                    item.unit_price ??
                                    ''
                                  const amountVal =
                                    item.Amount?.['Invoice Value'] ??
                                    item.total ??
                                    item.amount ??
                                    ''

                                  const sideBySideItem = (() => {
                                    const matches =
                                      agentData?.debug?.[
                                        'Side-by-side Line Item matching'
                                      ]
                                    if (!matches || matches.length === 0)
                                      return null

                                    // Try matching by index first if description is similar
                                    const byIndex = matches[index]
                                    if (byIndex) {
                                      const byIndexDesc =
                                        byIndex.Description?.[
                                          'Invoice Value'
                                        ] ||
                                        byIndex.description ||
                                        ''
                                      if (
                                        matchKeysLoosely(byIndexDesc, descVal)
                                      ) {
                                        return byIndex
                                      }
                                    }

                                    // Fallback: match by description
                                    return matches.find((m: any) => {
                                      const mDesc =
                                        m.Description?.['Invoice Value'] ||
                                        m.description ||
                                        ''
                                      return matchKeysLoosely(mDesc, descVal)
                                    })
                                  })()

                                  const lineScore =
                                    sideBySideItem?.['Line Score'] ??
                                    sideBySideItem?.score ??
                                    item?.['Line Score'] ??
                                    item?.score ??
                                    100

                                  const isMatch =
                                    lineScore >= 90 || item?.status === 'MATCH'

                                  return (
                                    <tr
                                      key={item._id}
                                      className={cn(
                                        'group transition-colors',
                                        isMatch
                                          ? 'hover:bg-[var(--gray-1)]'
                                          : 'bg-[var(--red-1)]/30 hover:bg-[var(--red-1)]/50',
                                      )}
                                    >
                                      {/* Description Cell */}
                                      <td className='px-2 py-1.5 font-semibold text-[var(--gray-13)]'>
                                        <input
                                          className='w-full rounded border-none bg-transparent px-1.5 py-1 text-xs font-semibold text-[var(--gray-13)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                          value={descVal}
                                          onChange={(e) =>
                                            handleLineItemChange(
                                              index,
                                              'description',
                                              e.target.value,
                                            )
                                          }
                                        />
                                        {sideBySideItem && (
                                          <div className='mt-0.5 flex flex-wrap items-center gap-1.5 px-1.5'>
                                            <span
                                              className={cn(
                                                'py-0.2 inline-flex items-center rounded px-1 text-[9px] font-bold tracking-wider uppercase',
                                                lineScore >= 90
                                                  ? 'border border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
                                                  : lineScore >= 50
                                                    ? 'border border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                                                    : 'border border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]',
                                              )}
                                            >
                                              Line Score: {lineScore}%
                                            </span>
                                            {sideBySideItem.Description?.[
                                              'PO Value'
                                            ] &&
                                              sideBySideItem.Description?.[
                                                'PO Value'
                                              ] !== descVal && (
                                                <span
                                                  className='truncate text-[10px] text-[var(--gray-11)]'
                                                  title={`PO Desc: ${sideBySideItem.Description['PO Value']}`}
                                                >
                                                  PO:{' '}
                                                  <span className='font-semibold text-[var(--gray-12)]'>
                                                    {
                                                      sideBySideItem
                                                        .Description['PO Value']
                                                    }
                                                  </span>
                                                  <span className='ml-1 opacity-80'>
                                                    (
                                                    {
                                                      sideBySideItem.Description
                                                        .Score
                                                    }
                                                    % match)
                                                  </span>
                                                </span>
                                              )}
                                          </div>
                                        )}
                                      </td>

                                      {/* Quantity Cell */}
                                      <td className='w-[70px] px-2 py-1.5 text-right font-semibold text-[var(--gray-11)]'>
                                        <input
                                          className='w-full rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-11)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                          value={qtyVal}
                                          onChange={(e) =>
                                            handleLineItemChange(
                                              index,
                                              'quantity',
                                              e.target.value,
                                            )
                                          }
                                        />
                                        {sideBySideItem?.Quantity &&
                                          sideBySideItem.Quantity.Score <
                                            100 && (
                                            <div className='mt-0.5 px-1.5 text-right text-[10px] text-[var(--gray-11)]'>
                                              <span className='opacity-80'>
                                                PO:{' '}
                                              </span>
                                              <span className='font-semibold text-[var(--gray-12)]'>
                                                {sideBySideItem.Quantity[
                                                  'PO Value'
                                                ] ?? '-'}
                                              </span>
                                              <span
                                                className={cn(
                                                  'ml-1 text-[9px] font-bold',
                                                  sideBySideItem.Quantity
                                                    .Score >= 90
                                                    ? 'text-[var(--green-9)]'
                                                    : sideBySideItem.Quantity
                                                          .Score >= 50
                                                      ? 'text-[var(--orange-9)]'
                                                      : 'text-[var(--red-9)]',
                                                )}
                                              >
                                                ({sideBySideItem.Quantity.Score}
                                                %)
                                              </span>
                                            </div>
                                          )}
                                      </td>

                                      {/* Rate/Price Cell */}
                                      <td className='w-[100px] px-2 py-1.5 text-right font-semibold text-[var(--gray-11)]'>
                                        <input
                                          className='w-full rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-11)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                          value={priceVal}
                                          onBlur={(e) => {
                                            const num = Number.parseFloat(
                                              e.target.value.replace(
                                                /[^0-9.-]+/g,
                                                '',
                                              ),
                                            )
                                            if (!Number.isNaN(num)) {
                                              handleLineItemChange(
                                                index,
                                                'price',
                                                num.toFixed(2),
                                              )
                                            }
                                          }}
                                          onChange={(e) =>
                                            handleLineItemChange(
                                              index,
                                              'price',
                                              e.target.value,
                                            )
                                          }
                                        />
                                        {(() => {
                                          const priceMatch =
                                            sideBySideItem?.Price ??
                                            sideBySideItem?.Rate
                                          if (
                                            !priceMatch ||
                                            priceMatch.Score === 100
                                          )
                                            return null
                                          return (
                                            <div className='mt-0.5 px-1.5 text-right text-[10px] text-[var(--gray-11)]'>
                                              <span className='opacity-80'>
                                                PO:{' '}
                                              </span>
                                              <span className='font-semibold text-[var(--gray-12)]'>
                                                {priceMatch['PO Value'] !==
                                                  null &&
                                                priceMatch['PO Value'] !==
                                                  undefined &&
                                                priceMatch['PO Value'] !== ''
                                                  ? `$${Number(priceMatch['PO Value']).toFixed(2)}`
                                                  : '-'}
                                              </span>
                                              <span
                                                className={cn(
                                                  'ml-1 text-[9px] font-bold',
                                                  priceMatch.Score >= 90
                                                    ? 'text-[var(--green-9)]'
                                                    : priceMatch.Score >= 50
                                                      ? 'text-[var(--orange-9)]'
                                                      : 'text-[var(--red-9)]',
                                                )}
                                              >
                                                ({priceMatch.Score}%)
                                              </span>
                                            </div>
                                          )
                                        })()}
                                      </td>

                                      {/* Total Amount Cell */}
                                      <td className='w-[120px] px-2 py-1.5 text-right font-semibold text-[var(--gray-13)]'>
                                        <input
                                          className='w-full rounded border-none bg-transparent px-1.5 py-1 text-right text-xs font-semibold text-[var(--gray-13)] transition-all hover:bg-[var(--gray-2)]/30 focus:bg-surface focus:ring-1 focus:ring-[var(--primary-3)] focus:outline-none'
                                          value={amountVal}
                                          onBlur={(e) => {
                                            const num = Number.parseFloat(
                                              e.target.value.replace(
                                                /[^0-9.-]+/g,
                                                '',
                                              ),
                                            )
                                            if (!Number.isNaN(num)) {
                                              handleLineItemChange(
                                                index,
                                                'amount',
                                                num.toFixed(2),
                                              )
                                            }
                                          }}
                                          onChange={(e) =>
                                            handleLineItemChange(
                                              index,
                                              'amount',
                                              e.target.value,
                                            )
                                          }
                                        />
                                        {sideBySideItem?.Amount &&
                                          sideBySideItem.Amount.Score < 100 && (
                                            <div className='mt-0.5 px-1.5 text-right text-[10px] text-[var(--gray-11)]'>
                                              <span className='opacity-80'>
                                                PO:{' '}
                                              </span>
                                              <span className='font-semibold text-[var(--gray-12)]'>
                                                {sideBySideItem.Amount[
                                                  'PO Value'
                                                ] !== null &&
                                                sideBySideItem.Amount[
                                                  'PO Value'
                                                ] !== undefined &&
                                                sideBySideItem.Amount[
                                                  'PO Value'
                                                ] !== ''
                                                  ? `$${Number(sideBySideItem.Amount['PO Value']).toFixed(2)}`
                                                  : '-'}
                                              </span>
                                              <span
                                                className={cn(
                                                  'ml-1 text-[9px] font-bold',
                                                  sideBySideItem.Amount.Score >=
                                                    90
                                                    ? 'text-[var(--green-9)]'
                                                    : sideBySideItem.Amount
                                                          .Score >= 50
                                                      ? 'text-[var(--orange-9)]'
                                                      : 'text-[var(--red-9)]',
                                                )}
                                              >
                                                ({sideBySideItem.Amount.Score}%)
                                              </span>
                                            </div>
                                          )}
                                      </td>

                                      {/* Action Cell */}
                                      <td className='w-[44px] px-2 py-0.5 text-center'>
                                        <button
                                          className='rounded p-1 text-[var(--red-9)] transition-all hover:bg-[var(--red-2)] hover:text-[var(--red-11)] active:scale-95'
                                          title='Remove Item'
                                          type='button'
                                          onClick={() =>
                                            handleRemoveItem(index)
                                          }
                                        >
                                          <Trash2 className='h-3.5 w-3.5' />
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                })}
                          </tbody>
                          <tfoot className='border-t border-[var(--gray-3)] bg-[var(--gray-1)]'>
                            <tr className='font-bold'>
                              <td
                                className='px-3 py-2 text-right text-[11px] text-[var(--gray-11)]'
                                colSpan={3}
                              >
                                Grand Total
                              </td>
                              <td className='px-3 py-2 text-right text-[13px] text-[var(--gray-13)]'>
                                {(() => {
                                  const currencyCode =
                                    formModel?.['Currency'] ||
                                    agentData?.['Extracted Invoice JSON']
                                      ?.invoice_header?.['Currency'] ||
                                    ''
                                  const total = lineItems.reduce(
                                    (sum: number, item: any) => {
                                      const val = getLineItemAmount(item)
                                      const num = Number.parseFloat(
                                        String(val).replace(/[^0-9.-]+/g, ''),
                                      )
                                      return sum + (Number.isNaN(num) ? 0 : num)
                                    },
                                    0,
                                  )
                                  const formattedTotal = total.toLocaleString(
                                    undefined,
                                    {
                                      maximumFractionDigits: 2,
                                      minimumFractionDigits: 2,
                                    },
                                  )
                                  return currencyCode
                                    ? `${currencyCode} ${formattedTotal}`
                                    : formattedTotal
                                })()}
                              </td>
                              <td className='w-[44px] bg-[var(--gray-1)]' />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'attachments' && (
                    <div className='flex-1 overflow-y-auto p-4'>
                      {isCurrentlyProcessing ? (
                        <div className='flex h-48 flex-col items-center justify-center text-center'>
                          <Icon
                            className='mb-2 size-8 animate-spin text-[var(--primary-9)]'
                            name='tabler:loader-2'
                          />
                          <p className='text-xs font-semibold text-[var(--gray-10)]'>
                            Loading Attachments...
                          </p>
                        </div>
                      ) : (
                        <Attachments
                          enabled={true}
                          processId={processId}
                          workflowId={workflowId}
                          onSelect={(file) =>
                            selectedFile?.id === file.id
                              ? (setIsViewerLoading(true),
                                setTimeout(
                                  () => setIsViewerLoading(false),
                                  500,
                                ))
                              : setSelectedFile(file)
                          }
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'comments' && (
                    <div className='flex min-h-0 flex-1 flex-col pt-4 pb-0'>
                      {isCurrentlyProcessing ? (
                        <div className='flex h-48 flex-col items-center justify-center text-center'>
                          <Icon
                            className='mb-2 size-8 animate-spin text-[var(--primary-9)]'
                            name='tabler:loader-2'
                          />
                          <p className='text-xs font-semibold text-[var(--gray-10)]'>
                            Loading Comments...
                          </p>
                        </div>
                      ) : (
                        <Comments
                          attachments={selectedItem?.attachments || []}
                          comments={commentsData}
                          enabled={true}
                          isLoading={isLoadingComments}
                          processId={processId}
                          refetch={refetchComments}
                          repositoryId={repositoryId}
                          transactionId={transactionId}
                          workflowId={workflowId}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className='flex-1 overflow-y-auto p-4'>
                      {isCurrentlyProcessing ? (
                        <div className='flex h-48 flex-col items-center justify-center text-center'>
                          <Icon
                            className='mb-2 size-8 animate-spin text-[var(--primary-9)]'
                            name='tabler:loader-2'
                          />
                          <p className='text-xs font-semibold text-[var(--gray-10)]'>
                            Loading History...
                          </p>
                        </div>
                      ) : (
                        <History
                          enabled={true}
                          processId={processId}
                          workflowId={workflowId}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
