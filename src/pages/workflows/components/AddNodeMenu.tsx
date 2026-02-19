import { useReactFlow } from '@xyflow/react'
import { useRef, useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import useWorkflowStore from '../stores/useWorkflowStore'

type TabType = 'explore' | 'apps' | 'agents' | 'triggers'

interface IntegrationItem {
    label: string
    icon: string
    iconColor: string
    bgColor: string
    type: 'popular' | 'highlight'
    category: TabType | 'utility' // keeping utility for type safety if needed, but mainly mapping to new tabs
    description: string
    actions?: string[]
}

const AddNodeMenu = () => {
    const { addMenu, closeAddMenu, selectedNode, selectNode } = useWorkflowStore((state) => state)
    const { position } = addMenu
    const { getViewport, setNodes, getNodes, setEdges, getEdge, getEdges } = useReactFlow()
    const menuRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<TabType>('explore')

    const { nodeId, edgeId } = addMenu

    // Reset scroll on open/tab change
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = 0
        }
    }, [addMenu.isOpen, activeTab, search])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as globalThis.Node)) {
                closeAddMenu()
            }
        }
        window.addEventListener('mousedown', handleClickOutside, { capture: true })
        return () => window.removeEventListener('mousedown', handleClickOutside, { capture: true })
    }, [closeAddMenu])

    const handleItemSelect = (item: IntegrationItem) => {
        if (nodeId) {
            // Change existing node
            const nodes = getNodes()
            const updatedNodes = nodes.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: item.label,
                            icon: item.icon,
                            iconColor: item.iconColor,
                            subLabel: item.description,
                            type: item.category === 'triggers' ? 'trigger' : 'action',
                        },
                    }
                }
                return node
            })

            setNodes(updatedNodes)

            // Update selected node in store if it matches
            const updatedNode = updatedNodes.find((n) => n.id === nodeId)
            if (updatedNode && selectedNode?.id === nodeId) {
                selectNode(updatedNode)
            }
        } else if (edgeId && position) {
            // Add new node on edge with Auto-Layout
            const edge = getEdge(edgeId)
            const allNodes = getNodes()
            const allEdges = getEdges() // Ensure we have latest edges for traversal

            if (edge) {
                const sourceNode = allNodes.find((n) => n.id === edge.source)
                const targetNode = allNodes.find((n) => n.id === edge.target)

                if (sourceNode && targetNode) {
                    const GAP = 250 // Vertical spacing matches initial nodes (50 -> 300)

                    const newNodeId = `node-${Date.now()}`
                    const newNode = {
                        id: newNodeId,
                        type: 'custom',
                        // Align X with source, Place Y at source Y + GAP
                        position: { x: sourceNode.position.x, y: sourceNode.position.y + GAP },
                        data: {
                            label: item.label,
                            icon: item.icon,
                            iconColor: item.iconColor,
                            subLabel: item.description,
                            type: item.category === 'triggers' ? 'trigger' : 'action',
                        },
                    }

                    // 1. Identify all downstream nodes starting from the current target
                    // We need to shift these down to make room for the new node
                    const downstreamNodeIds = new Set<string>()
                    const queue = [edge.target]

                    while (queue.length > 0) {
                        const currentId = queue.shift()!
                        if (!downstreamNodeIds.has(currentId)) {
                            downstreamNodeIds.add(currentId)
                            // Find all nodes connected to outgoing edges of currentId
                            const outgoingEdges = allEdges.filter(e => e.source === currentId)
                            outgoingEdges.forEach(e => {
                                if (!downstreamNodeIds.has(e.target)) {
                                    queue.push(e.target)
                                }
                            })
                        }
                    }

                    // 2. Create updated nodes arrays
                    const shiftedNodes = allNodes.map(n => {
                        if (downstreamNodeIds.has(n.id)) {
                            return {
                                ...n,
                                position: {
                                    ...n.position,
                                    y: n.position.y + GAP // Shift down by one gap unit
                                }
                            }
                        }
                        return n
                    })

                    const newEdges = [
                        { id: `${edge.source}->${newNodeId}`, source: edge.source, target: newNodeId, type: 'custom' },
                        { id: `${newNodeId}->${edge.target}`, source: newNodeId, target: edge.target, type: 'custom' },
                    ]

                    // Add new node to the shifted nodes
                    setNodes(shiftedNodes.concat(newNode))
                    setEdges((eds) => eds.filter((e) => e.id !== edgeId).concat(newEdges))

                    // Select the new node
                    selectNode(newNode as any)
                }
            }
        }
        closeAddMenu()
    }

    if (!addMenu.isOpen || !position) return null

    const { x: flowX, y: flowY } = position
    const { x: viewX, y: viewY, zoom } = getViewport()

    const screenX = flowX * zoom + viewX
    const screenY = flowY * zoom + viewY

    // Smart Positioning: Best Fit Logic
    const PADDING = 20
    const DEFAULT_HEIGHT = 450
    const actualHeight = menuRef.current?.offsetHeight || DEFAULT_HEIGHT

    // Calculate available space
    const spaceBelow = window.innerHeight - screenY - PADDING
    const spaceAbove = screenY - PADDING

    let top: number
    let maxHeight: number
    let transformOrigin: string

    // Prefer placing below if it fits, or if there's more space below than above
    if (spaceBelow >= actualHeight || spaceBelow >= spaceAbove) {
        top = screenY + PADDING
        maxHeight = Math.min(spaceBelow - PADDING, 450)
        transformOrigin = 'top center'
    } else {
        maxHeight = Math.min(spaceAbove - PADDING, 450)
        top = screenY - PADDING - maxHeight
        transformOrigin = 'bottom center'
    }

    const integrations: IntegrationItem[] = [
        // Apps
        { label: 'Gmail Connect', icon: 'logos:google-gmail', iconColor: '', bgColor: 'bg-transparent', type: 'popular', category: 'apps', description: 'Send or receive emails', actions: ['New Email', 'New Label'] },
        { label: 'Slack', icon: 'logos:slack-icon', iconColor: '', bgColor: 'bg-transparent', type: 'popular', category: 'apps', description: 'Send channel messages' },
        { label: 'Teams', icon: 'logos:microsoft-teams', iconColor: '', bgColor: 'bg-transparent', type: 'popular', category: 'apps', description: 'Microsoft Teams integration' },

        // Agents
        { label: 'OCR Agent', icon: 'lucide:scan-text', iconColor: '#2563eb', bgColor: 'bg-blue-50', type: 'popular', category: 'agents', description: 'Extract text from images/PDFs' },
        { label: 'AP Agent', icon: 'lucide:receipt-text', iconColor: '#059669', bgColor: 'bg-emerald-50', type: 'popular', category: 'agents', description: 'Accounts Payable automation' },
        { label: 'FTP Agent', icon: 'lucide:server', iconColor: '#7c3aed', bgColor: 'bg-violet-50', type: 'popular', category: 'agents', description: 'File Transfer Protocol' },

        // Triggers
        { label: 'Form Submission', icon: 'lucide:file-input', iconColor: '#ea580c', bgColor: 'bg-orange-50', type: 'highlight', category: 'triggers', description: 'Trigger on new form entry' },
        { label: 'Manual User', icon: 'lucide:user', iconColor: '#ec4899', bgColor: 'bg-pink-50', type: 'highlight', category: 'triggers', description: 'Trigger manually by user' },
    ]

    const filteredIntegrations = integrations.filter(item => {
        const matchesSearch = item.label.toLowerCase().includes(search.toLowerCase())
        const matchesTab = activeTab === 'explore' || item.category === activeTab
        return matchesSearch && matchesTab
    })

    const appsAndAgents = filteredIntegrations.filter(i => (i.category === 'apps' || i.category === 'agents') && activeTab === 'explore')
    const triggerItems = filteredIntegrations.filter(i => i.category === 'triggers' && activeTab === 'explore')

    return (
        <div
            ref={menuRef}
            style={{
                position: 'absolute',
                top: top,
                left: screenX,
                transform: 'translateX(-50%)',
                transformOrigin: transformOrigin,
                zIndex: 1000,
                maxHeight: maxHeight,
            }}
            className='w-[420px] flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 font-sans'
        >
            {/* Search Header */}
            <div className='p-4 pb-2 shrink-0'>
                <div className='relative'>
                    <Input
                        placeholder='Search apps, tools, or logic...'
                        value={search}
                        onChange={(val) => setSearch(val)}
                        className='w-full text-sm bg-gray-50 border-transparent focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 rounded-xl py-2.5 transition-all'
                        leftSection={<Icon name='lucide:search' className='h-4.5 w-4.5 text-gray-400' />}
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className='px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0'>
                {[
                    { id: 'explore', label: 'All', icon: 'lucide:layout-grid' },
                    { id: 'apps', label: 'Apps', icon: 'lucide:puzzle' },
                    { id: 'agents', label: 'Agents', icon: 'lucide:bot' },
                    { id: 'triggers', label: 'Triggers', icon: 'lucide:zap' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 group ${activeTab === tab.id
                            ? 'bg-[var(--primary-3)] text-[var(--primary-9)]'
                            : 'text-gray-600 hover:bg-[var(--primary-1)] hover:text-[var(--primary-9)]'
                            }`}
                    >
                        {/* Icon - keeping it as requested "Mainly icon with text" */}
                        <Icon
                            name={tab.icon}
                            className={`h-4 w-4 transition-colors ${activeTab === tab.id
                                ? 'text-[var(--primary-9)]'
                                : 'text-gray-500 group-hover:text-[var(--primary-9)]'
                                }`}
                        />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content View */}
            <div
                ref={listRef}
                className='p-4 overflow-y-auto min-h-0 flex-1'
            >
                {activeTab === 'explore' && !search ? (
                    <div className='grid grid-cols-2 gap-8'>
                        {/* Integrations Column */}
                        <div className='flex flex-col gap-2'>
                            <h3 className='text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 pl-2'>Integrations</h3>
                            {appsAndAgents.map((item, i) => (
                                <button
                                    key={i}
                                    className='flex items-center gap-3 rounded-xl p-2.5 hover:bg-[var(--primary-1)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left group'
                                    onClick={() => handleItemSelect(item)}
                                >
                                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${item.bgColor === 'bg-transparent' ? '' : item.bgColor}`}>
                                        <Icon
                                            name={item.icon}
                                            className={item.bgColor === 'bg-transparent' ? 'h-5 w-5' : 'h-4 w-4'}
                                            style={{ color: item.iconColor }}
                                        />
                                    </div>
                                    <span className='text-sm font-medium text-gray-700 group-hover:text-[var(--primary-9)]'>{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Triggers Column */}
                        <div className='flex flex-col gap-2'>
                            <h3 className='text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 pl-2'>Triggers</h3>
                            {triggerItems.map((item, i) => (
                                <button
                                    key={i}
                                    className='flex items-center gap-3 rounded-xl p-2.5 hover:bg-[var(--primary-1)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left group'
                                    onClick={() => handleItemSelect(item)}
                                >
                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.bgColor}`}>
                                        <Icon name={item.icon} className='h-4 w-4' style={{ color: item.iconColor }} />
                                    </div>
                                    <span className='text-sm font-medium text-gray-700 group-hover:text-[var(--primary-9)]'>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Standard List View for Search or Specific Tabs
                    <div className='flex flex-col gap-1'>
                        {filteredIntegrations.map((item, i) => (
                            <button
                                key={i}
                                className='flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--primary-1)] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-left group'
                                onClick={() => handleItemSelect(item)}
                            >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bgColor === 'bg-transparent' ? '' : item.bgColor}`}>
                                    <Icon
                                        name={item.icon}
                                        className={item.bgColor === 'bg-transparent' ? 'h-6 w-6' : 'h-5 w-5'}
                                        style={{ color: item.iconColor }}
                                    />
                                </div>
                                <div className='flex flex-col'>
                                    <span className='text-sm font-medium text-gray-900 group-hover:text-[var(--primary-9)]'>{item.label}</span>
                                    {search && <span className='text-xs text-gray-500'>{item.description}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AddNodeMenu
