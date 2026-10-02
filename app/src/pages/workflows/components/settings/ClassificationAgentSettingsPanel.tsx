import type { Node } from '@xyflow/react'
import ConnectionsRouting from './common/ConnectionsRouting'

export default function ClassificationAgentSettingsPanel({
  node,
}: {
  node?: Node
}) {
  if (!node) return null

  return (
    <div className='flex h-full flex-col space-y-3.5 overflow-y-auto p-4 font-sans'>
      <ConnectionsRouting defaultOpen node={node} />
    </div>
  )
}
