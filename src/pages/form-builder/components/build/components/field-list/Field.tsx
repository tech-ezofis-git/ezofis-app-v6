import Icon from '@/components/base/icon/Icon'

interface Props {
  icon: string
  label: string
  draggable?: boolean
  onClick?(): void
}

const Field = ({ draggable = false, icon, label, onClick }: Props) => {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: label }))
  }

  return (
    <div
      className='group flex cursor-grab items-center gap-2 rounded border border-gray-3 p-2 transition-colors hover:bg-gray-3'
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
    >
      <div className='flex size-6 items-center justify-center rounded bg-gray-3 transition-colors group-hover:bg-surface'>
        <Icon className='text-gray-11' name={icon} />
      </div>
      <span className='flex-1 font-medium text-gray-12 group-hover:text-gray-13'>
        {label}
      </span>
      {draggable && (
        <Icon className='text-gray-8' name='lucide:grip-vertical' />
      )}
    </div>
  )
}

Field.displayName = 'Field'
export default Field
