import { type QueryClient, useQuery } from '@tanstack/react-query'
import {
  type AllWorkflowsInboxGroup,
  getAllWorkflowsInbox,
} from '@/api/v6/workflows'

export const ALL_WORKFLOWS_INBOX_KEY = ['all-workflows-inbox']

/**
 * Refetch every request list after a request changes (approve, reject,
 * submit, background job done): the per-workflow lists (`inbox`) and the
 * All Workflows inbox, which is cached separately and would otherwise keep
 * showing the request until its staleTime runs out.
 */
export const invalidateRequestLists = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: ['inbox'] })
  void queryClient.invalidateQueries({ queryKey: ALL_WORKFLOWS_INBOX_KEY })
}

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
 * Overdue requests in a group: open requests that reached the inbox before
 * today and are still not actioned. The API's earlierCount only covers the
 * fetched items (itemsPerWorkflow), so it is taken as totalCount minus
 * today's new ones (rows come newest first, so today's are all fetched).
 */
export const countOverdue = (group: AllWorkflowsInboxGroup) =>
  Math.max(group.earlierCount, group.totalCount - group.newTodayCount, 0)
