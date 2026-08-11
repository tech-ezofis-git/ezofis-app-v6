import Icon from '@/components/base/icon/Icon'

interface Props {
  reveal: boolean
}

const VisibilityToggleIcon = ({ reveal }: Props) => {
  return (
    <Icon
      className='text-gray-11 group-hover:text-gray-12'
      name={reveal ? 'lucide:eye-off' : 'lucide:eye'}
    />
  )
}

VisibilityToggleIcon.displayName = 'VisibilityToggleIcon'
export default VisibilityToggleIcon
