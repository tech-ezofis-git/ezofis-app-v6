import {
  SEARCH_ENDPOINT,
  resolveChatbotAuth,
} from '@/components/common/ask-ai/chatbotApi'

export type GlobalSearchHitId = {
  formEntryId?: string
  formId?: string
  formName?: string
  instanceId?: string
  itemId?: string
  masterFormId?: string
  masterFormName?: string
  processId?: number | string
  repositoryId?: string
  repositoryName?: string
  requestNo?: string
  workflowId?: number | string
  workflowName?: string
  workspaceId?: string
}

export type GlobalSearchHit = {
  badges?: Array<{
    label: string
    tone?: 'ok' | 'warn' | 'err' | 'default'
  }>
  dateandtime?: string
  description?: string
  entity_id?: string
  entity_name?: string
  entity_type?: string
  folder?: string
  formKind?: string | null
  found?: Array<{
    by?: string
    count?: number
    field?: string
    kind?: string
    name?: string
    no?: number | string
    page?: number
    snippet?: string
    value?: string
  }>
  id: GlobalSearchHitId
  ifileName?: string
  line?: string
  matchFields?: string[]
  matchSource?: string
  matchValue?: string
  matchedFields?: string[]
  matchedValue?: string
  matched_field?: string
  matched_value?: string
  modifiedDateandtime?: string
  name?: string
  needles?: string[]
  pinned?: boolean
  requestNo?: string
  snippet?: string
  subtitle?: string
  title?: string
  type: string
}

export type GlobalSearchRequest = {
  actionFrom: string
  query: string
  specificId: string | null
  tenantId: string
}

type RawSearchHit = Record<string, unknown>

const asTrimmedString = (value: unknown): string => {
  if (value == null) return ''
  const text = String(value).trim()
  if (!text || text === 'null' || text === 'undefined') return ''
  return text
}

const pickString = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    const text = asTrimmedString(candidate)
    if (text) return text
  }
  return ''
}

const normalizeHitId = (rawId: unknown, hit: RawSearchHit): GlobalSearchHitId => {
  const source =
    rawId && typeof rawId === 'object' && !Array.isArray(rawId)
      ? (rawId as Record<string, unknown>)
      : {}

  const itemId = pickString(
    source.itemId,
    source.ItemId,
    hit.entity_id,
    hit.entityId,
  )
  const repositoryId = pickString(
    source.repositoryId,
    source.RepositoryId,
    hit.repositoryId,
  )
  const workflowId = pickString(
    source.workflowId,
    source.WorkflowId,
    hit.workflowId,
  )
  const instanceId = pickString(
    source.instanceId,
    source.InstanceId,
    hit.instanceId,
  )
  const requestNo = pickString(
    source.requestNo,
    source.RequestNo,
    hit.requestNo,
  )
  const formId = pickString(source.formId, source.FormId, hit.formId)
  const formEntryId = pickString(
    source.formEntryId,
    source.FormEntryId,
    hit.formEntryId,
    hit.entity_id,
    hit.entityId,
  )
  const formName = pickString(
    source.formName,
    source.FormName,
    source.masterFormName,
    hit.entity_name,
    hit.name,
  )

  return {
    formEntryId: formEntryId || undefined,
    formId: formId || undefined,
    formName: formName || undefined,
    instanceId: instanceId || undefined,
    itemId: itemId || undefined,
    masterFormId: pickString(source.masterFormId, formId) || undefined,
    masterFormName: pickString(source.masterFormName, formName) || undefined,
    processId: source.processId as number | string | undefined,
    repositoryId: repositoryId || undefined,
    repositoryName:
      pickString(source.repositoryName, source.RepositoryName, hit.name) ||
      undefined,
    requestNo: requestNo || undefined,
    workflowId: workflowId || undefined,
    workflowName:
      pickString(source.workflowName, source.WorkflowName) || undefined,
    workspaceId: pickString(source.workspaceId) || undefined,
  }
}

/**
 * Map cloud.ezofis.com `{ query, hits }` (and legacy array responses) into the
 * GlobalSearchHit shape used by GlobalSearch / RelatedDocumentsFinder.
 */
