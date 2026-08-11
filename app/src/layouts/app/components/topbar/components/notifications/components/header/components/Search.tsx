import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

const Search = () => {
  const { t } = useLingui()

  return (
    <Tooltip content={t`Search`} position='top'>
      <IconButton color='gray' icon='lucide:search' variant='ghost' />
    </Tooltip>
  )
}

Search.displayName = 'Search'
export default Search
