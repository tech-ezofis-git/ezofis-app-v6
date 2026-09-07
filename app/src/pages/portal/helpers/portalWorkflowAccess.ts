import {
  extractBlocks,
  extractWorkflowGraph,
  isAccountsPayableWorkflow,
} from '@/pages/requests/utils/workflow.utils'

const asRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

export const userIdFromIdentity = (payload: unknown): string => {
  const record = asRecord(payload)
  if (!record) return ''
  const nested = asRecord(record.user) || asRecord(record.session)
  return String(
    record.id ||
      record.userId ||
      record.userID ||
      nested?.id ||
      nested?.userId ||
      '',
  ).trim()
}

export const canCreateFromWorkflow = (
  workflow: unknown,
  userId?: string,
): boolean => {
  if (isAccountsPayableWorkflow(workflow)) return true

  const blocks = extractBlocks(workflow)
  const startBlock = blocks.find(
    (block: { settings?: { users?: unknown }; type?: string }) =>
      String(block.type || '').toUpperCase() === 'START',
  )

  if (!startBlock?.settings) return true

  const allowedUsers: string[] = Array.isArray(startBlock.settings.users)
    ? startBlock.settings.users.map(String)
    : []

  if (allowedUsers.length === 0) return true
  if (!userId) return false

  return allowedUsers.some(
    (allowed) => allowed.toLowerCase() === String(userId).toLowerCase(),
  )
}

export const getStartActionLabel = (
  workflow: unknown,
  fallback = 'Submit',
): string => {
  const { blocks, rules } = extractWorkflowGraph(workflow)
  const start = blocks.find(
    (block: { id?: string; type?: string }) =>
      String(block.type || '').toUpperCase() === 'START',
  )
  if (!start) return fallback

  const action = rules
    .filter(
      (rule: { fromBlockId?: string }) =>
        String(rule.fromBlockId || '') === String(start.id || ''),
    )
    .map((rule: { action?: string; proceedAction?: string }) =>
      String(rule.proceedAction || rule.action || '').trim(),
    )
    .find(Boolean)

  return action || fallback
}

export const getWorkflowRuleActions = (
  workflow: unknown,
  activityId?: string,
): { label: string; value: string }[] => {
  if (!activityId) return []
  const { rules } = extractWorkflowGraph(workflow)
  return rules
    .filter(
      (rule: { fromBlockId?: string }) =>
        String(rule.fromBlockId || '') === String(activityId),
    )
    .map((rule: { action?: string; proceedAction?: string }) => {
      const actionName = String(rule.proceedAction || rule.action || 'Submit')
      return { label: actionName, value: actionName }
    })
}

export const assignedUserIdsForActivity = (
  workflow: unknown,
  activityId?: string,
  raw?: Record<string, unknown>,
): string[] => {
  if (!activityId) return []

  const assigned = String(raw?.assignedToUserId || '').trim()
  if (assigned) return [assigned]

  const { blocks } = extractWorkflowGraph(workflow)
  const block = blocks.find(
    (item: { id?: string; settings?: { users?: unknown } }) =>
      String(item.id || '') === String(activityId),
  )
  const users = block?.settings?.users
  return Array.isArray(users) ? users.map(String) : []
}

export const isAssignedToUser = (
  assignedUserIds: string[],
  userId?: string,
): boolean => {
  if (assignedUserIds.length === 0) return true
  if (!userId) return false
  return assignedUserIds.some(
    (id) => id.toLowerCase() === String(userId).toLowerCase(),
  )
}