export function normalizeGlobalSearchHit(raw: unknown): GlobalSearchHit | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const hit = raw as RawSearchHit

  const type = pickString(hit.type, hit.entity_type, hit.entityType, 'document')
  const matchedField = pickString(
    hit.matched_field,
    hit.matchedField,
    hit.matchField,
  )
  const matchedValue = pickString(
    hit.matched_value,
    hit.matchedValue,
    hit.matchValue,
  )
  const matchSource = pickString(hit.matchSource, hit.match_source) || undefined
  const entityName = pickString(hit.entity_name, hit.entityName)
  const ifileName = pickString(hit.ifileName, hit.fileName, hit.filename)
  const name = pickString(hit.name, hit.id && typeof hit.id === 'object'
    ? (hit.id as Record<string, unknown>).repositoryName ||
        (hit.id as Record<string, unknown>).workflowName ||
        (hit.id as Record<string, unknown>).formName
    : '')
  const title = pickString(hit.title, entityName, ifileName, name, hit.requestNo)
  const description = pickString(hit.description)
  const requestNo = pickString(
    hit.requestNo,
    hit.id && typeof hit.id === 'object'
      ? (hit.id as Record<string, unknown>).requestNo
      : '',
  )
  const formKind = pickString(hit.formKind, hit.form_kind) || null
  const id = normalizeHitId(hit.id, hit)

  const found =
    Array.isArray(hit.found) && hit.found.length > 0
      ? (hit.found as GlobalSearchHit['found'])
      : matchedField || matchedValue
        ? [
            {
              field: matchedField || undefined,
              kind: type.toLowerCase().includes('form') ? 'form' : 'field',
              snippet: matchedValue || undefined,
              value: matchedValue || undefined,
            },
          ]
        : undefined

  const needles = [matchedValue, requestNo, title].filter(Boolean) as string[]

  const badges: GlobalSearchHit['badges'] = []
  if (formKind) {
    badges.push({
      label: formKind,
      tone: 'default',
    })
  }
  if (requestNo) {
    badges.push({
      label: requestNo,
      tone: 'ok',
    })
  }
  if (Array.isArray(hit.badges)) {
    for (const badge of hit.badges) {
      if (badge && typeof badge === 'object' && 'label' in badge) {
        badges.push(badge as NonNullable<GlobalSearchHit['badges']>[number])
      }
    }
  }

  const folder = pickString(
    hit.folder,
    id.repositoryName,
    id.workflowName,
    name,
  )

  return {
    badges: badges.length ? badges : undefined,
    dateandtime: pickString(hit.dateandtime, hit.dateAndTime) || undefined,
    description: description || undefined,
    entity_id: pickString(hit.entity_id, hit.entityId, id.itemId, id.formEntryId) || undefined,
    entity_name: entityName || undefined,
    entity_type: pickString(hit.entity_type, hit.entityType, type) || undefined,
    folder: folder || undefined,
    formKind,
    found,
    id,
    ifileName: ifileName || undefined,
    line: pickString(hit.line) || undefined,
    matchFields: matchedField ? [matchedField] : undefined,
    matchSource,
    matchValue: matchedValue || undefined,
    matchedFields: matchedField ? [matchedField] : undefined,
    matchedValue: matchedValue || undefined,
    matched_field: matchedField || undefined,
    matched_value: matchedValue || undefined,
    modifiedDateandtime:
      pickString(hit.modifiedDateandtime, hit.modifiedDateAndTime) || undefined,
    name: name || folder || undefined,
    needles: needles.length ? needles : undefined,
    pinned: Boolean(hit.pinned),
    requestNo: requestNo || undefined,
    snippet: matchedValue || pickString(hit.snippet) || undefined,
    subtitle: pickString(hit.subtitle) || undefined,
    title: title || undefined,
    type,
  }
}

/** Accept legacy `[...]` or new `{ query, hits: [...] }` cloud payloads. */
export function mapGlobalSearchResponse(data: unknown): GlobalSearchHit[] {
  let rows: unknown[] = []

  if (Array.isArray(data)) {
    rows = data
  } else if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>
    if (Array.isArray(payload.hits)) rows = payload.hits
    else if (Array.isArray(payload.data)) rows = payload.data
    else if (Array.isArray(payload.results)) rows = payload.results
  }

  return rows
    .map((row) => normalizeGlobalSearchHit(row))
    .filter((hit): hit is GlobalSearchHit => Boolean(hit))
}

export async function fetchGlobalSearch(
  payload: Omit<GlobalSearchRequest, 'specificId' | 'tenantId'> & {
    specificId?: string | string[] | null
    tenantId?: string
  },
): Promise<GlobalSearchHit[]> {
  try {
    const { accessToken, tenantId: resolvedTenantId } = resolveChatbotAuth()
    const tenantId = payload.tenantId || resolvedTenantId

    if (!tenantId) {
      return []
    }

    // Backend currently only accepts a single specificId string; multiple
    // folder selections are joined here until it supports an array natively.
    let specificId: string | null
    if (Array.isArray(payload.specificId)) {
      const cleaned = payload.specificId
        .map((id) => String(id).trim())
        .filter(Boolean)
      specificId = cleaned.length ? cleaned.join(',') : null
    } else {
      const rawSpecificId = payload.specificId
        ? String(payload.specificId).trim()
        : ''
      specificId = rawSpecificId || null
    }

    const response = await fetch(SEARCH_ENDPOINT, {
      body: JSON.stringify({
        actionFrom: payload.actionFrom ?? '',
        query: payload.query,
        specificId,
        tenantId,
      } satisfies GlobalSearchRequest),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken
          ? {
              Authorization: accessToken.startsWith('Bearer ')
                ? accessToken
                : `Bearer ${accessToken}`,
            }
          : {}),
        'X-Tenant-Id': tenantId,
      },
      method: 'POST',
    })

    if (!response.ok || response.status !== 200) {
      return []
    }

    const data = await response.json().catch(() => null)
    return mapGlobalSearchResponse(data)
  } catch {
    return []
  }
}

export function getSearchHitTitle(hit: GlobalSearchHit) {
  return (
    hit.title?.trim() ||
    hit.entity_name?.trim() ||
    hit.ifileName?.trim() ||
    hit.name?.trim() ||
    hit.requestNo?.trim() ||
    hit.description?.trim() ||
    'Untitled'
  )
}

export function getSearchHitDate(hit: GlobalSearchHit) {
  return hit.modifiedDateandtime?.trim() || hit.dateandtime?.trim() || ''
}

export function getSearchHitIcon(type: string) {
  const normalized = String(type || '').toLowerCase()
  if (normalized.includes('folder') || normalized.includes('repository')) {
    return 'lucide:folder'
  }
  if (normalized.includes('request') || normalized.includes('clipboard')) {
    return 'lucide:clipboard-list'
  }
  if (normalized.includes('workflow') || normalized.includes('process')) {
    return 'lucide:git-branch'
  }
  if (normalized.includes('form') || normalized.includes('master')) {
    return 'lucide:file-spreadsheet'
  }
  if (normalized.includes('vendor') || normalized.includes('supplier')) {
    return 'lucide:building-2'
  }
  if (normalized.includes('user') || normalized.includes('people')) {
    return 'lucide:user'
  }
  return 'lucide:file-text'
}
