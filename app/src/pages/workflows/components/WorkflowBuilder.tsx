import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
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
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useState } from 'react'
import { getWorkflowQueryOptions } from '@/api/workflow/queries'
import useWorkflowStore from '../stores/useWorkflowStore'
import { generateId } from '../utils/generateId'
import AddNodeMenu from './AddNodeMenu'
import CustomEdge from './edges/CustomEdge'
import BuilderHeader from './header/BuilderHeader'
import CustomNode from './nodes/CustomNode'
import PropertiesPanel from './PropertiesPanel'
import { WorkflowSettings } from './WorkflowSettings'

const computeEdgeHandles = (
  edges: Edge[],
  nodes: Node[],
): { changed: boolean; edges: Edge[] } => {
  let changed = false
  const updatedEdges = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)

    if (!sourceNode || !targetNode) return edge

    const dx = targetNode.position.x - sourceNode.position.x
    const dy = targetNode.position.y - sourceNode.position.y

    const isHorizontal = Math.abs(dx) > Math.abs(dy) + 100
    let sourceHandle = ''
    let targetHandle = ''

    if (isHorizontal) {
      sourceHandle = dx > 0 ? 's-right' : 's-left'
      targetHandle = dx > 0 ? 't-left' : 't-right'
    } else {
      sourceHandle = dy > 0 ? 's-bottom' : 's-top'
      targetHandle = dy > 0 ? 't-top' : 't-bottom'
    }

    if (
      sourceHandle !== edge.sourceHandle ||
      targetHandle !== edge.targetHandle
    ) {
      changed = true
      return { ...edge, sourceHandle, targetHandle }
    }
    return edge
  })

  return { changed, edges: updatedEdges }
}

