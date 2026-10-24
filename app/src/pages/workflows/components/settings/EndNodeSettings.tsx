import type { Node } from '@xyflow/react'
import { useNodes } from '@xyflow/react'
import ConnectionsRouting from './common/ConnectionsRouting'

// The Data Integration section (shared by all blocks) renders inside
// ConnectionsRouting, above the routing settings.
export default function EndNodeSettings({ node: initialNode }: { node: Node }) {
  const liveNodes = useNodes()
  const currentNode =
    liveNodes.find((n) => n.id === initialNode.id) || initialNode

  return (
    <div className='h-full space-y-3 overflow-y-auto px-4 pt-3 pb-4'>
      <ConnectionsRouting node={currentNode} />
    </div>
  )
}
