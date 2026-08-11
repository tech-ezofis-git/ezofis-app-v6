import type { Node } from '@xyflow/react'
import OCRAgentSettingsPanel from './OCRAgentSettingsPanel'

export default function OCRAgentNodeSettings({ node }: { node: Node }) {
  return <OCRAgentSettingsPanel node={node} />
}
