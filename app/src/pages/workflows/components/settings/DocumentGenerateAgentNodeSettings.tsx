import type { Node } from '@xyflow/react'
import DocumentGenerateAgentSettingsPanel from './DocumentGenerateAgentSettingsPanel'

export default function DocumentGenerateAgentNodeSettings({
  node,
}: {
  node: Node
}) {
  return <DocumentGenerateAgentSettingsPanel node={node} />
}
