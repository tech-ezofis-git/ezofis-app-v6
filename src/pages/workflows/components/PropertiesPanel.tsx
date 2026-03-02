import type { Node, Edge } from '@xyflow/react'
import { useReactFlow, useNodes, useEdges } from '@xyflow/react'
import { useState, useRef, useEffect, lazy, Suspense } from 'react'

// Lazy load APAgentNodeSettings at module scope (must be before PropertiesPanel)
const APAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/APAgentNodeSettings'));
const FTPAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/FTPAgentNodeSettings'));
const OCRAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/OCRAgentNodeSettings'));
const ManualUserNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/ManualUserNodeSettings'));
import cn from '@/utils/cn'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import useWorkflowStore from '../stores/useWorkflowStore'
import authUserStore from '@/stores/authUserStore'

interface PropertiesPanelProps {
    node: Node | null
    edge?: Edge | null
    onClose: () => void
}

function PropertiesPanel({ node: selectedNode, edge, onClose }: PropertiesPanelProps) {
    const { setEdges, setNodes } = useReactFlow()
    const selectNode = useWorkflowStore((state) => state.selectNode)
    const nodes = useNodes()
    const edges = useEdges()
    // Use the live node from React Flow state to ensure updates (like label changes) are reflected immediately
    const node = selectedNode ? nodes.find((n) => n.id === selectedNode.id) || selectedNode : null

    const sortedNodes = [...nodes].sort((a, b) => {
        if (Math.abs(a.position.y - b.position.y) < 10) return a.position.x - b.position.x
        return a.position.y - b.position.y
    })
    const currentIndex = node ? sortedNodes.findIndex((n) => n.id === node.id) : -1
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < sortedNodes.length - 1

    const handlePrev = () => {
        if (hasPrev) selectNode(sortedNodes[currentIndex - 1])
    }

    const handleNext = () => {
        if (hasNext) selectNode(sortedNodes[currentIndex + 1])
    }

    const [isEditingLabel, setIsEditingLabel] = useState(false)
    const [editedLabel, setEditedLabel] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const [isConnectionOpen, setIsConnectionOpen] = useState(false)
    const [isCreatingConnection, setIsCreatingConnection] = useState(false)
    const [newConnectionName, setNewConnectionName] = useState('')
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionOptions, setConnectionOptions] = useState<{ label: string; value: string }[]>([])
    const session = authUserStore((state) => state.session)

    useEffect(() => {
        if (node) {
            setEditedLabel((node.data.label as string) || '')
        }
    }, [node?.id, node?.data?.label])

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data.type === 'CONNECTION_SUCCESS') {
                const { connector, provider } = event.data
                const newValue = `${provider}-${Date.now()}`
                const newOption = { label: connector, value: newValue }

                setConnectionOptions(prev => [...prev, newOption])

                // Select the new connection
                if (node) {
                    setNodes((nodes) =>
                        nodes.map((n) =>
                            n.id === node.id ? { ...n, data: { ...n.data, connection: newValue, connectionLabel: connector } } : n
                        )
                    )
                }

                setIsCreatingConnection(false)
                setIsConnectionOpen(false)
                setNewConnectionName('')
                setIsConnecting(false)
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [node, setNodes])

    useEffect(() => {
        if (isEditingLabel && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isEditingLabel])

    const handleLabelSave = () => {
        if (node && editedLabel.trim() !== '') {
            setNodes((nodes) =>
                nodes.map((n) =>
                    n.id === node.id ? { ...n, data: { ...n.data, label: editedLabel } } : n
                )
            )
        }
        setIsEditingLabel(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLabelSave()
        }
    }

    if (!node && !edge) return null

    // --- EDGE VIEW ---
    if (edge) {
        const handleDeleteEdge = () => {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id))
            onClose()
        }

        return (
            <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
                {/* Header */}
                <div className='flex items-center justify-between px-4 py-3 border-b border-gray-2'>
                    <div className='flex items-center gap-2'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gray-1 border border-gray-2'>
                            <Icon name='lucide:workflow' className='h-5 w-5 text-gray-11' />
                        </div>
                        <h2 className='text-15/5 font-semibold text-gray-13'>Connection</h2>
                    </div>
                    <button
                        className='rounded-[4px] p-1 hover:bg-gray-2 text-gray-8 transition-colors'
                        onClick={onClose}
                    >
                        <Icon name='lucide:x' className='h-5 w-5' />
                    </button>
                </div>

                {/* Content */}
                <div className='flex-1 overflow-y-auto p-4 space-y-5'>
                    <div className='rounded-lg border border-gray-2 bg-gray-1 p-4'>
                        <div className='text-sm text-gray-11 mb-2'>Connection ID</div>
                        <div className='font-mono text-xs text-gray-13 break-all'>{edge.id}</div>
                        <div className='mt-4 flex items-center justify-center gap-2'>
                            <div className='text-xs font-medium text-gray-10'>Source: {edge.source}</div>
                            <Icon name='lucide:arrow-right' className='h-3 w-3 text-gray-8' />
                            <div className='text-xs font-medium text-gray-10'>Target: {edge.target}</div>
                        </div>
                    </div>

                    <Button
                        variant='outline'
                        color='red'
                        className='w-full justify-start'
                        icon='lucide:trash-2'
                        label='Delete Connection'
                        onClick={handleDeleteEdge}
                    />
                </div>
            </div>
        )
    }

    // --- NODE VIEW ---
    if (!node) return null // Should be unreachable given first check, but safe


    // Common header for all nodes
    const NodeHeader = (
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-2 gap-2'>
            <div className='flex items-center gap-2 min-w-0 flex-1'>
                {/* Node Icon in Header - Adjusted for Logos */}
                <div
                    className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        (node.data.icon as string)?.startsWith('logos:')
                            ? 'bg-transparent'
                            : 'bg-gray-1 border border-gray-2'
                    )}
                >
                    <Icon
                        name={(node.data.icon as string) || 'lucide:settings-2'}
                        className={(node.data.icon as string)?.startsWith('logos:') ? 'h-5 w-5' : 'h-4 w-4'}
                        style={{
                            color: (node.data.icon as string)?.startsWith('logos:')
                                ? undefined
                                : (node.data.iconColor as string) || 'var(--color-primary-9)'
                        }}
                    />
                </div>
                {isEditingLabel ? (
                    <div className="flex-1 flex items-center gap-1">
                        <input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            value={editedLabel}
                            onChange={(e) => setEditedLabel(e.target.value)}
                            onBlur={handleLabelSave}
                            onKeyDown={handleKeyDown}
                            className="flex-1 min-w-0 text-15/5 font-semibold text-gray-13 border border-primary-5 rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary-5 bg-white"
                        />
                        <button
                            className='flex h-6 w-6 items-center justify-center rounded hover:bg-green-1 text-green-9 transition-colors shrink-0'
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleLabelSave}
                            title="Save"
                        >
                            <Icon name='lucide:check' className='h-4 w-4' />
                        </button>
                    </div>
                ) : (
                    <>
                        <h2
                            className='text-15/5 font-semibold text-gray-13 truncate cursor-pointer hover:text-gray-11'
                            onClick={() => setIsEditingLabel(true)}
                            title={node.data.label as string}
                        >
                            {node.data.label as string}
                        </h2>
                        <Icon
                            name='lucide:pencil'
                            className='h-4 w-4 text-gray-8 cursor-pointer hover:text-gray-11 shrink-0 ml-1'
                            onClick={() => setIsEditingLabel(true)}
                        />
                    </>
                )}
            </div>
            <div className='flex items-center gap-0.5 shrink-0'>
                {!isEditingLabel && (
                    <>
                        <div className='flex items-center gap-0.5'>
                            <button
                                className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                                    hasPrev ? 'hover:bg-gray-2 text-gray-8 hover:text-gray-11' : 'text-gray-4 cursor-not-allowed'
                                )}
                                onClick={handlePrev}
                                disabled={!hasPrev}
                            >
                                <Icon name='lucide:chevron-left' className='h-4 w-4' />
                            </button>
                            <button
                                className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                                    hasNext ? 'hover:bg-gray-2 text-gray-8 hover:text-gray-11' : 'text-gray-4 cursor-not-allowed'
                                )}
                                onClick={handleNext}
                                disabled={!hasNext}
                            >
                                <Icon name='lucide:chevron-right' className='h-4 w-4' />
                            </button>
                        </div>
                        {/* Delete Node Button */}
                        {(() => {
                            const hasIncoming = edges.some(e => e.target === node.id)
                            const isRootTrigger = !hasIncoming && node.data.type === 'trigger'
                            const isSuccessNode = node.data.label === 'Workflow Success'
                            if (isRootTrigger || isSuccessNode) return null
                            return (
                                <button
                                    className='flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-1 text-gray-8 hover:text-red-9 transition-colors'
                                    onClick={() => {
                                        setNodes((nodes) => nodes.filter((n) => n.id !== node.id))
                                        onClose()
                                    }}
                                    title="Delete Step"
                                >
                                    <Icon name='lucide:trash-2' className='h-4 w-4' />
                                </button>
                            )
                        })()}
                    </>
                )}
                <button
                    className='flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-2 text-gray-8 transition-colors'
                    onClick={onClose}
                >
                    <Icon name='lucide:x' className='h-4 w-4' />
                </button>
            </div>
        </div>
    );

    const CommonFooter = (
        <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-3 bg-white'>
            <Button
                variant='ghost'
                className='text-gray-10 hover:text-gray-13 hover:bg-gray-2'
                onClick={() => {
                    setNodes((nodes) => nodes.map((n) => n.id === node.id ? { ...n, selected: false } : n))
                    onClose()
                }}
            >
                Cancel
            </Button>
            <Button
                color='primary'
                className='px-6 shadow-sm active:scale-95 transition-all'
                onClick={() => {
                    // Save logic would go here
                    setNodes((nodes) => nodes.map((n) => n.id === node.id ? { ...n, selected: false } : n))
                    onClose()
                }}
            >
                Save
            </Button>
        </div>
    );

    // Render AP Agent node settings panel
    if ((node.data.label as string)?.toLowerCase() === 'ap agent') {
        return (
            <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
                {NodeHeader}
                <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<div className="p-6 text-gray-10">Loading settings...</div>}>
                        <APAgentNodeSettings node={node} />
                    </Suspense>
                </div>
                {CommonFooter}
            </div>
        );
    }

    // Render FTP Agent node settings panel
    if ((node.data.label as string)?.toLowerCase() === 'ftp agent') {
        return (
            <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
                {NodeHeader}
                <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<div className="p-6 text-gray-10">Loading settings...</div>}>
                        <FTPAgentNodeSettings node={node} />
                    </Suspense>
                </div>
                {CommonFooter}
            </div>
        );
    }

    // Render OCR Agent node settings panel
    if ((node.data.label as string)?.toLowerCase() === 'ocr agent') {
        return (
            <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
                {NodeHeader}
                <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<div className="p-6 text-gray-10">Loading settings...</div>}>
                        <OCRAgentNodeSettings node={node} />
                    </Suspense>
                </div>
                {CommonFooter}
            </div>
        );
    }

    // Render Manual User node settings panel
    if ((node.data.label as string)?.toLowerCase() === 'manual user') {
        return (
            <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
                {NodeHeader}
                <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<div className="p-6 text-gray-10">Loading settings...</div>}>
                        <ManualUserNodeSettings node={node} />
                    </Suspense>
                </div>
                {CommonFooter}
            </div>
        );
    }


    return (
        <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
            {/* Header */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-gray-2 gap-2'>
                <div className='flex items-center gap-2 min-w-0 flex-1'>
                    {/* Node Icon in Header - Adjusted for Logos */}
                    <div
                        className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            ((node.data.icon as string)?.startsWith('logos:') || (node.data.icon as string)?.startsWith('vscode-icons:'))
                                ? 'bg-transparent'
                                : 'bg-gray-1 border border-gray-2'
                        )}
                    >
                        <Icon
                            name={(node.data.icon as string) || 'lucide:settings-2'}
                            className={((node.data.icon as string)?.startsWith('logos:') || (node.data.icon as string)?.startsWith('vscode-icons:')) ? 'h-5 w-5' : 'h-4 w-4'}
                            style={{
                                color: ((node.data.icon as string)?.startsWith('logos:') || (node.data.icon as string)?.startsWith('vscode-icons:'))
                                    ? undefined
                                    : (node.data.iconColor as string) || 'var(--color-primary-9)'
                            }}
                        />
                    </div>
                    {isEditingLabel ? (
                        <div className="flex-1 flex items-center gap-1">
                            <input
                                ref={inputRef}
                                autoFocus
                                type="text"
                                value={editedLabel}
                                onChange={(e) => setEditedLabel(e.target.value)}
                                onBlur={handleLabelSave}
                                onKeyDown={handleKeyDown}
                                className="flex-1 min-w-0 text-15/5 font-semibold text-gray-13 border border-primary-5 rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary-5 bg-white"
                            />
                            <button
                                className='flex h-6 w-6 items-center justify-center rounded hover:bg-green-1 text-green-9 transition-colors shrink-0'
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={handleLabelSave}
                                title="Save"
                            >
                                <Icon name='lucide:check' className='h-4 w-4' />
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2
                                className='text-15/5 font-semibold text-gray-13 truncate cursor-pointer hover:text-gray-11'
                                onClick={() => setIsEditingLabel(true)}
                                title={node.data.label as string}
                            >
                                {node.data.label as string}
                            </h2>
                            <Icon
                                name='lucide:pencil'
                                className='h-4 w-4 text-gray-8 cursor-pointer hover:text-gray-11 shrink-0 ml-1'
                                onClick={() => setIsEditingLabel(true)}
                            />
                        </>
                    )}
                </div>
                <div className='flex items-center gap-0.5 shrink-0'>
                    {!isEditingLabel && (
                        <>
                            <div className='flex items-center gap-0.5'>
                                <button
                                    className={cn(
                                        'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                                        hasPrev ? 'hover:bg-gray-2 text-gray-8 hover:text-gray-11' : 'text-gray-4 cursor-not-allowed'
                                    )}
                                    onClick={handlePrev}
                                    disabled={!hasPrev}
                                >
                                    <Icon name='lucide:chevron-left' className='h-4 w-4' />
                                </button>
                                <button
                                    className={cn(
                                        'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                                        hasNext ? 'hover:bg-gray-2 text-gray-8 hover:text-gray-11' : 'text-gray-4 cursor-not-allowed'
                                    )}
                                    onClick={handleNext}
                                    disabled={!hasNext}
                                >
                                    <Icon name='lucide:chevron-right' className='h-4 w-4' />
                                </button>
                            </div>

                            {/* Delete Node Button */}
                            {(() => {
                                const hasIncoming = edges.some(e => e.target === node.id)
                                const isRootTrigger = !hasIncoming && node.data.type === 'trigger'
                                const isSuccessNode = node.data.label === 'Workflow Success'

                                if (isRootTrigger || isSuccessNode) return null

                                return (
                                    <button
                                        className='flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-1 text-gray-8 hover:text-red-9 transition-colors'
                                        onClick={() => {
                                            setNodes((nodes) => nodes.filter((n) => n.id !== node.id))
                                            onClose()
                                        }}
                                        title="Delete Step"
                                    >
                                        <Icon name='lucide:trash-2' className='h-4 w-4' />
                                    </button>
                                )
                            })()}
                        </>
                    )}

                    <button
                        className='flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-2 text-gray-8 transition-colors'
                        onClick={onClose}
                    >
                        <Icon name='lucide:x' className='h-4 w-4' />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className='flex-1 overflow-y-auto p-4 space-y-5'>
                {/* Conditionally render content based on node type */}
                {((node.data.label as string)?.toLowerCase().includes('gmail') || (node.data.icon as string)?.includes('gmail') ||
                    (node.data.label as string)?.toLowerCase().includes('outlook') || (node.data.icon as string)?.includes('outlook')) && (
                        <>
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
                                        <span className={!node.data.connection ? 'text-gray-9' : 'text-gray-13 font-medium'}>
                                            {connectionOptions.find(o => o.value === node.data.connection)?.label || (node.data.connectionLabel as string) || 'Select a connection'}
                                        </span>
                                        <Icon name='lucide:chevrons-up-down' className='h-4 w-4 text-gray-7 pointer-events-none' />
                                    </button>

                                    {isConnectionOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => {
                                                    setIsConnectionOpen(false)
                                                    setIsCreatingConnection(false)
                                                    setNewConnectionName('')
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
                                                                    node.data.connection === option.value ? 'bg-primary-1 text-primary-9 font-medium' : 'text-gray-13 hover:bg-gray-2'
                                                                )}
                                                                onClick={() => {
                                                                    setNodes((nodes) =>
                                                                        nodes.map((n) =>
                                                                            n.id === node.id ? { ...n, data: { ...n.data, connection: option.value } } : n
                                                                        )
                                                                    )
                                                                    setIsConnectionOpen(false)
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
                                                                placeholder={((node.data.icon as string)?.includes('gmail') || (node.data.label as string)?.toLowerCase().includes('gmail')) ? "e.g. My Gmail Connection" : "e.g. My Outlook Connection"}
                                                                className="w-full px-2 py-1.5 text-sm border border-gray-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-4 focus:border-primary-9"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        // Handle connect
                                                                        if (!newConnectionName.trim() || isConnecting) return
                                                                        setIsConnecting(true)
                                                                        const tenantId = session?.tenantId
                                                                        const nodeIcon = (node.data.icon as string)?.toLowerCase() || ""
                                                                        const provider = nodeIcon.includes('outlook') ? 'outlook' : 'gmail'
                                                                        const location = window.location
                                                                        const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${tenantId}&envtype=trial&connectorname=${newConnectionName}&provider=${provider}&resulturl=${location.origin}/auth/`
                                                                        window.open(url, '_blank')
                                                                    }
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
                                                                onClick={() => {
                                                                    setIsConnecting(true)
                                                                    const tenantId = session?.tenantId
                                                                    const nodeIcon = (node.data.icon as string)?.toLowerCase() || ""
                                                                    const provider = nodeIcon.includes('outlook') ? 'outlook' : 'gmail'
                                                                    const location = window.location
                                                                    const url = `https://ezcloudauth.azurewebsites.net/api/authorize?tenantid=${tenantId}&envtype=trial&connectorname=${newConnectionName}&provider=${provider}&resulturl=${location.origin}/auth/`
                                                                    window.open(url, '_blank')
                                                                }}
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

                            {/* Email Subject */}
                            <div className='space-y-1'>
                                <Input
                                    label='Email subject'
                                    value=''
                                    onChange={() => { }}
                                    className='text-sm'
                                />
                            </div>
                        </>
                    )}
            </div>
            {CommonFooter}

            {/* Resize Handle (Visual) */}
            <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-1.5 bg-gray-3 rounded-full cursor-col-resize hover:bg-gray-4 transition-colors' />

        </div>
    )
}

export default PropertiesPanel
