// Field.tsx
import Icon from '@/components/base/icon/Icon'

type FieldPaletteItem = {
  type: string
  label: string
  icon?: string
}

interface Props extends FieldPaletteItem {
  draggable?: boolean
}

const Field = ({ type, label, icon, draggable }: Props) => {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const payload = { type, label, icon }
    e.dataTransfer.setData('application/x-form-field', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className='flex cursor-grab items-center gap-3 rounded-lg border border-gray-2 bg-white p-2.5 active:cursor-grabbing hover:border-accent-primary hover:shadow-sm transition-all group'
    >
      {icon && <Icon name={icon} className="text-gray-7 group-hover:text-accent-primary" />}
      <span className='text-13 font-medium text-gray-13'>{label}</span>
    </div>
  )
}

export default Field
