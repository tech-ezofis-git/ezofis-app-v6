import type { ShareContext } from '@/stores/authUserStore'

const SHARE_STORAGE_KEY = 'ezofis.repositoryShareContext'

export const persistShareContext = (context: ShareContext | null) => {
  if (globalThis.window === undefined) return

  if (!context) {
    sessionStorage.removeItem(SHARE_STORAGE_KEY)
    sessionStorage.removeItem('shareToken')
    sessionStorage.removeItem('tenantId')
    sessionStorage.removeItem('repositoryId')
    sessionStorage.removeItem('itemId')
    sessionStorage.removeItem('shareAction')
    sessionStorage.removeItem('sharePermission')
    sessionStorage.removeItem('shareResourceType')
    sessionStorage.removeItem('shareReportId')
    return
  }

  sessionStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(context))
  sessionStorage.setItem('shareToken', context.shareToken)
  sessionStorage.setItem('tenantId', context.sourceTenantId)
  sessionStorage.setItem('repositoryId', context.sourceRepositoryId)
  sessionStorage.setItem('itemId', context.sourceItemId)
  if (context.action != null) {
    sessionStorage.setItem('shareAction', String(context.action))
  }
  if (context.permission) {
    sessionStorage.setItem('sharePermission', context.permission)
  }
  if (context.resourceType) {
    sessionStorage.setItem('shareResourceType', context.resourceType)
  }
  if (context.sourceReportId) {
    sessionStorage.setItem('shareReportId', context.sourceReportId)
  }
}

export const readPersistedShareContext = (): ShareContext | null => {
  if (globalThis.window === undefined) return null

  try {
    const raw = sessionStorage.getItem(SHARE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ShareContext
      if (
        parsed?.shareToken &&
        parsed?.sourceItemId &&
        parsed?.sourceRepositoryId &&
        parsed?.sourceTenantId
      ) {
        return { resourceType: 'folder-item', ...parsed }
      }
    }
  } catch {
    // fall through to individual keys
  }

  const shareToken = sessionStorage.getItem('shareToken') || ''
  const sourceTenantId = sessionStorage.getItem('tenantId') || ''
  const sourceRepositoryId = sessionStorage.getItem('repositoryId') || ''
  const sourceItemId = sessionStorage.getItem('itemId') || ''
  if (!shareToken || !sourceTenantId || !sourceRepositoryId || !sourceItemId) {
    return null
  }

  const actionRaw = sessionStorage.getItem('shareAction')
  const permission = sessionStorage.getItem('sharePermission') || undefined
  const resourceType =
    (sessionStorage.getItem(
      'shareResourceType',
    ) as ShareContext['resourceType']) || 'folder-item'
  const sourceReportId = sessionStorage.getItem('shareReportId') || undefined

  return {
    action:
      actionRaw != null && actionRaw !== '' ? Number(actionRaw) : undefined,
    permission,
    resourceType,
    shareToken,
    sourceItemId,
    sourceReportId,
    sourceRepositoryId,
    sourceTenantId,
  }
}

export const resolveShareContext = (
  context: ShareContext | null,
): ShareContext | null => context || readPersistedShareContext()
