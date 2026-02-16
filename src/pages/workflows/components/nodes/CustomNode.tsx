import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import { memo } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import useWorkflowStore from '../../stores/useWorkflowStore'

const CustomNode = ({ id, data, selected }: NodeProps) => {
    const isTrigger = data.type === 'trigger'
    const hasWarning = data.warning
    const { screenToFlowPosition } = useReactFlow()
    const openChangeMenu = useWorkflowStore((state) => state.openChangeMenu)

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const flowPos = screenToFlowPosition({
            x: buttonRect.left + buttonRect.width / 2,
            y: buttonRect.bottom + 10
        })
        openChangeMenu(flowPos, id)
    }

    return (
        <div className='relative'>
            {/* Warning Side Icon (Left of Node) */}
            {hasWarning && (
                <div className='absolute -left-10 top-1/2 -translate-y-1/2 z-10'>
                    <div className='flex h-7 w-7 items-center justify-center rounded-full bg-red-1 border-2 border-red-9 shadow-sm animate-pulse'>
                        <Icon name='lucide:alert-circle' className='h-4 w-4 text-red-9' />
                    </div>
                </div>
            )}

            {/* Trigger Label (Top of Node) */}
            {isTrigger && (
                <div className='absolute -top-[1.4rem] left-0 z-10'>
                    <div className='flex items-center gap-1.5 rounded-t-lg bg-surface-raised border-2 border-b-0 border-primary-9 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-11 shadow-xs'>
                        <Icon name='lucide:zap' className='h-3.5 w-3.5 fill-primary-9 text-primary-9' />
                        Trigger
                    </div>
                </div>
            )}

            <div
                className={cn(
                    'group relative min-w-[280px] rounded-xl border-2 bg-surface-raised shadow-sm transition-all overflow-visible',
                    isTrigger ? 'border-primary-9' : 'border-gray-3',
                    selected && 'border-primary-9 ring-4 ring-primary-3 shadow-lg scale-[1.02]',
                    !selected && 'hover:border-primary-7 hover:shadow-md'
                )}
            >
                {/* Input Handle */}
                {!isTrigger && (
                    <Handle
                        type='target'
                        position={Position.Top}
                        className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                    />
                )}

                <div className='flex items-center gap-4 p-5'>
                    {/* Main Icon Container */}
                    <div
                        className={cn(
                            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:rotate-3',
                            (data.icon as string)?.startsWith('logos:')
                                ? 'bg-transparent'
                                : 'bg-white border border-gray-2 shadow-inner'
                        )}
                        style={{
                            backgroundColor: (data.icon as string)?.startsWith('logos:')
                                ? 'transparent'
                                : `${(data.iconColor as string) || '#ef4444'}10`
                        }}
                    >
                        <Icon
                            name={(data.icon as string) || 'lucide:box'}
                            className={cn(
                                'drop-shadow-sm',
                                (data.icon as string)?.startsWith('logos:') ? 'h-10 w-10' : 'h-9 w-9'
                            )}
                            style={{
                                color: (data.icon as string)?.startsWith('logos:')
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
                        className='rounded-full p-1.5 group-hover:bg-gray-2 transition-colors cursor-pointer hover:bg-gray-3'
                        onClick={handleMenuClick}
                    >
                        <Icon
                            name='lucide:chevron-down'
                            className='h-5 w-5 text-gray-80'
                        />
                    </div>
                </div>

                {/* Output Handle */}
                <Handle
                    type='source'
                    position={Position.Bottom}
                    className='!bg-primary-9 !border-2 !border-white !h-3.5 !w-3.5 !shadow-sm transition-transform hover:scale-125'
                />
            </div>

            {/* Progress Line (Visual Only) */}
            <div className='absolute -bottom-6 left-1/2 w-0.5 h-6 bg-primary-3 -translate-x-1/2 -z-10' />
        </div>
    )
}

export default memo(CustomNode)
