import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
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
    id === 'avatar' ||
    id === 'icon' ||
    id === 'members' ||
    id === 'users' ||
    id === 'status' ||
    id === 'flowstatus' ||
    id === 'type' ||
    id.endsWith('actions') ||
    id.endsWith('avatar') ||
    id.endsWith('icon') ||
    id.endsWith('members') ||
    id.endsWith('users') ||
    id.endsWith('status') ||
    id.endsWith('type')
  )
}

/**
 * Single-line ellipsis constrained to the column width.
 * When text overflows, hover expands the full text below with no extra styling.
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
  const ref = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return

    const truncated =
      el.scrollWidth > el.clientWidth + 1 ||
      el.scrollHeight > el.clientHeight + 1
    setIsTruncated(truncated)
  }, [])

  useLayoutEffect(() => {
    if (isHovered) return

    measure()

    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    return () => observer.disconnect()
  }, [children, isHovered, measure])

  if (disabled) return <>{children}</>

  return (
    <div
      ref={ref}
      className={cn(
        'block max-w-full min-w-0',
        isTruncated && isHovered
          ? 'relative z-20 whitespace-normal break-words'
          : 'overflow-hidden text-ellipsis whitespace-nowrap',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  )
}
