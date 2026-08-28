import type { PortalWorkflowLink } from '@/pages/settings/helpers/portalConfigStorage'
import { axiosV6 } from '@/api/axios'

export type PortalSubmissionStatus =
  | 'Action Required'
  | 'Approved'
  | 'Pending'
  | 'Rejected'

export const PORTAL_STATUS_TONE: Record<PortalSubmissionStatus, string> = {
  'Action Required': 'bg-orange-3 text-orange-11',
  'Approved': 'bg-green-3 text-green-11',
  'Pending': 'bg-yellow-3 text-yellow-11',
  'Rejected': 'bg-red-3 text-red-11',
}

export type PortalSubmission = {
  amount: string
  id: string
  raw: Record<string, unknown>
  requestNo: string
  status: PortalSubmissionStatus
  submittedAt: string
  title: string
  workflowId: string
  workflowName: string
}

type ListSource = 'completed' | 'inbox' | 'sent'

const PAGE_SIZE = 100
const SOURCE_RANK: Record<ListSource, number> = {
  completed: 3,
  inbox: 1,
  sent: 2,
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

const asItems = (data: unknown): Record<string, unknown>[] => {
  const record = asRecord(data)
  if (Array.isArray(record.items)) {
    return record.items.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    )
  }
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    )
  }
  return []
}

export const parseSubmissionFormData = (
  raw: Record<string, unknown>,
): Record<string, unknown> => {
  const formData = raw.formData
  if (!formData) return {}
  if (typeof formData === 'string') {
    try {
      const parsed = JSON.parse(formData) as unknown
      const record = asRecord(parsed)
      const nested = asRecord(record.fields)
      return Object.keys(nested).length ? nested : record
    } catch {
      return {}
    }
  }
  const record = asRecord(formData)
  const fields = asRecord(record.fields)
  return Object.keys(fields).length ? fields : record
}

const textOf = (value: unknown) => {
  if (value == null || value === '') return ''
  if (typeof value === 'object') {
    const record = asRecord(value)
    const nested = record.value ?? record.val ?? record.label ?? record.name
    if (nested != null && nested !== '') return String(nested).trim()
    return ''
  }
  return String(value).trim()
}

const findByHint = (source: Record<string, unknown>, hints: string[]) => {
  for (const [key, value] of Object.entries(source)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (hints.some((hint) => normalized.includes(hint))) {
      const text = textOf(value)
      if (text && text !== '-') return text
    }
  }
  return ''
}

const formatAmount = (raw: string) => {
  if (!raw) return '—'
  const numeric = Number(raw.replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(numeric)) return raw
  return `$${numeric.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`
}

