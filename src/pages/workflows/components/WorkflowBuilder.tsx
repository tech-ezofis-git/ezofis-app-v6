import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    addEdge,
    type Connection,
    type Node,
    type Edge,
} from '@xyflow/react'
import { useCallback, useState } from 'react'
import { useEffect } from 'react'
import '@xyflow/react/dist/style.css'
import BuilderHeader from './header/BuilderHeader'
import AddNodeMenu from './AddNodeMenu'


import CustomEdge from './edges/CustomEdge'
import CustomNode from './nodes/CustomNode'
import PropertiesPanel from './PropertiesPanel'
import { WorkflowSettings } from './WorkflowSettings'
import useWorkflowStore from '../stores/useWorkflowStore'

const nodeTypes = {
    custom: CustomNode,
}

const edgeTypes = {
    custom: CustomEdge,
}

const initialNodes = [
    {
        id: '1',
        type: 'custom',
        position: { x: 400, y: 50 },
        data: {
            type: 'trigger',
            label: 'Gmail',
            subLabel: 'Send or receive emails',
            icon: 'logos:google-gmail',
            warning: true,
        },
    },
    {
        id: '2',
        type: 'custom',
        position: { x: 400, y: 300 },
        data: {
            label: 'Workflow Success',
            subLabel: 'Automated Process End',
            icon: 'lucide:party-popper',
            iconColor: 'var(--color-secondary-9)',
            warning: true,
        },
    },
]
const initialEdges = [
    { id: 'e1-2', source: '1', target: '2', type: 'custom' },
]



