import { Divider as Primitive } from '@mantine/core'

interface Props {
  className?: string
  label?: string
  labelPosition?: 'left' | 'right' | 'center'
  orientation?: 'horizontal' | 'vertical'
}

const Divider: React.FC<Props> = ({
  className,
  label,
  labelPosition,
  orientation,
}) => {
  return (
    <Primitive
      className={className}
      label={label}
      labelPosition={labelPosition}
      orientation={orientation}
      classNames={{
        label:
          'text-gray-500 before:border-gray-600/10 after:border-gray-600/10',
        root: 'border-gray-600/10',
      }}
    />
  )
}

Divider.displayName = 'Divider'
export default Divider
