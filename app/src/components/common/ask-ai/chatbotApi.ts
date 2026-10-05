import { getV6ApiBaseUrl } from '@/api/axios'
import authUserStore from '@/stores/authUserStore'
import { serializeFilterValues } from '@/utils/filterUtils'
import { getFromLocalStorage, setToLocalStorage } from '@/utils/local-storage'
import type {
  AskAiAnswer,
  AskAiBrowseFilterGroup,
  AskAiBrowseRequest,
  AskAiCard,
  AskAiField,
  AskAiFilterBy,
  AskAiPageContext,
  AskAiTextBlock,
} from './types'

export const CHATBOT_API_BASE = (
  import.meta.env.VITE_CHATBOT_API_URL || getV6ApiBaseUrl()
)
  .trim()
  .replace(/\/+$/, '')

export const CHATBOT_ENDPOINT = `${CHATBOT_API_BASE}/repositories/assistant/chatbot`
export const SEARCH_ENDPOINT = `${CHATBOT_API_BASE}/repositories/assistant/search`

export type ChatbotRequestBody = {
  actionFrom: string
  message: string
  specificId: string | null
  tenantId: string
  token: string
}

/** Resolve tenant + bearer token from store / localStorage / JWT claims. */
export function resolveChatbotAuth(): {
  accessToken: string
  tenantId: string
} {
  const store = authUserStore.getState()
  const identity =
    store.identity || (getFromLocalStorage('identity') as any) || null
  const session =
    store.session || (getFromLocalStorage('session') as any) || null
  const share = store.shareContext

  const accessToken = pickFirst(
    identity?.accessToken,
    identity?.token,
    (identity as any)?.access_token,
  )

  const jwt = accessToken ? decodeJwtPayload(accessToken) : null
  const storedTenantId = getFromLocalStorage('tenantId', 'STRING') as
    | string
    | undefined

  const tenantId = pickFirst(
    session?.tenantId,
    (session as any)?.TenantId,
    (session as any)?.tenant_id,
    (session as any)?.tenantID,
    (session as any)?.tenant?.id,
    (session as any)?.tenant?.tenantId,
    (identity as any)?.tenantId,
    (identity as any)?.TenantId,
    (identity as any)?.tenant_id,
    share?.sourceTenantId,
    storedTenantId,
    jwt?.tenantId,
    jwt?.TenantId,
    jwt?.tenant_id,
    jwt?.tid,
    jwt?.['http://schemas.microsoft.com/identity/claims/tenantid'],
  )

  return { accessToken, tenantId }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token
    const parts = raw.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    )
    const json =
      typeof window === 'undefined'
        ? Buffer.from(padded, 'base64').toString('utf8')
        : decodeURIComponent(
            Array.from(atob(padded))
              .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
              .join(''),
          )
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function flatFilterByToGroups(
  flat: Record<string, string | number | boolean | null | undefined>,
): AskAiBrowseFilterGroup[] {
  return Object.entries(flat)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value], index) => {
      const values = Array.isArray(value)
        ? value.map(String).filter(Boolean)
        : [String(value)].filter(Boolean)
      return {
        filters: [
          {
            arrayValue: values,
            condition: 'IS_EQUALS_TO',
            criteria: key,
            criteriaArray: [key],
            dataType: 'SHORT_TEXT',
            id: `cloud-f-${index}`,
            value: JSON.stringify(values),
          },
        ],
        groupCondition: index === 0 ? '' : 'AND',
        id: `cloud-g-${index}`,
      }
    })
}

/** cloud.ezofis.com sends filterBy as a flat map; demo uses filter groups. */
function isFlatFilterBy(
  filterBy: AskAiFilterBy,
): filterBy is Record<string, string | number | boolean | null | undefined> {
  return !Array.isArray(filterBy)
}

function pickFirst(...candidates: unknown[]): string {
  for (const value of candidates) {
    if (value == null) continue
    const text = String(value).trim()
    if (text && text !== 'undefined' && text !== 'null') return text
  }
  return ''
}

function serializeUiFilterMap(
  next: Record<string, string[]>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(next).map(([key, values]) => [
      key,
      serializeFilterValues(Array.from(new Set(values))),
    ]),
  )
}

/** Meta keys in cloud flat filterBy — not repository item field filters. */
const CLOUD_META_FILTER_KEYS = new Set([
  'folder',
  'foldername',
  'repo',
  'repository',
  'repositoryid',
  'repositoryname',
  'workspace',
  'workspaceid',
])

