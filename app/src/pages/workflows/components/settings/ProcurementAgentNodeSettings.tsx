import type { Node } from '@xyflow/react'
import ProcurementAgentSettingsPanel from './ProcurementAgentSettingsPanel'

export default function ProcurementAgentNodeSettings({ node }: { node: Node }) {
  return <ProcurementAgentSettingsPanel node={node} />
}
