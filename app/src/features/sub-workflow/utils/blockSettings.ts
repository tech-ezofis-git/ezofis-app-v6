import type {
  ConnectorBlockSettings,
  Id,
  InitiatorBlockSettings,
} from '../types'

export const WORKFLOW_CONNECTOR_BLOCK_TYPE = 'WORKFLOW_CONNECTOR'

/** Block types that may carry the Workflow Initiator toggle. */
export const INITIATOR_BLOCK_TYPES = ['START', 'INTERNAL_ACTOR'] as const

const isSet = (id: unknown): id is Id =>
  (typeof id === 'number' && id > 0) ||
  (typeof id === 'string' && id.trim() !== '' && id !== '0')

// Reads and writes the sub-workflow keys of a flowJson block's `settings`.
// Writers return a patch to spread over the existing settings so the rest
// of the block is untouched.

export const readConnectorSettings = (
  settings: Record<string, any> | undefined,
): ConnectorBlockSettings => ({
  label: String(settings?.label ?? ''),
  subWorkflowId: isSet(settings?.subWorkflowId) ? settings.subWorkflowId : '',
})

export const writeConnectorSettings = (
  subWorkflowId: Id | null | undefined,
): Pick<ConnectorBlockSettings, 'subWorkflowId'> => ({
  subWorkflowId: isSet(subWorkflowId) ? subWorkflowId : '',
})

export const readInitiatorSettings = (
  settings: Record<string, any> | undefined,
): InitiatorBlockSettings => {
  const subWorkflowId = isSet(settings?.subWorkflowId)
    ? settings.subWorkflowId
    : 0
  // V5 could leave workflowInitiator=true with subWorkflowId=0 after the
  // box was unchecked; treat that as off.
  return {
    subWorkflowId,
    workflowInitiator:
      Boolean(settings?.workflowInitiator) && subWorkflowId !== 0,
  }
}

export const writeInitiatorSettings = (
  enabled: boolean,
  subWorkflowId: Id | null | undefined,
): InitiatorBlockSettings =>
  enabled && isSet(subWorkflowId)
    ? { subWorkflowId, workflowInitiator: true }
    : { subWorkflowId: 0, workflowInitiator: false }

export const isSubWorkflowIdSet = isSet