const CLOUD_FILTER_KEY_ALIASES: Record<string, string> = {
  file_name: 'FileName',
  filename: 'FileName',
  invoice_date: 'InvoiceDate',
  invoice_no: 'InvoiceNo',
  invoiceno: 'InvoiceNo',
  po_date: 'PoDate',
  po_number: 'PONumber',
  ponumber: 'PONumber',
  supplier: 'Supplier',
}

export type BrowseUiFilterResult = {
  fileSearch: string
  filters: Record<string, string>
}

/** Convert chatbot browse_request.filterBy → UI Record<string, string> filters. */
export function browseFilterByToUiFilters(
  filterBy: AskAiFilterBy | undefined,
): Record<string, string> {
  return browseFilterByToUiFiltersAndSearch(filterBy).filters
}

/** Split cloud/demo browse_request.filterBy into UI filters + file search text. */
export function browseFilterByToUiFiltersAndSearch(
  filterBy: AskAiFilterBy | undefined,
  contentSearchValue?: string,
): BrowseUiFilterResult {
  let fileSearch = String(contentSearchValue || '').trim()
  const next: Record<string, string[]> = {}

  if (!filterBy) {
    return { fileSearch, filters: {} }
  }

  // cloud.ezofis.com: { search, repository, file_name, po_date, ... }
  if (isFlatFilterBy(filterBy)) {
    for (const [key, value] of Object.entries(filterBy)) {
      const k = String(key).trim()
      if (!k || value == null || value === '') continue

      const values = collectFilterValues(value)
      if (!values.length) continue

      if (k.toLowerCase() === 'search') {
        fileSearch = values[values.length - 1] || fileSearch
        continue
      }

      const normalizedKey = normalizeCloudFilterKey(k)
      if (!normalizedKey) continue

      next[normalizedKey] = [...(next[normalizedKey] || []), ...values]
    }

    return {
      fileSearch,
      filters: serializeUiFilterMap(next),
    }
  }

  for (const group of filterBy) {
    for (const filter of group.filters || []) {
      const key = String(
        filter.criteriaArray?.[0] || filter.criteria || '',
      ).trim()
      if (!key) continue

      let values: string[] = []
      if (Array.isArray(filter.arrayValue) && filter.arrayValue.length > 0) {
        values = filter.arrayValue.map(String).filter(Boolean)
      } else if (filter.value != null && filter.value !== '') {
        const raw = String(filter.value)
        try {
          const parsed = JSON.parse(raw)
          values = Array.isArray(parsed)
            ? parsed.map(String).filter(Boolean)
            : [String(parsed)].filter(Boolean)
        } catch {
          values = [raw].filter(Boolean)
        }
      }

      if (!values.length) continue
      next[key] = [...(next[key] || []), ...values]
    }
  }

  return {
    fileSearch,
    filters: serializeUiFilterMap(next),
  }
}

export function hasBrowsableAction(answer: AskAiAnswer | null | undefined) {
  if (!answer?.actionTo) return false
  const target = String(answer.actionTo).toLowerCase()
  if (target !== 'repository' && target !== 'workflow') return false

  const browse = answer.action?.browse_request
  const { fileSearch, filters } = browseFilterByToUiFiltersAndSearch(
    browse?.filterBy,
    browse?.contentSearchValue,
  )
  const repositoryId = String(
    answer.actionContext?.repositoryId ?? browse?.repositoryId ?? '',
  ).trim()
  const workflowId = String(answer.actionContext?.workflowId ?? '').trim()

  if (target === 'repository') {
    return (
      Boolean(repositoryId) ||
      Object.keys(filters).length > 0 ||
      Boolean(fileSearch)
    )
  }
  return Boolean(workflowId) || Object.keys(filters).length > 0
}

/**
 * Normalize cloud.ezofis.com chatbot payloads into the
 * shape Ask AI UI already renders (paragraph / bullets / cards + browse filters).
 */
