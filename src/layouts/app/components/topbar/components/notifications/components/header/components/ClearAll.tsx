import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

const ClearAll = () => {
  return (
    <Tooltip content='Clear all' position='top'>
      <IconButton color='gray' icon='lucide:brush-cleaning' variant='ghost' />
    </Tooltip>
  )
}

ClearAll.displayName = 'ClearAll'
export default ClearAll
