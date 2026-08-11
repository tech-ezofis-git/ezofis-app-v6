import type { Node } from '@xyflow/react'
import ManualUserSettingsPanel from './ManualUserSettingsPanel'

export default function ManualUserNodeSettings({ node }: { node: Node }) {
  return <ManualUserSettingsPanel node={node} />
}
