import { Icon as Base } from '@iconify/react'
import React from 'react'
import cn from '@/utils/cn'

interface Props extends React.SVGProps<SVGSVGElement> {
  name: string
  className?: string
}

const Icon = React.forwardRef<SVGSVGElement, Props>(
  ({ className, name }, ref) => {
    return (
      <Base
        className={cn('inline-block size-4.5 shrink-0 text-inherit', className)}
        icon={name}
        ref={ref}
      />
    )
  },
)

Icon.displayName = 'Icon'
export default Icon
