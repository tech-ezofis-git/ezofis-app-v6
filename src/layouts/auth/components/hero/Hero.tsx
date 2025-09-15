import { type Edge, type Node, Position, ReactFlow } from '@xyflow/react'
import AINode from './components/AINode'
import AnimatedEdge from './components/AnimatedEdge'
import ChildNode from './components/ChildNode'
import ParentNode from './components/ParentNode'

const nodeTypes = {
  aiNode: AINode,
  childNode: ChildNode,
  parentNode: ParentNode,
}
const edgeTypes = {
  animatedEdge: AnimatedEdge,
}

const nodes: Node[] = [
  {
    data: { position: Position.Left },
    id: 'p1',
    position: { x: 3, y: 45 },
    type: 'parentNode',
  },
  {
    data: { position: Position.Right },
    id: 'p2',
    position: { x: 87, y: 45 },
    type: 'parentNode',
  },
  {
    data: {},
    id: 'a1',
    position: { x: 0, y: 0 },
    type: 'aiNode',
  },
  {
    data: { moduleName: 'Tasks' },
    id: 'c1',
    position: { x: -160, y: -90 },
    type: 'childNode',
  },
  {
    data: { moduleName: 'Workflows' },
    id: 'c2',
    position: { x: -210, y: 12 },
    type: 'childNode',
  },
  {
    data: { moduleName: 'Folders' },
    id: 'c3',
    position: { x: -160, y: 114 },
    type: 'childNode',
  },
  {
    data: { moduleName: 'Dashboard' },
    id: 'c4',
    position: { x: 196, y: -90 },
    type: 'childNode',
  },
  {
    data: { moduleName: 'Forms' },
    id: 'c5',
    position: { x: 235, y: 12 },
    type: 'childNode',
  },
  {
    data: { moduleName: 'Portals' },
    id: 'c6',
    position: { x: 196, y: 114 },
    type: 'childNode',
  },
]
const edges: Edge[] = [
  {
    animated: true,
    data: { animate: false },
    id: 'p1-c1',
    source: 'p1',
    target: 'c1',
    type: 'animatedEdge',
  },
  {
    animated: true,
    data: { animate: false },
    id: 'p1-c2',
    source: 'p1',
    target: 'c2',
    type: 'animatedEdge',
  },
  {
    animated: true,
    data: { animate: false },
    id: 'p1-c3',
    source: 'p1',
    target: 'c3',
    type: 'animatedEdge',
  },
  {
    animated: true,
    data: { animate: false },
    id: 'p2-c4',
    source: 'p2',
    target: 'c4',
    type: 'animatedEdge',
  },
  {
    animated: true,
    data: { animate: false },
    id: 'p2-c5',
    source: 'p2',
    target: 'c5',
    type: 'animatedEdge',
  },
  {
    animated: true,
    data: { animate: false },
    id: 'p2-c6',
    source: 'p2',
    target: 'c6',
    type: 'animatedEdge',
  },
]

const Hero = () => {
  return (
    <div className='h-70 w-130'>
      <ReactFlow
        edges={edges}
        edgesFocusable={false}
        edgeTypes={edgeTypes}
        elementsSelectable={false}
        height={280}
        maxZoom={1}
        minZoom={1}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        nodeTypes={nodeTypes}
        panOnDrag={false}
        proOptions={{ hideAttribution: true }}
        width={520}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        zoomOnScroll={false}
        fitView
        style={
          {
            '--xy-edge-stroke-default': 'var(--gray-8)',
          } as React.CSSProperties
        }
      ></ReactFlow>
    </div>
  )
}

Hero.displayName = 'Hero'
export default Hero
