import type { Node } from '@xyflow/react';
import FTPAgentSettingsPanel from './FTPAgentSettingsPanel';

export default function FTPAgentNodeSettings({ node }: { node: Node }) {
    return <FTPAgentSettingsPanel node={node} />;
}
