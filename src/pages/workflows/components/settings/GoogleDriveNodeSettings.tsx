import type { Node } from '@xyflow/react'
import GoogleDriveSettingsPanel from './GoogleDriveSettingsPanel'

export default function GoogleDriveNodeSettings({ node }: { node: Node }) {
    return <GoogleDriveSettingsPanel node={node} />
}
