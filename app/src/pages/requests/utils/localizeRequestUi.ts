import type { I18n, MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'

const FIELD_LABELS: Record<string, MessageDescriptor> = {
  'Amount': msg`Amount`,
  'Amount in Invoice': msg`Amount in Invoice`,
  'Bill To Address': msg`Bill To Address`,
  'Buyer': msg`Buyer`,
  'Currency': msg`Currency`,
  'Discount': msg`Discount`,
  'Due Date': msg`Due Date`,
  'First Approver': msg`First Approver`,
  'Invoice Amount': msg`Invoice Amount`,
  'Invoice Date': msg`Invoice Date`,
  'Invoice Extracted Line Item': msg`Invoice Extracted Line Item`,
  'Invoice No': msg`Invoice No`,
  'Invoice Number': msg`Invoice Number`,
  'Invoice Tax Amount': msg`Invoice Tax Amount`,
  'Matched Status': msg`Matched Status`,
  'Net Amount': msg`Net Amount`,
  'Payment Terms': msg`Payment Terms`,
  'PO Amount': msg`PO Amount`,
  'PO Date': msg`PO Date`,
  'PO Line Item': msg`PO Line Item`,
  'PO Number': msg`PO Number`,
  'Received Quantity': msg`Received Quantity`,
  'Received Status': msg`Received Status`,
  'Remarks': msg`Remarks`,
  'Requested By': msg`Requested By`,
  'Requested Date': msg`Requested Date`,
  'Ship To Address': msg`Ship To Address`,
  'Sub Total': msg`Sub Total`,
  'Supplier': msg`Supplier`,
  'Supplier Address': msg`Supplier Address`,
  'Supplier Name': msg`Supplier Name`,
  'Tax Amount': msg`Tax Amount`,
  'Terms': msg`Payment Terms`,
  'Total Due': msg`Total Due`,
  'Vendor Name': msg`Vendor Name`,
}

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  'Approved': msg`Approved`,
  'Discrepancies': msg`Discrepancies`,
  'Duplicate': msg`Duplicate`,
  'Exceptions': msg`Exceptions`,
  'Finalizing Results...': msg`Finalizing Results...`,
  'High Value': msg`High Value`,
  'Inbox': msg`Inbox`,
  'Matched': msg`Matched`,
  'No Duplicate': msg`No Duplicate`,
  'No duplicates detected': msg`No duplicates detected`,
  'No PO Found': msg`No PO Found`,
  'Not Matched': msg`Not Matched`,
  'Not Verified': msg`Not Verified`,
  'Overdue': msg`Overdue`,
  'Partially Approved': msg`Partially Approved`,
  'Partially Matched': msg`Partially Matched`,
  'Pending Review': msg`Pending Review`,
  'Preparing your request...': msg`Preparing your request...`,
  'Processed': msg`Processed`,
  'Rejected': msg`Rejected`,
  'Setting up...': msg`Setting up...`,
  'Verified': msg`Verified`,
}

