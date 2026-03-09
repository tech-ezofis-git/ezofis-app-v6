import { useState, useEffect } from 'react';
import { useReactFlow, useNodes } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import cn from '@/utils/cn';
import Icon from '@/components/base/icon/Icon';
import Button from '@/components/base/button/Button';
import Input from '@/components/base/inputs/InputText';
import InputSelect from '@/components/base/inputs/InputSelect';
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple';
import InputSwitch from '@/components/base/inputs/InputSwitch';
import type { Option } from '@/types/option';
import authUserStore from '@/stores/authUserStore';
import SettingsSection from './common/SettingsSection';
import ConnectionsRouting from './common/ConnectionsRouting';

const domainNameOptions: Option[] = [
    { id: 1, name: 'example.com' },
    { id: 2, name: 'gmail.com' },
    { id: 3, name: 'outlook.com' },
];

export default function EmailSettingsPanel({ node: initialNode }: { node: Node }) {
    const { setNodes } = useReactFlow();
    const liveNodes = useNodes();
    const session = authUserStore((state) => state.session);

    // Find matching node in the live nodes array to ensure reactivity
    const currentNode = liveNodes.find(n => n.id === initialNode?.id) || initialNode;
    const nodeData = (currentNode?.data || {}) as any;

    const [openBasic, setOpenBasic] = useState(true);
    const [openTrigger, setOpenTrigger] = useState(false);

    // Connection States
    const [isConnectionOpen, setIsConnectionOpen] = useState(false);
    const [isCreatingConnection, setIsCreatingConnection] = useState(false);
    const [newConnectionName, setNewConnectionName] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionOptions, setConnectionOptions] = useState<{ label: string; value: string }[]>([]);

    // Trigger States
    const [mailSubjectEnabled, setMailSubjectEnabled] = useState(nodeData.mailSubjectEnabled ?? false);
    const [mailSubjectToMonitor, setMailSubjectToMonitor] = useState(nodeData.mailSubjectToMonitor || '');
    const [hasAttachmentEnabled, setHasAttachmentEnabled] = useState(nodeData.hasAttachmentEnabled ?? false);
    const [mailContentEnabled, setMailContentEnabled] = useState(nodeData.mailContentEnabled ?? false);
    const [mailContentToMonitor, setMailContentToMonitor] = useState(nodeData.mailContentToMonitor || '');
    const [fromMailAddressEnabled, setFromMailAddressEnabled] = useState(nodeData.fromMailAddressEnabled ?? false);
    const [fromMailAddresses, setFromMailAddresses] = useState<Option[]>(
        nodeData.fromMailAddresses || []
    );
    const [fromDomainNameEnabled, setFromDomainNameEnabled] = useState(nodeData.fromDomainNameEnabled ?? false);
    const [fromDomainName, setFromDomainName] = useState<Option | null>(
        nodeData.fromDomainName || null
    );

    const updateNodeData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((n) =>
                n.id === currentNode?.id ? { ...n, data: { ...n.data, [key]: value } } : n
            )
        );
    };

    // Initialize connection options
    useEffect(() => {
        if (nodeData.connection && nodeData.connectionLabel) {
            setConnectionOptions(prev => {
                if (!prev.find(o => o.value === nodeData.connection)) {
                    return [...prev, { label: nodeData.connectionLabel, value: nodeData.connection }];
                }
                return prev;
            });
        }
    }, [nodeData.connection, nodeData.connectionLabel]);

    // Connection Success Listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'CONNECTION_SUCCESS') {
                const { connector, provider } = event.data;
                const newValue = `${provider}-${Date.now()}`;
                const newOption = { label: connector, value: newValue };

                setConnectionOptions(prev => [...prev, newOption]);

                updateNodeData('connection', newValue);
                updateNodeData('connectionLabel', connector);

                setIsCreatingConnection(false);
                setIsConnectionOpen(false);
                setNewConnectionName('');
                setIsConnecting(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [currentNode?.id]);

    const handleConnect = () => {
        if (!newConnectionName.trim() || isConnecting) return;
        setIsConnecting(true);
        const tenantId = session?.tenantId;
        const nodeIcon = (currentNode.data.icon as string)?.toLowerCase() || "";
        const provider = nodeIcon.includes('outlook') ? 'outlook' : 'gmail';
        const location = window.location;
        const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${tenantId}&envtype=trial&connectorname=${newConnectionName}&provider=${provider}&resulturl=${location.origin}/auth/`;
        window.open(url, '_blank');
    };

    const isEmailAgent = (currentNode.data.icon as string)?.toLowerCase().includes('gmail') ||
        (currentNode.data.icon as string)?.toLowerCase().includes('outlook') ||
        (currentNode.data.label as string)?.toLowerCase().includes('gmail') ||
        (currentNode.data.label as string)?.toLowerCase().includes('outlook');
    const isTrigger = currentNode.data.type === 'trigger' || isEmailAgent;

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
                    <div className="space-y-4 pt-1">
                        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                            <div className='space-y-1.5'>
                                <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
                                    Connection <span className='text-red-11'>*</span>
                                </label>
                                <div className='relative'>
                                    <button
                                        className={cn(
                                            'w-full h-10 px-3 flex items-center justify-between rounded-md border text-sm bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-primary-4 focus:border-primary-9',
                                            isConnectionOpen ? 'border-primary-9 ring-2 ring-primary-4' : 'border-gray-3 hover:border-primary-5'
                                        )}
                                        onClick={() => setIsConnectionOpen(!isConnectionOpen)}
                                    >
                                        <span className={!nodeData.connection ? 'text-gray-9' : 'text-gray-13 font-medium'}>
                                            {connectionOptions.find(o => o.value === nodeData.connection)?.label || nodeData.connectionLabel || 'Select a connection'}
                                        </span>
                                        <Icon name='lucide:chevrons-up-down' className='h-4 w-4 text-gray-7 pointer-events-none' />
                                    </button>

                                    {isConnectionOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => {
                                                    setIsConnectionOpen(false);
                                                    setIsCreatingConnection(false);
                                                    setNewConnectionName('');
                                                }}
                                            />
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-3 rounded-lg shadow-xl z-50 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                                {!isCreatingConnection ? (
                                                    <>
                                                        {connectionOptions.map(option => (
                                                            <button
                                                                key={option.value}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 text-sm transition-colors",
                                                                    nodeData.connection === option.value ? 'bg-primary-1 text-primary-9 font-medium' : 'text-gray-13 hover:bg-gray-2'
                                                                )}
                                                                onClick={() => {
                                                                    updateNodeData('connection', option.value);
                                                                    updateNodeData('connectionLabel', option.label);
                                                                    setIsConnectionOpen(false);
                                                                }}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}

                                                        {connectionOptions.length > 0 && <div className="h-px bg-gray-2 my-1" />}

                                                        <button
                                                            className="w-full text-left px-3 py-2 text-sm font-medium text-primary-9 hover:bg-primary-1 transition-colors flex items-center gap-2"
                                                            onClick={() => setIsCreatingConnection(true)}
                                                        >
                                                            <Icon name="lucide:plus" className="h-4 w-4" />
                                                            Create Connection
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="p-3 space-y-3">
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-medium text-gray-11">Connection Name</label>
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={newConnectionName}
                                                                onChange={(e) => setNewConnectionName(e.target.value)}
                                                                placeholder={((currentNode.data.icon as string)?.includes('gmail') || (currentNode.data.label as string)?.toLowerCase().includes('gmail')) ? "e.g. My Gmail Connection" : "e.g. My Outlook Connection"}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-4 focus:border-primary-9"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleConnect();
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="md"
                                                                variant="ghost"
                                                                className="text-gray-10 hover:text-gray-13 hover:bg-gray-2"
                                                                onClick={() => setIsCreatingConnection(false)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="md"
                                                                color="primary"
                                                                className="flex items-center justify-center gap-2"
                                                                disabled={!newConnectionName.trim() || isConnecting}
                                                                onClick={handleConnect}
                                                            >
                                                                {isConnecting && <Icon name="lucide:loader-2" className="h-3 w-3 animate-spin" />}
                                                                {isConnecting ? 'Connecting...' : 'Connect'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* TRIGGER CONDITIONS */}
                {isTrigger && (
                    <SettingsSection
                        title="Trigger Conditions"
                        icon="lucide:filter"
                        isOpen={openTrigger}
                        variant="premium"
                        onToggle={() => setOpenTrigger(!openTrigger)}
                    >
                        <div className="flex flex-col gap-2.5 py-1">

                            {/* Mail Subject */}
                            <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Icon name="lucide:type" className="h-4 w-4 text-purple-600 stroke-[2]" />
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-13 font-medium text-gray-12">Mail Subject</span>
                                            <span className="text-11 text-gray-9 leading-tight">To check the mail subject</span>
                                        </div>
                                    </div>
                                    <InputSwitch
                                        checked={mailSubjectEnabled}
                                        onChange={(checked) => {
                                            setMailSubjectEnabled(checked);
                                            updateNodeData('mailSubjectEnabled', checked);
                                        }}
                                    />
                                </div>
                                {mailSubjectEnabled && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="space-y-1.5 pt-1">
                                            <div className="text-12 font-medium text-gray-12">Mail Subject To Monitor</div>
                                            <Input
                                                value={mailSubjectToMonitor}
                                                onChange={(val) => {
                                                    setMailSubjectToMonitor(val);
                                                    updateNodeData('mailSubjectToMonitor', val);
                                                }}
                                                placeholder="Enter subject to monitor..."
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Has Attachment */}
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Icon name="lucide:paperclip" className="h-4 w-4 text-blue-600 stroke-[2]" />
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-13 font-medium text-gray-12">Has Attachment</span>
                                            <span className="text-11 text-gray-9 leading-tight">To check the attachment included</span>
                                        </div>
                                    </div>
                                    <InputSwitch
                                        checked={hasAttachmentEnabled}
                                        onChange={(checked) => {
                                            setHasAttachmentEnabled(checked);
                                            updateNodeData('hasAttachmentEnabled', checked);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Mail Content */}
                            <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Icon name="lucide:file-text" className="h-4 w-4 text-amber-600 stroke-[2]" />
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-13 font-medium text-gray-12">Mail Content</span>
                                            <span className="text-11 text-gray-9 leading-tight">To check the mail Content</span>
                                        </div>
                                    </div>
                                    <InputSwitch
                                        checked={mailContentEnabled}
                                        onChange={(checked) => {
                                            setMailContentEnabled(checked);
                                            updateNodeData('mailContentEnabled', checked);
                                        }}
                                    />
                                </div>
                                {mailContentEnabled && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="space-y-1.5 pt-1">
                                            <div className="text-12 font-medium text-gray-12">Specific Mail Content To Monitor</div>
                                            <Input
                                                value={mailContentToMonitor}
                                                onChange={(val) => {
                                                    setMailContentToMonitor(val);
                                                    updateNodeData('mailContentToMonitor', val);
                                                }}
                                                placeholder="Enter content to monitor..."
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* From Mail Address */}
                            <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Icon name="lucide:mail" className="h-4 w-4 text-rose-600 stroke-[2]" />
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-13 font-medium text-gray-12">From Mail Address</span>
                                            <span className="text-11 text-gray-9 leading-tight">To check specify the from email address</span>
                                        </div>
                                    </div>
                                    <InputSwitch
                                        checked={fromMailAddressEnabled}
                                        onChange={(checked) => {
                                            setFromMailAddressEnabled(checked);
                                            updateNodeData('fromMailAddressEnabled', checked);
                                        }}
                                    />
                                </div>
                                {fromMailAddressEnabled && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="space-y-1.5 pt-1">
                                            <div className="text-12 font-medium text-gray-12">Sender Email Addresses</div>
                                            <InputSelectMultiple
                                                options={[]}
                                                value={fromMailAddresses}
                                                onChange={(vals) => {
                                                    setFromMailAddresses(vals);
                                                    updateNodeData('fromMailAddresses', vals);
                                                }}
                                                placeholder="Add email address..."
                                                creatable
                                                searchable
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* From Domain Name */}
                            <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Icon name="lucide:globe" className="h-4 w-4 text-emerald-600 stroke-[2]" />
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-13 font-medium text-gray-12">From Domain Name</span>
                                            <span className="text-11 text-gray-9 leading-tight">To check specify the from Domain Name</span>
                                        </div>
                                    </div>
                                    <InputSwitch
                                        checked={fromDomainNameEnabled}
                                        onChange={(checked) => {
                                            setFromDomainNameEnabled(checked);
                                            updateNodeData('fromDomainNameEnabled', checked);
                                        }}
                                    />
                                </div>
                                {fromDomainNameEnabled && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="space-y-1.5 pt-1">
                                            <div className="text-12 font-medium text-gray-12">Sender Domains</div>
                                            <InputSelect
                                                options={domainNameOptions}
                                                value={fromDomainName}
                                                onChange={(val) => {
                                                    setFromDomainName(val);
                                                    updateNodeData('fromDomainName', val);
                                                }}
                                                placeholder="Select or add domain..."
                                                creatable
                                                searchable
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SettingsSection>
                )}

                <ConnectionsRouting node={currentNode as any} />
            </div>
        </div>
    );
}
