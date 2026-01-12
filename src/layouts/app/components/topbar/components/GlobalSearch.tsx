import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

const GlobalSearch = () => {
  return (
    <Tooltip content='Search' openDelay={500}>
      <IconButton
        ariaLabel='search'
        color='gray'
        icon='lucide:search'
        variant='ghost'
      />
    </Tooltip>
  )
}

GlobalSearch.displayName = 'GlobalSearch'
export default GlobalSearch