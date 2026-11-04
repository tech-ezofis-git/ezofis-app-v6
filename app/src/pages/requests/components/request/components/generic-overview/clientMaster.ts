import formApi from '@/api/form/form'
import { getFieldHeading, getFieldId } from './qualifierResultUtils'

/** The client details RFQ Master can fill on a quote's form. */
export type ClientDetails = {
  billing: string
  company: string
  contact: string
  email: string
  phone: string
  shipping: string
}

export type ClientMasterRow = ClientDetails & { id: string }

const MASTER_FORM_NAME = 'rfqmaster'
const ENTRY_PAGE_SIZE = 5000

const CLIENT_LABELS: Record<keyof ClientDetails, string[]> = {
  billing: ['billingaddress', 'billto'],
  company: ['companyname', 'company', 'customername', 'customer'],
  contact: ['contactname', 'contactperson', 'contact'],
  email: ['email', 'contactemail'],
  phone: ['phonenumber', 'phone', 'contactphone'],
  shipping: ['shippingaddress', 'shipto'],
}

const compact = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

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
    const values = new Map<string, string>()
    Object.entries(flattenEntry(entry)).forEach(([key, value]) => {
      if (value === null || typeof value === 'object') return
      const text = String(value).trim()
      if (text) values.set(labelById.get(key) || compact(key), text)
    })
    const read = (kind: keyof ClientDetails) =>
      CLIENT_LABELS[kind].map((label) => values.get(label)).find(Boolean) || ''
    return {
      billing: read('billing'),
      company: read('company'),
      contact: read('contact'),
      email: read('email'),
      id: String(entry.id ?? entry.entryId ?? index),
      phone: read('phone'),
      shipping: read('shipping'),
    }
  })
  return clients
    .filter((client) => client.company)
    .sort((a, b) => a.company.localeCompare(b.company))
}

/** Clients from this tenant's RFQ Master form; none when the tenant doesn't have one. */
export const fetchClientMaster = async (): Promise<ClientMasterRow[]> => {
  const forms = await formApi.listAllForms(1, 500, '', [])
  const master = listOf(forms.data).find(
    (form) => compact(form?.name) === MASTER_FORM_NAME,
  )
  if (!master?.id) return []

  const [definition, entries] = await Promise.all([
    formApi.getFormDataById(String(master.id)),
    formApi.getFormEntries(String(master.id), 1, ENTRY_PAGE_SIZE, false),
  ])
  const formJson = parseObject(
    definition.data?.formJson || definition.data?._json,
  ) as { panels?: { fields?: any[] }[] } | null
  const fields = (formJson?.panels || []).flatMap((panel) => panel.fields || [])
  return clientsFromEntries(listOf(entries.data), fields)
}

/** The client whose company matches the form's current company, if exactly one does. */
export const matchClientByCompany = (
  clients: ClientMasterRow[],
  company: unknown,
): ClientMasterRow | null => {
  const wanted = compact(company)
  if (!wanted) return null
  const matches = clients.filter((client) => compact(client.company) === wanted)
  return matches.length === 1 ? matches[0] : null
}

/**
 * Form field id -> value for a chosen client. Only Quote 1's own header fields
 * match (not "quote_2 Email"), and a blank master value never clears a field.
 */
export const buildClientFieldPatch = (
  client: ClientDetails,
  formFields: any[],
): { field: any; id: string; value: string }[] => {
  const patch: { field: any; id: string; value: string }[] = []
  ;(Object.keys(CLIENT_LABELS) as (keyof ClientDetails)[]).forEach((kind) => {
    const value = client[kind]
    if (!value) return
    const field = CLIENT_LABELS[kind]
      .map((label) =>
        formFields.find((item) => compact(getFieldHeading(item)) === label),
      )
      .find(Boolean)
    const id = field ? getFieldId(field) : ''
    if (id) patch.push({ field, id, value })
  })
  return patch
}

export const isCompanyField = (field: any) =>
  CLIENT_LABELS.company.includes(compact(getFieldHeading(field)))