export const CANONICAL_FIELD_MAP: Record<string, string> = {
  // PO Number
  ponumber: 'PO Number',
  po_number: 'PO Number',
  po_no: 'PO Number',
  pono: 'PO Number',
  po_num: 'PO Number',
  po: 'PO Number',
  rxwlghillrremmrqlk9mj: 'PO Number',
  hq2ebsurkiboviwv0npbx: 'PO Number',

  // Invoice Number
  invoiceno: 'Invoice No',
  invoice_no: 'Invoice No',
  invno: 'Invoice No',
  inv_no: 'Invoice No',
  invoicenumber: 'Invoice Number',
  invoice_number: 'Invoice Number',
  invnumber: 'Invoice Number',
  inv_number: 'Invoice Number',
  kvcyuknkdumktenjvrvlj: 'Invoice No',

  // PO Amount
  poamount: 'PO Amount',
  po_amount: 'PO Amount',
  pototal: 'PO Amount',
  po_total: 'PO Amount',
  povalue: 'PO Amount',
  po_value: 'PO Amount',
  wksh1mrs42x4j9ahgobtw: 'PO Amount',

  // Invoice Amount
  invoiceamount: 'Invoice Amount',
  invoice_amount: 'Invoice Amount',
  invoicevalue: 'Invoice Amount',
  invoice_value: 'Invoice Amount',
  totalamount: 'Invoice Amount',
  total_amount: 'Invoice Amount',
  totaldue: 'Invoice Amount',
  total_due: 'Invoice Amount',
  total: 'Invoice Amount',
  amount: 'Amount',
  suyqsm0syii8vsj4p0c: 'Invoice Amount',
  nnssqdvgzgylnnhkpk1c: 'Total Due',

  // Status
  matchedstatus: 'Matched Status',
  matched_status: 'Matched Status',
  matchstatus: 'Matched Status',
  match_status: 'Matched Status',
  matchingstatus: 'Matched Status',
  matching_status: 'Matched Status',
  status: 'Matched Status',
  aistatus: 'Matched Status',
  ai_status: 'Matched Status',
  '2mhbmdfevksu0uaqjoi1': 'Matched Status',

  // Currency
  currency: 'Currency',
  bjf8x90uoqsdynk9jev3q: 'Currency',
  wbljrqdgy7succd1zyurq: 'Currency',

  // Supplier
  supplier: 'Supplier',
  suppliername: 'Supplier',
  supplier_name: 'Supplier',
  vendor: 'Supplier',
  vendorname: 'Supplier',
  vendor_name: 'Supplier',
  utfgjy6z0qyfrc5bclfc: 'Supplier',
  u6lnvqtoaju1aovscfdyv: 'Supplier',

  // Supplier Address
  supplieraddress: 'Supplier Address',
  supplier_address: 'Supplier Address',
  vendoraddress: 'Supplier Address',
  vendor_address: 'Supplier Address',
  xyzpybgrgt4dkvdrdnknl: 'Supplier Address',

  // Ship To Address
  shiptoaddress: 'Ship To Address',
  ship_to_address: 'Ship To Address',
  shippingaddress: 'Ship To Address',
  shipping_address: 'Ship To Address',
  '2mditdi0bgnf6hxu6fq8': 'Ship To Address',

  // Bill To Address
  billtoaddress: 'Bill To Address',
  bill_to_address: 'Bill To Address',
  billingaddress: 'Bill To Address',
  billing_address: 'Bill To Address',

  // Dates
  podate: 'PO Date',
  po_date: 'PO Date',
  xc3784ncgbwvpdfkb0s: 'PO Date',
  invoicedate: 'Invoice Date',
  invoice_date: 'Invoice Date',
  '9f6tpvhornmongx3kyju2': 'Invoice Date',
  duedate: 'Due Date',
  due_date: 'Due Date',
  '792iwmnnxlkyfxjcgcowu': 'Due Date',
  kjqfgfmrybznaz9yrxc: 'Due Date',

  // Terms
  paymentterms: 'Payment Terms',
  payment_terms: 'Payment Terms',
  terms: 'Payment Terms',
  terms_description: 'Payment Terms',
  vxnkcxsxkz8acpogke: 'Payment Terms',
  bspnosyv6f1fbzwstpxcw: 'Payment Terms',

  // Tax & Totals
  taxamount: 'Tax Amount',
  tax_amount: 'Tax Amount',
  tax: 'Tax Amount',
  subtotal: 'Sub Total',
  sub_total: 'Sub Total',
  netamount: 'Net Amount',
  net_amount: 'Net Amount',
  discount: 'Discount',
  discountamount: 'Discount',
  discount_amount: 'Discount',
  invoicetaxamount: 'Invoice Tax Amount',
  invoice_tax_amount: 'Invoice Tax Amount',
  pym5lfft7mvjfjoutp9mz: 'Invoice Tax Amount',

  // Additional AP & Workflow Form Controls
  buyer: 'Buyer',
  qbkasblg7zc4f68gvayt: 'Buyer',
  receivedquantity: 'Received Quantity',
  received_quantity: 'Received Quantity',
  roa4dspf67y7s0ismywja: 'Received Quantity',
  amountininvoice: 'Amount in Invoice',
  amount_in_invoice: 'Amount in Invoice',
  c1d2miaszrhtit2rrnz0k: 'Amount in Invoice',
  receivedstatus: 'Received Status',
  received_status: 'Received Status',
  '3ceq3rdchudexcy5sfq6': 'Received Status',
  remarks: 'Remarks',
  '0nphyuks4ugulcvhjabs': 'Remarks',
  '35e6bb5360cd4143895438e18885ee3d': 'Remarks',
  polineitem: 'PO Line Item',
  po_line_item: 'PO Line Item',
  pollineitem: 'PO Line Item',
  awaiq3o4hlpb76lbivmp: 'PO Line Item',
  invoiceextractedlineitem: 'Invoice Extracted Line Item',
  invoice_extracted_line_item: 'Invoice Extracted Line Item',
  w0svxtdp0ivwfjoo73v: 'Invoice Extracted Line Item',
  requestedby: 'Requested By',
  requested_by: 'Requested By',
  '03c459cb404e4acca8973c61e1c8a44f': 'Requested By',
  requesteddate: 'Requested Date',
  requested_date: 'Requested Date',
  '70f625fbca6e4f43b377ebffbc402592': 'Requested Date',
  firstapprover: 'First Approver',
  first_approver: 'First Approver',
  '5ed0585d6de947ccbfe3975dddcbe512': 'First Approver',
}

