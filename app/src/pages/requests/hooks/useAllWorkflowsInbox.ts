import { useQuery } from '@tanstack/react-query'
import {
  type AllWorkflowsInboxGroup,
  getAllWorkflowsInbox,
} from '@/api/v6/workflows'
import { isInboxRowOverdue } from '../utils/inboxItemDisplay'

export const ALL_WORKFLOWS_INBOX_KEY = ['all-workflows-inbox']

/** Rows fetched per workflow group (the API's default is 20). */
const ITEMS_PER_WORKFLOW = 20

/**
 * The current user's open inbox across every workflow, grouped by workflow
 * (GET /Workflows/inbox/all-workflows). Shared by the All Workflows view and
 * the workflow switcher's counts.
 */
export const useAllWorkflowsInbox = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: ALL_WORKFLOWS_INBOX_KEY,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    queryFn: () => getAllWorkflowsInbox(ITEMS_PER_WORKFLOW),
  })

/**
 * Overdue requests in a group: the API's earlierCount (open requests that
 * reached the inbox before today and are still not actioned), or, when a
 * row's due date is already past, at least that many.
 */
export const countOverdue = (group: AllWorkflowsInboxGroup) =>
  Math.max(group.earlierCount, group.items.filter(isInboxRowOverdue).length)
