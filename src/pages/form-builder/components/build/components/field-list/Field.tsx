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
      className='flex cursor-grab items-center gap-2 rounded border border-gray-3 bg-surface p-2 active:cursor-grabbing'
    >
      {icon && <Icon name={icon} />}
      <span className='text-13 text-gray-11'>{label}</span>
    </div>
  )
}

export default Field
