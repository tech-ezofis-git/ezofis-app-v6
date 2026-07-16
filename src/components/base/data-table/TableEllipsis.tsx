import type { ReactNode } from 'react'
import cn from '@/utils/cn'

/**
 * Single-line ellipsis by default.
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
        'min-w-0 max-w-full break-words [overflow-wrap:anywhere]',
        'line-clamp-1 transition-all',
        'hover:line-clamp-none group-hover/dtcell:line-clamp-none',
        className,
      )}
    >
      {children}
    </div>
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
    id.endsWith('actions')
  )
}

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
