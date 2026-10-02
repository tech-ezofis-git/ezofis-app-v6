import type { Node } from '@xyflow/react'
import ClassificationAgentSettingsPanel from './ClassificationAgentSettingsPanel'

export default function ClassificationAgentNodeSettings({
  node,
}: {
  node: Node
}) {
  return <ClassificationAgentSettingsPanel node={node} />
}
