import type { HTMLAttributes } from 'react'
import cn from '@/utils/cn'

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClass = {
  sm: 'size-8 text-11',
  md: 'size-11 text-14',
  lg: 'size-14 text-16',
}

export function Avatar({
  className,
  label = 'U',
  size = 'md',
  ...rest
}: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-primary',
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  )
}
