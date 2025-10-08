import { Divider as Base } from '@mantine/core'

interface Props {
  className?: string
  label?: string
  labelPosition?: 'left' | 'right' | 'center'
  orientation?: 'horizontal' | 'vertical'
}

const classNames = {
  label: 'text-gray-11 before:border-gray-3 after:border-gray-3',
  root: 'border-gray-3',
}

const Divider = ({ className, label, labelPosition, orientation }: Props) => {
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
