import { msg } from '@lingui/core/macro'
import type { I18n, MessageDescriptor } from '@lingui/core'

const FIELD_LABELS: Record<string, MessageDescriptor> = {
  'Supplier Name': msg`Supplier Name`,
  'Vendor Name': msg`Vendor Name`,
  'Invoice Number': msg`Invoice Number`,
  'Invoice Date': msg`Invoice Date`,
  'Invoice Amount': msg`Invoice Amount`,
  'PO Number': msg`PO Number`,
  'Payment Terms': msg`Payment Terms`,
  Currency: msg`Currency`,
  'Tax Amount': msg`Tax Amount`,
  'Due Date': msg`Due Date`,
  Amount: msg`Amount`,
  Supplier: msg`Supplier`,
}

const STATUS_LABELS: Record<string, MessageDescriptor> = {
  Matched: msg`Matched`,
  'Not Matched': msg`Not Matched`,
  'Partially Matched': msg`Partially Matched`,
  Approved: msg`Approved`,
  'Partially Approved': msg`Partially Approved`,
  Rejected: msg`Rejected`,
  Discrepancies: msg`Discrepancies`,
  'High Value': msg`High Value`,
  Overdue: msg`Overdue`,
  'Not Verified': msg`Not Verified`,
  Verified: msg`Verified`,
  'No Duplicate': msg`No Duplicate`,
  Duplicate: msg`Duplicate`,
  'No PO Found': msg`No PO Found`,
  'No duplicates detected': msg`No duplicates detected`,
  Inbox: msg`Inbox`,
  Exceptions: msg`Exceptions`,
  Processed: msg`Processed`,
  'Pending Review': msg`Pending Review`,
  'Setting up...': msg`Setting up...`,
  'Finalizing Results...': msg`Finalizing Results...`,
  'Preparing your request...': msg`Preparing your request...`,
}

export function localizeRequestFieldLabel(i18n: I18n, label: string): string {
  const descriptor = FIELD_LABELS[label]
  return descriptor ? i18n._(descriptor) : label
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

export function localizeRequestListTab(i18n: I18n, tab: string): string {
  return localizeRequestStatus(i18n, tab)
}
