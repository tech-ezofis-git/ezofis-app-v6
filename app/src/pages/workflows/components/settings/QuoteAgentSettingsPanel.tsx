import type { Node } from '@xyflow/react'
import { useNodes } from '@xyflow/react'
import ConnectionsRouting from './common/ConnectionsRouting'

export default function QuoteAgentSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const liveNodes = useNodes()

  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 space-y-3.5 font-sans'>
      {/* Connections & Routing */}
      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}
