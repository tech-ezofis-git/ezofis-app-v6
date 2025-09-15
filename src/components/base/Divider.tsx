import { Divider as Base } from '@mantine/core'

interface Props {
  className?: string
  label?: string
  labelPosition?: 'left' | 'right' | 'center'
  orientation?: 'horizontal' | 'vertical'
}

const classNames = {
  label: 'text-gray-11 before:border-gray-4 after:border-gray-4',
  root: 'border-gray-4',
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
