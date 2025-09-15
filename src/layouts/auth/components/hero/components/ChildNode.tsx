import { Handle, type NodeProps, Position } from '@xyflow/react'
import Icon from '@/components/base/icon/Icon'

const modules = [
  {
    icon: 'tabler:triangle-square-circle',
    name: 'Tasks',
    position: Position.Right,
  },
  {
    icon: 'tabler:replace',
    name: 'Workflows',
    position: Position.Right,
  },
  {
    icon: 'tabler:folder',
    name: 'Folders',
    position: Position.Right,
  },
  {
    icon: 'tabler:layout-dashboard',
    name: 'Dashboard',
    position: Position.Left,
  },
  {
    icon: 'tabler:clipboard-text',
    name: 'Forms',
    position: Position.Left,
  },
  {
    icon: 'tabler:template',
    name: 'Portals',
    position: Position.Left,
  },
]

const ChildNode = ({ data }: NodeProps) => {
  const module =
    modules.find((module) => module.name === data.moduleName) || modules[0]

  return (
    <div className='flex size-18 items-center justify-center rounded-full bg-gray-3'>
      <div className='flex size-12 items-center justify-center rounded-full bg-surface shadow-xs'>
        <Handle
          className='pointer-events-none opacity-0'
          isConnectable={false}
          position={module.position}
          type='target'
        />
        <Icon className='size-6 text-gray-11' name={module.icon} />
      </div>
    </div>
  )
}

ChildNode.displayName = 'ChildNode'
export default ChildNode