const WorkflowBuilder = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const [contextMenu, setContextMenu] = useState<{ id: string; type: 'node' | 'edge'; top: number; left: number } | null>(null)
    const { selectedNode, selectedEdge, isPanelOpen, selectNode, selectEdge, closePanel } = useWorkflowStore(
        (state) => state,
    )

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => ({
                ...node,
                selected: node.id === selectedNode?.id,
            }))
        )
    }, [selectedNode, setNodes])

    // Dynamic Edge Handle Logic: Snap to best face based on relative position
    useEffect(() => {
        setEdges((eds) => {
            let hasChanged = false;
            const newEdges = eds.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);

                if (!sourceNode || !targetNode) return edge;

                const dx = targetNode.position.x - sourceNode.position.x;
                const dy = targetNode.position.y - sourceNode.position.y;

                let sourceHandle = edge.sourceHandle;
                let targetHandle = edge.targetHandle;

                if (Math.abs(dx) > Math.abs(dy) + 100) {
                    // Primarily Horizontal
                    sourceHandle = dx > 0 ? 's-right' : 's-left';
                    targetHandle = dx > 0 ? 't-left' : 't-right';
                } else {
                    // Primarily Vertical
                    sourceHandle = dy > 0 ? 's-bottom' : 's-top';
                    targetHandle = dy > 0 ? 't-top' : 't-bottom';
                }

                if (sourceHandle !== edge.sourceHandle || targetHandle !== edge.targetHandle) {
                    hasChanged = true;
                    return { ...edge, sourceHandle, targetHandle };
                }
                return edge;
            });

            return hasChanged ? newEdges : eds;
        });
    }, [nodes, setEdges]);

    const { isRunningTest, stopTestRun, setActiveEdge, setActiveNode } = useWorkflowStore((state) => state)

    useEffect(() => {
        if (!isRunningTest) return

        let mounted = true
        const sequence = async () => {
            // Simple linear traversal from top to bottom for MVP
            // Find start node (trigger or top-most)
            const startNode = nodes.find(n => n.data.type === 'trigger') || nodes[0]
            if (!startNode) return

            let currentNodeId = startNode.id

            while (mounted && currentNodeId) {
                // Highlight current node
                setActiveNode(currentNodeId)
                await new Promise(r => setTimeout(r, 800)) // Pause on node
                if (!mounted) break

                // Find outgoing edge
                const outgoingEdge = edges.find(e => e.source === currentNodeId)

                if (outgoingEdge) {
                    setActiveNode(null) // Un-highlight node
                    setActiveEdge(outgoingEdge.id)
                    await new Promise(r => setTimeout(r, 1000)) // Animate edge
                    if (!mounted) break
                    setActiveEdge(null)
                    currentNodeId = outgoingEdge.target
                } else {
                    // Start of end node highlight (final node)
                    setActiveNode(currentNodeId)
                    await new Promise(r => setTimeout(r, 800))
                    setActiveNode(null)
                    currentNodeId = '' // Stop
                }

                // If we reached the end node or no more edges
                if (!outgoingEdge) {
                    // Ensure the last node gets un-highlighted if loop breaks here
                    setActiveNode(null)
                    break
                }
            }

            if (mounted) stopTestRun()
        }

        sequence()

        return () => {
            mounted = false
            stopTestRun() // Cleanup on unmount or re-run
        }
    }, [isRunningTest, nodes, edges, stopTestRun, setActiveEdge, setActiveNode])

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'custom' }, eds)),
        [setEdges],
    )

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        selectNode(node)
        setContextMenu(null)
    }

    const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
        selectEdge(edge)
        setContextMenu(null)
    }

    const onPaneClick = () => {
        selectNode(null)
        setContextMenu(null)
    }

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: any) => {
            event.preventDefault()
            setContextMenu({
                id: edge.id,
                type: 'edge',
                top: event.clientY,
                left: event.clientX,
            })
        },
        [],
    )

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault()
            setContextMenu({
                id: node.id,
                type: 'node',
                top: event.clientY,
                left: event.clientX,
            })
        },
        [],
    )

    const deleteItem = useCallback(() => {
        if (contextMenu) {
            if (contextMenu.type === 'edge') {
                setEdges((edges) => edges.filter((edge) => edge.id !== contextMenu.id))
            } else if (contextMenu.type === 'node') {
                const nodeToDelete = nodes.find((n) => n.id === contextMenu.id)
                if (nodeToDelete && (nodeToDelete.data.type === 'trigger' || nodeToDelete.data.label === 'Workflow Success')) {
                    setContextMenu(null)
                    return
                }
                setNodes((nodes) => nodes.filter((node) => node.id !== contextMenu.id))
                // Also close panel if deleted node was selected
                if (selectedNode?.id === contextMenu.id) {
                    selectNode(null)
                }
            }
            setContextMenu(null)
        }
    }, [contextMenu, setEdges, setNodes, selectedNode, selectNode, nodes])

    return (
        <ReactFlowProvider>
            <div className='flex flex-col h-screen w-full overflow-hidden bg-gray-1'>
                <BuilderHeader />
                <div className='flex flex-1 overflow-hidden'>
                    {/* Canvas Area */}
                    <div className='flex-1 relative h-full min-w-0'>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onEdgeContextMenu={onEdgeContextMenu}
                            onNodeContextMenu={onNodeContextMenu}
                            deleteKeyCode={['Backspace', 'Delete']}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            onNodeClick={onNodeClick}
                            onEdgeClick={onEdgeClick}
                            onPaneClick={onPaneClick}
                            fitView
                            fitViewOptions={{ padding: 0.2, maxZoom: 0.75 }}
                            maxZoom={0.75}
                            minZoom={0.25}
                            zoomOnScroll={false}
                            panOnScroll={true}
                            className='bg-transparent'
                            defaultEdgeOptions={{
                                type: 'custom',
                            }}
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background
                                variant={BackgroundVariant.Lines}
                                gap={40}
                                size={1}
                                color='var(--color-primary-2)'
                                style={{ opacity: 0.5 }}
                            />
                            <Controls
                                position='bottom-right'
                                className='!bg-white !border-2 !border-gray-2 !shadow-xl !rounded-xl overflow-hidden'
                            />
                            <AddNodeMenu />
                            {contextMenu && (
                                <div
                                    style={{
                                        top: contextMenu.top,
                                        left: contextMenu.left,
                                    }}
                                    className='fixed z-[1000] min-w-[150px] overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg'
                                >
                                    {(contextMenu.type !== 'node' || (
                                        nodes.find(n => n.id === contextMenu.id)?.data.type !== 'trigger' &&
                                        nodes.find(n => n.id === contextMenu.id)?.data.label !== 'Workflow Success'
                                    )) && (
                                            <button
                                                className='flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50'
                                                onClick={deleteItem}
                                            >
                                                {contextMenu.type === 'node' ? 'Delete Node' : 'Delete Connection'}
                                            </button>
                                        )}
                                </div>
                            )}
                        </ReactFlow>
                    </div>


                    {/* Properties Panel (Right Sidebar) */}
                    {isPanelOpen && (
                        <div className='h-full animate-in slide-in-from-right duration-300'>
                            <PropertiesPanel node={selectedNode} edge={selectedEdge} onClose={closePanel} />
                        </div>
                    )}

                    {/* Settings Panel (Right Sidebar) */}
                    <WorkflowSettings />
                </div>
            </div>
        </ReactFlowProvider>
    )
}

WorkflowBuilder.displayName = 'WorkflowBuilder'
export default WorkflowBuilder
