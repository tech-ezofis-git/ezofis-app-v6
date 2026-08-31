import type { Node } from '@xyflow/react'
import KYCAgentSettingsPanel from './KYCAgentSettingsPanel'

export default function KYCAgentNodeSettings({ node }: { node: Node }) {
  return <KYCAgentSettingsPanel node={node} />
}
