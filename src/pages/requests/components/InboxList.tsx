import React, { useMemo, useState } from 'react'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Icon from '@/components/base/icon/Icon'
import Pagination from '@/components/base/pagination/Pagination'
import Tooltip from '@/components/base/Tooltip'
import DynamicFilter, {
  type DynamicFilterField,
} from '@/components/common/DynamicFilter'
import { DUE_DATE_FILTER_OPTIONS } from '@/utils/filterUtils'
import type { TableGroup, WorkflowOption } from '../types'
import requestStore from '../stores/useRequestStore'
// import TableSort from '@/components/base/data-table/actions/TableSort'
// import TableColumns from '@/components/base/data-table/actions/TableColumns'
// import TableRows from '@/components/base/data-table/actions/TableRows'
// import type { RowSize } from '@/components/base/data-table/types'
import ExportButton from './buttons/ExportButton'
import RefreshButton from './buttons/RefreshButton'
import UploadPoButton from './buttons/UploadPoButton'
import { useDynamicColumns } from './columns/useDynamicColumns'
import GridView from './GridView'
import { extractDueDate } from '@/pages/requests/utils/inboxItemDisplay'

interface InboxListProps {
  data: TableGroup[]
  isLoading: boolean
  isRefetching: boolean
  page: number
  pageSize: number
  selectedItem: any
  totalItems: number
  viewMode: 'table' | 'grid'
  workflow: WorkflowOption | null
  activeTab?: string
  setPage: (p: number) => void
  setPageSize: (s: number) => void
  setViewMode: (mode: 'table' | 'grid') => void
  onGroupByChange?: (groups: string[]) => void
  onRefresh: () => void
  onRowClick: (item: any, tab: string) => void
}

// ✅ robust flattener for your backend shape (group.items)
function flattenRows(groups: any[]): any[] {
  const out: any[] = []

  const walk = (node: any) => {
    if (!node) return

    // Your shape: group has items: []
    if (Array.isArray(node.items)) {
      out.push(...node.items)
    }

    // Future-proof: some APIs use value/rows
    if (Array.isArray(node.value)) {
      out.push(...node.value)
    }
    if (Array.isArray(node.rows)) {
      out.push(...node.rows)
    }

    // Nested groups (if any)
    if (Array.isArray(node.children)) {
      node.children.forEach(walk)
    }
    if (Array.isArray(node.groups)) {
      node.groups.forEach(walk)
    }
  }

  ;(groups || []).forEach(walk)
  return out
}

const getParsedFormData = (row: any): any => {
  if (!row?.formData) return {}
  if (typeof row.formData === 'object') {
    return row.formData.fields || row.formData || {}
  }
  if (typeof row.formData === 'string') {
    try {
      const parsed = JSON.parse(row.formData)
      return parsed.fields || parsed || {}
    } catch {
      return {}
    }
  }
  return {}
}

const isOverdue = (row: any) => {
  const dueDateStr = extractDueDate(row)
  if (!dueDateStr || dueDateStr === '-') return false
  try {
    const dueDate = new Date(dueDateStr)
    if (Number.isNaN(dueDate.getTime())) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  } catch {
    return false
  }
}

const extractAmountStr = (val: any): string | null => {
  if (val == null) return null
  let actualVal = val
  if (typeof val === 'object') {
    actualVal =
      val['Invoice Value'] || val['InvoiceValue'] || val['value'] || val['val']
  }
  if (actualVal == null) return null
  const str = String(actualVal).trim()
  return str !== '' && str !== '-' ? str : null
}

const searchInvoiceAmountInObj = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null

  const directKeys = [
    'suyqsm0SYii_8vsj4p0c_',
    'WksH1Mrs42X4J9AHgoBtw',
    'Invoice Amount',
    'Invoice Amount Value',
    'Invoice No',
    'Invoice No.',
    'Invoice Number',
    'Invoice_No',
    'Invoice_Number',
    'InvoiceNo',
    'InvoiceNumber',
    'PO Amount',
    'PO_Amount',
    'POAmount',
    'Invoice Value',
    'PO Value',
    'Amount',
    'total',
    'amount',
  ]
  for (const key of directKeys) {
    const extracted = extractAmountStr(obj[key])
    if (extracted !== null) return extracted
  }

  for (const key of Object.keys(obj)) {
    const k = key
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim()
    if (
      k === 'invoiceamount' ||
      k === 'totalamount' ||
      k === 'amount' ||
      k === 'total' ||
      k === 'suyqsm0syii8vsj4p0c' ||
      k === 'wksh1mrs42x4j9ahgobtw'
    ) {
      const extracted = extractAmountStr(obj[key])
      if (extracted !== null) return extracted
    }
  }
  return null
}

const findSupplierName = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const searchInObj = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null

    const directKeys = [
      'UtfgJy6Z0qyfRC5Bclfc',
      'UtfgJy6Z0qyfRC5Bclf-c',
      'UtfgJy6Z0qyfRC5Bclf_c',
      'Supplier Name',
      'Vendor Name',
      'Supplier_Name',
      'Vendor_Name',
      'SupplierName',
      'VendorName',
    ]
    for (const key of directKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const val = String(obj[key]).trim()
        if (val !== '' && val !== '-') return val
      }
    }

    for (const key of Object.keys(obj)) {
      const k = key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
      if (
        k === 'suppliername' ||
        k === 'vendorname' ||
        k === 'supplier' ||
        k === 'vendor'
      ) {
        const val = obj[key]
        if (
          val &&
          typeof val !== 'object' &&
          String(val).trim() !== '' &&
          String(val).trim() !== '-'
        ) {
          return String(val).trim()
        }
      }
    }
    return null
  }

  const fromForm = searchInObj(parsedForm)
  if (fromForm) return fromForm

  const agentData =
    row._agentResponse || row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInObj(agentData)
  if (fromAgent) return fromAgent

  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  return null
}

const findInvoiceAmount = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const fromForm = searchInvoiceAmountInObj(parsedForm)
  if (fromForm) return fromForm

  const agentData =
    row._agentResponse || row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInvoiceAmountInObj(agentData)
  if (fromAgent) return fromAgent

  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInvoiceAmountInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  const poMatching = agentData?.po_matching
  if (poMatching) {
    const fromPO = searchInvoiceAmountInObj(poMatching)
    if (fromPO) return fromPO
  }

  return null
}
const getHighValueThreshold = (rows: any[]) => {
  let maxAmount = 0
  rows.forEach((row) => {
    const amtStr = findInvoiceAmount(row)
    const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
    if (amount > maxAmount) maxAmount = amount
  })
  if (maxAmount === 0) return 10000

  let threshold = maxAmount * 0.8
  if (threshold >= 1000) threshold = Math.floor(threshold / 1000) * 1000
  else threshold = Math.floor(threshold / 100) * 100

  return Math.max(100, threshold)
}

