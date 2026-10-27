import { extractWorkflowGeneral } from '@/pages/requests/utils/workflow.utils'
import type {
  PortalSubmission,
  PortalSubmissionSource,
} from './portalSubmissions'
import { submissionInstanceIds } from './portalDetail'

/**
 * A list tab from the workflow's Request Views setting
 * (settings.general.requestTabs), the same tabs the Requests page shows.
 */
export type PortalRequestTab = {
  id: string
  label: string
  /** Stage-based tab: the workflow blocks whose requests it lists. */
  nodeIds: string[]
  /** Non stage-based tab: the mailbox it lists (Inbox / Sent / Closed). */
  source: PortalSubmissionSource | null
}

// Same order as the Requests page's Inbox / Sent / Closed buckets.
const BUCKET_SOURCES: PortalSubmissionSource[] = ['inbox', 'sent', 'completed']

/** The workflow's configured request tabs; [] when it has none. */
export const getPortalRequestTabs = (workflow: unknown): PortalRequestTab[] => {
  const general = extractWorkflowGeneral(workflow)
  const configured: {
    id?: unknown
    label?: unknown
    nodeIds?: unknown[]
  }[] = Array.isArray(general?.requestTabs) ? general.requestTabs : []
  if (!configured.length) return []

  const isStageBased =
    general?.isStageBased === 1 ||
    general?.isStageBased === true ||
    configured.some((tab) => Array.isArray(tab?.nodeIds) && tab.nodeIds.length)

  return configured.map((tab, index) => ({
    id: String(tab?.id ?? `tab-${index}`),
    label: String(tab?.label || '').trim() || `Tab ${index + 1}`,
    nodeIds:
      isStageBased && Array.isArray(tab?.nodeIds)
        ? tab.nodeIds.map(String).filter(Boolean)
        : [],
    source: isStageBased ? null : (BUCKET_SOURCES[index] ?? null),
  }))
}

/** Whether a submission belongs in a tab. */
export const submissionInTab = (
  submission: PortalSubmission,
  tab: PortalRequestTab,
): boolean => {
  if (tab.nodeIds.length) {
    const activityId =
      submissionInstanceIds(submission).activityId || submission.raw.activityId
    return activityId != null && tab.nodeIds.includes(String(activityId))
  }
  if (tab.source) return submission.source === tab.source
  return false
}