export function normalizeChatbotAnswer(raw: unknown): AskAiAnswer | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const data = raw as Record<string, unknown>

  const textPayload =
    data.text && typeof data.text === 'object' && !Array.isArray(data.text)
      ? (data.text as { blocks?: unknown })
      : null

  let blocks: AskAiTextBlock[] = Array.isArray(textPayload?.blocks)
    ? textPayload.blocks
        .map(normalizeTextBlock)
        .filter((b): b is AskAiTextBlock => Boolean(b))
    : []

  // If cloud returns hits but no text.blocks, synthesize a readable answer.
  if (!blocks.length && Array.isArray(data.hits) && data.hits.length > 0) {
    const cards = data.hits.map(normalizeCardItem).filter((c) => c.title)
    blocks = [
      {
        text: `I found ${cards.length} matching result${cards.length === 1 ? '' : 's'}.`,
        type: 'paragraph',
      },
      ...(cards.length
        ? ([{ items: cards, type: 'cards' }] as AskAiTextBlock[])
        : []),
    ]
  }

  if (!blocks.length) return null

  const actionRaw =
    data.action &&
    typeof data.action === 'object' &&
    !Array.isArray(data.action)
      ? (data.action as Record<string, unknown>)
      : undefined

  const browse = normalizeBrowseRequest(
    actionRaw?.browse_request as AskAiBrowseRequest | undefined,
  )

  return {
    action: actionRaw
      ? {
          ...actionRaw,
          browse_request: browse,
        }
      : undefined,
    actionContext:
      data.actionContext &&
      typeof data.actionContext === 'object' &&
      !Array.isArray(data.actionContext)
        ? (data.actionContext as AskAiAnswer['actionContext'])
        : undefined,
    actionTo: data.actionTo != null ? String(data.actionTo) : undefined,
    conversationId:
      data.conversationId != null
        ? String(data.conversationId)
        : data.conversation_id != null
          ? String(data.conversation_id)
          : undefined,
    text: { blocks },
  }
}

export function resolveAskAiPageContext(
  pathname: string,
  pageContext?: AskAiPageContext | null,
): AskAiPageContext {
  const normalizedPath = pathname.toLowerCase()

  if (
    normalizedPath === '/' ||
    normalizedPath.startsWith('/dashboard') ||
    normalizedPath.startsWith('/reports') ||
    normalizedPath.startsWith('/report')
  ) {
    return {
      actionFrom: '',
      specificId: pageContext?.specificId || '',
    }
  }

  if (normalizedPath.startsWith('/folders')) {
    return {
      actionFrom: 'Repository',
      specificId: pageContext?.specificId || '',
    }
  }

  if (normalizedPath.startsWith('/workflows')) {
    return {
      actionFrom: 'Workflow',
      specificId: pageContext?.specificId || '',
    }
  }

  if (normalizedPath.startsWith('/requests')) {
    return {
      actionFrom: 'Request',
      specificId: pageContext?.specificId || '',
    }
  }

  const currentActionFrom = String(pageContext?.actionFrom || '').trim()
  const lowerActionFrom = currentActionFrom.toLowerCase()
  if (
    lowerActionFrom === 'dashboard' ||
    lowerActionFrom === 'reports' ||
    lowerActionFrom === 'report'
  ) {
    return {
      actionFrom: '',
      specificId: pageContext?.specificId || '',
    }
  }

  return {
    actionFrom: currentActionFrom,
    specificId: pageContext?.specificId || '',
  }
}

function collectFilterValues(
  value: string | number | boolean | null | undefined | string[],
): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return [String(value)].filter(Boolean)
}

function normalizeBrowseRequest(
  browse: AskAiBrowseRequest | undefined,
): AskAiBrowseRequest | undefined {
  if (!browse || typeof browse !== 'object') return browse

  const filterBy = browse.filterBy
  if (!filterBy || Array.isArray(filterBy)) return browse

  const flat = filterBy as Record<
    string,
    string | number | boolean | null | undefined
  >
  const searchValue =
    String(browse.contentSearchValue || '').trim() ||
    (flat.search != null ? String(flat.search).trim() : '')

  return {
    ...browse,
    contentSearchValue: searchValue || browse.contentSearchValue,
    filterBy: flatFilterByToGroups(flat),
  }
}

function normalizeCardItem(raw: unknown): AskAiCard {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { title: '' }
  }

  const item = raw as Record<string, unknown>
  const title = String(item.title ?? item.entity_name ?? item.name ?? '').trim()
  const subtitle =
    item.subtitle != null && String(item.subtitle).trim()
      ? String(item.subtitle)
      : undefined
  const description =
    item.description != null && String(item.description).trim()
      ? String(item.description)
      : undefined

  let fields: AskAiField[] | undefined
  if (Array.isArray(item.fields) && item.fields.length > 0) {
    fields = item.fields
      .filter((f): f is AskAiField => Boolean(f && typeof f === 'object'))
      .map((f) => ({
        label: String((f as AskAiField).label ?? ''),
        value: (f as AskAiField).value,
      }))
  }

  return {
    description,
    fields,
    id:
      item.id && typeof item.id === 'object' && !Array.isArray(item.id)
        ? (item.id as Record<string, unknown>)
        : undefined,
    matchSource:
      (item.matchSource ??
        item.match_source ??
        item.MatchSource ??
        item.matchsource) != null
        ? String(
            item.matchSource ??
              item.match_source ??
              item.MatchSource ??
              item.matchsource,
          )
        : null,
    subtitle,
    title,
    type: item.type != null ? String(item.type) : undefined,
  }
}