const formatAmountLabel = (value: number) => {
  if (value >= 1000) {
    const asK = value / 1000
    const rounded = Number.isInteger(asK) ? asK : Number(asK.toFixed(1))
    return `$${rounded}k`
  }
  return `$${Math.round(value).toLocaleString()}`
}

const getAmountRangeOptions = (rows: any[]) => {
  const amounts = rows
    .map((row) => {
      const amtStr = findInvoiceAmount(row)
      return amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : NaN
    })
    .filter((n) => typeof n === 'number' && !Number.isNaN(n) && n > 0)

  if (amounts.length === 0) {
    return [
      { label: '< $1k', value: '0-1000' },
      { label: '$1k – $5k', value: '1000-5000' },
      { label: '$5k – $10k', value: '5000-10000' },
      { label: '≥ $10k', value: '10000-999999999' },
      { label: 'Custom Range', value: 'custom' },
    ]
  }

  const min = Math.min(...amounts)
  const max = Math.max(...amounts)

  if (min === max) {
    return [
      {
        label: formatAmountLabel(min),
        value: `${min}-${min}`,
      },
      { label: 'Custom Range', value: 'custom' },
    ]
  }

  const range = max - min
  let bucketCount = 4
  if (range < 1000) bucketCount = 3
  else if (range > 50000) bucketCount = 5

  let bucketSize = range / bucketCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(bucketSize, 1))))
  bucketSize = Math.ceil(bucketSize / magnitude) * magnitude

  const start = Math.floor(min / bucketSize) * bucketSize
  const options: { label: string; value: string }[] = []

  for (let edge = start; edge < max; edge += bucketSize) {
    const from = Math.max(0, edge)
    const to = edge + bucketSize
    const isLast = to >= max
    const upper = isLast ? Math.ceil(max) : to

    if (isLast) {
      options.push({
        label: `≥ ${formatAmountLabel(from)}`,
        value: `${from}-999999999`,
      })
      break
    }

    if (from <= 0) {
      options.push({
        label: `< ${formatAmountLabel(upper)}`,
        value: `0-${upper}`,
      })
      continue
    }

    options.push({
      label: `${formatAmountLabel(from)} – ${formatAmountLabel(upper)}`,
      value: `${from}-${upper}`,
    })
  }

  return options.length > 0
    ? [...options, { label: 'Custom Range', value: 'custom' }]
    : [
        {
          label: `≥ ${formatAmountLabel(min)}`,
          value: `${min}-999999999`,
        },
        { label: 'Custom Range', value: 'custom' },
      ]
}

const KNOWN_QUICK_FILTERS = new Set([
  'matched',
  'discrepancies',
  'highValue',
  'overdue',
])
const KNOWN_FILTER_PREFIXES = [
  'status:',
  'amount:',
  'supplier:',
  'due_date:',
  'overdue:',
  'discrepancies:',
]

const isKnownQuickFilterToken = (filter: string) =>
  KNOWN_QUICK_FILTERS.has(filter) ||
  KNOWN_FILTER_PREFIXES.some((prefix) => filter.startsWith(prefix))

const getGenericColumnFilters = (activeQuickFilters: string[]) => {
  const byId: Record<string, string[]> = {}
  for (const filter of activeQuickFilters) {
    if (isKnownQuickFilterToken(filter)) continue
    const idx = filter.indexOf(':')
    if (idx <= 0) continue
    const id = filter.slice(0, idx)
    const val = filter.slice(idx + 1)
    if (!id || !val) continue
    ;(byId[id] ||= []).push(val)
  }
  return byId
}

const parseDay = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === '-') return null
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  }
  const fallback = new Date(dateStr)
  if (Number.isNaN(fallback.getTime())) return null
  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
  )
}

const matchesNumericFilterValue = (raw: string, val: string): boolean => {
  const num = Number(String(raw).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(num)) return false
  if (val.startsWith('custom:')) {
    const [min, max] = val.replace('custom:', '').split('-').map(Number)
    return num >= min && num <= max
  }
  if (/^-?\d+(\.\d+)?-\d+(\.\d+)?$/.test(val)) {
    const [min, max] = val.split('-').map(Number)
    return num >= min && num < max
  }
  return String(raw) === val
}

const matchesDateFilterValue = (
  rowDateStr: string,
  val: string,
  isOvr: boolean,
): boolean => {
  if (val === 'overdue') return isOvr
  const hasNoDueDate = !rowDateStr || rowDateStr === '-'
  if (val === 'no_due_date') return hasNoDueDate
  if (hasNoDueDate) return false

  const rowDay = parseDay(rowDateStr)
  if (!rowDay) return val === 'no_due_date'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (val.startsWith('custom:')) {
    const [startStr, endStr] = val.replace('custom:', '').split('_')
    const start = parseDay(startStr)
    const end = parseDay(endStr)
    if (!start || !end) return false
    return (
      rowDay.getTime() >= start.getTime() && rowDay.getTime() <= end.getTime()
    )
  }

  if (val === 'today') return rowDay.getTime() === today.getTime()
  if (val === 'tomorrow') return rowDay.getTime() === today.getTime() + 86400000
  if (val === 'next_7_days')
    return (
      rowDay.getTime() >= today.getTime() &&
      rowDay.getTime() <= today.getTime() + 7 * 86400000
    )
  if (val === 'next_15_days')
    return (
      rowDay.getTime() >= today.getTime() &&
      rowDay.getTime() <= today.getTime() + 15 * 86400000
    )
  if (val === 'next_30_days')
    return (
      rowDay.getTime() >= today.getTime() &&
      rowDay.getTime() <= today.getTime() + 30 * 86400000
    )
  if (val === 'days_2_to_7')
    return (
      rowDay.getTime() >= today.getTime() + 2 * 86400000 &&
      rowDay.getTime() <= today.getTime() + 7 * 86400000
    )
  if (val === 'days_8_to_30')
    return (
      rowDay.getTime() >= today.getTime() + 8 * 86400000 &&
      rowDay.getTime() <= today.getTime() + 30 * 86400000
    )
  if (val === 'after_30_days')
    return rowDay.getTime() > today.getTime() + 30 * 86400000
  if (val === 'this_week') {
    const startOfWeek = new Date(today.getTime() - today.getDay() * 86400000)
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000)
    return (
      rowDay.getTime() >= startOfWeek.getTime() &&
      rowDay.getTime() <= endOfWeek.getTime()
    )
  }
  if (val === 'last_week') {
    const startOfThisWeek = new Date(today.getTime() - today.getDay() * 86400000)
    const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400000)
    const endOfLastWeek = new Date(startOfThisWeek.getTime() - 86400000)
    return (
      rowDay.getTime() >= startOfLastWeek.getTime() &&
      rowDay.getTime() <= endOfLastWeek.getTime()
    )
  }
  if (val === 'this_month')
    return (
      rowDay.getFullYear() === now.getFullYear() &&
      rowDay.getMonth() === now.getMonth()
    )
  if (val === 'next_month') {
    const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return (
      rowDay.getFullYear() === nm.getFullYear() &&
      rowDay.getMonth() === nm.getMonth()
    )
  }
  if (val === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return (
      rowDay.getFullYear() === lm.getFullYear() &&
      rowDay.getMonth() === lm.getMonth()
    )
  }
  if (val === 'last_3_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, today.getDate())
    return (
      rowDay.getTime() >= start.getTime() && rowDay.getTime() <= today.getTime()
    )
  }
  if (val === 'last_6_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 6, today.getDate())
    return (
      rowDay.getTime() >= start.getTime() && rowDay.getTime() <= today.getTime()
    )
  }
  if (val === 'this_year') return rowDay.getFullYear() === now.getFullYear()
  if (val === 'last_year') return rowDay.getFullYear() === now.getFullYear() - 1
  return rowDateStr === val || rowDateStr.toLowerCase() === val.toLowerCase()
}

