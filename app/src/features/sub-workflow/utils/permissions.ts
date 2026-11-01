import {
  isSubWorkflowIdSet,
  readInitiatorSettings,
  WORKFLOW_CONNECTOR_BLOCK_TYPE,
} from './blockSettings'

interface SessionLike {
  email?: string
  id?: number | string
}

const parseJson = (value: unknown): any => {
  if (typeof value !== 'string') return value ?? null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/** The workflow definition: V6 keeps it in `workflowJson`, V5 in `flowJson`. */
export const getWorkflowDefinition = (workflow: any): any =>
  parseJson(workflow?.workflowJson) ?? parseJson(workflow?.flowJson) ?? null

/** The `blocks[]` of a workflow's definition, stored as string or object. */
export const getFlowBlocks = (workflow: any): any[] => {
  const definition = getWorkflowDefinition(workflow)
  return Array.isArray(definition?.blocks) ? definition.blocks : []
}

export const getStartBlock = (workflow: any) =>
  getFlowBlocks(workflow).find((b) => b?.type === 'START')

/**
 * Child workflow id offered by the block the parent request is currently
 * on: the START block for a new request, otherwise the block matching the
 * request's `activityId`. 0 when that block has no initiator.
 */
export const getInitiatorSubWorkflowId = (
  parentWorkflow: any,
  activityId?: number | string | null,
): number | string => {
  const blocks = getFlowBlocks(parentWorkflow)
  const block = activityId
    ? blocks.find((b) => String(b?.id) === String(activityId))
    : blocks.find((b) => b?.type === 'START')
  const { subWorkflowId, workflowInitiator } = readInitiatorSettings(
    block?.settings,
  )
  return workflowInitiator ? subWorkflowId : 0
}

/** True when any block has a Workflow Initiator or a connector target. */
export const hasSubWorkflowSetup = (workflow: any): boolean =>
  getFlowBlocks(workflow).some((block) =>
    block?.type === WORKFLOW_CONNECTOR_BLOCK_TYPE
      ? isSubWorkflowIdSet(block?.settings?.subWorkflowId)
      : readInitiatorSettings(block?.settings).workflowInitiator,
  )

const emailDomain = (email?: string) =>
  String(email || '')
    .split('@')[1]
    ?.trim()
    .toLowerCase() || ''

const isDocumentOnly = (workflow: any) => {
  if (String(workflow?.initiatedBy || '').toUpperCase() === 'DOCUMENT')
    return true
  const type =
    getWorkflowDefinition(workflow)?.settings?.general?.initiateUsing?.type
  return (
    String(type || '')
      .toUpperCase()
      .replace(/[-_\s]/g, '') === 'DOCUMENT'
  )
}

const EMAIL_TOOL_TYPES = new Set(['gmail', 'outlook'])

// V5 rule (InboxList.vue:5009-5047), extended for V6 definitions: the user
// may start the child only when it is started manually (V5 `initiateMode`
// MANUAL; V6 has no such key, so any non-email start counts), it is not
// document-only, and the user is listed ("0" = everyone), their e-mail
// domain is allowed, or the START block restricts nobody. Groups aren't
// resolved here, matching V5.
export const canInitiateSubWorkflow = (
  childWorkflow: any,
  session: SessionLike | null | undefined,
): boolean => {
  if (!childWorkflow || !session) return false
  if (isDocumentOnly(childWorkflow)) return false

  const settings = getStartBlock(childWorkflow)?.settings
  if (!settings) return false
  if (settings.initiateMode && settings.initiateMode !== 'MANUAL') return false
  if (EMAIL_TOOL_TYPES.has(String(settings.toolType || '').toLowerCase()))
    return false

  const users: string[] = (settings.users || []).map(String)
  const groups: unknown[] = settings.groups || []
  if (users.includes('0') || users.includes(String(session.id))) return true

  const initiateBy: string[] = settings.initiateBy || []
  if (initiateBy.includes('DOMAIN_USER')) {
    const domains: string[] = (settings.userDomains || []).map((d: string) =>
      String(d).trim().toLowerCase(),
    )
    if (domains.includes(emailDomain(session.email))) return true
  }
  return users.length === 0 && groups.length === 0 && !settings.initiateMode
}
