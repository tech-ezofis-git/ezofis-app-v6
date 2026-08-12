import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react'
import { useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import useWorkflowStore from '../../stores/useWorkflowStore'

const CustomEdge = ({
  id,
  markerEnd,
  sourcePosition,
  sourceX,
  sourceY,
  style = {},
  targetPosition,
  targetX,
  targetY,
}: EdgeProps) => {
  const { activeEdgeId, openAddMenu, workflowStatus } = useWorkflowStore(
    (state) => state,
  )
  const { setEdges } = useReactFlow()
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  })

  const onAddClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    openAddMenu({ x: labelX, y: labelY }, id)
  }

  const onDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 300)
  }

  // New logic: In Draft, Add button is always visible. In Published, hover only.
  const isAddButtonVisible = workflowStatus === 'draft' || isHovered

  return (
    <>
      {/* Interaction Path (Invisible but wide) */}
      <BaseEdge
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          cursor: 'pointer',
          stroke: 'transparent',
          strokeWidth: 30,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Visible Path */}
      <BaseEdge
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          ...style,
          animation:
            id === activeEdgeId ? 'dashdraw 0.5s linear infinite' : undefined,
          stroke: id === activeEdgeId ? '#22c55e' : '#cbd5e1',
          strokeDasharray: id === activeEdgeId ? 5 : undefined,
          strokeWidth: 3,
        }}
      />
      <style>
        {`
                    @keyframes dashdraw {
                        from { stroke-dashoffset: 10; }
                        to { stroke-dashoffset: 0; }
                    }
                `}
      </style>

      <EdgeLabelRenderer>
        {/* Add Button - Center */}
        <div
          className='nodrag nopan group'
          style={{
            opacity: isAddButtonVisible ? 1 : 0,
            pointerEvents: 'all',
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            transition: 'opacity 0.2s ease-in-out',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className='flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-3 bg-white text-primary-9 shadow-md transition-all hover:scale-125 hover:rotate-90 hover:border-primary-9 hover:bg-primary-1'
            title='Add step'
            onClick={onAddClick}
          >
            <Icon className='h-5 w-5 stroke-[3px]' name='lucide:plus' />
          </button>
        </div>

        {/* Delete Button - End (Near Target) */}
        <div
          className='nodrag nopan'
          style={{
            opacity: isHovered ? 1 : 0,
            pointerEvents: 'all',
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetX}px,${targetY - 24}px)`,
            transition: 'opacity 0.2s ease-in-out',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className='text-gray-500 flex h-6 w-6 items-center justify-center rounded-full border border-gray-3 bg-white shadow-sm transition-all hover:scale-110 hover:border-red-9 hover:bg-red-1 hover:text-red-9'
            title='Delete connection'
            onClick={onDeleteClick}
          >
            <Icon className='h-3.5 w-3.5' name='lucide:x' />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default CustomEdge
