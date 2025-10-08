import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'
import sidebarStore from '@/layouts/app/store/sidebarStore'

const SidebarToggle = () => {
  const openSidebar = sidebarStore((state) => state.openSidebar)

  return (
    <Tooltip
      content='Toggle sidebar'
      openDelay={TOOLTIP_DELAY}
      position='bottom-start'
    >
      <IconButton
        ariaLabel='toggle sidebar'
        color='gray'
        icon='tabler:menu-3'
        variant='ghost'
        onClick={openSidebar}
      />
    </Tooltip>
  )
}

SidebarToggle.displayName = 'SidebarToggle'
export default SidebarToggle
