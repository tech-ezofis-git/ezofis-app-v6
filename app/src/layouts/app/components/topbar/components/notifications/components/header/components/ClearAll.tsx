import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  onClick?: () => void
}

const ClearAll = ({ onClick }: Props) => {
  const { t } = useLingui()

  return (
    <Tooltip content={t`Clear all`} position='top'>
      <IconButton
        color='gray'
        icon='lucide:brush-cleaning'
        variant='ghost'
        onClick={onClick}
      />
    </Tooltip>
  )
}

ClearAll.displayName = 'ClearAll'
export default ClearAll