export function looksLikeJsonId(key: string): boolean {
  if (!key) return false
  const trimmed = String(key).trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true
  }
  const compact = trimmed.replace(/[\s_-]+/g, '')
  if (
    compact.length >= 15 &&
    /\d/.test(compact) &&
    (/[A-Z]/.test(compact) || /[a-z]/.test(compact))
  ) {
    return true
  }
  return false
}

export function formatRawKeyToLabel(key: string): string {
  if (!key) return ''
  const trimmed = String(key).trim()
  if (!trimmed) return ''

  // Never turn raw/generated IDs into fake English words
  if (looksLikeJsonId(trimmed)) {
    return trimmed
  }

  if (trimmed.includes(' ') && !trimmed.includes('_') && !trimmed.includes('-')) {
    return trimmed
  }

  const words = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim()
    .split(/\s+/)

  const acronyms = new Set([
    'PO',
    'ID',
    'VAT',
    'GST',
    'GL',
    'UOM',
    'OCR',
    'AI',
    'ERP',
    'CAD',
    'USD',
  ])

  return words
    .map((w) => {
      const upper = w.toUpperCase()
      if (acronyms.has(upper)) return upper
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

export function getCanonicalFieldLabel(key: string): string {
  if (!key) return ''
  const trimmed = String(key).trim()
  if (CANONICAL_FIELD_MAP[trimmed]) {
    return CANONICAL_FIELD_MAP[trimmed]
  }
  const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, '')
  if (CANONICAL_FIELD_MAP[normalized]) {
    return CANONICAL_FIELD_MAP[normalized]
  }
  return formatRawKeyToLabel(key)
}

export function localizeRequestFieldLabel(i18n: I18n, label: string): string {
  const trimmed = String(label || '').trim()
  if (!trimmed) return trimmed

  // 1. Direct match in FIELD_LABELS
  if (FIELD_LABELS[trimmed]) {
    return i18n._(FIELD_LABELS[trimmed])
  }

  // 2. Direct or normalized match in CANONICAL_FIELD_MAP
  const canonicalDirect = CANONICAL_FIELD_MAP[trimmed]
  if (canonicalDirect && FIELD_LABELS[canonicalDirect]) {
    return i18n._(FIELD_LABELS[canonicalDirect])
  }
  if (canonicalDirect) {
    return canonicalDirect
  }

  const normalized = trimmed.toLowerCase().replace(/[\s_-]+/g, '')
  const canonical = CANONICAL_FIELD_MAP[normalized]
  if (canonical && FIELD_LABELS[canonical]) {
    return i18n._(FIELD_LABELS[canonical])
  }
  if (canonical) {
    return canonical
  }

  // 3. Fallback to formatRawKeyToLabel
  const formatted = formatRawKeyToLabel(trimmed)
  if (FIELD_LABELS[formatted]) {
    return i18n._(FIELD_LABELS[formatted])
  }

  return formatted || trimmed
}

export function localizeRequestListTab(i18n: I18n, tab: string): string {
  return localizeRequestStatus(i18n, tab)
}

export function localizeRequestStatus(i18n: I18n, status: string): string {
  const trimmed = String(status || '').trim()
  if (!trimmed) return trimmed
  const descriptor = STATUS_LABELS[trimmed]
  if (descriptor) return i18n._(descriptor)

  const upper = trimmed.toUpperCase()
  for (const [key, value] of Object.entries(STATUS_LABELS)) {
    if (key.toUpperCase() === upper) return i18n._(value)
  }

  return trimmed
}
