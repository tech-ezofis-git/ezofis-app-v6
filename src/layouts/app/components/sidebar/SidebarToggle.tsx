import type { TooltipProps } from '@mantine/core'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import useSidebarStore from '@/layouts/app/stores/useSidebarStore'

interface Props {
  tooltipPosition?: TooltipProps['position']
}

const SidebarToggle = ({ tooltipPosition = 'bottom-start' }: Props) => {
  const openSidebar = useSidebarStore((state) => state.openSidebar)

  return (
    <Tooltip
      content='Toggle sidebar'
      openDelay={500}
      position={tooltipPosition}
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
