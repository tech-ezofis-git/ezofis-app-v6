import React from 'react'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'
import type { ButtonColor, ButtonSize, ButtonVariant } from './types'
import { getVariantClassName } from './helpers'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  className?: string
  color?: ButtonColor
  disabled?: boolean
  icon?: string
  iconClass?: string
  loading?: boolean
  size?: ButtonSize
  suffixIcon?: string
  suffixIconClass?: string
  variant?: ButtonVariant
}

const sizeClassName: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-9 px-3.5 text-sm',
  xs: 'h-8 px-2.5 text-xs',
}

const Button = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      color = 'primary',
      disabled,
      icon,
      iconClass,
      label,
      loading,
      size = 'sm',
      suffixIcon,
      suffixIconClass,
      variant = 'solid',
      ...props
    },
    ref,
  ) => {
    const variantClassName = getVariantClassName(variant, color)
    const computedClassName = cn(
      variantClassName,
      sizeClassName[size],
      className,
    )

    return (
      <button
        className={computedClassName}
        data-loading={loading || undefined}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {loading && <Icon className='-ml-0.5 animate-spin' name='gg:spinner' />}
        {!loading && icon && (
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