const rowMatchesGenericFilter = (
  row: any,
  colId: string,
  values: string[],
): boolean => {
  const rowVal = getRowColumnValue(row, colId)
  const isOvr = isOverdue(row)
  const dueDateStr = extractDueDate(row)

  return values.some((val) => {
    if (
      val === 'overdue' ||
      val === 'today' ||
      val === 'tomorrow' ||
      val.startsWith('next_') ||
      val.startsWith('this_') ||
      val.startsWith('last_') ||
      (val.startsWith('custom:') && val.includes('_'))
    ) {
      const dateSource =
        colId === 'due_date' || colId.toLowerCase().includes('due')
          ? dueDateStr
          : rowVal
      return matchesDateFilterValue(dateSource, val, isOvr)
    }
    if (val.startsWith('custom:') || /^-?\d+(\.\d+)?-\d+(\.\d+)?$/.test(val)) {
      return matchesNumericFilterValue(rowVal, val)
    }
    return (
      String(rowVal) === val ||
      String(rowVal).toLowerCase() === val.toLowerCase()
    )
  })
}

const filterRowsByQuickFilters = (
  rows: any[],
  activeQuickFilters: string[],
  excludeCategory?: 'status' | 'amount' | 'overdue',
) => {
  const activeStatus = activeQuickFilters.filter(
    (f) =>
      f === 'matched' ||
      f === 'discrepancies' ||
      f.startsWith('status:') ||
      f.startsWith('discrepancies:'),
  )
  const activeAmount = activeQuickFilters.filter(
    (f) => f === 'highValue' || f.startsWith('amount:'),
  )
  const activeDueDate = activeQuickFilters.filter(
    (f) =>
      f === 'overdue' || f.startsWith('due_date:') || f.startsWith('overdue:'),
  )
  const activeSupplier = activeQuickFilters.filter((f) =>
    f.startsWith('supplier:'),
  )
  const genericById = getGenericColumnFilters(activeQuickFilters)
  const hasGenericFilters = Object.keys(genericById).length > 0

  if (
    (excludeCategory === 'status' || activeStatus.length === 0) &&
    (excludeCategory === 'amount' || activeAmount.length === 0) &&
    (excludeCategory === 'overdue' || activeDueDate.length === 0) &&
    activeSupplier.length === 0 &&
    !hasGenericFilters
  ) {
    return rows
  }

  const dynamicHighValue = getHighValueThreshold(rows)

  return rows.filter((row: any) => {
    const isOvr = isOverdue(row)

    const parsedForm = getParsedFormData(row)
    const agentData =
      row._agentResponse || row._agentData?.[0] || row._agentData || {}
    const rawDecision = String(
      parsedForm['2MH_BMDFEVKsU0uAQjoI1'] ||
        agentData?.decision ||
        row.decision ||
        row.status ||
        '',
    ).toUpperCase()

    const isMtc =
      rawDecision === 'APPROVED' ||
      rawDecision === 'MATCHED' ||
      rawDecision === 'FULLY MATCHED' ||
      rawDecision === 'FULLY_MATCHED'
    const isDisc =
      rawDecision === 'PARTIALLY APPROVED' ||
      rawDecision === 'PARTIALLY MATCHED' ||
      rawDecision === 'PARTIALLY_APPROVED' ||
      rawDecision === 'PARTIALLY_MATCHED' ||
      rawDecision === 'NOT MATCHED' ||
      rawDecision === 'NOT_MATCHED' ||
      rawDecision === 'NO MATCH' ||
      rawDecision === 'NO_MATCH'

    const amtStr = findInvoiceAmount(row)
    const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
    const isHigh = amount >= dynamicHighValue

    // 1. Check Status filters (OR within category)
    let matchesStatus = true
    if (excludeCategory !== 'status' && activeStatus.length > 0) {
      matchesStatus = activeStatus.some((filter) => {
        if (filter === 'matched') return isMtc
        if (filter === 'discrepancies') return isDisc
        if (
          filter.startsWith('status:') ||
          filter.startsWith('discrepancies:')
        ) {
          const parts = filter.split(':')
          parts.shift()
          const val = parts.join(':').toUpperCase()
          if (val === 'APPROVED' || val === 'MATCHED') {
            return (
              rawDecision === 'APPROVED' ||
              rawDecision === 'MATCHED' ||
              rawDecision === 'FULLY MATCHED' ||
              rawDecision === 'FULLY_MATCHED'
            )
          }
          if (
            val === 'PARTIALLY APPROVED' ||
            val === 'PARTIALLY MATCHED' ||
            val === 'PARTIALLY_MATCHED' ||
            val === 'PENDING'
          ) {
            return (
              rawDecision === 'PARTIALLY APPROVED' ||
              rawDecision === 'PARTIALLY MATCHED' ||
              rawDecision === 'PARTIALLY_APPROVED' ||
              rawDecision === 'PARTIALLY_MATCHED' ||
              rawDecision === 'PARTIAL MATCH' ||
              rawDecision === 'PENDING'
            )
          }
          if (
            val === 'NOT MATCHED' ||
            val === 'NOT_MATCHED' ||
            val === 'REJECTED'
          ) {
            return (
              rawDecision === 'NOT MATCHED' ||
              rawDecision === 'NO MATCH' ||
              rawDecision === 'NO_MATCH' ||
              rawDecision === 'NOT_MATCHED' ||
              rawDecision === 'REJECTED' ||
              rawDecision === 'FAILED'
            )
          }
          return rawDecision === val
        }
        return false
      })
    }

    // 2. Check Amount filters (OR within category)
    let matchesAmount = true
    if (excludeCategory !== 'amount' && activeAmount.length > 0) {
      matchesAmount = activeAmount.some((filter) => {
        if (filter === 'highValue') return isHigh
        if (filter.startsWith('amount:')) {
          const val = filter.replace('amount:', '')
          if (val === 'lt1k') return amount > 0 && amount < 1000
          if (val === '1k_5k') return amount >= 1000 && amount < 5000
          if (val === '5k_10k') return amount >= 5000 && amount < 10000
          if (val === 'ge10k') return amount >= 10000
          if (val.startsWith('custom:')) {
            const [min, max] = val.replace('custom:', '').split('-').map(Number)
            return amount >= min && amount <= max
          }
          if (val.includes('-')) {
            const [min, max] = val.split('-').map(Number)
            if (Number.isNaN(min) || Number.isNaN(max)) return false
            if (max >= 999999999) return amount >= min
            return amount >= min && amount < max
          }
        }
        return false
      })
    }

    // 3. Check Overdue & Due Date filters (OR within category)
    let matchesDueDate = true
    if (excludeCategory !== 'overdue' && activeDueDate.length > 0) {
      matchesDueDate = activeDueDate.some((filter) => {
        if (filter === 'overdue' || filter === 'due_date:overdue') return isOvr

        if (filter.startsWith('due_date:') || filter.startsWith('overdue:')) {
          const isOverdueCheck = filter.startsWith('overdue:')
          const parts = filter.split(':')
          parts.shift()
          const val = parts.join(':')

          if (isOverdueCheck && !isOvr) return false
          if (val === 'overdue') return isOvr

          const rowDateStr = extractDueDate(row)
          if (!rowDateStr || rowDateStr === '-') {
            return val === 'no_due_date'
          }
          if (val === 'no_due_date') return false

          let rowDay: Date
          if (rowDateStr.includes('-')) {
            const [y, m, d] = rowDateStr.split('-').map(Number)
            rowDay = new Date(y, m - 1, d)
          } else {
            const fallback = new Date(rowDateStr)
            rowDay = new Date(
              fallback.getFullYear(),
              fallback.getMonth(),
              fallback.getDate(),
            )
          }
          if (isNaN(rowDay.getTime())) return val === 'no_due_date'

          const now = new Date()
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          )

          if (val.startsWith('custom:')) {
            const [startStr, endStr] = val.replace('custom:', '').split('_')
            const [sy, sm, sd] = startStr.split('-').map(Number)
            const [ey, em, ed] = endStr.split('-').map(Number)
            const start = new Date(sy, sm - 1, sd).getTime()
            const end = new Date(ey, em - 1, ed).getTime()
            return rowDay.getTime() >= start && rowDay.getTime() <= end
          }

          if (val === 'today') return rowDay.getTime() === today.getTime()
          if (val === 'tomorrow')
            return rowDay.getTime() === today.getTime() + 86400000
          if (val === 'next_7_days')
            return (
              rowDay.getTime() >= today.getTime() &&
              rowDay.getTime() <= today.getTime() + 7 * 86400000
            )
          if (val === 'next_15_days')
            return (
              rowDay.getTime() >= today.getTime() &&
              rowDay.getTime() <= today.getTime() + 15 * 86400000
            )
          if (val === 'next_30_days')
            return (
              rowDay.getTime() >= today.getTime() &&
              rowDay.getTime() <= today.getTime() + 30 * 86400000
            )
          if (val === 'days_2_to_7')
            return (
              rowDay.getTime() >= today.getTime() + 2 * 86400000 &&
              rowDay.getTime() <= today.getTime() + 7 * 86400000
            )
          if (val === 'days_8_to_30')
            return (
              rowDay.getTime() >= today.getTime() + 8 * 86400000 &&
              rowDay.getTime() <= today.getTime() + 30 * 86400000
            )
          if (val === 'after_30_days')
            return rowDay.getTime() > today.getTime() + 30 * 86400000

          if (val === 'this_week') {
            const startOfWeek = new Date(
              today.getTime() - today.getDay() * 86400000,
            )
            const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000)
            return (
              rowDay.getTime() >= startOfWeek.getTime() &&
              rowDay.getTime() <= endOfWeek.getTime()
            )
          }
          if (val === 'this_month')
            return (
              rowDay.getFullYear() === now.getFullYear() &&
              rowDay.getMonth() === now.getMonth()
            )
          if (val === 'next_month') {
            const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            return (
              rowDay.getFullYear() === nm.getFullYear() &&
              rowDay.getMonth() === nm.getMonth()
            )
          }
          if (val === 'last_week') {
            const startOfThisWeek = new Date(
              today.getTime() - today.getDay() * 86400000,
            )
            const startOfLastWeek = new Date(
              startOfThisWeek.getTime() - 7 * 86400000,
            )
            const endOfLastWeek = new Date(
              startOfThisWeek.getTime() - 86400000,
            )
            return (
              rowDay.getTime() >= startOfLastWeek.getTime() &&
              rowDay.getTime() <= endOfLastWeek.getTime()
            )
          }
          if (val === 'last_month') {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            return (
              rowDay.getFullYear() === lm.getFullYear() &&
              rowDay.getMonth() === lm.getMonth()
            )
          }
          if (val === 'last_3_months') {
            const l3m = new Date(
              now.getFullYear(),
              now.getMonth() - 3,
              now.getDate(),
            )
            return (
              rowDay.getTime() >= l3m.getTime() &&
              rowDay.getTime() <= today.getTime()
            )
          }
          if (val === 'last_6_months') {
            const l6m = new Date(
              now.getFullYear(),
              now.getMonth() - 6,
              now.getDate(),
            )
            return (
              rowDay.getTime() >= l6m.getTime() &&
              rowDay.getTime() <= today.getTime()
            )
          }
          if (val === 'older') {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            return rowDay.getTime() < lm.getTime()
          }
          if (val === 'this_year')
            return rowDay.getFullYear() === now.getFullYear()
          if (val === 'last_year')
            return rowDay.getFullYear() === now.getFullYear() - 1
        }
        return false
      })
    }

    // 4. Check Supplier filters (OR within category)
    let matchesSupplier = true
    if (activeSupplier.length > 0) {
      matchesSupplier = activeSupplier.some((filter) => {
        const val = filter.split(':')[1].toUpperCase()
        const supplierName = String(
          findSupplierName(row) ||
            row?.vendor ||
            row?.['UtfgJy6Z0qyfRC5Bclf-c'] ||
            row?.raisedBy ||
            'Unknown Supplier',
        ).toUpperCase()
        return supplierName === val
      })
    }

    // 5. Check form / generic column filters (AND across columns, OR within column)
    let matchesGeneric = true
    if (hasGenericFilters) {
      matchesGeneric = Object.entries(genericById).every(([colId, values]) =>
        rowMatchesGenericFilter(row, colId, values),
      )
    }

    return (
      matchesStatus &&
      matchesAmount &&
      matchesDueDate &&
      matchesSupplier &&
      matchesGeneric
    )
  })
}

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
      lowerKey === 'po_no' ||
      lowerKey === 'pono' ||
      lowerKey === 'po no' ||
      lowerKey === 'purchase_order' ||
      lowerKey === 'purchaseorder' ||
      lowerKey === 'purchase_order_number' ||
      lowerKey === 'purchaseorder_number' ||
      lowerKey === 'purchase order number' ||
      lowerKey === 'purchase_order_no' ||
      lowerKey === 'purchaseorder_no' ||
      lowerKey === 'purchase order no' ||
      lowerKey === 'rxwlghillrremmrqlk9mj' ||
      lowerKey.includes('purchase order') ||
      lowerKey.includes('purchase_order') ||
      lowerKey.includes('purchaseorder')

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
  const agentData =
    row._agentResponse || row._agentData?.[0] || row._agentData || {}
  const parsedForm = getParsedFormData(row)

  if (parsedForm['RXwLGHILLrreMmRqlk9mj']) {
    return String(parsedForm['RXwLGHILLrreMmRqlk9mj'])
  }

  const fromForm =
    findPONumberInObject(row.formData?.fields) ||
    findPONumberInObject(row.formData) ||
    findPONumberInObject(parsedForm)
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

