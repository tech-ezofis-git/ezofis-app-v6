import formApi from '@/api/form/form'
import { getFieldHeading } from './qualifierResultUtils'

/** The details a form edit can save to RFQ Master. The company is never one: it identifies the client. */
export type ClientDetail = 'billing' | 'contact' | 'email' | 'phone'

export type ClientFormValues = Partial<
  Record<ClientDetail | 'company', unknown>
>

export type ClientMaster = {
  clients: ClientMasterRow[]
  masterFormId: string
}

/** A client row in RFQ Master, as far as the quote form needs it. */
export type ClientMasterRow = Record<ClientDetail, string> & {
  /** The master column each detail is read from, used to save edits back. */
  columns: Record<ClientDetail, string>
  company: string
  id: string
}

export type MasterSave = { entryId?: string; fields: Record<string, string> }

const MASTER_FORM_NAME = 'rfqmaster'
const ENTRY_PAGE_SIZE = 5000
const DETAIL_LABELS: Record<ClientDetail, string[]> = {
  billing: ['billingaddress', 'billto'],
  contact: ['contactname', 'contactperson', 'contact'],
  email: ['email', 'contactemail'],
  phone: ['phonenumber', 'phone', 'contactphone'],
}
const DEFAULT_COLUMNS: Record<ClientDetail, string> = {
  billing: 'Billing Address',
  contact: 'Contact',
  email: 'Email',
  phone: 'Phone Number',
}
const DETAILS = Object.keys(DETAIL_LABELS) as ClientDetail[]
const COMPANY_LABELS = ['companyname', 'company', 'customername', 'customer']

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
      billing: cell(DETAIL_LABELS.billing)?.text || '',
      columns: Object.fromEntries(
        DETAILS.map((detail) => [
          detail,
          cell(DETAIL_LABELS[detail])?.key || DEFAULT_COLUMNS[detail],
        ]),
      ) as Record<ClientDetail, string>,
      company: cell(COMPANY_LABELS)?.text || '',
      contact: cell(DETAIL_LABELS.contact)?.text || '',
      email: cell(DETAIL_LABELS.email)?.text || '',
      id: String(
        entry.itemId ?? entry.item_id ?? entry.entryId ?? entry.id ?? index,
      ),
      phone: cell(DETAIL_LABELS.phone)?.text || '',
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

/** Which detail a form field holds. Only Quote 1's own fields match, not "quote_2 Email". */
export const clientDetailForField = (field: any): ClientDetail | null => {
  const label = compact(getFieldHeading(field))
  return DETAILS.find((detail) => DETAIL_LABELS[detail].includes(label)) || null
}

export const isCompanyField = (field: any) =>
  COMPANY_LABELS.includes(compact(getFieldHeading(field)))

/**
 * The master save for one edited detail: that column on the client's row, or a
 * new row with the form's details when the client has none. Blank never clears
 * the master, and a new row needs a company.
 */
export const buildMasterSave = (
  client: ClientMasterRow | null,
  detail: ClientDetail,
  values: ClientFormValues,
): MasterSave | null => {
  const text = String(values[detail] ?? '').trim()
  if (!text) return null
  if (client) {
    if (text === client[detail] || !/^[0-9a-f-]{36}$/i.test(client.id)) {
      return null
    }
    return { entryId: client.id, fields: { [client.columns[detail]]: text } }
  }
  const company = String(values.company ?? '').trim()
  if (!company) return null
  const fields: Record<string, string> = { 'Company Name': company }
  DETAILS.forEach((item) => {
    const value = String(values[item] ?? '').trim()
    if (value) fields[DEFAULT_COLUMNS[item]] = value
  })
  return { fields }
}

export const saveToMaster = (masterFormId: string, save: MasterSave) =>
  formApi.saveFormEntry(masterFormId, save.entryId, { fields: save.fields })