const classifyStatus = (
  item: Record<string, unknown>,
  fields: Record<string, unknown>,
  source: ListSource,
): PortalSubmissionStatus => {
  const raw = [
    textOf(fields.status),
    textOf(fields.decision),
    textOf(fields.review),
    textOf(item.status),
    textOf(item.decision),
    textOf(item.review),
    textOf(item.stage),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (
    raw.includes('reject') ||
    raw.includes('fail') ||
    raw.includes('denied') ||
    raw.includes('cancelled') ||
    raw.includes('canceled')
  ) {
    return 'Rejected'
  }
  if (
    raw.includes('approv') ||
    raw.includes('matched') ||
    raw.includes('complete') ||
    raw.includes('paid') ||
    raw.includes('closed')
  ) {
    return 'Approved'
  }
  if (
    raw.includes('action') ||
    raw.includes('required') ||
    raw.includes('exception') ||
    raw.includes('discrepan') ||
    raw.includes('not match') ||
    raw.includes('nomatch') ||
    raw.includes('overdue')
  ) {
    return 'Action Required'
  }
  if (source === 'completed') return 'Approved'
  if (source === 'inbox') return 'Action Required'
  return 'Pending'
}

const instanceIdOf = (item: Record<string, unknown>) =>
  String(
    item.workflowInstanceId ||
      item.processId ||
      item.instanceId ||
      item.id ||
      '',
  )

const requestNoOf = (item: Record<string, unknown>, id: string) => {
  const explicit = textOf(
    item.requestNo || item.referenceNumber || item.documentNumber,
  )
  if (explicit) return explicit
  const short = id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return short ? `REQ-${short}` : '—'
}

const submittedAtOf = (item: Record<string, unknown>) =>
  textOf(
    item.createdAtUtc ||
      item.transactionCreatedAt ||
      item.createdAt ||
      item.raisedAt ||
      item.modifiedAtUtc ||
      item.modifiedAt,
  )

const amountOf = (
  item: Record<string, unknown>,
  fields: Record<string, unknown>,
) => {
  const hints = ['invoiceamount', 'totalamount', 'amount', 'total', 'value']
  return formatAmount(
    findByHint(fields, hints) || findByHint(item, hints) || textOf(item.amount),
  )
}

const fetchWorkflowList = async (
  path: '/Workflows/completed' | '/Workflows/inbox' | '/Workflows/sent',
  workflowId: string,
  tenantId?: string,
) => {
  const { data, status } = await axiosV6({
    headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
    method: 'GET',
    params: {
      pageNumber: 1,
      pageSize: PAGE_SIZE,
      skipTotal: true,
      workflowId,
    },
    skipCancellation: true,
    url: path,
  })
  if (status !== 200) return []
  return asItems(data)
}

const toSubmission = (
  item: Record<string, unknown>,
  workflow: PortalWorkflowLink,
  source: ListSource,
): PortalSubmission | null => {
  const id = instanceIdOf(item)
  if (!id) return null
  const fields = parseSubmissionFormData(item)
  const requestNo = requestNoOf(item, id)
  const title =
    findByHint(fields, [
      'invoicenumber',
      'invoiceno',
      'documentnumber',
      'title',
      'subject',
    ]) || requestNo
  return {
    amount: amountOf(item, fields),
    id,
    raw: item,
    requestNo,
    status: classifyStatus(item, fields, source),
    submittedAt: submittedAtOf(item),
    title,
    workflowId: String(workflow.id),
    workflowName:
      textOf(item.workflowName) ||
      textOf(item.workflow) ||
      workflow.name ||
      'Workflow',
  }
}

export const listPortalSubmissions = async ({
  tenantId,
  workflows,
}: {
  tenantId?: string
  workflows: PortalWorkflowLink[]
}): Promise<{ error: string; submissions: PortalSubmission[] }> => {
  if (!workflows.length) {
    return { error: '', submissions: [] }
  }

  const results = await Promise.allSettled(
    workflows.flatMap((workflow) => {
      const workflowId = String(workflow.id)
      if (!workflowId) return []
      return (
        [
          ['inbox', '/Workflows/inbox'],
          ['sent', '/Workflows/sent'],
          ['completed', '/Workflows/completed'],
        ] as const
      ).map(async ([source, path]) => {
        const items = await fetchWorkflowList(path, workflowId, tenantId)
        return { items, source, workflow }
      })
    }),
  )

  const byId = new Map<string, { rank: number; submission: PortalSubmission }>()
  let failureCount = 0

  results.forEach((result) => {
    if (result.status === 'rejected') {
      failureCount += 1
      return
    }
    const { items, source, workflow } = result.value
    items.forEach((item) => {
      const submission = toSubmission(item, workflow, source)
      if (!submission) return
      const rank = SOURCE_RANK[source]
      const existing = byId.get(submission.id)
      if (!existing || rank >= existing.rank) {
        byId.set(submission.id, { rank, submission })
      }
    })
  })

  const submissions = Array.from(byId.values())
    .map((entry) => entry.submission)
    .sort((left, right) => {
      const leftTime = Date.parse(left.submittedAt) || 0
      const rightTime = Date.parse(right.submittedAt) || 0
      return rightTime - leftTime
    })

  if (
    !submissions.length &&
    failureCount === results.length &&
    results.length
  ) {
    return {
      error: 'Unable to load submissions for the selected workflows.',
      submissions: [],
    }
  }

  return { error: '', submissions }
}

export const submissionDetailFields = (submission: PortalSubmission) => {
  const fields = parseSubmissionFormData(submission.raw)
  return Object.entries(fields)
    .filter(([, value]) => {
      if (value == null || value === '') return false
      if (typeof value === 'object')
        return Object.keys(asRecord(value)).length > 0
      return true
    })
    .map(([id, value]) => ({
      id,
      name: id,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
}
