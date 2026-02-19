import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useReactFlow,
    type EdgeProps,
} from '@xyflow/react'
import useWorkflowStore from '../../stores/useWorkflowStore'
import Icon from '@/components/base/icon/Icon'
import { useState, useRef } from 'react'

const CustomEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) => {
    const { openAddMenu, workflowStatus, activeEdgeId } = useWorkflowStore((state) => state)
    const { setEdges } = useReactFlow()
    const [isHovered, setIsHovered] = useState(false)
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
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
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    strokeWidth: 30,
                    stroke: 'transparent',
                    cursor: 'pointer',
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />

            {/* Visible Path */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: id === activeEdgeId ? '#22c55e' : '#cbd5e1',
                    strokeWidth: 3,
                    strokeDasharray: id === activeEdgeId ? 5 : undefined,
                    animation: id === activeEdgeId ? 'dashdraw 0.5s linear infinite' : undefined,
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
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        opacity: isAddButtonVisible ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out',
                    }}
                    className='nodrag nopan group'
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <button
                        className='flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-3 bg-white text-primary-9 shadow-md transition-all hover:scale-125 hover:border-primary-9 hover:bg-primary-1 hover:rotate-90'
                        onClick={onAddClick}
                        title='Add step'
                    >
                        <Icon name='lucide:plus' className='h-5 w-5 stroke-[3px]' />
                    </button>
                </div>

                {/* Delete Button - End (Near Target) */}
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${targetX}px,${targetY - 24}px)`,
                        pointerEvents: 'all',
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out',
                    }}
                    className='nodrag nopan'
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <button
                        className='flex h-6 w-6 items-center justify-center rounded-full border border-gray-3 bg-white text-gray-500 shadow-sm transition-all hover:scale-110 hover:border-red-9 hover:bg-red-1 hover:text-red-9'
                        onClick={onDeleteClick}
                        title='Delete connection'
                    >
                        <Icon name='lucide:x' className='h-3.5 w-3.5' />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    )
}

export default CustomEdge
