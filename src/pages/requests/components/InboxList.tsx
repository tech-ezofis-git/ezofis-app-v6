import React, { useMemo, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Pagination from '@/components/base/pagination/Pagination'
import type { TableGroup, WorkflowOption } from '../types'
import requestStore from '../stores/useRequestStore'
import { useDynamicColumns } from './columns/useDynamicColumns'
import GridView from './GridView'
import DynamicFilter from '@/components/common/DynamicFilter'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
// import TableSort from '@/components/base/data-table/actions/TableSort'
// import TableColumns from '@/components/base/data-table/actions/TableColumns'
// import TableRows from '@/components/base/data-table/actions/TableRows'
// import type { RowSize } from '@/components/base/data-table/types'
import ExportButton from './buttons/ExportButton'
import RefreshButton from './buttons/RefreshButton'
import UploadPoButton from './buttons/UploadPoButton'
import Tooltip from '@/components/base/Tooltip'

interface InboxListProps {
  data: TableGroup[]
  isLoading: boolean
  isRefetching: boolean
  page: number
  pageSize: number
  selectedItem: any
  totalItems: number
  viewMode: 'table' | 'grid'
  setViewMode: (mode: 'table' | 'grid') => void
  workflow: WorkflowOption | null
  activeTab?: string
  setPage: (p: number) => void
  setPageSize: (s: number) => void
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

    ; (groups || []).forEach(walk)
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

const extractDueDate = (row: any): string => {
  if (!row) return '-'
  const agentData = row._agentData?.[0] || row._agentData || {}
  const parsedForm = getParsedFormData(row)

  let val =
    parsedForm['Due Date'] ||
    parsedForm['due_date'] ||
    parsedForm['Due_Date'] ||
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

  if ((!val || val === '-') && parsedForm['9F6tPVHoRnmONGx3kYJu2']) {
    const invDateStr = parsedForm['9F6tPVHoRnmONGx3kYJu2']
    const termsStr = parsedForm['vxnKCXsXkz8_acPogKe'] || ''
    const numMatch = /\d+/.exec(termsStr)
    if (numMatch) {
      const days = Number.parseInt(numMatch[0], 10)
      try {
        const d = new Date(invDateStr)
        if (!Number.isNaN(d.getTime())) {
          d.setDate(d.getDate() + days)
          val = d.toISOString().split('T')[0]
        }
      } catch (error) {
        console.debug('Failed to parse date fallback:', error)
      }
    }
  }

  if (!val || val === '-') return '-'
  return String(val)
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

const filterRowsByQuickFilters = (
  rows: any[],
  activeQuickFilters: string[],
  excludeCategory?: 'status' | 'amount' | 'overdue',
) => {
  const activeStatus = activeQuickFilters.filter(
    (f) => f === 'matched' || f === 'discrepancies' || f.startsWith('status:') || f.startsWith('discrepancies:'),
  )
  const activeAmount = activeQuickFilters.filter(
    (f) => f === 'highValue' || f.startsWith('amount:'),
  )
  const activeDueDate = activeQuickFilters.filter((f) => f === 'overdue' || f.startsWith('due_date:') || f.startsWith('overdue:'))
  const activeSupplier = activeQuickFilters.filter((f) =>
    f.startsWith('supplier:'),
  )

  if (
    (excludeCategory === 'status' || activeStatus.length === 0) &&
    (excludeCategory === 'amount' || activeAmount.length === 0) &&
    (excludeCategory === 'overdue' || activeDueDate.length === 0) &&
    activeSupplier.length === 0
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

    const isMtc = rawDecision === 'APPROVED' || rawDecision === 'MATCHED'
    const isDisc =
      rawDecision === 'PARTIALLY APPROVED' ||
      rawDecision === 'PARTIALLY MATCHED' ||
      rawDecision === 'REJECTED' ||
      rawDecision === 'NOT MATCHED' ||
      rawDecision === 'NO MATCH' ||
      row.isDuplicateInvoice === true

    const amtStr = findInvoiceAmount(row)
    const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
    const isHigh = amount >= dynamicHighValue

    // 1. Check Status filters (OR within category)
    let matchesStatus = true
    if (excludeCategory !== 'status' && activeStatus.length > 0) {
      matchesStatus = activeStatus.some((filter) => {
        if (filter === 'matched') return isMtc
        if (filter === 'discrepancies') return isDisc
        if (filter.startsWith('status:') || filter.startsWith('discrepancies:')) {
          const parts = filter.split(':');
          parts.shift();
          const val = parts.join(':').toUpperCase()
          if (val === 'APPROVED' || val === 'MATCHED') {
            return rawDecision === 'APPROVED' || rawDecision === 'MATCHED' || rawDecision === 'FULLY MATCHED' || rawDecision === 'FULLY_MATCHED'
          }
          if (val === 'PARTIALLY APPROVED' || val === 'PARTIALLY MATCHED' || val === 'PARTIALLY_MATCHED' || val === 'PENDING') {
            return (
              rawDecision === 'PARTIALLY APPROVED' ||
              rawDecision === 'PARTIALLY MATCHED' ||
              rawDecision === 'PARTIALLY_APPROVED' ||
              rawDecision === 'PARTIALLY_MATCHED' ||
              rawDecision === 'PARTIAL MATCH' ||
              rawDecision === 'PENDING'
            )
          }
          if (val === 'NOT MATCHED' || val === 'NOT_MATCHED' || val === 'REJECTED') {
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
          const isOverdueCheck = filter.startsWith('overdue:');
          const parts = filter.split(':');
          parts.shift();
          const val = parts.join(':');
          
          if (isOverdueCheck && !isOvr) return false;
          if (val === 'overdue') return isOvr;
          
          const rowDateStr = extractDueDate(row)
          if (!rowDateStr || rowDateStr === '-') {
            // If there's no due date, the UI treats it as "0 days immediate".
            // The user expects this to be caught by the "Today" filter.
            if (val === 'today') return true
            return false
          }
          
          let rowDay: Date;
          if (rowDateStr.includes('-')) {
             const [y, m, d] = rowDateStr.split('-').map(Number);
             rowDay = new Date(y, m - 1, d);
          } else {
             const fallback = new Date(rowDateStr);
             rowDay = new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
          }
          if (isNaN(rowDay.getTime())) return false

          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

          if (val.startsWith('custom:')) {
            const [startStr, endStr] = val.replace('custom:', '').split('_');
            const [sy, sm, sd] = startStr.split('-').map(Number);
            const [ey, em, ed] = endStr.split('-').map(Number);
            const start = new Date(sy, sm - 1, sd).getTime();
            const end = new Date(ey, em - 1, ed).getTime();
            return rowDay.getTime() >= start && rowDay.getTime() <= end;
          }

          if (val === 'today') return rowDay.getTime() === today.getTime()
          if (val === 'tomorrow') return rowDay.getTime() === today.getTime() + 86400000
          if (val === 'next_7_days') return rowDay.getTime() >= today.getTime() && rowDay.getTime() <= today.getTime() + 7 * 86400000
          if (val === 'next_30_days') return rowDay.getTime() >= today.getTime() && rowDay.getTime() <= today.getTime() + 30 * 86400000
          
          if (val === 'this_week') {
            const startOfWeek = new Date(today.getTime() - today.getDay() * 86400000)
            const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000)
            return rowDay.getTime() >= startOfWeek.getTime() && rowDay.getTime() <= endOfWeek.getTime()
          }
          if (val === 'this_month') return rowDay.getFullYear() === now.getFullYear() && rowDay.getMonth() === now.getMonth()
          if (val === 'next_month') {
            const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1)
            return rowDay.getFullYear() === nm.getFullYear() && rowDay.getMonth() === nm.getMonth()
          }
          if (val === 'last_week') return rowDay.getTime() >= today.getTime() - 7 * 86400000 && rowDay.getTime() <= today.getTime()
          if (val === 'last_month') {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            return rowDay.getFullYear() === lm.getFullYear() && rowDay.getMonth() === lm.getMonth()
          }
          if (val === 'last_3_months') {
            const l3m = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
            return rowDay.getTime() >= l3m.getTime() && rowDay.getTime() <= today.getTime()
          }
          if (val === 'last_6_months') {
            const l6m = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
            return rowDay.getTime() >= l6m.getTime() && rowDay.getTime() <= today.getTime()
          }
          if (val === 'older') {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            return rowDay.getTime() < lm.getTime()
          }
          if (val === 'this_year') return rowDay.getFullYear() === now.getFullYear()
          if (val === 'last_year') return rowDay.getFullYear() === now.getFullYear() - 1
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

    return matchesStatus && matchesAmount && matchesDueDate && matchesSupplier
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
  setViewMode,
  workflow,
  setPage,
  setPageSize,
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

  const counts = useMemo(() => {
    // For overdue count, filter by Status and Amount (ignore Overdue)
    const overdueRows = filterRowsByQuickFilters(
      flatRows,
      activeQuickFilters,
      'overdue',
    )
    let overdue = 0
    overdueRows.forEach((row) => {
      if (isOverdue(row)) overdue++
    })

    // For status counts, filter by Amount and Overdue (ignore Status)
    const statusRows = filterRowsByQuickFilters(
      flatRows,
      activeQuickFilters,
      'status',
    )
    let matched = 0
    let discrepancies = 0
    statusRows.forEach((row) => {
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

      if (rawDecision === 'APPROVED' || rawDecision === 'MATCHED') {
        matched++
      }

      if (
        rawDecision === 'PARTIALLY APPROVED' ||
        rawDecision === 'PARTIALLY MATCHED' ||
        rawDecision === 'REJECTED' ||
        rawDecision === 'NOT MATCHED' ||
        rawDecision === 'NO MATCH' ||
        row.isDuplicateInvoice === true
      ) {
        discrepancies++
      }
    })

    // For amount counts, filter by Status and Overdue (ignore Amount)
    const amountRows = filterRowsByQuickFilters(
      flatRows,
      activeQuickFilters,
      'amount',
    )
    let highValue = 0
    const dynamicHighValue = getHighValueThreshold(flatRows)
    amountRows.forEach((row) => {
      const amtStr = findInvoiceAmount(row)
      const amount = amtStr ? Number(amtStr.replace(/[^0-9.-]/g, '')) : 0
      if (amount >= dynamicHighValue) {
        highValue++
      }
    })

    return { discrepancies, highValue, matched, overdue }
  }, [flatRows, activeQuickFilters])

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

  const activeFiltersMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    activeQuickFilters.forEach(f => {
      if (f.startsWith('status:')) { map.status = map.status || []; map.status.push(f.replace('status:', '')) }
      if (f.startsWith('amount:')) { map.amount = map.amount || []; map.amount.push(f.replace('amount:', '')) }
      if (f.startsWith('supplier:')) { map.supplier = map.supplier || []; map.supplier.push(f.replace('supplier:', '')) }
      if (f === 'matched') { map.status = map.status || []; map.status.push('MATCHED') }
      if (f === 'discrepancies') { map.status = map.status || []; map.status.push('NOT_MATCHED') }
      if (f === 'discrepancies:NOT_MATCHED') { map.status = map.status || []; map.status.push('NOT_MATCHED') }
      if (f === 'discrepancies:PARTIALLY_MATCHED') { map.status = map.status || []; map.status.push('PARTIALLY_MATCHED') }
      if (f === 'highValue') { map.amount = map.amount || []; map.amount.push('ge10k') }
      if (f === 'overdue' || f.startsWith('due_date:')) {
        map.due_date = map.due_date || [];
        map.due_date.push(f === 'overdue' ? 'overdue' : f.replace('due_date:', ''));
      }
      if (f.startsWith('overdue:')) {
        map.due_date = map.due_date || [];
        map.due_date.push(f.replace('overdue:', ''));
      }
    })
    return map
  }, [activeQuickFilters])

  const handleFilterChange = (id: string, values: string | string[]) => {
    const store = requestStore.getState()
    const newFilters = store.activeQuickFilters.filter(f => !f.startsWith(`${id}:`) && !f.startsWith(`overdue:`) && !f.startsWith(`discrepancies:`) && !['matched', 'discrepancies', 'highValue', 'overdue'].includes(f))

    const vals = Array.isArray(values) ? values : (values ? [values] : [])
    vals.forEach(val => {
      if (val === 'overdue_chip_alias') {
        newFilters.push('overdue')
      } else if (id === 'status' && val === 'Pending') {
        newFilters.push(`status:Partially Approved`)
      } else {
        newFilters.push(`${id}:${val}`)
      }
    })

    store.clearQuickFilters()
    newFilters.forEach(f => store.toggleQuickFilter(f))
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
            matchedJobStatus = jobStatuses[String(mappedJobId)] || jobStatuses[`job-${mappedJobId}`]
          }
          if (!matchedJobStatus) {
            matchedJobStatus = jobStatuses[`job-${p.apAgentJobId}`]
          }
        }

        const isCompleted = matchedJobStatus?.isCompleted || p.isCompleted || false

        // Extract values from matchedJobStatus / p / agentResponse if available
        const agentResponse = matchedJobStatus || p.agentResponse || p._agentResponse || null
        let parsedAgentResponse = null
        if (agentResponse) {
          if (typeof agentResponse === 'string') {
            try {
              parsedAgentResponse = JSON.parse(agentResponse)
            } catch { }
          } else if (typeof agentResponse === 'object') {
            parsedAgentResponse = agentResponse
          }
        }

        // Extract OCR fields like supplier, amount, currency, invoice date, invoice number
        const ocrData = parsedAgentResponse?.['Extracted Invoice JSON'] || parsedAgentResponse?.extractedInvoiceJson || {}
        const invoiceHeader = ocrData?.invoice_header || {}

        const invoiceValue = invoiceHeader?.['Invoice Amount'] || invoiceHeader?.['Total Due'] || invoiceHeader?.['Total'] || invoiceHeader?.['invoice_amount'] || invoiceHeader?.['total_amount'] || parsedAgentResponse?.invoice_amount || p['Invoice Value'] || ''
        const invoiceNo = invoiceHeader?.['Invoice Number'] || invoiceHeader?.['Invoice No'] || invoiceHeader?.['invoice_number'] || parsedAgentResponse?.invoice_number || p['Invoice Number'] || ''
        const supplierName = invoiceHeader?.['Supplier Name'] || invoiceHeader?.['Vendor Name'] || invoiceHeader?.['vendor'] || parsedAgentResponse?.vendor || p['Supplier Name'] || ''
        const poValue = invoiceHeader?.['PO Value'] || invoiceHeader?.['PO Amount'] || invoiceHeader?.['po_value'] || invoiceHeader?.['po_amount'] || parsedAgentResponse?.po_amount || p['PO Value'] || ''
        const currency = invoiceHeader?.['Currency'] || parsedAgentResponse?.currency || p['Currency'] || 'USD'

        const status = isCompleted ? (parsedAgentResponse?.decision || p.status || 'Matched') : 'Progressing'
        const stage = matchedJobStatus?.stage || p.stage || 'Start'

        return {
          ...p,
          _groupKey: 'root',
          documentNumber: invoiceNo || p.requestNo || p.name || 'Processing...',
          id: rowId,
          isProcessing: !isCompleted,
          processId: rowId,
          raisedAt: p.raisedAt || new Date().toISOString(),
          stage: stage,
          status: status,
          // Merge extracted values
          'Invoice Value': invoiceValue,
          'Invoice Number': invoiceNo,
          'Supplier Name': supplierName,
          'PO Value': poValue,
          'Currency': currency,
          _agentResponse: parsedAgentResponse,
          _agentData: parsedAgentResponse ? [parsedAgentResponse] : [],
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
          dataset={flatRows}
          quickFilters={[
            { 
              id: 'overdue', 
              label: 'Overdue', 
              icon: 'tabler:clock', 
              count: counts.overdue,
              type: 'date',
              options: [
                { label: 'All Overdue', value: 'overdue' },
                { label: 'This Week', value: 'this_week' },
                { label: 'Last Month', value: 'last_month' },
                { label: 'Last 3 Months', value: 'last_3_months' },
                { label: 'Last 6 Months', value: 'last_6_months' },
                { label: 'Last Year', value: 'last_year' },
                { label: 'Custom Range', value: 'custom' }
              ]
            },
            { id: 'matched', label: 'Auto-Matched', icon: 'tabler:circle-check', count: counts.matched },
            { 
              id: 'discrepancies', 
              label: 'Discrepancies', 
              icon: 'tabler:alert-triangle', 
              count: counts.discrepancies,
              type: 'category',
              options: [
                { label: 'All Discrepancies', value: 'discrepancies:discrepancies' },
                { label: 'Not Matched', value: 'discrepancies:NOT_MATCHED' },
                { label: 'Partially Matched', value: 'discrepancies:PARTIALLY_MATCHED' }
              ]
            },
            { 
              id: 'highValue', 
              label: `High Value (≥$${getHighValueThreshold(flatRows) >= 1000 ? getHighValueThreshold(flatRows) / 1000 + 'k' : getHighValueThreshold(flatRows)})`, 
              icon: 'tabler:currency-dollar', 
              count: counts.highValue 
            }
          ]}
          activeQuickFilters={activeQuickFilters}
          onQuickFilterToggle={(id) => requestStore.getState().toggleQuickFilter(id)}
          fields={[
            { 
              id: 'status', 
              label: 'Request Status',
              options: [
                { label: 'Matched', value: 'MATCHED' },
                { label: 'Not Matched', value: 'NOT_MATCHED' },
                { label: 'Partially Matched', value: 'PARTIALLY_MATCHED' }
              ]
            },
            { 
              id: 'Supplier Name', 
              label: 'Supplier',
              valueGetter: (row) => getRowColumnValue(row, 'vendor')
            },
            { 
              id: 'Invoice Value', 
              label: 'PO Amount', 
              type: 'number',
              valueGetter: (row) => {
                const amt = findInvoiceAmount(row);
                return amt ? Number(amt.replace(/[^0-9.-]/g, '')) : null;
              }
            },
            {
              id: 'due_date',
              label: 'Due Date',
              type: 'date',
              valueGetter: (row) => extractDueDate(row)
            }
          ]}
          activeFilters={{
            'status': activeFiltersMap.status || [],
            'Supplier Name': activeFiltersMap.supplier || [],
            'Invoice Value': activeFiltersMap.amount || [],
            'due_date': activeFiltersMap.due_date || []
          }}
          onFilterChange={(id, values) => {
             let mappedId = id;
             if (id === 'Supplier Name') mappedId = 'supplier';
             if (id === 'Invoice Value') mappedId = 'amount';
             // special handling: if they toggle 'overdue' via the dropdown, handleFilterChange will push due_date:overdue.
             // But we might want it to literally push the quickfilter 'overdue' instead of 'due_date:overdue'.
             const finalValues = (Array.isArray(values) ? values : [values]).map(v => {
                if (mappedId === 'due_date' && v === 'overdue') return 'overdue_chip_alias';
                return v;
             });
             
             handleFilterChange(mappedId, finalValues);
          }}
          onClearAll={() => {
            requestStore.getState().clearQuickFilters();
          }}
          searchQuery={searchState?.value || ''}
          onSearchChange={(val) => {
            if (setSearchState) setSearchState({ id: '', value: val })
          }}
          searchPlaceholder="Search invoice, supplier, PO..."
          customSearchComponent={<TableSearch table={table as any} />}
          toolbarActions={[
            {
              id: 'refresh',
              icon: 'tabler:refresh',
              onClick: onRefresh,
              tooltip: 'Refresh',
              isIconButton: true,
              // Note: the old customFilter also passed color/variant, DynamicFilterToolbar standardizes this
            },
            {
              id: 'export',
              icon: 'tabler:download',
              onClick: () => {},
              tooltip: 'Export',
              isIconButton: true,
            },
            {
              id: 'upload-po',
              icon: 'tabler:upload',
              onClick: handlePoSheet,
              tooltip: 'Import PO Data',
              isIconButton: true,
            }
          ]}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
      <div className='relative flex min-h-0 w-full flex-1 flex-col mt-2'>
        <div className='flex h-full w-full gap-3'>
          {/* Left */}
          {!selectedItem && viewMode === 'table' && (
            <div className='flex h-full min-w-0 flex-1 flex-col'>
              <DataTable
                component={selectedItem}
                emptyPage='requests'
                hideActionBar={true}
                hideGrouping={true}
                hideExport={true}
                hideReload={true}
                hideSearch={true}
                hideFilters={true}
                isLoading={isLoading}
                isReLoading={isRefetching}
                pageSize={pageSize}
                // rowSize={rowSize}
                // onRowSizeChange={setRowSize}
                stickyHeader={true}
                table={table}
                actions={[]}
                onEmptyPrimaryAction={() => openNewRequest('request')}
                onReload={onRefresh}
              />
            </div>
          )}

          {!selectedItem && viewMode === 'grid' && (
            <div className='h-full min-w-0 flex-1 overflow-hidden'>
              <GridView
                activeTab={activeTab}
                data={finalData} // ✅ Use final data
                hideExport={true}
                hideGrouping={activeTab !== 'Inbox'}
                hideReload={true}
                isLoading={isLoading}
                isReloading={isRefetching}
                table={table} // Pass the instance
                actions={[]}
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
