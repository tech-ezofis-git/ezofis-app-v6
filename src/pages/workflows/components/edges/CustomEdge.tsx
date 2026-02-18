import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from '@xyflow/react'
import useWorkflowStore from '../../stores/useWorkflowStore'
import Icon from '@/components/base/icon/Icon'

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
    const { openAddMenu } = useWorkflowStore((state) => state)
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

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: '#cbd5e1',
                    strokeWidth: 3,
                }}
            />
            {/* Animated Path on Hover? Not easy with BaseEdge. Let's stick to coloring. */}

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className='nodrag nopan group'
                >
                    <button
                        className='flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-3 bg-white text-primary-9 shadow-md transition-all hover:scale-125 hover:border-primary-9 hover:bg-primary-1 hover:rotate-90'
                        onClick={onAddClick}
                        title='Add step'
                    >
                        <Icon name='lucide:plus' className='h-5 w-5 stroke-[3px]' />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    )
}

export default CustomEdge
