import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'

const GlobalSearch = () => {
  return (
    <Tooltip content='Search' openDelay={TOOLTIP_DELAY}>
      <IconButton
        ariaLabel='search'
        color='gray'
        icon='tabler:search'
        variant='ghost'
      />
    </Tooltip>
  )
}

GlobalSearch.displayName = 'GlobalSearch'
export default GlobalSearch