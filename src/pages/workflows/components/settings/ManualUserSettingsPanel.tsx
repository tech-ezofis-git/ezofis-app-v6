import { useState, useEffect } from 'react';
import { useReactFlow, useNodes } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import Icon from '@/components/base/icon/Icon';
import InputSwitch from '@/components/base/inputs/InputSwitch';
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple';
import type { Option } from '@/types/option';
import SettingsSection from './common/SettingsSection';
import ConnectionsRouting from './common/ConnectionsRouting';

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

    const [openBasic, setOpenBasic] = useState(false);

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
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-1">

                {/* BASIC SETUP */}
                <SettingsSection
                    title="Basic Setup"
                    icon="lucide:settings-2"
                    isOpen={openBasic}
                    variant="premium"
                    onToggle={() => setOpenBasic(!openBasic)}
                >
                    <div className="flex flex-col gap-2.5 py-1">
                        <div className="flex items-center gap-2.5 px-1 pb-1">
                            <Icon name="lucide:users" className="h-4 w-4 text-indigo-600" />
                            <div className="flex flex-col space-y-1">
                                <span className="text-13 font-medium text-gray-12">Assignees</span>
                                <span className="text-11 text-gray-9 leading-tight">Configure who can perform this task</span>
                            </div>
                        </div>

                        {/* Users Option */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Icon name="lucide:user" className="h-4 w-4 text-purple-600 stroke-[2]" />
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-13 font-medium text-gray-12">Users</span>
                                        <span className="text-11 text-gray-9 leading-tight">Assign task to specific users</span>
                                    </div>
                                </div>
                                <InputSwitch
                                    checked={isUserEnabled}
                                    onChange={(checked) => {
                                        setIsUserEnabled(checked);
                                        updateNodeData('isUserEnabled', checked);
                                    }}
                                />
                            </div>

                            {isUserEnabled && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="space-y-1.5">
                                        <div className="text-12 font-medium text-gray-12">Selected Users</div>
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
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Groups Option */}
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Icon name="lucide:users-2" className="h-4 w-4 text-blue-600 stroke-[2]" />
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-13 font-medium text-gray-12">Groups</span>
                                        <span className="text-11 text-gray-9 leading-tight">Assign task to user groups</span>
                                    </div>
                                </div>
                                <InputSwitch
                                    checked={isGroupEnabled}
                                    onChange={(checked) => {
                                        setIsGroupEnabled(checked);
                                        updateNodeData('isGroupEnabled', checked);
                                    }}
                                />
                            </div>

                            {isGroupEnabled && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="space-y-1.5">
                                        <div className="text-12 font-medium text-gray-12">Selected Groups</div>
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
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </SettingsSection>

                <ConnectionsRouting node={currentNode as any} />
            </div>
        </div>
    );
}
