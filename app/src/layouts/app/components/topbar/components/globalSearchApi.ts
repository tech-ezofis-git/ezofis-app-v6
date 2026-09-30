import {
  resolveChatbotAuth,
  SEARCH_ENDPOINT,
} from '@/components/common/ask-ai/chatbotApi'
import { getFromLocalStorage, setToLocalStorage } from '@/utils/local-storage'

export type GlobalSearchHit = {
  /** Preserve unknown API fields so cache search can match them too. */
  [key: string]: unknown
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
  matched_field?: string
  matched_value?: string
  matchedFields?: string[]
  matchedValue?: string
  matchFields?: string[]
  matchSource?: string
  matchValue?: string
  metadata?: Record<string, unknown>
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

const normalizeHitId = (
  rawId: unknown,
  hit: RawSearchHit,
): GlobalSearchHitId => {
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
      throw new Error('Missing tenant id for global search')
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
        'Accept': 'application/json',
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
      throw new Error(`Global search failed (${response.status})`)
    }

    const data = await response.json().catch(() => null)
    const hits = mapGlobalSearchResponse(data)
    // Persist API hits so typing can filter locally without another call.
    if (hits.length) {
      saveGlobalSearchCache(hits, {
        query: payload.query,
        tenantId,
      })
    }
    return hits
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('Global search failed')
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
  const matchSource =
    pickString(
      hit.matchSource,
      hit.match_source,
      hit.MatchSource,
      hit.matchsource,
    ) || undefined
  const entityName = pickString(hit.entity_name, hit.entityName)
  const ifileName = pickString(hit.ifileName, hit.fileName, hit.filename)
  const name = pickString(
    hit.name,
    hit.id && typeof hit.id === 'object'
      ? (hit.id as Record<string, unknown>).repositoryName ||
          (hit.id as Record<string, unknown>).workflowName ||
          (hit.id as Record<string, unknown>).formName
      : '',
  )
  const title = pickString(
    hit.title,
    entityName,
    ifileName,
    name,
    hit.requestNo,
  )
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

  const isRedundant = (label: string, mainText: string) => {
    if (!label) return true
    const l = label.toLowerCase()
    const m = mainText.toLowerCase()
    return m === l
  }

  const rawFolder = pickString(
    hit.folder,
    id.repositoryName,
    id.workflowName,
    name,
  )
  const folder = isRedundant(rawFolder, title) ? undefined : rawFolder

  const finalBadges: GlobalSearchHit['badges'] = []
  const seenBadges = new Set<string>()
  for (const b of badges) {
    const lbl = String(b.label || '').trim()
    const lblLower = lbl.toLowerCase()
    if (isRedundant(lbl, title) || (folder && isRedundant(lbl, folder)))
      continue
    if (!seenBadges.has(lblLower)) {
      seenBadges.add(lblLower)
      finalBadges.push(b)
    }
  }

  const metadata =
    hit.metadata &&
    typeof hit.metadata === 'object' &&
    !Array.isArray(hit.metadata)
      ? (hit.metadata as Record<string, unknown>)
      : undefined

  return {
    ...hit,
    badges: finalBadges.length ? finalBadges : undefined,
    dateandtime: pickString(hit.dateandtime, hit.dateAndTime) || undefined,
    description: description || undefined,
    entity_id:
      pickString(hit.entity_id, hit.entityId, id.itemId, id.formEntryId) ||
      undefined,
    entity_name: entityName || undefined,
    entity_type: pickString(hit.entity_type, hit.entityType, type) || undefined,
    folder: folder || undefined,
    formKind,
    found,
    id,
    ifileName: ifileName || undefined,
    line: pickString(hit.line) || undefined,
    matched_field: matchedField || undefined,
    matched_value: matchedValue || undefined,
    matchedFields: matchedField ? [matchedField] : undefined,
    matchedValue: matchedValue || undefined,
    matchFields: matchedField ? [matchedField] : undefined,
    matchSource,
    matchValue: matchedValue || undefined,
    metadata,
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

const GLOBAL_SEARCH_CACHE_KEY = 'ezofis.globalSearch.cache'
const GLOBAL_SEARCH_CACHE_LIMIT = 500
const GLOBAL_SEARCH_QUERY_LIMIT = 30

export type GlobalSearchCachePayload = {
  /** Exact API responses keyed by normalized query. */
  byQuery: Record<string, GlobalSearchHit[]>
  /** Deduped pool of all hits for fuzzy / partial filtering. */
  hits: GlobalSearchHit[]
  queries: string[]
  savedAt: number
  tenantId: string
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

const normalizeQueryKey = (query: string) =>
  String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const hitCacheKey = (hit: GlobalSearchHit): string =>
  [
    hit.type,
    hit.id?.itemId,
    hit.id?.formEntryId,
    hit.id?.instanceId,
    hit.entity_id,
    hit.id?.repositoryId,
    hit.id?.workflowId,
    hit.id?.formId,
    getSearchHitTitle(hit),
    hit.matched_value || hit.matchedValue || hit.matchValue,
  ]
    .filter(Boolean)
    .join('::')

const sameTenant = (cachedTenant: string, currentTenant?: string) => {
  const a = String(cachedTenant || '').trim()
  const b = String(currentTenant || '').trim()
  // If either side is unknown, still allow reading the cache.
  if (!a || !b) return true
  return a === b
}

export function loadGlobalSearchCache(
  tenantId?: string,
): GlobalSearchCachePayload | null {
  try {
    const cached = getFromLocalStorage<GlobalSearchCachePayload>(
      GLOBAL_SEARCH_CACHE_KEY,
      'OBJECT',
    ) as GlobalSearchCachePayload | undefined
    if (!cached || typeof cached !== 'object') return null
    if (!sameTenant(String(cached.tenantId || ''), tenantId)) return null

    const hits = Array.isArray(cached.hits) ? cached.hits : []
    const byQuery =
      cached.byQuery && typeof cached.byQuery === 'object' ? cached.byQuery : {}

    return {
      byQuery,
      hits,
      queries: Array.isArray(cached.queries) ? cached.queries : [],
      savedAt: Number(cached.savedAt) || 0,
      tenantId: String(cached.tenantId || ''),
    }
  } catch {
    return null
  }
}

export function saveGlobalSearchCache(
  hits: GlobalSearchHit[],
  options?: { query?: string; tenantId?: string },
): void {
  if (!Array.isArray(hits) || !hits.length) return

  try {
    const { tenantId: authTenantId } = resolveChatbotAuth()
    const tenantId = options?.tenantId || authTenantId || ''
    const previous = loadGlobalSearchCache(tenantId || undefined)
    const merged = new Map<string, GlobalSearchHit>()

    for (const hit of previous?.hits || []) {
      merged.set(hitCacheKey(hit), hit)
    }
    for (const hit of hits) {
      merged.set(hitCacheKey(hit), hit)
    }

    const nextHits = Array.from(merged.values()).slice(
      0,
      GLOBAL_SEARCH_CACHE_LIMIT,
    )
    const query = String(options?.query || '').trim()
    const queryKey = normalizeQueryKey(query)
    const byQuery: Record<string, GlobalSearchHit[]> = {
      ...(previous?.byQuery || {}),
    }
    if (queryKey) {
      byQuery[queryKey] = hits
    }

    // Keep only the newest N query buckets.
    const queryKeys = [
      ...(queryKey ? [queryKey] : []),
      ...Object.keys(byQuery).filter((key) => key !== queryKey),
    ].slice(0, GLOBAL_SEARCH_QUERY_LIMIT)
    const trimmedByQuery: Record<string, GlobalSearchHit[]> = {}
    for (const key of queryKeys) {
      if (byQuery[key]) trimmedByQuery[key] = byQuery[key]
    }

    const queries = [
      ...(query ? [query] : []),
      ...(previous?.queries || []).filter(
        (item) => normalizeQueryKey(item) !== queryKey,
      ),
    ].slice(0, GLOBAL_SEARCH_QUERY_LIMIT)

    setToLocalStorage(
      {
        byQuery: trimmedByQuery,
        hits: nextHits,
        queries,
        savedAt: Date.now(),
        tenantId,
      } satisfies GlobalSearchCachePayload,
      GLOBAL_SEARCH_CACHE_KEY,
      'OBJECT',
    )
  } catch (error) {
    console.warn('Failed to save global search cache', error)
  }
}

/** Flatten any JSON-like value into searchable lowercase text. */
const flattenSearchText = (value: unknown, depth = 0): string => {
  if (value == null || depth > 4) return ''
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map((item) => flattenSearchText(item, depth + 1)).join(' ')
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => flattenSearchText(item, depth + 1))
      .join(' ')
  }
  return ''
}

const collectHitSearchText = (hit: GlobalSearchHit): string =>
  flattenSearchText(hit).toLowerCase()

/**
 * Resolve search results from cache:
 * 1) exact query bucket from prior API call
 * 2) otherwise filter the full hit pool across ALL response fields
 */
export function filterCachedGlobalSearchHits(
  query: string,
  hits?: GlobalSearchHit[] | null,
): GlobalSearchHit[] {
  const needle = String(query || '').trim()
  if (!needle) return []

  const tenantId = resolveChatbotAuth().tenantId || undefined
  const exact = getCachedHitsForQuery(needle, tenantId)
  if (exact?.length) return exact

  const source = hits || loadGlobalSearchCache(tenantId)?.hits || []

  if (!source.length) return []

  const tokens = normalizeQueryKey(needle).split(/\s+/).filter(Boolean)
  if (!tokens.length) return []

  return source.filter((hit) => {
    const haystack = collectHitSearchText(hit)
    // Match tokens with and without punctuation (po-60001 / po60001).
    return tokens.every((token) => {
      if (haystack.includes(token)) return true
      const compactToken = token.replace(/[^a-z0-9]/g, '')
      const compactHaystack = haystack.replace(/[^a-z0-9]/g, '')
      return Boolean(compactToken) && compactHaystack.includes(compactToken)
    })
  })
}

/** Exact cached API response for a query (Enter / same search again). */
export function getCachedHitsForQuery(
  query: string,
  tenantId?: string,
): GlobalSearchHit[] | null {
  const key = normalizeQueryKey(query)
  if (!key) return null
  const cached = loadGlobalSearchCache(
    tenantId || resolveChatbotAuth().tenantId || undefined,
  )
  const hits = cached?.byQuery?.[key]
  return Array.isArray(hits) && hits.length ? hits : null
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
