import { type Node, useEdges, useNodes, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
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
  edgeId: string
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

  // Find all edges coming out of this node
  const outgoingEdges = edges.filter((e) => e.source === node.id)

  // Dynamic options: Base defaults + any unique actions found across all workflow edges
  const dynamicActions = Array.from(
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
      return {
        action: getRoutingAction(edge.data as Record<string, unknown>),
        edgeId: edge.id,
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
                  creatable
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
