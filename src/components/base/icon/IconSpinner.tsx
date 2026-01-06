import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  className?: string
}

const IconSpinner = ({ className }: Props) => {
  return (
    <Icon
      className={cn('size-12 animate-spin text-primary-11', className)}
      name='fa:spinner'
    />
  )
}

IconSpinner.displayName = 'IconSpinner'
export default IconSpinner
