import formApi from '@/api/form/form'
import { getFieldHeading } from './qualifierResultUtils'

export type ClientMaster = {
  clients: ClientMasterRow[]
  masterFormId: string
}

/** A client row in RFQ Master, as far as the quote form needs it. */
export type ClientMasterRow = {
  billing: string
  /** The master column Bill To is read from, used to save edits back. */
  billingColumn: string
  company: string
  email: string
  id: string
}

const MASTER_FORM_NAME = 'rfqmaster'
const ENTRY_PAGE_SIZE = 5000
const BILLING_LABELS = ['billingaddress', 'billto']
const COMPANY_LABELS = ['companyname', 'company', 'customername', 'customer']
const EMAIL_LABELS = ['email', 'contactemail']

/** The agent's bookkeeping for RFQ Master, never a field a user fills in. */
const MASTER_TAG_LABELS = [
  'billingaddressfrommaster',
  'shippingaddressfrommaster',
  'rfqmastermatch',
  'rfqmasternomatch',
]

const compact = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

export const isMasterTagLabel = (label: unknown) =>
  MASTER_TAG_LABELS.includes(compact(label))

const parseObject = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== 'string' || !value.trim().startsWith('{')) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/** An entry's values at the top level, whichever JSON column holds them. */
const flattenEntry = (entry: Record<string, unknown>) => {
  const out: Record<string, unknown> = {}
  Object.values(entry).forEach((value) => {
    const inner = parseObject(value)
    if (inner) Object.assign(out, inner)
  })
  return { ...out, ...entry }
}

const listOf = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  for (const key of ['entries', 'items', 'content', 'rows', 'data', 'value']) {
    const value = data[key]
    if (Array.isArray(value)) {
      return Array.isArray(value[0]?.value)
        ? value.flatMap((group: any) => group.value || [])
        : value
    }
    if (value && typeof value === 'object') {
      const nested = listOf(value)
      if (nested.length) return nested
    }
  }
  return []
}

/** One client per entry with a company name. Keys may be labels, physical columns or field ids. */
export const clientsFromEntries = (
  entries: Record<string, unknown>[],
  masterFields: any[] = [],
): ClientMasterRow[] => {
  const labelById = new Map<string, string>()
  masterFields.forEach((field) => {
    const label = compact(field?.label || field?.name)
    ;[field?.id, field?.jsonId].forEach((id) => {
      if (id && label) labelById.set(String(id), label)
    })
  })

  const clients = entries.map((entry, index) => {
    const values = new Map<string, { key: string; text: string }>()
    Object.entries(flattenEntry(entry)).forEach(([key, value]) => {
      if (value === null || typeof value === 'object') return
      values.set(labelById.get(key) || compact(key), {
        key,
        text: String(value).trim(),
      })
    })
    const cell = (labels: string[]) =>
      labels.map((label) => values.get(label)).find(Boolean)
    return {
      billing: cell(BILLING_LABELS)?.text || '',
      billingColumn: cell(BILLING_LABELS)?.key || 'Billing Address',
      company: cell(COMPANY_LABELS)?.text || '',
      email: cell(EMAIL_LABELS)?.text || '',
      id: String(
        entry.itemId ?? entry.item_id ?? entry.entryId ?? entry.id ?? index,
      ),
    }
  })
  return clients.filter((client) => client.company)
}

/** This tenant's RFQ Master form and clients; null when the tenant doesn't have the form. */
export const fetchClientMaster = async (): Promise<ClientMaster | null> => {
  const forms = await formApi.listAllForms(1, 500, '', [])
  const master = listOf(forms.data).find(
    (form) => compact(form?.name) === MASTER_FORM_NAME,
  )
  if (!master?.id) return null

  const [definition, entries] = await Promise.all([
    formApi.getFormDataById(String(master.id)),
    formApi.getFormEntries(String(master.id), 1, ENTRY_PAGE_SIZE, false),
  ])
  const formJson = parseObject(
    definition.data?.formJson || definition.data?._json,
  ) as { panels?: { fields?: any[] }[] } | null
  const fields = (formJson?.panels || []).flatMap((panel) => panel.fields || [])
  return {
    clients: clientsFromEntries(listOf(entries.data), fields),
    masterFormId: String(master.id),
  }
}

/** The client with this email if exactly one has it; otherwise the same check on company. */
export const matchClient = (
  clients: ClientMasterRow[],
  email: unknown,
  company: unknown,
): ClientMasterRow | null => {
  const wantedEmail = String(email ?? '')
    .trim()
    .toLowerCase()
  const byEmail = wantedEmail
    ? clients.filter((client) => client.email.toLowerCase() === wantedEmail)
    : []
  if (byEmail.length === 1) return byEmail[0]
  const wantedCompany = compact(company)
  const byCompany = wantedCompany
    ? clients.filter((client) => compact(client.company) === wantedCompany)
    : []
  return byCompany.length === 1 ? byCompany[0] : null
}

/** Quote 1's own Bill To, not "quote_2 Billing Address". */
export const isBillingField = (field: any) =>
  BILLING_LABELS.includes(compact(getFieldHeading(field)))

export const isCompanyField = (field: any) =>
  COMPANY_LABELS.includes(compact(getFieldHeading(field)))

export const isEmailField = (field: any) =>
  EMAIL_LABELS.includes(compact(getFieldHeading(field)))

/**
 * The master save for an edited Bill To: its row when the client has one, a new
 * row when not, and null when nothing should be saved.
 */
export const buildBillingSave = (
  client: ClientMasterRow | null,
  billing: unknown,
  company: unknown,
  email: unknown,
): { entryId?: string; fields: Record<string, string> } | null => {
  const text = String(billing ?? '').trim()
  if (!text) return null
  if (client) {
    if (text === client.billing || !/^[0-9a-f-]{36}$/i.test(client.id)) {
      return null
    }
    return { entryId: client.id, fields: { [client.billingColumn]: text } }
  }
  const companyText = String(company ?? '').trim()
  if (!companyText) return null
  const emailText = String(email ?? '').trim()
  return {
    fields: {
      'Billing Address': text,
      'Company Name': companyText,
      ...(emailText ? { Email: emailText } : {}),
    },
  }
}

export const saveBillingToMaster = (
  masterFormId: string,
  save: { entryId?: string; fields: Record<string, string> },
) =>
  save.entryId
    ? formApi.saveFormEntry(masterFormId, save.entryId, { fields: save.fields })
    : formApi.saveFormEntry(masterFormId, undefined, { fields: save.fields })
