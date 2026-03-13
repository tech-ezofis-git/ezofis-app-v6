import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useCallback, useState } from 'react'
import { useEffect } from 'react'
import '@xyflow/react/dist/style.css'
import useWorkflowStore from '../stores/useWorkflowStore'
import AddNodeMenu from './AddNodeMenu'
import CustomEdge from './edges/CustomEdge'
import BuilderHeader from './header/BuilderHeader'
import CustomNode from './nodes/CustomNode'
import PropertiesPanel from './PropertiesPanel'
import { WorkflowSettings } from './WorkflowSettings'

const nodeTypes = {
  custom: CustomNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

const initialNodes = [
  {
    data: {
      icon: 'logos:google-gmail',
      label: 'Gmail',
      subLabel: 'Send or receive emails',
      toolType: 'Gmail',
      type: 'trigger',
      warning: true,
    },
    id: '1',
    position: { x: 400, y: 50 },
    type: 'custom',
  },
  {
    data: {
      icon: 'lucide:party-popper',
      iconColor: 'var(--color-secondary-9)',
      label: 'Workflow Success',
      subLabel: 'Automated Process End',
      warning: true,
    },
    id: '2',
    position: { x: 400, y: 300 },
    type: 'custom',
  },
]
const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'custom' },
]

const WorkflowBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [contextMenu, setContextMenu] = useState<{
    id: string
    left: number
    top: number
    type: 'node' | 'edge'
  } | null>(null)
  const {
    closePanel,
    isPanelOpen,
    selectedEdge,
    selectEdge,
    selectedNode,
    selectNode,
  } = useWorkflowStore((state) => state)

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedNode?.id,
      })),
    )
  }, [selectedNode, setNodes])

  // Dynamic Edge Handle Logic: Snap to best face based on relative position
  useEffect(() => {
    setEdges((eds) => {
      let hasChanged = false
      const newEdges = eds.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source)
        const targetNode = nodes.find((n) => n.id === edge.target)

        if (!sourceNode || !targetNode) return edge

        const dx = targetNode.position.x - sourceNode.position.x
        const dy = targetNode.position.y - sourceNode.position.y

        let sourceHandle = edge.sourceHandle
        let targetHandle = edge.targetHandle

        if (Math.abs(dx) > Math.abs(dy) + 100) {
          // Primarily Horizontal
          sourceHandle = dx > 0 ? 's-right' : 's-left'
          targetHandle = dx > 0 ? 't-left' : 't-right'
        } else {
          // Primarily Vertical
          sourceHandle = dy > 0 ? 's-bottom' : 's-top'
          targetHandle = dy > 0 ? 't-top' : 't-bottom'
        }

        if (
          sourceHandle !== edge.sourceHandle ||
          targetHandle !== edge.targetHandle
        ) {
          hasChanged = true
          return { ...edge, sourceHandle, targetHandle }
        }
        return edge
      })

      return hasChanged ? newEdges : eds
    })
  }, [nodes, setEdges])

  const { isRunningTest, stopTestRun, setActiveEdge, setActiveNode } =
    useWorkflowStore((state) => state)

  useEffect(() => {
    if (!isRunningTest) return

    let mounted = true
    const sequence = async () => {
      // Simple linear traversal from top to bottom for MVP
      // Find start node (trigger or top-most)
      const startNode = nodes.find((n) => n.data.type === 'trigger') || nodes[0]
      if (!startNode) return

      let currentNodeId = startNode.id

      while (mounted && currentNodeId) {
        // Highlight current node
        setActiveNode(currentNodeId)
        await new Promise((r) => setTimeout(r, 800)) // Pause on node
        if (!mounted) break

        // Find outgoing edge
        const outgoingEdge = edges.find((e) => e.source === currentNodeId)

        if (outgoingEdge) {
          setActiveNode(null) // Un-highlight node
          setActiveEdge(outgoingEdge.id)
          await new Promise((r) => setTimeout(r, 1000)) // Animate edge
          if (!mounted) break
          setActiveEdge(null)
          currentNodeId = outgoingEdge.target
        } else {
          // Start of end node highlight (final node)
          setActiveNode(currentNodeId)
          await new Promise((r) => setTimeout(r, 800))
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
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, type: 'custom' }, eds)),
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
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      setContextMenu({
        id: edge.id,
        left: event.clientX,
        top: event.clientY,
        type: 'edge',
      })
    },
    [],
  )

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      setContextMenu({
        id: node.id,
        left: event.clientX,
        top: event.clientY,
        type: 'node',
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
        if (
          nodeToDelete &&
          (nodeToDelete.data.type === 'trigger' ||
            nodeToDelete.data.label === 'Workflow Success')
        ) {
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
      <div className='flex h-screen w-full flex-col overflow-hidden bg-gray-1'>
        <BuilderHeader />
        <div className='flex flex-1 overflow-hidden'>
          {/* Canvas Area */}
          <div className='relative h-full min-w-0 flex-1'>
            <ReactFlow
              className='bg-transparent'
              deleteKeyCode={['Backspace', 'Delete']}
              edges={edges}
              edgeTypes={edgeTypes}
              fitViewOptions={{ maxZoom: 0.75, padding: 0.2 }}
              maxZoom={0.75}
              minZoom={0.25}
              nodes={nodes}
              nodeTypes={nodeTypes}
              panOnScroll={true}
              proOptions={{ hideAttribution: true }}
              zoomOnScroll={false}
              fitView
              defaultEdgeOptions={{
                type: 'custom',
              }}
              onConnect={onConnect}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
              onNodesChange={onNodesChange}
              onPaneClick={onPaneClick}
            >
              <Background
                color='var(--color-primary-2)'
                gap={40}
                size={1}
                style={{ opacity: 0.5 }}
                variant={BackgroundVariant.Lines}
              />
              <Controls
                className='overflow-hidden !rounded-xl !border-2 !border-gray-2 !bg-white !shadow-xl'
                position='bottom-right'
              />
              <AddNodeMenu />
              {contextMenu && (
                <div
                  className='border-gray-200 fixed z-[1000] min-w-[150px] overflow-hidden rounded-lg border bg-white p-1 shadow-lg'
                  style={{
                    left: contextMenu.left,
                    top: contextMenu.top,
                  }}
                >
                  {(contextMenu.type !== 'node' ||
                    (nodes.find((n) => n.id === contextMenu.id)?.data.type !==
                      'trigger' &&
                      nodes.find((n) => n.id === contextMenu.id)?.data.label !==
                      'Workflow Success')) && (
                      <button
                        className='text-red-600 hover:bg-red-50 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm'
                        onClick={deleteItem}
                      >
                        {contextMenu.type === 'node'
                          ? 'Delete Node'
                          : 'Delete Connection'}
                      </button>
                    )}
                </div>
              )}
            </ReactFlow>
          </div>

          {/* Properties Panel (Right Sidebar) */}
          {isPanelOpen && (
            <div className='animate-in slide-in-from-right h-full duration-300'>
              <PropertiesPanel
                edge={selectedEdge}
                node={selectedNode}
                onClose={closePanel}
              />
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
