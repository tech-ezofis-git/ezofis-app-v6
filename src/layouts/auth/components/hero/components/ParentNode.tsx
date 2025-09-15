import { Handle, type NodeProps, Position } from '@xyflow/react'

const ParentNode = ({ data }: NodeProps) => {
  return (
    <div className='size-1.5'>
      <Handle
        className='pointer-events-none opacity-0'
        isConnectable={false}
        position={data.position as Position}
        type='source'
      />
    </div>
  )
}

ParentNode.displayName = 'ParentNode'
export default ParentNode
