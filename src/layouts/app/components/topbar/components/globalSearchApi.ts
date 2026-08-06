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
  dateandtime?: string
  description?: string
  id: GlobalSearchHitId
  ifileName?: string
  modifiedDateandtime?: string
  name?: string
  requestNo?: string
  type: string
}

export type GlobalSearchRequest = {
  actionFrom: string
  query: string
  specificId: string | null
  tenantId: string
}

export async function fetchGlobalSearch(
  payload: Omit<GlobalSearchRequest, 'tenantId'> & { tenantId?: string },
): Promise<GlobalSearchHit[]> {
  const { accessToken, tenantId: resolvedTenantId } = resolveChatbotAuth()
  const tenantId = payload.tenantId || resolvedTenantId

  if (!tenantId) {
    throw new Error('Missing tenant. Sign in again, then retry search.')
  }

  const rawSpecificId = payload.specificId ? String(payload.specificId).trim() : ''
  const specificId = rawSpecificId || null

  const response = await fetch(SEARCH_ENDPOINT, {
    body: JSON.stringify({
      actionFrom: payload.actionFrom || 'Repository',
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

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Search failed (${response.status})`)
  }

  const data = await response.json()
  return Array.isArray(data) ? (data as GlobalSearchHit[]) : []
}

export function getSearchHitTitle(hit: GlobalSearchHit) {
  return (
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
  if (normalized.includes('request')) {
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
