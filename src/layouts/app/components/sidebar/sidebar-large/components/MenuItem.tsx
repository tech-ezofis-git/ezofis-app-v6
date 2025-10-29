import { Link, useLocation } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props extends Menu {
  iconClassName?: string
  onClick: () => void
}

const MenuItem = ({
  activeIcon,
  icon,
  iconClassName,
  label,
  route,
  onClick,
}: Props) => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const isActive = pathname === route

  return (
    <li key={label} onClick={onClick}>
      <Link
        to={route}
        className={cn(
          'flex h-8 items-center gap-2 rounded px-2 font-medium text-gray-12 transition-colors hover:bg-gray-4 hover:text-gray-13 focus-visible:bg-gray-4 focus-visible:outline-0',
          isActive && 'bg-gray-4',
        )}
      >
        <Icon
          name={isActive ? activeIcon : icon}
          className={cn(
            'transition-colors',
            isActive
              ? 'text-primary-11'
              : 'text-gray-11 group-hover:text-gray-12',
            iconClassName,
          )}
        />

        <div>{label}</div>
      </Link>
    </li>
  )
}

MenuItem.displayName = 'MenuItem'
export default MenuItem
