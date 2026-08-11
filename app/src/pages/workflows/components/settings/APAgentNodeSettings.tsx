import type { Node } from '@xyflow/react'
import APAgentSettingsPanel from './APAgentSettingsPanel'

export default function APAgentNodeSettings({ node }: { node: Node }) {
  return <APAgentSettingsPanel node={node} />
}
