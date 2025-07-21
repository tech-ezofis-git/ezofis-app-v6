import { Icon } from '@/components/base'

interface Props {
  reveal: boolean
}

const VisibilityToggleIcon: React.FC<Props> = ({ reveal }) => {
  return (
    <Icon
      className='text-gray-500'
      name={reveal ? 'tabler:eye-off' : 'tabler:eye'}
    />
  )
}

VisibilityToggleIcon.displayName = 'VisibilityToggleIcon'
export default VisibilityToggleIcon
