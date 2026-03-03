import { useState, useEffect } from 'react';
import Icon from '@/components/base/icon/Icon';
import Button from '@/components/base/button/Button';
import cn from '@/utils/cn';
import { useReactFlow, useNodes } from '@xyflow/react';
import type { Node } from '@xyflow/react';

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
    const connectionData = (currentNode?.data || {}) as any;

    const [isConnectionOpen, setIsConnectionOpen] = useState(false);
    const [isCreatingConnection, setIsCreatingConnection] = useState(false);
    const [connectionOptions, setConnectionOptions] = useState<{ label: string; value: string }[]>([]);
    const [path, setPath] = useState(connectionData.path || '');

    // Initialize connection options from node data if it exists
    useEffect(() => {
        if (connectionData.connection && connectionData.connectionLabel) {
            setConnectionOptions(prev => {
                if (!prev.find(o => o.value === connectionData.connection)) {
                    return [...prev, { label: connectionData.connectionLabel, value: connectionData.connection }];
                }
                return prev;
            });
        }
    }, [connectionData.connection, connectionData.connectionLabel]);

    // Keep path in sync with node data if it changes externally
    useEffect(() => {
        if (connectionData.path !== undefined && connectionData.path !== path) {
            setPath(connectionData.path);
        }
    }, [connectionData.path]);

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

            // Real-time range validation
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

    useEffect(() => {
        // Mock initial connections if needed
    }, []);

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

        // Simulate API call delay then update dropdown locally
        setTimeout(() => {
            const connectorName = formData.name;
            const newValue = `ftp-${Date.now()}`;
            const newOption = { label: connectorName, value: newValue };

            setConnectionOptions(prev => [...prev, newOption]);

            if (currentNode) {
                setNodes((nodes) =>
                    nodes.map((n) =>
                        n.id === currentNode.id ? { ...n, data: { ...n.data, connection: newValue, connectionLabel: connectorName } } : n
                    )
                );
            }

            setIsCreatingConnection(false);
            setIsConnectionOpen(false);
            resetForm();
            setIsConnecting(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Connection Field */}
                <div className='space-y-1'>
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
                            <span className={!connectionData.connection ? 'text-gray-9' : 'text-gray-13 font-medium'}>
                                {connectionOptions.find(o => o.value === connectionData.connection)?.label || connectionData.connectionLabel || 'Select a connection'}
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
                                                        connectionData.connection === option.value ? 'bg-primary-1 text-primary-9 font-medium' : 'text-gray-13 hover:bg-gray-2'
                                                    )}
                                                    onClick={() => {
                                                        setNodes((nodes) =>
                                                            nodes.map((n) =>
                                                                n.id === currentNode?.id ? { ...n, data: { ...n.data, connection: option.value, connectionLabel: option.label } } : n
                                                            )
                                                        );
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
                                            {/* Name */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-gray-11">Connection Name <span className="text-red-11">*</span></label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                                    placeholder="e.g. Production SFTP"
                                                    className={cn(
                                                        "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all",
                                                        errors.name
                                                            ? "border-red-9 focus:ring-red-4 focus:border-red-9"
                                                            : "border-gray-3 focus:ring-primary-4 focus:border-primary-9"
                                                    )}
                                                />
                                                {errors.name && <span className="text-[10px] text-red-11 font-medium">{errors.name}</span>}
                                            </div>

                                            {/* Protocol Segmented Control */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-gray-11">Protocol <span className="text-red-11">*</span></label>
                                                <div className="flex bg-gray-50/50 p-1 rounded-lg border border-gray-2/50 shadow-inner">
                                                    {protocolOptions.map((opt) => {
                                                        const isActive = formData.protocol.id === opt.id;
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, protocol: opt }))}
                                                                className={cn(
                                                                    "flex-1 py-1.5 text-[11px] font-bold transition-all duration-300 rounded-md border border-transparent outline-none",
                                                                    isActive
                                                                        ? "bg-purple-9 text-white shadow-md active:scale-95 hover:bg-purple-8 hover:-translate-y-0.5"
                                                                        : "text-gray-9 hover:text-purple-11 hover:bg-purple-50 hover:border-purple-200/50 hover:shadow-sm hover:scale-[1.02]"
                                                                )}
                                                            >
                                                                {opt.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Host & Port */}
                                            <div className="grid grid-cols-4 gap-3">
                                                <div className="col-span-3 flex flex-col gap-1.5">
                                                    <label className="text-xs font-medium text-gray-11">Host <span className="text-red-11">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={formData.host}
                                                        onChange={(e) => handleHostChange(e.target.value)}
                                                        onBlur={handleHostBlur}
                                                        placeholder="ftp.example.com"
                                                        className={cn(
                                                            "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all",
                                                            errors.host
                                                                ? "border-red-9 focus:ring-red-4 focus:border-red-9"
                                                                : "border-gray-3 focus:ring-primary-4 focus:border-primary-9"
                                                        )}
                                                    />
                                                    {errors.host && <span className="text-[10px] text-red-11 font-medium">{errors.host}</span>}
                                                </div>
                                                <div className="col-span-1 flex flex-col gap-1.5">
                                                    <label className="text-xs font-medium text-gray-11">Port <span className="text-red-11">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={formData.port}
                                                        onChange={(e) => handlePortChange(e.target.value)}
                                                        onBlur={handlePortBlur}
                                                        placeholder="22"
                                                        className={cn(
                                                            "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all font-mono text-center",
                                                            errors.port
                                                                ? "border-red-9 focus:ring-red-4 focus:border-red-9"
                                                                : "border-gray-3 focus:ring-primary-4 focus:border-primary-9"
                                                        )}
                                                    />
                                                    {errors.port && <span className="text-[10px] text-red-11 font-medium leading-tight">{errors.port}</span>}
                                                </div>
                                            </div>

                                            {/* Username */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-gray-11">Username <span className="text-red-11">*</span></label>
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => handleFieldChange('username', e.target.value)}
                                                    placeholder="Username"
                                                    className={cn(
                                                        "w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all",
                                                        errors.username
                                                            ? "border-red-9 focus:ring-red-4 focus:border-red-9"
                                                            : "border-gray-3 focus:ring-primary-4 focus:border-primary-9"
                                                    )}
                                                />
                                                {errors.username && <span className="text-[10px] text-red-11 font-medium">{errors.username}</span>}
                                            </div>

                                            {/* Password */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-gray-11">Password <span className="text-red-11">*</span></label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={formData.password}
                                                        onChange={(e) => handleFieldChange('password', e.target.value)}
                                                        placeholder="Password"
                                                        className={cn(
                                                            "w-full pl-2 pr-9 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 transition-all",
                                                            errors.password
                                                                ? "border-red-9 focus:ring-red-4 focus:border-red-9"
                                                                : "border-gray-3 focus:ring-primary-4 focus:border-primary-9"
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-8 hover:text-gray-11"
                                                    >
                                                        <Icon name={showPassword ? 'lucide:eye-off' : 'lucide:eye'} className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {errors.password && <span className="text-[10px] text-red-11 font-medium">{errors.password}</span>}
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-2">
                                                <Button
                                                    size="md"
                                                    variant="ghost"
                                                    className="text-gray-10 hover:text-gray-13 hover:bg-gray-2"
                                                    onClick={() => {
                                                        setIsCreatingConnection(false);
                                                        resetForm();
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="md"
                                                    color="primary"
                                                    className="flex items-center justify-center gap-2"
                                                    disabled={!formData.name.trim() || !formData.host.trim() || isConnecting}
                                                    onClick={handleConnect}
                                                >
                                                    {isConnecting && <Icon name="lucide:loader-2" className="h-3.5 w-3.5 animate-spin" />}
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

                {/* Path Setting */}
                <div className='space-y-1.5'>
                    <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
                        Path <span className='text-red-11'>*</span>
                    </label>
                    <div className='relative'>
                        <input
                            type="text"
                            value={path}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setPath(newVal);
                                if (currentNode) {
                                    setNodes((nodes) =>
                                        nodes.map((n) =>
                                            n.id === currentNode.id ? { ...n, data: { ...n.data, path: newVal } } : n
                                        )
                                    );
                                }
                            }}
                            placeholder="./"
                            className="w-full h-10 px-3 text-sm border border-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-4 focus:border-primary-9 bg-white transition-all duration-200"
                        />
                        <p className="text-[10px] text-gray-9 mt-1 italic">
                            Enter the directory path (e.g., ./ for root)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
