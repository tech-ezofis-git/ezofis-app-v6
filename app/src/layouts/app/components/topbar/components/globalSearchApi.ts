import {
  SEARCH_ENDPOINT,
  resolveChatbotAuth,
} from '@/components/common/ask-ai/chatbotApi'

export type GlobalSearchHitId = {
  itemId?: string
  processId?: number
  repositoryId?: string
  workflowId?: number
  workspaceId?: string
}

export type GlobalSearchHit = {
  badges?: Array<{
    label: string
    tone?: 'ok' | 'warn' | 'err' | 'default'
  }>
  dateandtime?: string
  description?: string
  folder?: string
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
    const cleaned = payload.specificId.map((id) => String(id).trim()).filter(Boolean)
    specificId = cleaned.length ? cleaned.join(',') : null
  } else {
    const rawSpecificId = payload.specificId ? String(payload.specificId).trim() : ''
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

    const data = await response.json().catch(() => [])
    return Array.isArray(data) ? (data as GlobalSearchHit[]) : []
  } catch {
    return []
  }
}

export function getSearchHitTitle(hit: GlobalSearchHit) {
  return (
    hit.title?.trim() ||
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
  if (normalized.includes('vendor') || normalized.includes('supplier')) {
    return 'lucide:building-2'
  }
  if (normalized.includes('user') || normalized.includes('people')) {
    return 'lucide:user'
  }
  return 'lucide:file-text'
}
