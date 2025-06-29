import React from 'react'
import { Icon } from '@/components/base'
import { cn } from '@/utils'
import type { ButtonColor, ButtonSize, ButtonVariant } from './types'
import getStyles from './styles'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  ariaLabel?: string
  className?: string
  color?: ButtonColor
  iconClass?: string
  isDisabled?: boolean
  isLoading?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      ariaLabel,
      className,
      color = 'primary',
      icon,
      iconClass,
      isDisabled,
      isLoading,
      size = 'sm',
      variant = 'solid',
      ...props
    },
    ref,
  ) => {
    const styles = getStyles(variant, color)
    const sizeClasses = {
      lg: 'size-11',
      md: 'size-10',
      sm: 'size-9',
      xl: 'size-10',
      xs: 'size-8',
    }

    return (
      <button
        aria-label={ariaLabel}
        className={cn(styles, sizeClasses[size], 'justify-center', className)}
        data-loading={isLoading}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <Icon className='animate-spin' name='gg:spinner' />
        ) : (
          <Icon className={iconClass} name={icon} />
        )}
      </button>
    )
  },
)

export default IconButton
