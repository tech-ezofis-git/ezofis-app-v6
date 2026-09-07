import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  query: string
  onChange: (query: string) => void
}

const Search = ({ query, onChange }: Props) => {
  const { t } = useLingui()
  const [isExpanded, setIsExpanded] = useState(false)

  if (isExpanded) {
    return (
      <InputText
        className='flex-1'
        placeholder={t`Search notifications`}
        value={query}
        autoFocus
        clearable
        leftSection={
          <Icon className='h-4 w-4 text-gray-9' name='lucide:search' />
        }
        onBlur={() => {
          if (!query) setIsExpanded(false)
        }}
        onChange={onChange}
      />
    )
  }

  return (
    <Tooltip content={t`Search`} position='top'>
      <IconButton
        color='gray'
        icon='lucide:search'
        variant='ghost'
        onClick={() => setIsExpanded(true)}
      />
    </Tooltip>
  )
}

Search.displayName = 'Search'
export default Search
