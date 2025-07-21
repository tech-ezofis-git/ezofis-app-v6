import React from 'react'
import { Icon } from '@/components/base'
import { cn } from '@/utils'
import type { ButtonColor, ButtonSize, ButtonVariant } from './types'
import getStyles from './styles'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  className?: string
  color?: ButtonColor
  icon?: string
  iconClass?: string
  isDisabled?: boolean
  isLoading?: boolean
  size?: ButtonSize
  suffixIcon?: string
  suffixIconClass?: string
  variant?: ButtonVariant
}

const Button = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      color = 'primary',
      icon,
      iconClass,
      isDisabled,
      isLoading,
      label,
      size = 'sm',
      suffixIcon,
      suffixIconClass,
      variant = 'solid',
      ...props
    },
    ref,
  ) => {
    const styles = getStyles(variant, color)
    const sizeClasses = {
      md: 'h-10 px-4 text-sm',
      sm: 'h-9 px-3.5 text-sm',
      xs: 'h-8 px-2.5 text-xs',
    }

    return (
      <button
        className={cn(styles, sizeClasses[size], className)}
        data-loading={isLoading}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {isLoading && (
          <Icon className='-ml-0.5 animate-spin' name='gg:spinner' />
        )}
        {!isLoading && icon && (
          <Icon className={cn('-ml-0.5', iconClass)} name={icon} />
        )}
        <span>{label}</span>
        {suffixIcon && (
          <Icon className={cn('-mr-0.5', suffixIconClass)} name={suffixIcon} />
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
export default Button
