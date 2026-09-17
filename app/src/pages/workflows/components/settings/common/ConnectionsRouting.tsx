import { type Node, useEdges, useNodes, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import {
  getNodeToolType,
  NODE_TOOL_TYPE,
} from '@/pages/workflows/utils/nodeToolTypes'
import SettingsSection from './SettingsSection'

interface ConnectionsRoutingProps {
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

export default function ConnectionsRouting({ node }: ConnectionsRoutingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const edges = useEdges()
  const nodes = useNodes()
  const { setEdges } = useReactFlow()

  const onUpdateAction = (edgeId: string, action: string) => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, action, proceedAction: action } }
          : e,
      ),
    )
  }

  const onUpdateFlag = (
    edgeId: string,
    key: 'remarks' | 'confirm' | 'passwordAccess' | 'signature',
    value: boolean,
  ) => {
    setEdges((eds) =>
      eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, [key]: value } } : e)),
    )
  }

  // Find all edges coming out of this node
  const outgoingEdges = edges.filter((e) => e.source === node.id)

  const nodeToolType = getNodeToolType(node.data)
  const isQualifyAgent = nodeToolType === NODE_TOOL_TYPE.QUALIFY_AGENT
  const isConditionNode =
    nodeToolType === NODE_TOOL_TYPE.CONDITION ||
    nodeToolType === 'condition' ||
    String((node.data as any)?.type || '').toUpperCase() === 'CONDITION'
  const isApAgent = nodeToolType === NODE_TOOL_TYPE.AP_AGENT
  const isFtpAgent = nodeToolType === NODE_TOOL_TYPE.FTP_AGENT

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

  // Dynamic options: Base defaults + any unique actions found across all workflow edges
  const dynamicActions = isQualifyAgent
    ? qualifyActionOptions
    : isConditionNode
      ? conditionActionOptions
      : isApAgent
        ? apActionOptions
        : isFtpAgent
          ? ftpActionOptions
          : Array.from(
              new Set([
                ...routingActionOptions.map((o) => o.name),
                ...edges
                  .map((e) => getRoutingAction(e.data as Record<string, unknown>))
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
        const norm = String(rawAction).toUpperCase().replace(/[\s_-]+/g, ' ')
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
      return 'Route to Document Generate Agent for doc creation'
    if (conn.targetToolType === NODE_TOOL_TYPE.QUALIFY_AGENT)
      return 'Route to Qualify Agent for lead evaluation'
    if (conn.targetToolType === NODE_TOOL_TYPE.QUOTE_AGENT)
      return 'Route to Quote Agent for pricing & quote generation'
    if (conn.targetToolType === NODE_TOOL_TYPE.MANUAL_USER)
      return 'Route for manual user intervention'
    return `Define behavior when routing to ${conn.targetLabel}`
  }

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
              className='space-y-4 rounded-xl bg-white p-4 shadow-sm'
              key={conn.edgeId}
            >
              <div className='flex items-start gap-2.5'>
                <Icon
                  className='text-purple-600 mt-0.5 h-4 w-4 stroke-[2]'
                  name='lucide:link-2'
                />
                <div className='flex flex-col space-y-0.5'>
                  <span className='text-13 leading-none font-medium text-gray-12'>
                    {conn.targetLabel}
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    {getTargetDescription(conn)}
                  </span>
                </div>
              </div>

              <div className='animate-in fade-in slide-in-from-top-1 space-y-1.5 pt-1 duration-300'>
                <div className='text-12 font-medium text-gray-12'>Action</div>
                <InputSelect
                  className='bg-white'
                  options={dynamicActions}
                  placeholder='Select Action Type'
                  rightSectionIcon='lucide:chevrons-up-down'
                  creatable={
                    !isQualifyAgent &&
                    !isConditionNode &&
                    !isApAgent &&
                    !isFtpAgent
                  }
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

              <div className='grid grid-cols-2 gap-x-3 gap-y-2 pt-1'>
                <div className='flex items-center justify-between'>
                  <span className='text-12 text-gray-11'>Remarks required</span>
                  <InputSwitch
                    checked={conn.remarks}
                    onChange={(checked) =>
                      onUpdateFlag(conn.edgeId, 'remarks', checked)
                    }
                  />
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-12 text-gray-11'>Confirmation dialog</span>
                  <InputSwitch
                    checked={conn.confirm}
                    onChange={(checked) =>
                      onUpdateFlag(conn.edgeId, 'confirm', checked)
                    }
                  />
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-12 text-gray-11'>Password verification</span>
                  <InputSwitch
                    checked={conn.passwordAccess}
                    onChange={(checked) =>
                      onUpdateFlag(conn.edgeId, 'passwordAccess', checked)
                    }
                  />
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-12 text-gray-11'>Signature required</span>
                  <InputSwitch
                    checked={conn.signature}
                    onChange={(checked) =>
                      onUpdateFlag(conn.edgeId, 'signature', checked)
                    }
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='py-4 text-center'>
            <p className='text-12 text-gray-8 italic'>
              No outgoing connections from this node.
            </p>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
