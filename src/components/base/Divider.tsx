import { Divider as Base } from '@mantine/core'

interface Props {
  className?: string
  label?: string
  labelPosition?: 'left' | 'right' | 'center'
  orientation?: 'horizontal' | 'vertical'
}

const classNames = {
  label: 'text-gray-500 before:border-gray-600/10 after:border-gray-600/10',
  root: 'border-gray-600/10',
}

const Divider: React.FC<Props> = ({
  className,
  label,
  labelPosition,
  orientation,
}) => {
  return (
    <Base
      className={className}
      classNames={classNames}
      label={label}
      labelPosition={labelPosition}
      orientation={orientation}
    />
  )
}

Divider.displayName = 'Divider'
export default Divider
