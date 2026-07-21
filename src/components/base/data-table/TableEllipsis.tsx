import type { ReactNode } from 'react'
import cn from '@/utils/cn'

/** Cells that must not clip floating menus / controls. */
export function shouldAllowCellOverflow(
  columnId: string,
  disableEllipsis?: boolean,
) {
  if (disableEllipsis) return true

  const id = columnId.toLowerCase()
  return (
    id === 'actions' ||
    id === 'select' ||
    id === 'selection' ||
    id === '__select' ||
    id.endsWith('actions')
  )
}

export function shouldDisableTableEllipsis(
  columnId: string,
  disableEllipsis?: boolean,
) {
  if (disableEllipsis) return true

  const id = columnId.toLowerCase()
  return (
    id === 'actions' ||
    id === 'select' ||
    id === 'selection' ||
    id === '__select' ||
    id === '__name' ||
    id === 'name' ||
    id === 'avatar' ||
    id === 'role' ||
    id === 'status' ||
    id === 'icon' ||
    id === 'members' ||
    id === 'type' ||
    id === 'users' ||
    id.endsWith('actions') ||
    id.endsWith('status') ||
    id.endsWith('avatar') ||
    id.endsWith('role') ||
    id.endsWith('icon') ||
    id.endsWith('members') ||
    id.endsWith('type') ||
    id.endsWith('users')
  )
}

/**
 * Two-line ellipsis by default.
 * On hover, expands in place to show the full text (wraps within the column width).
 * No tooltip.
 */
export default function TableEllipsis({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  if (disabled) return <>{children}</>

  return (
    <div
      className={cn(
        'max-w-full min-w-0 [overflow-wrap:anywhere] break-words',
        'line-clamp-2 transition-all',
        'group-hover/dtcell:line-clamp-none hover:line-clamp-none',
        className,
      )}
    >
      {children}
    </div>
  )
}