const findInvoiceNumber = (row: any): string | null => {
  if (!row) return null
  const parsedForm = getParsedFormData(row)

  const searchInObj = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null

    const directKeys = [
      'kvcYuknkDumkTenjvrVLj',
      'Invoice No',
      'Invoice No.',
      'Invoice Number',
      'Invoice_No',
      'Invoice_Number',
      'InvoiceNo',
      'InvoiceNumber',
    ]
    for (const key of directKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const val = String(obj[key]).trim()
        if (val !== '' && val !== '-') return val
      }
    }

    for (const key of Object.keys(obj)) {
      const k = key
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim()
      if (k === 'invoiceno' || k === 'invoicenumber' || k === 'invoicenum') {
        const val = obj[key]
        if (
          val &&
          typeof val !== 'object' &&
          String(val).trim() !== '' &&
          String(val).trim() !== '-'
        ) {
          return String(val).trim()
        }
      }
    }
    return null
  }

  const fromForm = searchInObj(parsedForm)
  if (fromForm) return fromForm

  const agentData =
    row._agentResponse || row._agentData?.[0] || row._agentData || {}
  const fromAgent = searchInObj(agentData)
  if (fromAgent) return fromAgent

  const invoiceHeader = agentData?.['Extracted Invoice JSON']?.invoice_header
  if (invoiceHeader) {
    const fromHeader = searchInObj(invoiceHeader)
    if (fromHeader) return fromHeader
  }

  return null
}

