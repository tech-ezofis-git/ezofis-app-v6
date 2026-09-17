import type { Node } from '@xyflow/react'
import QuoteAgentSettingsPanel from './QuoteAgentSettingsPanel'

export default function QuoteAgentNodeSettings({ node }: { node: Node }) {
  return <QuoteAgentSettingsPanel node={node} />
}
