import { useState, useEffect } from 'react';
import InputSelect from '@/components/base/inputs/InputSelect';
import Input from '@/components/base/inputs/InputText';
import Button from '@/components/base/button/Button';
import Icon from '@/components/base/icon/Icon';
import cn from '@/utils/cn';
import { useReactFlow, useNodes } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import authUserStore from '@/stores/authUserStore';
import SettingsSection from './common/SettingsSection';
import ConnectionsRouting from './common/ConnectionsRouting';

const protocolOptions = [
    { id: 1, name: 'SFTP' },
    { id: 2, name: 'FTP' },
    { id: 3, name: 'FTPS' },
];

export default function FTPAgentSettingsPanel({ node: initialNode }: { node: Node }) {
    const { setNodes } = useReactFlow();
    const liveNodes = useNodes();

    // Find matching node in the live nodes array to ensure reactivity
    const currentNode = liveNodes.find(n => n.id === initialNode?.id) || initialNode;
    const nodeData = (currentNode?.data || {}) as any;

    const updateNodeData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((n) =>
                n.id === currentNode?.id ? { ...n, data: { ...n.data, [key]: value } } : n
            )
        );
    };

    const [isConnectionOpen, setIsConnectionOpen] = useState(false);
    const [isCreatingConnection, setIsCreatingConnection] = useState(false);
    const [newConnectionName, setNewConnectionName] = useState('');
    const [connectionOptions, setConnectionOptions] = useState<{ label: string; value: string }[]>([]);
    const [path, setPath] = useState(nodeData.path || '');

    // Initialize connection options from node data if it exists
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

    // Keep path in sync with node data if it changes externally
    useEffect(() => {
        if (nodeData.path !== undefined && nodeData.path !== path) {
            setPath(nodeData.path);
        }
    }, [nodeData.path]);

    // Connection form state
    const [formData, setFormData] = useState({
        name: '',
        protocol: protocolOptions[0],
        host: '',
        port: '22',
        username: '',
        password: '',
    });

    const [isConnecting, setIsConnecting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; host?: string; port?: string; username?: string; password?: string }>({});

    const handleFieldChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (value && typeof value === 'string' && value.trim()) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateHost = (host: string) => {
        if (!host) return "Host is required";
        const hostRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])|(\d{1,3}\.){3}\d{1,3}$/;
        if (!hostRegex.test(host)) return "Invalid host format";
        return undefined;
    };

    const handleHostBlur = () => {
        const error = validateHost(formData.host);
        setErrors(prev => ({ ...prev, host: error }));
    };

    const handleHostChange = (val: string) => {
        setFormData(prev => ({ ...prev, host: val }));
        if (val.trim()) {
            const error = validateHost(val);
            setErrors(prev => ({ ...prev, host: error }));
        } else if (errors.host) {
            setErrors(prev => ({ ...prev, host: undefined }));
        }
    };

    const handlePortChange = (val: string) => {
        if (/^\d*$/.test(val)) {
            setFormData(prev => ({ ...prev, port: val }));
            if (val) {
                if (parseInt(val) > 65535) {
                    setErrors(prev => ({ ...prev, port: "Max 65535" }));
                } else {
                    setErrors(prev => ({ ...prev, port: undefined }));
                }
            } else {
                setErrors(prev => ({ ...prev, port: undefined }));
            }
        }
    };

    const handlePortBlur = () => {
        if (!formData.port) {
            setErrors(prev => ({ ...prev, port: "Port is required" }));
        } else if (parseInt(formData.port) > 65535) {
            setErrors(prev => ({ ...prev, port: "Max 65535" }));
        } else {
            setErrors(prev => ({ ...prev, port: undefined }));
        }
    };

    const handlePathChange = (newVal: string) => {
        setPath(newVal);
        updateNodeData('path', newVal);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            protocol: protocolOptions[0],
            host: '',
            port: '22',
            username: '',
            password: '',
        });
        setErrors({});
    };

    const handleConnect = () => {
        const newErrors: any = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        const hostErr = validateHost(formData.host);
        if (hostErr) newErrors.host = hostErr;
        if (!formData.port) newErrors.port = "Port is required";
        else if (parseInt(formData.port) > 65535) newErrors.port = "Invalid Port";
        if (!formData.username.trim()) newErrors.username = "Username is required";
        if (!formData.password.trim()) newErrors.password = "Password is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (isConnecting) return;
        setIsConnecting(true);

        setTimeout(() => {
            const connectorName = formData.name;
            const newValue = `ftp-${Date.now()}`;
            const newOption = { label: connectorName, value: newValue };

            setConnectionOptions(prev => [...prev, newOption]);
            updateNodeData('connection', newValue);
            updateNodeData('connectionLabel', connectorName);

            setIsCreatingConnection(false);
            setIsConnectionOpen(false);
            resetForm();
            setIsConnecting(false);
        }, 1500);
    };

    const [openBasic, setOpenBasic] = useState(false);
    const session = authUserStore((state) => state.session);

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-inter text-gray-12">
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-1">
                <SettingsSection
                    title="Basic Setup"
                    icon="lucide:settings-2"
                    isOpen={openBasic}
                    variant="premium"
                    onToggle={() => setOpenBasic(!openBasic)}
                >
                    <div className="flex flex-col gap-2.5 py-1">
                        <div className="flex items-center gap-2.5 px-1 pb-1">
                            <Icon name="lucide:server" className="h-4 w-4 text-blue-600" />
                            <div className="flex flex-col space-y-1">
                                <span className="text-13 font-medium text-gray-12">Connection Details</span>
                                <span className="text-11 text-gray-9 leading-tight">Manage server connection settings</span>
                            </div>
                        </div>

                        {/* Connection Selector */}
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
                                                    resetForm();
                                                }}
                                            />
                                            <div className={cn(
                                                "absolute top-full left-0 w-full mt-1 bg-white border border-gray-3 rounded-lg shadow-xl z-50 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100",
                                                isCreatingConnection ? "overflow-y-auto max-h-[400px]" : "overflow-hidden"
                                            )}>
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
                                                    <div className="p-4 space-y-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-medium text-gray-11">Connection Name <span className="text-red-11">*</span></label>
                                                            <input
                                                                type="text"
                                                                value={formData.name}
                                                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                                                placeholder="e.g. Production SFTP"
                                                                className={cn(
                                                                    "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all",
                                                                    errors.name ? "border-red-9 focus:ring-red-4" : "border-gray-3 focus:ring-primary-4"
                                                                )}
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-medium text-gray-11">Protocol <span className="text-red-11">*</span></label>
                                                            <div className="flex bg-gray-50/50 p-1 rounded-lg border border-gray-2/50 shadow-inner">
                                                                {protocolOptions.map((opt) => (
                                                                    <button
                                                                        key={opt.id}
                                                                        type="button"
                                                                        onClick={() => setFormData(prev => ({ ...prev, protocol: opt }))}
                                                                        className={cn(
                                                                            "flex-1 py-1.5 text-[11px] font-bold transition-all duration-300 rounded-md border border-transparent outline-none",
                                                                            formData.protocol.id === opt.id ? "bg-purple-9 text-white shadow-md" : "text-gray-9 hover:text-purple-11"
                                                                        )}
                                                                    >
                                                                        {opt.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-4 gap-3">
                                                            <div className="col-span-3 flex flex-col gap-1.5">
                                                                <label className="text-xs font-medium text-gray-11">Host <span className="text-red-11">*</span></label>
                                                                <input
                                                                    type="text"
                                                                    value={formData.host}
                                                                    onChange={(e) => handleHostChange(e.target.value)}
                                                                    onBlur={handleHostBlur}
                                                                    className={cn(
                                                                        "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2",
                                                                        errors.host ? "border-red-9" : "border-gray-3"
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="col-span-1 flex flex-col gap-1.5">
                                                                <label className="text-xs font-medium text-gray-11">Port <span className="text-red-11">*</span></label>
                                                                <input
                                                                    type="text"
                                                                    value={formData.port}
                                                                    onChange={(e) => handlePortChange(e.target.value)}
                                                                    onBlur={handlePortBlur}
                                                                    className={cn(
                                                                        "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2",
                                                                        errors.port ? "border-red-9" : "border-gray-3"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-medium text-gray-11">Username <span className="text-red-11">*</span></label>
                                                            <input
                                                                type="text"
                                                                value={formData.username}
                                                                onChange={(e) => handleFieldChange('username', e.target.value)}
                                                                className={cn(
                                                                    "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2",
                                                                    errors.username ? "border-red-9" : "border-gray-3"
                                                                )}
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs font-medium text-gray-11">Password <span className="text-red-11">*</span></label>
                                                            <div className="relative">
                                                                <input
                                                                    type={showPassword ? "text" : "password"}
                                                                    value={formData.password}
                                                                    onChange={(e) => handleFieldChange('password', e.target.value)}
                                                                    className={cn(
                                                                        "w-full pl-2 pr-9 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2",
                                                                        errors.password ? "border-red-9" : "border-gray-3"
                                                                    )}
                                                                />
                                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                    <Icon name={showPassword ? 'lucide:eye-off' : 'lucide:eye'} className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-end gap-2 pt-2">
                                                            <Button variant="ghost" size="md" onClick={() => setIsCreatingConnection(false)}>Cancel</Button>
                                                            <Button color="primary" size="md" onClick={handleConnect} disabled={isConnecting}>
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

                        {/* Path Field */}
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <Input
                                label='Folder path'
                                value={path}
                                required
                                placeholder="e.g. /inbox/invoices"
                                onChange={handlePathChange}
                                className="bg-white"
                            />
                        </div>
                    </div>
                </SettingsSection>

                <ConnectionsRouting node={currentNode as any} />
            </div>
        </div>
    );
}