const getRowColumnValue = (row: any, colId: string): string => {
  if (!row) return ''
  const id = colId.toLowerCase()

  if (id === 'requestno' || id === 'invoicenumber') {
    const val = findInvoiceNumber(row)
    if (val && val !== '-') return val
    const fallback =
      row.documentNumber ||
      row.invoiceNo ||
      row.invoiceNumber ||
      row.reqNo ||
      row.requestNo ||
      row.document_number ||
      ''
    return String(fallback)
  }

  if (id === 'amount' || id === 'invoiceamount') {
    return String(findInvoiceAmount(row) || '')
  }

  if (id === 'vendor' || id === 'supplier' || id === 'suppliername') {
    const val = findSupplierName(row)
    if (val && val !== '-') return val
    const fallback =
      row.vendor || row.supplier || row.supplierName || row.vendorName || ''
    return String(fallback)
  }

  if (id === 'ponumber') {
    const val = extractPONumber(row)
    if (val && val !== 'N/A' && val !== '-') return val
    const fallback = row.poNumber || row.poNo || ''
    return String(fallback)
  }

  if (id === 'invoicedate') {
    const agentData =
      row._agentResponse || row._agentData?.[0] || row._agentData || {}
    const fromAgent =
      agentData?.['Extracted Invoice JSON']?.invoice_header?.['Invoice Date'] ||
      agentData?.['Extracted Invoice JSON']?.invoice_header?.['Invoice_Date'] ||
      agentData?.['Extracted Invoice JSON']?.invoice_header?.['InvoiceDate']
    if (fromAgent) return String(fromAgent)

    return String(
      row.invoiceDate ||
        row.documentDate ||
        row.raisedAt ||
        row.createdAt ||
        '',
    )
  }

  if (id === 'raisedby' || id === 'createdby') {
    return String(
      row.raisedBy || row.createdBy || row.performedByUserName || '',
    )
  }

  if (id === 'status' || id === 'matchstatus' || id === 'decision') {
    return String(row.decision || row.status || row.stage || '')
  }

  const parsedForm = getParsedFormData(row)
  if (parsedForm[colId] !== undefined) {
    return String(parsedForm[colId] || '')
  }

  return String(row[colId] || '')
}

