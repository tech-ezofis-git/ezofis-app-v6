import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  onClick?: () => void
}

const MarkAll = ({ onClick }: Props) => {
  const { t } = useLingui()

  return (
    <Tooltip content={t`Mark all as read`} position='top'>
      <IconButton color='gray' icon='lucide:check-check' variant='ghost' onClick={onClick} />
    </Tooltip>
  )
}

MarkAll.displayName = 'MarkAll'
export default MarkAll
