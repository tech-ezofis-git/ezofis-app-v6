import type { TooltipProps } from '@mantine/core'
import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import useSidebarStore from '@/layouts/app/stores/useSidebarStore'

interface Props {
  tooltipPosition?: TooltipProps['position']
}

const SidebarToggle = ({ tooltipPosition = 'bottom-start' }: Props) => {
  const { t } = useLingui()
  const openSidebar = useSidebarStore((state) => state.openSidebar)

  return (
    <Tooltip
      content={t`Toggle sidebar`}
      openDelay={500}
      position={tooltipPosition}
    >
      <IconButton
        ariaLabel={t`Toggle sidebar`}
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
