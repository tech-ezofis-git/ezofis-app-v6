import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

const MarkAll = () => {
  return (
    <Tooltip content='Mark all as read' position='top'>
      <IconButton color='gray' icon='lucide:check-check' variant='ghost' />
    </Tooltip>
  )
}

MarkAll.displayName = 'MarkAll'
export default MarkAll
