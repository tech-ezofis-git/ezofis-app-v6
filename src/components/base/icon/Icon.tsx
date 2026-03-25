import { Icon as Base } from '@iconify/react'
import { forwardRef, type SVGProps } from 'react'
import cn from '@/utils/cn'

interface Props extends SVGProps<SVGSVGElement> {
  name: string
  className?: string
  title?: string
}

const Icon = forwardRef<SVGSVGElement, Props>(
  ({ className, name, ...props }, ref) => {
    if (!name || typeof name !== 'string') return null

    return (
      <Base
        className={cn('inline-block size-4 shrink-0 text-inherit', className)}
        icon={name}
        ref={ref}
        {...(props as any)}
      />
    )
  },
)

Icon.displayName = 'Icon'
export default Icon