function normalizeCloudFilterKey(key: string): string | null {
  const trimmed = String(key || '').trim()
  if (!trimmed) return null

  const compact = trimmed.toLowerCase().replace(/[\s_-]+/g, '')
  if (CLOUD_META_FILTER_KEYS.has(compact)) return null

  const snakeKey = trimmed.toLowerCase().replace(/\s+/g, '_')
  if (CLOUD_FILTER_KEY_ALIASES[snakeKey]) {
    return CLOUD_FILTER_KEY_ALIASES[snakeKey]
  }
  if (CLOUD_FILTER_KEY_ALIASES[compact]) {
    return CLOUD_FILTER_KEY_ALIASES[compact]
  }

  if (trimmed.includes('_')) {
    return trimmed
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('')
  }

  return trimmed
}

function normalizeTextBlock(raw: unknown): AskAiTextBlock | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const block = raw as Record<string, unknown>
  const type = String(block.type || '').trim()

  if (type === 'paragraph') {
    return {
      text: String(block.text ?? ''),
      type: 'paragraph',
    }
  }

  if (type === 'bullets') {
    const items = Array.isArray(block.items)
      ? block.items
          .filter((item): item is AskAiField =>
            Boolean(item && typeof item === 'object'),
          )
          .map((item) => ({
            label: String((item as AskAiField).label ?? ''),
            value: (item as AskAiField).value,
          }))
      : []
    return {
      items,
      title: block.title != null ? String(block.title) : undefined,
      type: 'bullets',
      variant: block.variant != null ? String(block.variant) : undefined,
    }
  }

  if (type === 'card') {
    return {
      ...normalizeCardItem(block),
      type: 'card',
    }
  }

  if (type === 'cards') {
    const items = Array.isArray(block.items)
      ? block.items.map(normalizeCardItem)
      : []
    return {
      items,
      title: block.title != null ? String(block.title) : undefined,
      type: 'cards',
    }
  }

  return null
}

export const DEFAULT_CHATBOT_FALLBACK_ANSWER: AskAiAnswer = {
  text: {
    blocks: [
      {
        text: "I couldn't find any matching documents or records for your query. Try searching with different keywords or asking in another way.",
        type: 'paragraph',
      },
    ],
  },
}

export async function postChatbotMessage(
  message: string,
  pageContext: AskAiPageContext,
): Promise<AskAiAnswer> {
  try {
    let { accessToken, tenantId } = resolveChatbotAuth()

    // Session can lag behind login; refresh once if tenant is missing.
    if (accessToken && !tenantId) {
      try {
        const { getSession, getTenants } = await import('@/api/v6/auth')
        await getSession()
        ;({ accessToken, tenantId } = resolveChatbotAuth())

        if (!tenantId) {
          const store = authUserStore.getState()
          const email = String(store.session?.email || '').trim()
          if (email) {
            const tenantsRes = await getTenants(email)
            const tenants = Array.isArray(tenantsRes?.data)
              ? tenantsRes.data
              : []
            const only =
              tenants.length === 1
                ? (tenants[0]?.id ?? tenants[0]?.tenantId)
                : null
            if (only) {
              tenantId = String(only)
              setToLocalStorage(tenantId, 'tenantId', 'STRING')
              if (store.identity) {
                store.setIdentity({ ...store.identity, tenantId })
              }
              if (store.session) {
                store.setSession({ ...store.session, tenantId })
              }
            }
          }
        }
      } catch {
        // Keep going; check below
      }
    }

    if (!accessToken || !tenantId) {
      return DEFAULT_CHATBOT_FALLBACK_ANSWER
    }

    const specificId = String(pageContext.specificId || '').trim()
    const body: ChatbotRequestBody = {
      actionFrom: pageContext.actionFrom ?? '',
      message,
      specificId: specificId || null,
      tenantId,
      token: accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`,
    }

    const response = await fetch(CHATBOT_ENDPOINT, {
      body: JSON.stringify(body),
      headers: {
        'Accept': 'application/json',
        'Authorization': body.token,
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
      },
      method: 'POST',
    })

    if (!response.ok || response.status !== 200) {
      return DEFAULT_CHATBOT_FALLBACK_ANSWER
    }

    const data = await response.json().catch(() => null)
    const normalized = normalizeChatbotAnswer(data)
    if (!normalized) {
      return DEFAULT_CHATBOT_FALLBACK_ANSWER
    }

    return normalized
  } catch {
    return DEFAULT_CHATBOT_FALLBACK_ANSWER
  }
}
