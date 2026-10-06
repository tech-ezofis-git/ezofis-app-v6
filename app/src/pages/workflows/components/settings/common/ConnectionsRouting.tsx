import { type Node, useEdges, useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import {
  getNodeToolType,
  NODE_TOOL_TYPE,
} from '@/pages/workflows/utils/nodeToolTypes'
import useWorkflowStore from '../../../stores/useWorkflowStore'
import SettingsSection from './SettingsSection'

interface ConnectionsRoutingProps {
  defaultOpen?: boolean
  node: Node
}

interface ConnectionWithData {
  action: string
  confirm: boolean
  edgeId: string
  passwordAccess: boolean
  remarks: boolean
  signature: boolean
  targetId: string
  targetLabel: string
  targetToolType: string
}

const routingActionOptions = [
  { id: 1, name: 'Submit' },
  { id: 2, name: 'Approve' },
  { id: 3, name: 'Reject' },
  { id: 4, name: 'Verify' },
]

const getRoutingAction = (data: Record<string, unknown> | undefined) =>
  String(data?.action || data?.proceedAction || '')

export default function ConnectionsRouting({
  defaultOpen = false,
  node,
}: ConnectionsRoutingProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isAddingRoute, setIsAddingRoute] = useState(false)
  const [newAction, setNewAction] = useState('Submit')
  const [newTargetId, setNewTargetId] = useState('')

  const edges = useEdges()
  const nodes = useNodes()
  const { setEdges } = useReactFlow()

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true)
    }
  }, [node.id, defaultOpen])

