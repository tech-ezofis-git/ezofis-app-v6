import type { Node, Edge } from '@xyflow/react'
import { useReactFlow, useNodes, useEdges } from '@xyflow/react'
import { useState, useRef, useEffect, lazy, Suspense } from 'react'

// Lazy load APAgentNodeSettings at module scope (must be before PropertiesPanel)
const APAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/APAgentNodeSettings'));
const FTPAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/FTPAgentNodeSettings'));
const OCRAgentNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/OCRAgentNodeSettings'));
const ManualUserNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/ManualUserNodeSettings'));
const EmailNodeSettings = lazy<React.ComponentType<{ node: Node }>>(() => import('./settings/EmailNodeSettings'));
import cn from '@/utils/cn'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import useWorkflowStore from '../stores/useWorkflowStore'
import authUserStore from '@/stores/authUserStore'
import ConnectionsRouting from './settings/common/ConnectionsRouting'

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

    // Determine the effective tool type (original name or current label as fallback)
    const toolType = ((node.data.toolType as string) || (node.data.label as string) || '').toLowerCase();

    // Render AP Agent node settings panel
    if (toolType === 'ap agent') {
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
    if (toolType === 'ftp agent') {
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
    if (toolType === 'ocr agent') {
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
    if (toolType === 'manual user' || toolType === 'form submission') {
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

    // Render Email settings panel
    if (toolType.includes('gmail') || toolType.includes('outlook') ||
        (node.data.icon as string)?.includes('gmail') || (node.data.icon as string)?.includes('outlook')) {
        return (
            <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
                {NodeHeader}
                <div className="flex-1 overflow-hidden">
                    <Suspense fallback={<div className="p-6 text-gray-10">Loading settings...</div>}>
                        <EmailNodeSettings node={node} />
                    </Suspense>
                </div>
                {CommonFooter}
            </div>
        )
    }

    return (
        <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
            {NodeHeader}

            {/* Content */}
            <div className='flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-1'>
                <ConnectionsRouting node={node as any} />
            </div>
            {CommonFooter}

            {/* Resize Handle (Visual) */}
            <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-1.5 bg-gray-3 rounded-full cursor-col-resize hover:bg-gray-4 transition-colors' />

        </div>
    )
}

export default PropertiesPanel
