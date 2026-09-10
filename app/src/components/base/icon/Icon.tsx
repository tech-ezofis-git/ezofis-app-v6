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
  ({ className, name, variant = 'outline-purple', ...props }, ref) => {
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

    if (
      name === 'brand:quickbooks' ||
      name === 'logos:quickbooks' ||
      name === 'simple-icons:quickbooks'
    ) {
      return (
        <svg
          className={cn('inline-block size-4 shrink-0', className)}
          fill='none'
          viewBox='0 0 24 24'
          xmlns='http://www.w3.org/2000/svg'
        >
          <rect fill='#2CA01C' height='24' rx='12' width='24' />
          <path
            d='M11.5 6.5C8.73858 6.5 6.5 8.73858 6.5 11.5C6.5 14.2614 8.73858 16.5 11.5 16.5H12.5V14.5H11.5C9.84315 14.5 8.5 13.1569 8.5 11.5C8.5 9.84315 9.84315 8.5 11.5 8.5H12.5V6.5H11.5ZM12.5 17.5C15.2614 17.5 17.5 15.2614 17.5 12.5C17.5 9.73858 15.2614 7.5 12.5 7.5H11.5V9.5H12.5C14.1569 9.5 15.5 10.8431 15.5 12.5C15.5 14.1569 14.1569 15.5 12.5 15.5H11.5V17.5H12.5Z'
            fill='white'
          />
        </svg>
      )
    }

    if (
      name === 'brand:sap' ||
      name === 'logos:sap' ||
      name === 'simple-icons:sap'
    ) {
      return (
        <svg
          className={cn('inline-block size-4 shrink-0', className)}
          fill='none'
          viewBox='0 0 24 24'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z'
            fill='#008FD3'
          />
          <path
            d='M6.5 15L8.2 9H9.8L11.5 15H10.1L9.7 13.5H8.3L7.9 15H6.5ZM8.6 12.3H9.4L9 10.7L8.6 12.3ZM12.2 15V9H14.5C15.5 9 16.2 9.6 16.2 10.5C16.2 11.2 15.7 11.7 14.9 11.9C15.8 12.1 16.4 12.7 16.4 13.6C16.4 14.5 15.6 15 14.5 15H12.2ZM13.5 11.4H14.3C14.8 11.4 15.1 11.1 15.1 10.6C15.1 10.1 14.8 9.9 14.3 9.9H13.5V11.4ZM13.5 14.1H14.4C15 14.1 15.3 13.8 15.3 13.3C15.3 12.8 15 12.5 14.4 12.5H13.5V14.1Z'
            fill='white'
          />
        </svg>
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
