import type { Node } from '@xyflow/react'
import { isSubWorkflowIdSet } from '@/features/sub-workflow/utils/blockSettings'
import { getNodeToolType, NODE_TOOL_TYPE } from './nodeToolTypes'

// Workflow Connector block: starts another published workflow as a child.
// Only `subWorkflowId` (+ its display name) is stored on the node; export
// spreads node data into the flowJson block settings, matching V5's
// `{ type: 'WORKFLOW_CONNECTOR', settings: { subWorkflowId } }`.
export const WORKFLOW_CONNECTOR_NODE = {
  icon: 'lucide:workflow',
  iconColor: '#EA22EB',
  subLabel: 'Connect to another workflow',
} as const

export const isWorkflowConnectorNode = (node: Pick<Node, 'data'>) =>
  getNodeToolType(node.data) === NODE_TOOL_TYPE.WORKFLOW_CONNECTOR

/** Publish-time errors for connector nodes, one message per bad node. */
export const getWorkflowConnectorErrors = (
  nodes: Node[],
  currentWorkflowId?: number | string | null,
): string[] =>
  nodes.filter(isWorkflowConnectorNode).flatMap((node) => {
    const data = (node.data || {}) as Record<string, unknown>
    const label = String(data.label || 'Workflow Connector')
    if (!isSubWorkflowIdSet(data.subWorkflowId))
      return [`${label}: select the workflow to connect to`]
    if (
      currentWorkflowId != null &&
      String(data.subWorkflowId) === String(currentWorkflowId)
    )
      return [`${label}: a workflow can't connect to itself`]
    return []
  })

export const CONNECTOR_SAVE_BLOCKED_MESSAGE =
  "Workflows with a Workflow Connector step can't be saved yet: the server doesn't support it. Remove the step to save."

/**
 * Save-time block for Workflow Connector steps. The V6 save API rejects the
 * WORKFLOW_CONNECTOR block type until the sub-workflow backend ships, so a
 * workflow containing one isn't sent at all. Lifts when the live API is on.
 */
export const getConnectorSaveBlock = (
  nodes: Node[],
  backendSupportsConnector: boolean,
): string | null =>
  !backendSupportsConnector && nodes.some(isWorkflowConnectorNode)
    ? CONNECTOR_SAVE_BLOCKED_MESSAGE
    : null

/** Publish-time errors for nodes with the Workflow Initiator switched on. */
export const getWorkflowInitiatorErrors = (
  nodes: Node[],
  currentWorkflowId?: number | string | null,
): string[] =>
  nodes
    .filter((node) => (node.data as Record<string, unknown>)?.workflowInitiator)
    .flatMap((node) => {
      const data = node.data as Record<string, unknown>
      const label = String(data.label || 'Step')
      if (!isSubWorkflowIdSet(data.subWorkflowId))
        return [`${label}: select the workflow to initiate`]
      if (
        currentWorkflowId != null &&
        String(data.subWorkflowId) === String(currentWorkflowId)
      )
        return [`${label}: a workflow can't initiate itself`]
      return []
    })