const nodeTypes = {
  custom: CustomNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

const initialTriggerId = generateId()
const initialEndId = generateId()

const initialNodes: Node[] = [
  {
    data: {
      icon: 'logos:google-gmail',
      label: 'Gmail',
      subLabel: 'Send or receive emails',
      toolType: 'gmail',
      type: 'trigger',
      warning: true,
    },
    id: initialTriggerId,
    position: { x: 400, y: 50 },
    type: 'custom',
  },
  {
    data: {
      icon: 'lucide:party-popper',
      iconColor: 'var(--color-secondary-9)',
      label: 'Workflow Success',
      subLabel: 'Automated Process End',
      toolType: 'end',
      type: 'end',
      warning: true,
    },
    id: initialEndId,
    position: { x: 400, y: 300 },
    type: 'custom',
  },
]
const initialEdges: Edge[] = [
  {
    id: generateId(),
    source: initialTriggerId,
    target: initialEndId,
    type: 'custom',
  },
]

const WorkflowBuilderCanvas = ({ workflowId }: { workflowId: string }) => {
  const isNew = workflowId === 'new'
  const preloaded = isNew ? useWorkflowStore.getState() : null
  const hasPreloadedGraph = Boolean(
    preloaded?.loadedNodes?.length && preloaded.loadedEdges,
  )

  const { data } = useQuery({
    ...getWorkflowQueryOptions(workflowId),
    enabled: !isNew,
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    hasPreloadedGraph ? preloaded!.loadedNodes! : isNew ? initialNodes : [],
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    hasPreloadedGraph ? preloaded!.loadedEdges! : isNew ? initialEdges : [],
  )
  const [contextMenu, setContextMenu] = useState<{
    id: string
    left: number
    top: number
    type: 'node' | 'edge'
  } | null>(null)

  const {
    closePanel,
    isPanelOpen,
    loadedEdges,
    loadedNodes,
    loadLegacyWorkflow,
    resetWorkflow,
    selectedEdge,
    selectEdge,
    selectedNode,
    selectNode,
  } = useWorkflowStore((state) => state)

  // Existing workflows reset then load from the API. New workflows keep
  // whatever the AI / manual create flow already put in the store — resetting
  // here was wiping the generated name and description.
  useEffect(() => {
    if (isNew) {
      const { loadedEdges, loadedNodes } = useWorkflowStore.getState()
      if (loadedNodes?.length && loadedEdges) {
        setNodes(loadedNodes)
        setEdges(loadedEdges)
      } else {
        setNodes(initialNodes)
        setEdges(initialEdges)
      }
      return
    }

    resetWorkflow()
    return () => {
      resetWorkflow()
    }
  }, [isNew, resetWorkflow, setNodes, setEdges])

  // Load from database
  useEffect(() => {
    const flowJsonStr = data?.workflowJson || data?.flowJson
    if (flowJsonStr && !isNew) {
      try {
        const json =
          typeof flowJsonStr === 'string'
            ? JSON.parse(flowJsonStr)
            : flowJsonStr
        loadLegacyWorkflow(json, data)
      } catch (e) {
        console.error('Failed to parse workflow json', e)
      }
    }
  }, [data, loadLegacyWorkflow, isNew])

  const { fitView } = useReactFlow()

  useEffect(() => {
    if (loadedNodes && loadedEdges) {
      setNodes(loadedNodes)
      setEdges(loadedEdges)
      // Wait for nodes to render before fitting the viewport to show all nodes
      const timer = setTimeout(() => {
        fitView({ duration: 400, maxZoom: 1.0, padding: 0.2 })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loadedNodes, loadedEdges, setNodes, setEdges, fitView])

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
      const { changed, edges: newEdges } = computeEdgeHandles(eds, nodes)
      return changed ? newEdges : eds
    })
  }, [nodes, setEdges])

  const { isRunningTest, stopTestRun, setActiveEdge, setActiveNode } =
    useWorkflowStore((state) => state)

  useEffect(() => {
    if (!isRunningTest) return

    let mounted = true
    const sequence = async () => {
      const startNode = nodes.find((n) => n.data.type === 'trigger') ?? nodes[0]
      if (!startNode) return

      let currentNodeId = startNode.id

      while (mounted && currentNodeId) {
        setActiveNode(currentNodeId)
        await new Promise((r) => setTimeout(r, 800))
        if (!mounted) break

        const outgoingEdge = edges.find((e) => e.source === currentNodeId)

        if (outgoingEdge) {
          setActiveNode(null)
          setActiveEdge(outgoingEdge.id)
          await new Promise((r) => setTimeout(r, 1000))
          if (!mounted) break
          setActiveEdge(null)
          currentNodeId = outgoingEdge.target
        } else {
          setActiveNode(currentNodeId)
          await new Promise((r) => setTimeout(r, 800))
          setActiveNode(null)
          currentNodeId = ''
        }

        if (!outgoingEdge) {
          setActiveNode(null)
          break
        }
      }

      if (mounted) stopTestRun()
    }

    sequence()

    return () => {
      mounted = false
      stopTestRun()
    }
  }, [isRunningTest, nodes, edges, stopTestRun, setActiveEdge, setActiveNode])

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, id: generateId(), type: 'custom' }, eds),
      ),
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
        if (selectedNode?.id === contextMenu.id) {
          selectNode(null)
        }
      }
      setContextMenu(null)
    }
  }, [contextMenu, setEdges, setNodes, selectedNode, selectNode, nodes])

  return (
    <div className='flex h-screen w-full flex-col overflow-hidden bg-gray-1'>
      <BuilderHeader />
      <div className='flex flex-1 overflow-hidden'>
        <div className='relative h-full min-w-0 flex-1'>
          <ReactFlow
            className='bg-transparent'
            deleteKeyCode={['Backspace', 'Delete']}
            edges={edges}
            edgeTypes={edgeTypes}
            fitViewOptions={{ padding: 0.2 }}
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

        {isPanelOpen && (
          <div className='animate-in slide-in-from-right h-full duration-300'>
            <PropertiesPanel
              edge={selectedEdge}
              node={selectedNode}
              onClose={closePanel}
            />
          </div>
        )}

        <WorkflowSettings />
      </div>
    </div>
  )
}

const WorkflowBuilder = () => {
  const { workflowId } = useParams({ from: '/workflow-builder/$workflowId' })

  return (
    <ReactFlowProvider>
      <WorkflowBuilderCanvas key={workflowId} workflowId={workflowId} />
    </ReactFlowProvider>
  )
}

WorkflowBuilder.displayName = 'WorkflowBuilder'
export default WorkflowBuilder
