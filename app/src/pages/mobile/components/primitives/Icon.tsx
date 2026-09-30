import type { ComponentProps } from 'react'
import { icons, type LucideIcon } from 'lucide-react'
import cn from '@/utils/cn'

type IconName = keyof typeof icons

type IconProps = {
  className?: string
  name: IconName
} & Omit<ComponentProps<'svg'>, 'name' | 'ref'>

export function Icon({ className, name, ...rest }: IconProps) {
  const Lucide = icons[name] as LucideIcon | undefined
  if (!Lucide) return null

  return (
    <Lucide
      className={cn('size-5 shrink-0', className)}
      strokeWidth={1.75}
      aria-hidden
      {...rest}
    />
  )
}
