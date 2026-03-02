import { useState, useEffect } from 'react';
import { useReactFlow, useNodes } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import InputLabel from '@/components/base/inputs/InputLabel';
import InputCheckbox from '@/components/base/inputs/InputCheckbox';
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple';
import type { Option } from '@/types/option';

const userOptions: Option[] = [
    { id: 1, name: 'ap.verifier@belltemple.ca' },
    { id: 2, name: 'admin@ezofis.com' },
    { id: 3, name: 'user@example.com' },
];

const groupOptions: Option[] = [
    { id: 101, name: 'Accounts Payable' },
    { id: 102, name: 'Human Resources' },
    { id: 103, name: 'IT Support' },
];

export default function ManualUserSettingsPanel({ node: initialNode }: { node?: Node }) {
    const { setNodes } = useReactFlow();
    const liveNodes = useNodes();

    // Find matching node in the live nodes array to ensure reactivity
    const currentNode = initialNode ? (liveNodes.find(n => n.id === initialNode.id) || initialNode) : null;
    const nodeData = (currentNode?.data || {}) as any;

    const [isUserEnabled, setIsUserEnabled] = useState(nodeData.isUserEnabled ?? true);
    const [selectedUsers, setSelectedUsers] = useState<Option[]>(
        nodeData.selectedUsers || [userOptions[0]]
    );
    const [isGroupEnabled, setIsGroupEnabled] = useState(nodeData.isGroupEnabled ?? true);
    const [selectedGroups, setSelectedGroups] = useState<Option[]>(
        nodeData.selectedGroups || []
    );

    const updateNodeData = (key: string, value: any) => {
        if (currentNode) {
            setNodes((nodes) =>
                nodes.map((n) =>
                    n.id === currentNode.id ? { ...n, data: { ...n.data, [key]: value } } : n
                )
            );
        }
    };

    // Keep state in sync with external changes
    useEffect(() => {
        if (nodeData.isUserEnabled !== undefined && nodeData.isUserEnabled !== isUserEnabled) {
            setIsUserEnabled(nodeData.isUserEnabled);
        }
        if (nodeData.selectedUsers && JSON.stringify(nodeData.selectedUsers) !== JSON.stringify(selectedUsers)) {
            setSelectedUsers(nodeData.selectedUsers);
        }
        if (nodeData.isGroupEnabled !== undefined && nodeData.isGroupEnabled !== isGroupEnabled) {
            setIsGroupEnabled(nodeData.isGroupEnabled);
        }
        if (nodeData.selectedGroups && JSON.stringify(nodeData.selectedGroups) !== JSON.stringify(selectedGroups)) {
            setSelectedGroups(nodeData.selectedGroups);
        }
    }, [nodeData]);

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-inter text-gray-12">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* Assignees Section */}
                <div className="flex flex-col gap-2">
                    <div className="border-b border-gray-1 pb-1 mb-1">
                        <InputLabel label="Assignees" required />
                    </div>

                    {/* Users Option */}
                    <div className="space-y-1.5">
                        <InputCheckbox
                            label="Users"
                            checked={isUserEnabled}
                            onChange={(checked) => {
                                setIsUserEnabled(checked);
                                updateNodeData('isUserEnabled', checked);
                            }}
                        />

                        {isUserEnabled && (
                            <div className="pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                                <InputSelectMultiple
                                    required
                                    options={userOptions}
                                    value={selectedUsers}
                                    onChange={(val) => {
                                        setSelectedUsers(val);
                                        updateNodeData('selectedUsers', val);
                                    }}
                                    searchable
                                    clearable
                                    placeholder="Add users..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Groups Option */}
                    <div className="space-y-1.5">
                        <InputCheckbox
                            label="Groups"
                            checked={isGroupEnabled}
                            onChange={(checked) => {
                                setIsGroupEnabled(checked);
                                updateNodeData('isGroupEnabled', checked);
                            }}
                        />

                        {isGroupEnabled && (
                            <div className="pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                                <InputSelectMultiple
                                    required
                                    options={groupOptions}
                                    value={selectedGroups}
                                    onChange={(val) => {
                                        setSelectedGroups(val);
                                        updateNodeData('selectedGroups', val);
                                    }}
                                    searchable
                                    clearable
                                    placeholder="Select groups..."
                                />
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