const InboxList: React.FC<InboxListProps> = ({
  activeTab,
  data,
  isLoading,
  isRefetching,
  page,
  pageSize,
  selectedItem,
  totalItems,
  viewMode,
  workflow,
  setPage,
  setPageSize,
  setViewMode,
  onGroupByChange,
  onRefresh,
  onRowClick,
}) => {
  const openNewRequest = requestStore((state) => state.openNewRequest)
  const columns =
    useDynamicColumns(workflow, onRowClick, selectedItem, activeTab) || []
  // const [rowSize, setRowSize] = useState<RowSize>('default')

  const initialVisibilityState = {
    createdAt: false,
    createdBy: false,
    updatedAt: false,
    updatedBy: false,
  }

  const {
    expandState,
    filtersState,
    groupState,
    searchState,
    sortState,
    setExpandState,
    setFiltersState,
    setSearchState,
    ...rest
  } = useDataTableState({
    initialVisibilityState,
  })

  // ✅ Sync groupState with parent
  React.useEffect(() => {
    if (onGroupByChange) {
      onGroupByChange(groupState)
    }
  }, [groupState, onGroupByChange])

  // ✅ Use your actual API shape: data[0].items etc.
  const flatRows = useMemo(() => flattenRows(data as any), [data])

  const activeQuickFilters = requestStore((state) => state.activeQuickFilters)

  const supplierNames = useMemo(() => {
    const set = new Set<string>()
    flatRows.forEach((row: any) => {
      const name = findSupplierName(row) || row?.vendor || row?.raisedBy
      if (name && name !== 'Unknown Supplier' && name !== '-') {
        set.add(name)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [flatRows])

  const amountRangeOptions = useMemo(
    () => getAmountRangeOptions(flatRows),
    [flatRows],
  )

  const activeFiltersMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    activeQuickFilters.forEach((f) => {
      if (f.startsWith('status:')) {
        map.status = map.status || []
        map.status.push(f.replace('status:', ''))
      } else if (f.startsWith('amount:')) {
        map.amount = map.amount || []
        map.amount.push(f.replace('amount:', ''))
      } else if (f.startsWith('supplier:')) {
        map.supplier = map.supplier || []
        map.supplier.push(f.replace('supplier:', ''))
      } else if (f === 'matched') {
        map.status = map.status || []
        map.status.push('MATCHED')
      } else if (f === 'discrepancies') {
        map.status = map.status || []
        map.status.push('NOT_MATCHED')
      } else if (f === 'discrepancies:NOT_MATCHED') {
        map.status = map.status || []
        map.status.push('NOT_MATCHED')
      } else if (f === 'discrepancies:PARTIALLY_MATCHED') {
        map.status = map.status || []
        map.status.push('PARTIALLY_MATCHED')
      } else if (f === 'overdue' || f.startsWith('due_date:')) {
        map.due_date = map.due_date || []
        map.due_date.push(
          f === 'overdue' ? 'overdue' : f.replace('due_date:', ''),
        )
      } else if (f.startsWith('overdue:')) {
        map.due_date = map.due_date || []
        map.due_date.push(f.replace('overdue:', ''))
      } else if (!isKnownQuickFilterToken(f) && f.includes(':')) {
        const idx = f.indexOf(':')
        const id = f.slice(0, idx)
        const val = f.slice(idx + 1)
        if (id && val) {
          map[id] = map[id] || []
          map[id].push(val)
        }
      }
    })
    return map
  }, [activeQuickFilters])

  const optionalFilterFields = useMemo<DynamicFilterField[]>(() => {
    const skipIds = new Set([
      'actions',
      'Supplier Name',
      'supplier',
      'vendor',
      'amount',
      'Invoice Value',
      'Total Value',
    ])
    const fields: DynamicFilterField[] = []
    const seen = new Set<string>()

    for (const col of columns as Array<{
      id?: string
      isDisplayColumn?: boolean
      label?: string
    }>) {
      if (!col?.id || col.isDisplayColumn || skipIds.has(col.id)) continue
      const label = String(col.label || col.id)
      const lower = label.toLowerCase()
      if (
        lower.includes('supplier') ||
        lower.includes('vendor') ||
        lower.includes('total value') ||
        lower.includes('invoice value') ||
        lower === 'amount'
      ) {
        continue
      }
      if (seen.has(col.id)) continue
      seen.add(col.id)
      fields.push({
        id: col.id,
        label,
        valueGetter: (row) => getRowColumnValue(row, col.id as string),
      })
    }

    return fields
  }, [columns])

  const handleFilterChange = (id: string, values: string | string[]) => {
    const store = requestStore.getState()
    const newFilters = store.activeQuickFilters.filter(
      (f) =>
        !f.startsWith(`${id}:`) &&
        !f.startsWith(`overdue:`) &&
        !f.startsWith(`discrepancies:`) &&
        !['matched', 'discrepancies', 'highValue', 'overdue'].includes(f),
    )

    const vals = Array.isArray(values) ? values : values ? [values] : []
    vals.forEach((val) => {
      if (val === 'overdue_chip_alias') {
        newFilters.push('overdue')
      } else if (id === 'status' && val === 'Pending') {
        newFilters.push(`status:Partially Approved`)
      } else {
        newFilters.push(`${id}:${val}`)
      }
    })

    store.clearQuickFilters()
    newFilters.forEach((f) => store.toggleQuickFilter(f))
  }

  const quickFilteredRows = useMemo(() => {
    if (activeTab !== 'Inbox' || activeQuickFilters.length === 0) {
      return flatRows
    }

    return filterRowsByQuickFilters(flatRows, activeQuickFilters)
  }, [flatRows, activeQuickFilters, activeTab])

  // ✅ Filter rows based on search state
  const filteredFlatRows = useMemo(() => {
    if (!searchState?.value || searchState.value.trim() === '') {
      return quickFilteredRows
    }

    const searchValue = searchState.value.toLowerCase().trim()
    const searchColumnId = searchState.id

    return quickFilteredRows.filter((row: any) => {
      // If searching in a specific column
      if (searchColumnId) {
        const valStr = getRowColumnValue(row, searchColumnId)
        return valStr.toLowerCase().includes(searchValue)
      }

      // If searching globally (all columns)
      const searchableStrings = [
        getRowColumnValue(row, 'requestNo'),
        getRowColumnValue(row, 'amount'),
        getRowColumnValue(row, 'vendor'),
        getRowColumnValue(row, 'poNumber'),
        getRowColumnValue(row, 'invoiceDate'),
        getRowColumnValue(row, 'raisedBy'),
        getRowColumnValue(row, 'status'),
      ]

      const parsedForm = getParsedFormData(row)
      Object.values(parsedForm).forEach((val) => {
        if (val != null && typeof val !== 'object') {
          searchableStrings.push(String(val))
        }
      })

      return searchableStrings.some((str) =>
        str.toLowerCase().includes(searchValue),
      )
    })
  }, [quickFilteredRows, searchState])

  // ✅ Filter rows based on columnFilters
  const columnFilteredRows = useMemo(() => {
    if (!filtersState || filtersState.length === 0) {
      return filteredFlatRows
    }

    return filteredFlatRows.filter((row: any) => {
      // All column filters must match
      return filtersState.every((filter: any) => {
        if (!filter.id || filter.value === undefined || filter.value === null)
          return true
        const filterVal = String(filter.value).toLowerCase().trim()
        if (filterVal === '') return true

        const rowVal = getRowColumnValue(row, filter.id)
        return rowVal.toLowerCase().includes(filterVal)
      })
    })
  }, [filteredFlatRows, filtersState])

  // ✅ Rebuild grouped data structure with filtered rows
  const filteredData = useMemo(() => {
    if (!data) return data

    const hasSearch = searchState?.value && searchState.value.trim() !== ''
    const hasQuickFilters = activeQuickFilters && activeQuickFilters.length > 0
    const hasColumnFilters = filtersState && filtersState.length > 0

    if (!hasSearch && !hasQuickFilters && !hasColumnFilters) {
      return data
    }

    // Create a Set of filtered row IDs for fast lookup
    const filteredIds = new Set(
      columnFilteredRows.map(
        (row: any) => row.id || row.transactionId || row.processId,
      ),
    )

    // Filter the grouped data structure
    return data
      .map((group: any) => {
        if (!group.items || !Array.isArray(group.items)) return group

        return {
          ...group,
          items: group.items.filter((item: any) =>
            filteredIds.has(item.id || item.transactionId || item.processId),
          ),
        }
      })
      .filter((group: any) => !group.items || group.items.length > 0)
  }, [data, searchState, activeQuickFilters, filtersState, columnFilteredRows])

  // Inject processing processes from store
  const processingProcesses = requestStore((state) => state.processingProcesses)

  const finalData = useMemo(() => {
    if (
      activeTab !== 'Inbox' ||
      !processingProcesses ||
      processingProcesses.length === 0
    ) {
      return filteredData
    }

    const existingIds = new Set()
    const outData = (filteredData || []).map((g) => {
      g.items?.forEach((i: any) => existingIds.add(String(i.processId || i.id)))
      return { ...g, items: [...(g.items || [])] }
    })

    const newProcessingItems = processingProcesses
      .filter((p) => !existingIds.has(String(p.processId || p.id)))
      .map((p) => {
        const rowId = p.processId || p.id
        const jobStatuses = requestStore.getState().jobStatuses || {}
        const jobMappings = requestStore.getState().jobMappings || {}

        let matchedJobStatus = jobStatuses[String(rowId)]
        if (!matchedJobStatus && p.apAgentJobId) {
          const mappedJobId = jobMappings[String(p.apAgentJobId)]
          if (mappedJobId) {
            matchedJobStatus =
              jobStatuses[String(mappedJobId)] ||
              jobStatuses[`job-${mappedJobId}`]
          }
          if (!matchedJobStatus) {
            matchedJobStatus = jobStatuses[`job-${p.apAgentJobId}`]
          }
        }

        const isCompleted =
          matchedJobStatus?.isCompleted || p.isCompleted || false

        // Extract values from matchedJobStatus / p / agentResponse if available
        const agentResponse =
          matchedJobStatus || p.agentResponse || p._agentResponse || null
        let parsedAgentResponse = null
        if (agentResponse) {
          if (typeof agentResponse === 'string') {
            try {
              parsedAgentResponse = JSON.parse(agentResponse)
            } catch {}
          } else if (typeof agentResponse === 'object') {
            parsedAgentResponse = agentResponse
          }
        }

        // Extract OCR fields like supplier, amount, currency, invoice date, invoice number
        const ocrData =
          parsedAgentResponse?.['Extracted Invoice JSON'] ||
          parsedAgentResponse?.extractedInvoiceJson ||
          {}
        const invoiceHeader = ocrData?.invoice_header || {}

        const invoiceValue =
          invoiceHeader?.['Invoice Amount'] ||
          invoiceHeader?.['Total Due'] ||
          invoiceHeader?.['Total'] ||
          invoiceHeader?.['invoice_amount'] ||
          invoiceHeader?.['total_amount'] ||
          parsedAgentResponse?.invoice_amount ||
          p['Invoice Value'] ||
          ''
        const invoiceNo =
          invoiceHeader?.['Invoice Number'] ||
          invoiceHeader?.['Invoice No'] ||
          invoiceHeader?.['invoice_number'] ||
          parsedAgentResponse?.invoice_number ||
          p['Invoice Number'] ||
          ''
        const supplierName =
          invoiceHeader?.['Supplier Name'] ||
          invoiceHeader?.['Vendor Name'] ||
          invoiceHeader?.['vendor'] ||
          parsedAgentResponse?.vendor ||
          p['Supplier Name'] ||
          ''
        const poValue =
          invoiceHeader?.['PO Value'] ||
          invoiceHeader?.['PO Amount'] ||
          invoiceHeader?.['po_value'] ||
          invoiceHeader?.['po_amount'] ||
          parsedAgentResponse?.po_amount ||
          p['PO Value'] ||
          ''
        const currency =
          invoiceHeader?.['Currency'] ||
          parsedAgentResponse?.currency ||
          p['Currency'] ||
          'USD'

        const status = isCompleted
          ? parsedAgentResponse?.decision || p.status || 'Matched'
          : 'Progressing'
        const stage = matchedJobStatus?.stage || p.stage || 'Start'

        return {
          ...p,
          '_agentData': parsedAgentResponse ? [parsedAgentResponse] : [],
          '_agentResponse': parsedAgentResponse,
          '_groupKey': 'root',
          'Currency': currency,
          'documentNumber':
            invoiceNo || p.requestNo || p.name || 'Processing...',
          'id': rowId,
          'Invoice Number': invoiceNo,
          // Merge extracted values
          'Invoice Value': invoiceValue,
          'isProcessing': !isCompleted,
          'PO Value': poValue,
          'processId': rowId,
          'raisedAt': p.raisedAt || new Date().toISOString(),
          'stage': stage,
          'status': status,
          'Supplier Name': supplierName,
        }
      })

    if (newProcessingItems.length > 0) {
      const rootGroup = outData.find((g) => g.groupId === 'root')
      if (rootGroup) {
        rootGroup.items.unshift(...newProcessingItems)
        rootGroup.groupCount = rootGroup.items.length
      } else {
        outData.unshift({
          groupCount: newProcessingItems.length,
          groupId: 'root',
          groupKey: 'root',
          groupValue: 'root',
          items: newProcessingItems,
        })
      }
    }

    return outData
  }, [filteredData, processingProcesses, activeTab])

  // ✅ Flatten final data to render flat table rows when viewMode is 'table'
  const flatFinalRows = useMemo(() => {
    const items: any[] = []
    finalData.forEach((group: any) => {
      if (Array.isArray(group.items)) {
        items.push(...group.items)
      }
    })
    return items
  }, [finalData])

  // ✅ Handle default expansion: Expand ALL groups when data or grouping changes
  // ✅ Handle default expansion: Default to COLLAPSED
  React.useEffect(() => {
    // User requested default collapsed state
    setExpandState({})
  }, [filteredData, groupState, setExpandState])

  // ✅ Create table with filtered data
  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: (viewMode === 'table'
      ? [{ items: flatFinalRows }]
      : finalData) as any,

    state: {
      expandState,
      filtersState,
      groupState,
      searchState,
      sortState,
      setExpandState,
      setFiltersState,
      setSearchState,
      ...rest,
    },
  })

  // Debug (keep for a bit until stable)
  // console.log({ selectedIndex, hasPrev, hasNext, flatRowsLen: flatRows.length, selectedItem }, 'nav-debug')
  const handlePoSheet = () => {
    // alert("hi")
    openNewRequest('po')
  }
  return (
    <div className='bg-primary flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-2 md:px-6'>
      {!selectedItem && activeTab === 'Inbox' && (
        <DynamicFilter
          activeQuickFilters={activeQuickFilters}
          customSearchComponent={<TableSearch table={table as any} />}
          dataset={flatRows}
          isLoading={isLoading || isRefetching}
          optionalFields={optionalFilterFields}
          searchPlaceholder='Search invoice, supplier, PO...'
          searchQuery={searchState?.value || ''}
          viewMode={viewMode}
          activeFilters={{
            ...Object.fromEntries(
              Object.entries(activeFiltersMap).filter(([key]) => key !== 'amount'),
            ),
            'due_date': activeFiltersMap.due_date || [],
            'status': activeFiltersMap.status || [],
            'Supplier Name': activeFiltersMap.supplier || [],
          }}
          fields={[
            {
              id: 'Supplier Name',
              label: 'Supplier',
              valueGetter: (row) => getRowColumnValue(row, 'vendor'),
            },
          ]}
          quickFilters={[
            {
              icon: 'tabler:calendar-due',
              id: 'due_date',
              label: 'Due Date',
              options: DUE_DATE_FILTER_OPTIONS,
              type: 'date',
            },
            {
              icon: 'tabler:circle-check',
              id: 'matched',
              label: 'Matched',
            },
            {
              icon: 'tabler:alert-triangle',
              id: 'discrepancies',
              label: 'Discrepancies',
              options: [
                {
                  label: 'All',
                  value: 'discrepancies:discrepancies',
                },
                { label: 'Not Matched', value: 'discrepancies:NOT_MATCHED' },
                {
                  label: 'Partially Matched',
                  value: 'discrepancies:PARTIALLY_MATCHED',
                },
              ],
              type: 'category',
            },
            {
              icon: 'tabler:currency-dollar',
              id: 'highValue',
              label: 'High Value',
              options: amountRangeOptions,
              type: 'number',
            },
          ]}
          toolbarActions={[
            {
              icon: 'tabler:refresh',
              id: 'refresh',
              isIconButton: true,
              tooltip: 'Refresh',
              onClick: onRefresh,
            },
            {
              icon: 'tabler:download',
              id: 'export',
              isIconButton: true,
              tooltip: 'Export',
              onClick: () => {},
            },
            {
              icon: 'tabler:upload',
              id: 'upload-po',
              isIconButton: true,
              tooltip: 'Import PO Data',
              onClick: handlePoSheet,
            },
          ]}
          onClearAll={() => {
            requestStore.getState().clearQuickFilters()
          }}
          onFilterChange={(id, values) => {
            let mappedId = id
            if (id === 'Supplier Name') mappedId = 'supplier'
            if (id === 'Invoice Value') mappedId = 'amount'
            const finalValues = (Array.isArray(values) ? values : [values]).map(
              (v) => {
                if (mappedId === 'due_date' && v === 'overdue')
                  return 'overdue_chip_alias'
                return v
              },
            )
            handleFilterChange(mappedId, finalValues)
          }}
          onQuickFilterToggle={(id) =>
            requestStore.getState().toggleQuickFilter(id)
          }
          onSearchChange={(val) => {
            if (setSearchState) setSearchState({ id: '', value: val })
          }}
          onViewModeChange={setViewMode}
        />
      )}
      <div className='relative mt-2 flex min-h-0 w-full flex-1 flex-col'>
        <div className='flex h-full w-full gap-3'>
          {/* Left */}
          {!selectedItem && viewMode === 'table' && (
            <div className='flex h-full min-w-0 flex-1 flex-col'>
              <DataTable
                actions={[]}
                component={selectedItem}
                emptyPage='requests'
                hideActionBar={true}
                hideExport={true}
                hideFilters={true}
                hideGrouping={true}
                hideReload={true}
                hideSearch={true}
                isLoading={isLoading}
                isReLoading={isRefetching}
                pageSize={pageSize}
                // rowSize={rowSize}
                // onRowSizeChange={setRowSize}
                stickyHeader={true}
                table={table}
                onEmptyPrimaryAction={() => openNewRequest('request')}
                onReload={onRefresh}
              />
            </div>
          )}

          {!selectedItem && viewMode === 'grid' && (
            <div className='h-full min-w-0 flex-1 overflow-hidden'>
              <GridView
                actions={[]}
                activeTab={activeTab}
                data={finalData} // ✅ Use final data
                hideExport={true}
                hideGrouping={activeTab !== 'Inbox'}
                hideReload={true}
                isLoading={isLoading}
                isReloading={isRefetching}
                table={table} // Pass the instance
                onNewRequest={() => openNewRequest('request')}
                onReload={onRefresh}
                onRowClick={onRowClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {!selectedItem && (
        <div className='z-10 shrink-0 bg-primary-1 pt-2'>
          <Pagination
            itemLabel='Requests'
            page={page}
            pageSize={pageSize}
            showPageNumbers={false}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  )
}

export default InboxList
