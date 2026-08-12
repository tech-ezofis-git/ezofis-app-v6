import type { Node } from '@xyflow/react'
import EmailSettingsPanel from './EmailSettingsPanel'

export default function EmailNodeSettings({ node }: { node: Node }) {
  return <EmailSettingsPanel node={node} />
}
