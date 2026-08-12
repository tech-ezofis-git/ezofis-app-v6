import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  isReloading: boolean
  className?: string
  onReload: () => void
}

const TableReload = ({ className, isReloading, onReload }: Props) => {
  return (
    <Tooltip content='Refresh' position='top'>
      <IconButton
        className={className}
        color='gray'
        icon='lucide:rotate-cw'
        loading={isReloading}
        variant='outline'
        onClick={onReload}
      />
    </Tooltip>
  )
}

TableReload.displayName = 'TableReload'
export default TableReload