const computeHandlesForNodes = (sourceNode?: Node, targetNode?: Node) => {
  if (!sourceNode || !targetNode)
    return { sourceHandle: 's-bottom', targetHandle: 't-top' }
  const dx = targetNode.position.x - sourceNode.position.x
  const dy = targetNode.position.y - sourceNode.position.y
  const isHorizontal = Math.abs(dx) > Math.abs(dy) + 100
  if (isHorizontal) {
    return {
      sourceHandle: dx > 0 ? 's-right' : 's-left',
      targetHandle: dx > 0 ? 't-left' : 't-right',
    }
  }
  return {
    sourceHandle: dy > 0 ? 's-bottom' : 's-top',
    targetHandle: dy > 0 ? 't-top' : 't-bottom',
  }
}

  const updateEdgesAndStore = (updater: (eds: any[]) => any[]) => {
    setEdges((eds) => {
      const next = updater(eds)
      useWorkflowStore.setState({ loadedEdges: next })
      return next
    })
  }

  const onUpdateAction = (edgeId: string, action: string) => {
    updateEdgesAndStore((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, action, proceedAction: action } }
          : e,
      ),
    )
  }

  const onUpdateTarget = (edgeId: string, targetId: string) => {
    const targetNode = nodes.find((n) => n.id === targetId)
    const handles = computeHandlesForNodes(node, targetNode)
    updateEdgesAndStore((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              sourceHandle: handles.sourceHandle,
              target: targetId,
              targetHandle: handles.targetHandle,
            }
          : e,
      ),
    )
  }

  const onDeleteEdge = (edgeId: string) => {
    updateEdgesAndStore((eds) => eds.filter((e) => e.id !== edgeId))
  }

  const onUpdateFlag = (
    edgeId: string,
    key: 'remarks' | 'confirm' | 'passwordAccess' | 'signature',
    value: boolean,
  ) => {
    updateEdgesAndStore((eds) =>
      eds.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, [key]: value } } : e,
      ),
    )
  }

  // Find all edges coming out of this node
  const outgoingEdges = edges.filter((e) => e.source === node.id)

  const nodeToolType = getNodeToolType(node.data)
  const isQualifyAgent = nodeToolType === NODE_TOOL_TYPE.QUALIFY_AGENT
  const isClassificationAgent =
    nodeToolType === NODE_TOOL_TYPE.CLASSIFICATION_AGENT
  const isConditionNode =
    nodeToolType === NODE_TOOL_TYPE.CONDITION ||
    nodeToolType === 'condition' ||
    String((node.data as any)?.type || '').toUpperCase() === 'CONDITION'
  const isApAgent = nodeToolType === NODE_TOOL_TYPE.AP_AGENT
  const isFtpAgent = nodeToolType === NODE_TOOL_TYPE.FTP_AGENT

  const isManualUser =
    nodeToolType === NODE_TOOL_TYPE.MANUAL_USER ||
    nodeToolType === NODE_TOOL_TYPE.FORM_SUBMISSION ||
    nodeToolType === 'manual_user' ||
    nodeToolType === 'user_task' ||
    nodeToolType === 'manual' ||
    String((node.data as any)?.type || '').toUpperCase() === 'MANUAL_USER' ||
    String((node.data as any)?.type || '').toUpperCase() === 'USER_TASK'

  const qualifyActionOptions = [
    { id: 1, name: 'QUALIFY' },
    { id: 2, name: 'DISQUALIFY' },
  ]

  const conditionActionOptions = [
    { id: 1, name: 'SATISFIED' },
    { id: 2, name: 'NOT SATISFIED' },
  ]

  const apActionOptions = [
    { id: 1, name: 'MATCHED' },
    { id: 2, name: 'NOT MATCHED' },
    { id: 3, name: 'PARTIALLY MATCHED' },
    { id: 4, name: 'NON-INVOICE' },
  ]

  const ftpActionOptions = [
    { id: 1, name: 'SUCCESS' },
    { id: 2, name: 'FAILED' },
  ]

  const classificationActionOptions = [
    { id: 1, name: 'Classified' },
    { id: 2, name: 'Unclassified' },
  ]

  // Dynamic options: Base defaults + any unique actions found across all workflow edges
  const dynamicActions = isQualifyAgent
    ? qualifyActionOptions
    : isConditionNode
      ? conditionActionOptions
      : isApAgent
        ? apActionOptions
        : isFtpAgent
          ? ftpActionOptions
          : isClassificationAgent
            ? Array.from(
                new Set([
                  ...classificationActionOptions.map((o) => o.name),
                  ...routingActionOptions.map((o) => o.name),
                  ...edges
                    .map((e) =>
                      getRoutingAction(e.data as Record<string, unknown>),
                    )
                    .filter(Boolean),
                ]),
              ).map((name, index) => ({ id: index + 1, name }))
            : Array.from(
                new Set([
                  ...routingActionOptions.map((o) => o.name),
                  ...edges
                    .map((e) =>
                      getRoutingAction(e.data as Record<string, unknown>),
                    )
                    .filter(Boolean),
                ]),
              ).map((name, index) => ({ id: index + 1, name }))

  const connections: ConnectionWithData[] = outgoingEdges
    .filter((edge) => nodes.some((n) => n.id === edge.target))
    .map((edge) => {
      const targetNode = nodes.find((n) => n.id === edge.target)
      const edgeData = (edge.data || {}) as Record<string, unknown>
      const rawAction = getRoutingAction(edgeData)
      let action = rawAction

      if (isQualifyAgent) {
        action = rawAction === 'DISQUALIFY' ? 'DISQUALIFY' : 'QUALIFY'
      } else if (isConditionNode) {
        const norm = String(rawAction).toUpperCase().replace(/_/g, ' ')
        action = norm.includes('NOT') ? 'NOT SATISFIED' : 'SATISFIED'
      } else if (isApAgent) {
        const norm = String(rawAction)
          .toUpperCase()
          .replace(/[\s_-]+/g, ' ')
        if (norm.includes('PARTIAL')) {
          action = 'PARTIALLY MATCHED'
        } else if (norm.includes('NOT') || norm.includes('UNMATCH')) {
          action = 'NOT MATCHED'
        } else if (norm.includes('NON')) {
          action = 'NON-INVOICE'
        } else {
          action = 'MATCHED'
        }
      } else if (isFtpAgent) {
        const norm = String(rawAction).toUpperCase()
        action =
          norm.includes('FAIL') || norm.includes('ERROR') ? 'FAILED' : 'SUCCESS'
      }

      return {
        action,
        confirm: !!edgeData.confirm,
        edgeId: edge.id,
        passwordAccess: !!edgeData.passwordAccess,
        remarks: !!edgeData.remarks,
        signature: !!edgeData.signature,
        targetId: edge.target,
        targetLabel: (targetNode?.data?.label as string) || 'Next Step',
        targetToolType: getNodeToolType(targetNode?.data),
      }
    })

  const getTargetDescription = (conn: ConnectionWithData) => {
    if (conn.targetToolType === NODE_TOOL_TYPE.END)
      return 'Complete the workflow on this pathway'
    if (conn.targetToolType === NODE_TOOL_TYPE.AP_AGENT)
      return 'Route to AP Agent for processing'
    if (conn.targetToolType === NODE_TOOL_TYPE.OCR_AGENT)
      return 'Route to OCR Agent for extraction'
    if (conn.targetToolType === NODE_TOOL_TYPE.FTP_AGENT)
      return 'Route to FTP Agent for file transfer'
    if (conn.targetToolType === NODE_TOOL_TYPE.KYC_AGENT)
      return 'Route to KYC Agent for identity verification'
    if (conn.targetToolType === NODE_TOOL_TYPE.PROCUREMENT_AGENT)
      return 'Route to Procurement Agent for requisition processing'
    if (conn.targetToolType === NODE_TOOL_TYPE.DOCUMENT_GENERATE_AGENT)
      return 'Route to Document Generator for doc creation'
    if (conn.targetToolType === NODE_TOOL_TYPE.QUALIFY_AGENT)
      return 'Route to Qualifier for lead evaluation'
    if (conn.targetToolType === NODE_TOOL_TYPE.QUOTE_AGENT)
      return 'Route to Quote Estimator for pricing & quote generation'
    if (conn.targetToolType === NODE_TOOL_TYPE.CLASSIFICATION_AGENT)
      return 'Route to Classification Agent for category classification'
    if (conn.targetToolType === NODE_TOOL_TYPE.MANUAL_USER)
      return 'Route for manual user intervention'
    return `Define behavior when routing to ${conn.targetLabel}`
  }

  const targetNodeOptions = nodes
    .filter((n) => n.id !== node.id)
    .map((n) => ({
      id: String(n.id),
      name: String(
        (n.data as any)?.label || (n.data as any)?.name || `Step (${n.id})`,
      ),
    }))

  return (
    <SettingsSection
      icon='lucide:git-branch'
      isOpen={isOpen}
      title='Connections & Routing'
      variant='premium'
      onToggle={() => setIsOpen(!isOpen)}
    >
      <div className='flex flex-col gap-2.5 py-1'>
        {connections.length > 0 ? (
          connections.map((conn) => (
            <div
              className='space-y-4 rounded-xl bg-surface p-4 shadow-sm border border-gray-4'
              key={conn.edgeId}
            >
              <div className='flex items-start justify-between gap-2.5'>
                <div className='flex items-start gap-2.5'>
                  <Icon
                    className='mt-0.5 h-4 w-4 stroke-[2] text-purple-10'
                    name='lucide:link-2'
                  />
                  <div className='flex flex-col space-y-0.5'>
                    <span className='text-13 font-medium leading-none text-gray-12'>
                      {conn.action
                        ? `${conn.action} ➔ ${conn.targetLabel}`
                        : conn.targetLabel}
                    </span>
                    <span className='text-11 leading-tight text-gray-9'>
                      {getTargetDescription(conn)}
                    </span>
                  </div>
                </div>
                <IconButton
                  ariaLabel='Delete connection route'
                  color='gray'
                  icon='lucide:trash-2'
                  size='xs'
                  tooltip='Remove this action route'
                  type='button'
                  variant='ghost'
                  onClick={() => onDeleteEdge(conn.edgeId)}
                />
              </div>

              <div className='animate-in fade-in slide-in-from-top-1 grid grid-cols-2 gap-3 pt-1 duration-300'>
                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    Action Button Label
                  </div>
                  <InputSelect
                    className='bg-surface'
                    creatable={
                      !isQualifyAgent &&
                      !isConditionNode &&
                      !isApAgent &&
                      !isFtpAgent
                    }
                    options={dynamicActions}
                    placeholder='Select or type action...'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable
                    value={
                      dynamicActions.find((o) => o.name === conn.action) ||
                      (conn.action ? { id: -1, name: conn.action } : null)
                    }
                    onChange={(val) => {
                      if (val) {
                        onUpdateAction(conn.edgeId, val.name)
                      }
                    }}
                  />
                </div>

                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    Target Destination Step
                  </div>
                  <InputSelect
                    className='bg-surface'
                    options={targetNodeOptions}
                    placeholder='Select target step...'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable
                    value={
                      targetNodeOptions.find(
                        (o) => String(o.id) === String(conn.targetId),
                      ) || null
                    }
                    onChange={(val) => {
                      if (val) {
                        onUpdateTarget(conn.edgeId, String(val.id))
                      }
                    }}
                  />
                </div>
              </div>

              {isManualUser && (
                <div className='grid grid-cols-2 gap-x-3 gap-y-2 pt-1 border-t border-gray-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Remarks required
                    </span>
                    <InputSwitch
                      checked={conn.remarks}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'remarks', checked)
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Confirmation dialog
                    </span>
                    <InputSwitch
                      checked={conn.confirm}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'confirm', checked)
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Password verification
                    </span>
                    <InputSwitch
                      checked={conn.passwordAccess}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'passwordAccess', checked)
                      }
                    />
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-12 text-gray-11'>
                      Signature required
                    </span>
                    <InputSwitch
                      checked={conn.signature}
                      onChange={(checked) =>
                        onUpdateFlag(conn.edgeId, 'signature', checked)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className='py-4 text-center'>
            <p className='text-12 italic text-gray-8'>
              No outgoing connections from this node.
            </p>
          </div>
        )}

        <div className='mt-2 border-t border-gray-4 pt-3'>
          {!isAddingRoute ? (
            <Button
              className='w-full'
              color='primary'
              icon='lucide:plus'
              size='sm'
              variant='outline'
              onClick={() => setIsAddingRoute(true)}
            >
              Add Action Route
            </Button>
          ) : (
            <div className='animate-in fade-in space-y-3 rounded-xl border border-gray-4 bg-surface p-4 shadow-sm duration-200'>
              <div className='flex items-center justify-between text-13 font-medium text-gray-12'>
                <span>New Action Route</span>
                <IconButton
                  ariaLabel='Cancel'
                  color='gray'
                  icon='lucide:x'
                  size='xs'
                  type='button'
                  variant='ghost'
                  onClick={() => setIsAddingRoute(false)}
                />
              </div>

              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Action Button Label
                </div>
                <InputSelect
                  className='bg-surface'
                  creatable
                  options={dynamicActions}
                  placeholder='Select or type action (e.g. Approve, Reject)...'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable
                  value={
                    dynamicActions.find((o) => o.name === newAction) ||
                    (newAction ? { id: -1, name: newAction } : null)
                  }
                  onChange={(val) => {
                    if (val) setNewAction(val.name)
                  }}
                />
              </div>

              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Target Step
                </div>
                <InputSelect
                  className='bg-surface'
                  options={targetNodeOptions}
                  placeholder='Select target step...'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable
                  value={
                    targetNodeOptions.find(
                      (o) => String(o.id) === String(newTargetId),
                    ) || null
                  }
                  onChange={(val) => {
                    if (val) setNewTargetId(String(val.id))
                  }}
                />
              </div>

              <div className='flex items-center justify-end gap-2 pt-1'>
                <Button
                  color='gray'
                  size='sm'
                  variant='ghost'
                  onClick={() => setIsAddingRoute(false)}
                >
                  Cancel
                </Button>
                <Button
                  color='primary'
                  disabled={!newTargetId || !newAction}
                  size='sm'
                  variant='solid'
                  onClick={() => {
                    if (!newTargetId || !newAction) return
                    const targetNode = nodes.find((n) => n.id === newTargetId)
                    const handles = computeHandlesForNodes(node, targetNode)
                    const edgeId = `e-${node.id}-${newTargetId}-${Date.now()}`
                    updateEdgesAndStore((eds) => [
                      ...eds,
                      {
                        data: { action: newAction, proceedAction: newAction },
                        id: edgeId,
                        source: node.id,
                        sourceHandle: handles.sourceHandle,
                        target: newTargetId,
                        targetHandle: handles.targetHandle,
                        type: 'custom',
                      },
                    ])
                    setIsAddingRoute(false)
                    setNewAction('Submit')
                    setNewTargetId('')
                  }}
                >
                  Create Action Route
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}

