import authUserStore from '@/stores/authUserStore'
import {
  getFromLocalStorage,
  setToLocalStorage,
} from '@/utils/local-storage'
import { serializeFilterValues } from '@/utils/filterUtils'
import type {
  AskAiAnswer,
  AskAiBrowseFilterGroup,
  AskAiPageContext,
} from './types'

export const CHATBOT_API_BASE =
  import.meta.env.VITE_CHATBOT_API_URL || 'http://52.172.32.88:7071'

export type ChatbotRequestBody = {
  actionFrom: string
  message: string
  specificId: string
  tenantId: string
  token: string
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

function pickFirst(...candidates: unknown[]): string {
  for (const value of candidates) {
    if (value == null) continue
    const text = String(value).trim()
    if (text && text !== 'undefined' && text !== 'null') return text
  }
  return ''
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

/** Convert chatbot browse_request.filterBy → UI Record<string, string> filters. */
export function browseFilterByToUiFilters(
  filterBy: AskAiBrowseFilterGroup[] | undefined,
): Record<string, string> {
  const next: Record<string, string[]> = {}

  for (const group of filterBy || []) {
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

  return Object.fromEntries(
    Object.entries(next).map(([key, values]) => [
      key,
      serializeFilterValues(Array.from(new Set(values))),
    ]),
  )
}

export function hasBrowsableAction(answer: AskAiAnswer | null | undefined) {
  if (!answer?.actionTo) return false
  const target = String(answer.actionTo).toLowerCase()
  if (target !== 'repository' && target !== 'workflow') return false

  const browse = answer.action?.browse_request
  const filters = browseFilterByToUiFilters(browse?.filterBy)
  const repositoryId = String(
    answer.actionContext?.repositoryId ?? browse?.repositoryId ?? '',
  ).trim()
  const workflowId = String(answer.actionContext?.workflowId ?? '').trim()

  if (target === 'repository') {
    return Boolean(repositoryId) || Object.keys(filters).length > 0
  }
  return Boolean(workflowId) || Object.keys(filters).length > 0
}

export function resolveAskAiPageContext(
  pathname: string,
  pageContext?: AskAiPageContext | null,
): AskAiPageContext {
  if (pathname.startsWith('/folders')) {
    return {
      actionFrom: 'Repository',
      specificId: pageContext?.specificId || '',
    }
  }
  if (pathname.startsWith('/workflows')) {
    return {
      actionFrom: 'Workflow',
      specificId: pageContext?.specificId || '',
    }
  }
  if (pathname.startsWith('/requests')) {
    return { actionFrom: 'Request', specificId: pageContext?.specificId || '' }
  }
  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    return {
      actionFrom: 'Dashboard',
      specificId: pageContext?.specificId || '',
    }
  }
  return {
    actionFrom: pageContext?.actionFrom || 'Dashboard',
    specificId: pageContext?.specificId || '',
  }
}

export async function postChatbotMessage(
  message: string,
  pageContext: AskAiPageContext,
): Promise<AskAiAnswer> {
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
          const tenants = Array.isArray(tenantsRes?.data) ? tenantsRes.data : []
          const only =
            tenants.length === 1
              ? tenants[0]?.id ?? tenants[0]?.tenantId
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
      // Keep going; throw below if still empty.
    }
  }

  if (!accessToken) {
    throw new Error('Missing auth token for chatbot API')
  }
  if (!tenantId) {
    throw new Error(
      'Missing tenant id for chatbot API. Please sign out and sign in again.',
    )
  }

  const body: ChatbotRequestBody = {
    actionFrom: pageContext.actionFrom || 'Dashboard',
    message,
    specificId: pageContext.specificId || '',
    tenantId,
    token: accessToken.startsWith('Bearer ')
      ? accessToken
      : `Bearer ${accessToken}`,
  }

  const response = await fetch(`${CHATBOT_API_BASE}/api/chatbot`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      detail || `Chatbot API failed with status ${response.status}`,
    )
  }

  return (await response.json()) as AskAiAnswer
}
