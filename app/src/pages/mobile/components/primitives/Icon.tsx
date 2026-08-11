import { type LucideIcon, icons } from 'lucide-react'
import type { ComponentProps } from 'react'
import cn from '@/utils/cn'

type IconName = keyof typeof icons

type IconProps = {
  name: IconName
  className?: string
} & Omit<ComponentProps<'svg'>, 'name' | 'ref'>

export function Icon({ name, className, ...rest }: IconProps) {
  const Lucide = icons[name] as LucideIcon | undefined
  if (!Lucide) return null

  return (
    <Lucide
      aria-hidden
      className={cn('size-5 shrink-0', className)}
      strokeWidth={1.75}
      {...rest}
    />
  )
}
