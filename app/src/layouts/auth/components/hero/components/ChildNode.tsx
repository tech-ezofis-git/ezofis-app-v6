import { Handle, type NodeProps, Position } from '@xyflow/react'
import Icon from '@/components/base/icon/Icon'

const modules = [
  {
    icon: 'lucide:blocks',
    name: 'Tasks',
    position: Position.Right,
  },
  {
    icon: 'lucide:workflow',
    name: 'Workflows',
    position: Position.Right,
  },
  {
    icon: 'lucide:folder',
    name: 'Folders',
    position: Position.Right,
  },
  {
    icon: 'lucide:layout-dashboard',
    name: 'Dashboard',
    position: Position.Left,
  },
  {
    icon: 'lucide:clipboard-list',
    name: 'Forms',
    position: Position.Left,
  },
  {
    icon: 'lucide:panels-top-left',
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
        <Icon className='size-5.5 text-gray-11' name={module.icon} />
      </div>
    </div>
  )
}

ChildNode.displayName = 'ChildNode'
export default ChildNode
