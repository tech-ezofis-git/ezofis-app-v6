import { useState } from 'react';
import { useEdges, useNodes, useReactFlow, type Node } from '@xyflow/react';
import Icon from '@/components/base/icon/Icon';
import InputSelect from '@/components/base/inputs/InputSelect';
import SettingsSection from './SettingsSection';

interface ConnectionWithData {
    edgeId: string;
    targetId: string;
    targetLabel: string;
    action: string;
}

interface ConnectionsRoutingProps {
    node: Node;
}

const routingActionOptions = [
    { id: 1, name: 'Submit' },
    { id: 2, name: 'Approve' },
    { id: 3, name: 'Reject' },
    { id: 4, name: 'Verify' },
];

export default function ConnectionsRouting({ node }: ConnectionsRoutingProps) {
    const [isOpen, setIsOpen] = useState(false);
    const edges = useEdges();
    const nodes = useNodes();
    const { setEdges } = useReactFlow();

    const onUpdateAction = (edgeId: string, action: string) => {
        setEdges((eds) =>
            eds.map((e) =>
                e.id === edgeId ? { ...e, data: { ...e.data, action } } : e
            )
        );
    };

    // Find all edges coming out of this node
    const outgoingEdges = edges.filter(e => e.source === node.id);

    // Dynamic options: Base defaults + any unique actions found across all workflow edges
    const dynamicActions = Array.from(
        new Set([
            ...routingActionOptions.map(o => o.name),
            ...edges.filter(e => e.data?.action).map(e => e.data?.action as string)
        ])
    ).map((name, index) => ({ id: index + 1, name }));

    const connections: ConnectionWithData[] = outgoingEdges.map(edge => {
        const targetNode = nodes.find(n => n.id === edge.target);
        return {
            edgeId: edge.id,
            targetId: edge.target,
            targetLabel: (targetNode?.data?.label as string) || 'Unknown Node',
            action: (edge.data?.action as string) || ''
        };
    });

    const getTargetDescription = (conn: ConnectionWithData) => {
        const label = conn.targetLabel.toLowerCase();
        if (label.includes('success')) return 'Complete the workflow on this pathway';
        if (label.includes('ap agent')) return 'Route to AP Agent for processing';
        if (label.includes('ocr agent')) return 'Route to OCR Agent for extraction';
        if (label.includes('ftp agent')) return 'Route to FTP Agent for file transfer';
        if (label.includes('manual user')) return 'Route for manual user intervention';
        return `Define behavior when routing to ${conn.targetLabel}`;
    };

    return (
        <SettingsSection
            title="Connections & Routing"
            icon="lucide:git-branch"
            isOpen={isOpen}
            variant="premium"
            onToggle={() => setIsOpen(!isOpen)}
        >
            <div className="flex flex-col gap-2.5 py-1">
                {connections.length > 0 ? (
                    connections.map((conn) => (
                        <div key={conn.edgeId} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                            <div className="flex items-start gap-2.5">
                                <Icon name="lucide:link-2" className="h-4 w-4 text-purple-600 stroke-[2] mt-0.5" />
                                <div className="flex flex-col space-y-0.5">
                                    <span className="text-13 font-medium text-gray-12 leading-none">{conn.targetLabel}</span>
                                    <span className="text-11 text-gray-9 leading-tight">{getTargetDescription(conn)}</span>
                                </div>
                            </div>

                            <div className="animate-in fade-in slide-in-from-top-1 duration-300 space-y-1.5 pt-1">
                                <div className="text-12 font-medium text-gray-12">Action</div>
                                <InputSelect
                                    options={dynamicActions}
                                    value={dynamicActions.find(o => o.name === conn.action) || (conn.action ? { id: -1, name: conn.action } : null)}
                                    onChange={(val) => {
                                        if (val) {
                                            onUpdateAction(conn.edgeId, val.name);
                                        }
                                    }}
                                    placeholder="Select Action Type"
                                    className="bg-white"
                                    searchable
                                    creatable
                                    rightSectionIcon="lucide:chevrons-up-down"
                                />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-4 text-center">
                        <p className="text-12 text-gray-8 italic">No outgoing connections from this node.</p>
                    </div>
                )}
            </div>
        </SettingsSection>
    );
}
