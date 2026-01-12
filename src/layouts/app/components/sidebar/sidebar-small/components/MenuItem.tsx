import { Link, useLocation } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

interface Props extends Menu {
  iconClassName?: string
}

const MenuItem = ({ icon, iconClassName, label, route }: Props) => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const isActive = pathname === route

  return (
    <li key={label}>
      <Tooltip content={label} openDelay={500} position='right'>
        <Link
          to={route}
          className={cn(
            'group flex size-8 items-center justify-center rounded outline-0 transition-colors hover:bg-gray-4 focus-visible:bg-gray-4',
            isActive && 'bg-gray-4',
          )}
        >
          <Icon
            name={icon}
            className={cn(
              'transition-colors',
              isActive
                ? 'text-primary-11'
                : 'text-gray-11 group-hover:text-gray-12',
              iconClassName,
            )}
          />
        </Link>
      </Tooltip>
    </li>
  )
}

MenuItem.displayName = 'MenuItem'
export default MenuItem
