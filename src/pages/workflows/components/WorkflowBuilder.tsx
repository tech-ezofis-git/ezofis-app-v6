import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
    useEdgesState,
    useNodesState,
    type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import BuilderHeader from './header/BuilderHeader'
import AddNodeMenu from './AddNodeMenu'


import CustomEdge from './edges/CustomEdge'
import CustomNode from './nodes/CustomNode'
import PropertiesPanel from './PropertiesPanel'
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
            stepNumber: 1,
            label: 'New Form Submission',
            subLabel: 'Primary Trigger',
            icon: 'lucide:file-input',
            iconColor: 'var(--color-primary-9)',
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
        },
    },
]
const initialEdges = [
    { id: 'e1-2', source: '1', target: '2', type: 'custom' },
]



const WorkflowBuilder = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const { selectedNode, isPanelOpen, selectNode, closePanel } = useWorkflowStore(
        (state) => state,
    )

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        selectNode(node)
    }

    const onPaneClick = () => {
        selectNode(null)
    }

    return (
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
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onNodeClick={onNodeClick}
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
                    </ReactFlow>
                </div>

                {/* Properties Panel (Right Sidebar) */}
                {isPanelOpen && (
                    <div className='h-full animate-in slide-in-from-right duration-300'>
                        <PropertiesPanel node={selectedNode} onClose={closePanel} />
                    </div>
                )}
            </div>
        </div>
    )
}

WorkflowBuilder.displayName = 'WorkflowBuilder'
export default WorkflowBuilder
