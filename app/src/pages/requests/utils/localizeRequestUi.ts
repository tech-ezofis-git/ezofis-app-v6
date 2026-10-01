import type { I18n, MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'

const FIELD_LABELS: Record<string, MessageDescriptor> = {
  'Amount': msg`Amount`,
  'Currency': msg`Currency`,
  'Due Date': msg`Due Date`,
  'Invoice Amount': msg`Invoice Amount`,
  'Invoice Date': msg`Invoice Date`,
  'Invoice Number': msg`Invoice Number`,
  'Payment Terms': msg`Payment Terms`,
  'PO Number': msg`PO Number`,
  'Supplier': msg`Supplier`,
  'Supplier Name': msg`Supplier Name`,
  'Tax Amount': msg`Tax Amount`,
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

export function localizeRequestFieldLabel(i18n: I18n, label: string): string {
  const descriptor = FIELD_LABELS[label]
  return descriptor ? i18n._(descriptor) : label
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
