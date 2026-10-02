// Field.tsx
import Icon from '@/components/base/icon/Icon'

type FieldPaletteItem = {
  icon?: string
  label: string
  type: string
}

interface Props extends FieldPaletteItem {
  draggable?: boolean
}

const Field = ({ draggable, icon, label, type }: Props) => {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const payload = { icon, label, type }
    e.dataTransfer.setData('application/x-form-field', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      className='group flex cursor-grab items-center gap-3 rounded-lg border border-gray-2 bg-surface p-2.5 transition-all hover:border-accent-primary hover:shadow-sm active:cursor-grabbing'
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {icon && (
        <Icon
          className='text-accent-primary opacity-80 group-hover:opacity-100'
          name={icon}
        />
      )}
      <span className='text-13 font-medium text-gray-13'>{label}</span>
    </div>
  )
}

export default Field
