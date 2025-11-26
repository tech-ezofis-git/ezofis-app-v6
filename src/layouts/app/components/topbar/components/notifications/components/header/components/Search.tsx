import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

const Search = () => {
  return (
    <Tooltip content='Search' position='top'>
      <IconButton color='gray' icon='tabler:search' variant='ghost' />
    </Tooltip>
  )
}

Search.displayName = 'Search'
export default Search
