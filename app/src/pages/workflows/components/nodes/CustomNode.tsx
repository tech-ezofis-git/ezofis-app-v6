import {
  Handle,
  type NodeProps,
  Position,
  useHandleConnections,
  useReactFlow,
} from '@xyflow/react'
import { memo } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import useWorkflowStore from '../../stores/useWorkflowStore'

const CustomNode = ({ data, id, selected }: NodeProps) => {
  const isTrigger = data.type === 'trigger'
  const isEndNode = data.type === 'end'
  const isDeletable = !isTrigger && !isEndNode
  const hasWarning = data.warning
  const { screenToFlowPosition, setNodes } = useReactFlow()
  const { activeNodeId, openChangeMenu } = useWorkflowStore((state) => state)
  const isActive = id === activeNodeId

  // Check for incoming connections to the target handle
  const connections = useHandleConnections({
    type: 'target',
  })

  // Only show "Trigger" tag if it's a trigger node AND has NO incoming connections (i.e., it's a start node)
  const showTriggerTag = isTrigger && (connections?.length ?? 0) === 0

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const flowPos = screenToFlowPosition({
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.bottom + 10,
    })
    openChangeMenu(flowPos, id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((nodes) => nodes.filter((n) => n.id !== id))
  }

  return (
    <div className='group relative'>
      {/* Delete Button (Right of Node) */}
      {(isDeletable as any) && (
        <div
          className={cn(
            'absolute top-1/2 -right-14 z-10 -translate-y-1/2 pl-4 transition-opacity duration-200',
            selected
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
          )}
        >
          <button
            className='flex h-8 w-8 items-center justify-center rounded-full border border-gray-2 bg-white text-gray-8 shadow-md transition-colors hover:border-red-4 hover:bg-red-1 hover:text-red-9'
            title='Delete Node'
            onClick={handleDelete}
          >
            <Icon className='h-4 w-4' name='lucide:trash-2' />
          </button>
        </div>
      )}

      {/* Warning Side Icon (Left of Node) */}
      {hasWarning && (
        <div className='absolute top-1/2 -left-10 z-10 -translate-y-1/2'>
          <div className='flex h-7 w-7 animate-pulse items-center justify-center rounded-full border-2 border-red-9 bg-red-1 shadow-sm'>
            <Icon className='h-4 w-4 text-red-9' name='lucide:alert-circle' />
          </div>
        </div>
      )}

      {/* Trigger Label (Top of Node) */}
      {showTriggerTag && (
        <div className='absolute -top-[1.4rem] left-0 z-10'>
          <div className='flex items-center gap-1.5 rounded-t-lg border-2 border-b-0 border-primary-9 bg-surface-raised px-3 py-0.5 text-[11px] font-bold tracking-wider text-primary-11 uppercase shadow-xs'>
            <Icon
              className='h-3.5 w-3.5 fill-primary-9 text-primary-9'
              name='lucide:zap'
            />
            Trigger
          </div>
        </div>
      )}

      <div
        className={cn(
          'group/node relative min-w-[280px] overflow-visible rounded-xl border-2 bg-surface-raised shadow-sm transition-all duration-300',
          isActive &&
            'border-green-500 ring-green-200 z-10 scale-[1.05] shadow-xl ring-4',
          selected &&
            !isActive &&
            'z-10 scale-[1.02] border-primary-9 shadow-lg ring-4 ring-primary-3',
          !selected && !isActive
            ? 'border-gray-3 hover:border-primary-7 hover:shadow-md'
            : '',
        )}
      >
        {/* Input Handles (Target) */}
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='t-top'
          position={Position.Top}
          type='target'
        />
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='t-bottom'
          position={Position.Bottom}
          type='target'
        />
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='t-left'
          position={Position.Left}
          type='target'
        />
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='t-right'
          position={Position.Right}
          type='target'
        />

        <div className='flex items-center gap-4 p-5'>
          {/* Main Icon Container */}
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-transform group-hover/node:rotate-3',
              (data.icon as string)?.startsWith('logos:') ||
                (data.icon as string)?.startsWith('vscode-icons:')
                ? 'bg-transparent'
                : 'border border-gray-2 bg-white shadow-inner',
            )}
            style={{
              backgroundColor:
                (data.icon as string)?.startsWith('logos:') ||
                (data.icon as string)?.startsWith('vscode-icons:')
                  ? 'transparent'
                  : `${(data.iconColor as string) || '#ef4444'}10`,
            }}
          >
            <Icon
              name={(data.icon as string) || 'lucide:box'}
              className={cn(
                'drop-shadow-sm',
                (data.icon as string)?.startsWith('logos:') ||
                  (data.icon as string)?.startsWith('vscode-icons:')
                  ? 'h-10 w-10'
                  : 'h-9 w-9',
              )}
              style={{
                color:
                  (data.icon as string)?.startsWith('logos:') ||
                  (data.icon as string)?.startsWith('vscode-icons:')
                    ? undefined
                    : (data.iconColor as string) || '#ef4444',
              }}
            />
          </div>

          {/* Label and Status */}
          <div className='flex flex-1 flex-col gap-0.5'>
            <span className='text-[17px] font-bold text-gray-12'>
              {data.stepNumber ? `${data.stepNumber}. ` : ''}
              {data.label as string}
            </span>
            <span className='text-[14px] font-medium text-gray-10'>
              {(data.subLabel as string) || 'Click to configure'}
            </span>
          </div>

          {/* Dropdown / Status Arrow */}
          <div
            className='cursor-pointer rounded-full p-1.5 transition-colors group-hover/node:bg-gray-2 hover:bg-gray-3'
            onClick={handleMenuClick}
          >
            <Icon className='text-gray-80 h-5 w-5' name='lucide:chevron-down' />
          </div>
        </div>

        {/* Output Handles (Source) */}
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='s-top'
          position={Position.Top}
          type='source'
        />
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='s-bottom'
          position={Position.Bottom}
          type='source'
        />
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='s-left'
          position={Position.Left}
          type='source'
        />
        <Handle
          className='!h-3.5 !w-3.5 !border-2 !border-white !bg-primary-9 !shadow-sm transition-transform hover:scale-125'
          id='s-right'
          position={Position.Right}
          type='source'
        />
      </div>
    </div>
  )
}

export default memo(CustomNode)
