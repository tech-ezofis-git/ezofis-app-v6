import type { Node } from '@xyflow/react'
import OneDriveSettingsPanel from './OneDriveSettingsPanel'

export default function OneDriveNodeSettings({ node }: { node: Node }) {
  return <OneDriveSettingsPanel node={node} />
}
