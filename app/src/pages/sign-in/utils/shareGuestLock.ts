import authUserStore from '@/stores/authUserStore'

/**
 * Dashboard/report guests must stay on the single shared resource — unlike
 * folder-item shares, which still let the guest browse the wider app.
 */
export const shouldLockToShareResource = (): {
  allowedPath: string | null
  locked: boolean
} => {
  const shareCtx = authUserStore.getState().shareContext
  if (!shareCtx) return { allowedPath: null, locked: false }

  if (shareCtx.resourceType === 'dashboard') {
    return { allowedPath: '/', locked: true }
  }
  if (shareCtx.resourceType === 'report' && shareCtx.sourceReportId) {
    return { allowedPath: `/reports/${shareCtx.sourceReportId}`, locked: true }
  }
  return { allowedPath: null, locked: false }
}
