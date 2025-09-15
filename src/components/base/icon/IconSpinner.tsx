import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  className?: string
}

const IconSpinner = ({ className }: Props) => {
  return (
    <Icon
      className={cn('size-12 text-primary-11', className)}
      name='svg-spinners:6-dots-scale'
    />
  )
}

IconSpinner.displayName = 'IconSpinner'
export default IconSpinner
