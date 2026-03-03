import { Handle, Position, type NodeProps, useReactFlow, useHandleConnections } from '@xyflow/react'
import { memo } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import useWorkflowStore from '../../stores/useWorkflowStore'

const CustomNode = ({ id, data, selected }: NodeProps) => {
    const isTrigger = data.type === 'trigger'
    const isEndNode = data.label === 'Workflow Success'
    const isDeletable = !isTrigger && !isEndNode
    const hasWarning = data.warning
    const { screenToFlowPosition, setNodes } = useReactFlow()
    const { openChangeMenu, activeNodeId } = useWorkflowStore((state) => state)
    const isActive = id === activeNodeId

    // Check for incoming connections to the target handle
    const connections = useHandleConnections({
        type: 'target',
    })

    // Only show "Trigger" tag if it's a trigger node AND has NO incoming connections (i.e., it's a start node)
    const showTriggerTag = isTrigger && connections.length === 0

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const flowPos = screenToFlowPosition({
            x: buttonRect.left + buttonRect.width / 2,
            y: buttonRect.bottom + 10
        })
        openChangeMenu(flowPos, id)
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        setNodes((nodes) => nodes.filter((n) => n.id !== id))
    }

    return (
        <div className='relative group'>
            {/* Delete Button (Right of Node) */}
            {isDeletable as any && (
                <div
                    className={cn(
                        'absolute -right-14 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 pl-4',
                        selected
                            ? 'opacity-100 pointer-events-auto'
                            : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                    )}
                >
                    <button
                        className='flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-2 shadow-md hover:bg-red-1 hover:border-red-4 hover:text-red-9 text-gray-8 transition-colors'
                        onClick={handleDelete}
                        title='Delete Node'
                    >
                        <Icon name='lucide:trash-2' className='h-4 w-4' />
                    </button>
                </div>
            )}

            {/* Warning Side Icon (Left of Node) */}
            {hasWarning && (
                <div className='absolute -left-10 top-1/2 -translate-y-1/2 z-10'>
                    <div className='flex h-7 w-7 items-center justify-center rounded-full bg-red-1 border-2 border-red-9 shadow-sm animate-pulse'>
                        <Icon name='lucide:alert-circle' className='h-4 w-4 text-red-9' />
                    </div>
                </div>
            )}

            {/* Trigger Label (Top of Node) */}
            {showTriggerTag && (
                <div className='absolute -top-[1.4rem] left-0 z-10'>
                    <div className='flex items-center gap-1.5 rounded-t-lg bg-surface-raised border-2 border-b-0 border-primary-9 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-11 shadow-xs'>
                        <Icon name='lucide:zap' className='h-3.5 w-3.5 fill-primary-9 text-primary-9' />
                        Trigger
                    </div>
                </div>
            )}

            <div
                className={cn(
                    'group/node relative min-w-[280px] rounded-xl border-2 bg-surface-raised shadow-sm transition-all overflow-visible duration-300',
                    isActive && 'border-green-500 ring-4 ring-green-200 shadow-xl scale-[1.05] z-10',
                    selected && !isActive && 'border-primary-9 ring-4 ring-primary-3 shadow-lg scale-[1.02] z-10',
                    !selected && !isActive ? 'border-gray-3 hover:border-primary-7 hover:shadow-md' : ''
                )}
            >
                {/* Input Handles (Target) */}
                <Handle
                    type='target'
                    position={Position.Top}
                    id='t-top'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
                <Handle
                    type='target'
                    position={Position.Bottom}
                    id='t-bottom'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
                <Handle
                    type='target'
                    position={Position.Left}
                    id='t-left'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
                <Handle
                    type='target'
                    position={Position.Right}
                    id='t-right'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />

                <div className='flex items-center gap-4 p-5'>
                    {/* Main Icon Container */}
                    <div
                        className={cn(
                            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-transform group-hover/node:rotate-3',
                            ((data.icon as string)?.startsWith('logos:') || (data.icon as string)?.startsWith('vscode-icons:'))
                                ? 'bg-transparent'
                                : 'bg-white border border-gray-2 shadow-inner'
                        )}
                        style={{
                            backgroundColor: ((data.icon as string)?.startsWith('logos:') || (data.icon as string)?.startsWith('vscode-icons:'))
                                ? 'transparent'
                                : `${(data.iconColor as string) || '#ef4444'}10`
                        }}
                    >
                        <Icon
                            name={(data.icon as string) || 'lucide:box'}
                            className={cn(
                                'drop-shadow-sm',
                                ((data.icon as string)?.startsWith('logos:') || (data.icon as string)?.startsWith('vscode-icons:')) ? 'h-10 w-10' : 'h-9 w-9'
                            )}
                            style={{
                                color: ((data.icon as string)?.startsWith('logos:') || (data.icon as string)?.startsWith('vscode-icons:'))
                                    ? undefined
                                    : (data.iconColor as string) || '#ef4444'
                            }}
                        />
                    </div>

                    {/* Label and Status */}
                    <div className='flex flex-1 flex-col gap-0.5'>
                        <span className='text-[17px] font-bold text-gray-12'>
                            {data.stepNumber ? `${data.stepNumber}. ` : ''}{data.label as string}
                        </span>
                        <span className='text-[14px] font-medium text-gray-10'>
                            {(data.subLabel as string) || 'Click to configure'}
                        </span>
                    </div>

                    {/* Dropdown / Status Arrow */}
                    <div
                        className='rounded-full p-1.5 group-hover/node:bg-gray-2 transition-colors cursor-pointer hover:bg-gray-3'
                        onClick={handleMenuClick}
                    >
                        <Icon
                            name='lucide:chevron-down'
                            className='h-5 w-5 text-gray-80'
                        />
                    </div>
                </div>

                {/* Output Handles (Source) */}
                <Handle
                    type='source'
                    position={Position.Top}
                    id='s-top'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
                <Handle
                    type='source'
                    position={Position.Bottom}
                    id='s-bottom'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
                <Handle
                    type='source'
                    position={Position.Left}
                    id='s-left'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
                <Handle
                    type='source'
                    position={Position.Right}
                    id='s-right'
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
            </div>
        </div>
    )
}

export default memo(CustomNode)
