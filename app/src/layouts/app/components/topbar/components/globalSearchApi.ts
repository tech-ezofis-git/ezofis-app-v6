import {
  resolveChatbotAuth,
  SEARCH_ENDPOINT,
} from '@/components/common/ask-ai/chatbotApi'

export type GlobalSearchMatchedField = {
  fieldName: string
  fieldValue: string
  status?: string
}

export type GlobalSearchMatchInfo = {
  label?: string

  // Supports a simple single matched field
  fieldName?: string
  fieldValue?: string

  // Supports multiple matched fields
  matchedFields?: GlobalSearchMatchedField[]

  // Optional search context
  snippet?: string

  // AI-generated explanation
  aiExplanation?: string

  // Accepts either 0-1 or 0-100
  score?: number
}

export type GlobalSearchHit = {
  dateandtime?: string
  description?: string
  id: GlobalSearchHitId
  ifileName?: string

  matchSource?: string
  matchInfo?: GlobalSearchMatchInfo

  modifiedDateandtime?: string
  name?: string
  requestNo?: string
  type: string
}

export type GlobalSearchHitId = {
  itemId?: string
  processId?: number
  repositoryId?: string
  workflowId?: number
  workspaceId?: string
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

  const rawSpecificId = payload.specificId
    ? String(payload.specificId).trim()
    : ''
  const specificId = rawSpecificId || null

  const response = await fetch(SEARCH_ENDPOINT, {
    body: JSON.stringify({
      actionFrom: payload.actionFrom || 'Repository',
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

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Search failed (${response.status})`)
  }

  const data = await response.json()
  return Array.isArray(data) ? (data as GlobalSearchHit[]) : []
}

export function formatSearchDate(value?: string) {
  const raw = value?.trim()
  if (!raw) return ''

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    const monthName = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    ).toLocaleString('en-US', { month: 'short' })
    return `${day}-${monthName}-${year}`
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  const day = String(date.getDate()).padStart(2, '0')
  const monthName = date.toLocaleString('en-US', { month: 'short' })
  return `${day}-${monthName}-${date.getFullYear()}`
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

export function getSearchHitTitle(hit: GlobalSearchHit) {
  return (
    hit.ifileName?.trim() ||
    hit.name?.trim() ||
    hit.requestNo?.trim() ||
    hit.description?.trim() ||
    'Untitled'
  )
}
