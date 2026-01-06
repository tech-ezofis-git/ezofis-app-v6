import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import useSidebarStore from '@/layouts/app/stores/useSidebarStore'

const SidebarToggle = () => {
  const openSidebar = useSidebarStore((state) => state.openSidebar)

  return (
    <Tooltip content='Toggle sidebar' openDelay={500} position='bottom-start'>
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
