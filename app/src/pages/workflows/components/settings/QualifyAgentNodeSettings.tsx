import type { Node } from '@xyflow/react'
import QualifyAgentSettingsPanel from './QualifyAgentSettingsPanel'

export default function QualifyAgentNodeSettings({ node }: { node: Node }) {
  return <QualifyAgentSettingsPanel node={node} />
}
