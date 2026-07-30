import { Icon as Base } from '@iconify/react'
import { forwardRef, type SVGProps } from 'react'
import AiBrandIcon, { type AiBrandIconVariant } from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'

interface Props extends SVGProps<SVGSVGElement> {
  name: string
  className?: string
  title?: string
  variant?: AiBrandIconVariant
}

const Icon = forwardRef<SVGSVGElement, Props>(
  ({ className, name, variant = 'curved-purple', ...props }, ref) => {
    if (!name || typeof name !== 'string') return null

    if (
      name === 'aibrand' ||
      name === 'ai-brand' ||
      name === 'ezofis:ai' ||
      name === 'tabler:sparkles' ||
      name === 'lucide:sparkles'
    ) {
      return (
        <AiBrandIcon
          alt={props.title ?? 'AI Brand'}
          className={cn('inline-block size-4 shrink-0', className)}
          variant={variant}
        />
      )
    }

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
