import React from 'react'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'
import type { ButtonColor, ButtonSize, ButtonVariant } from './types'
import { getVariantClassName } from './helpers'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  ariaLabel?: string
  className?: string
  color?: ButtonColor
  disabled?: boolean
  iconClass?: string
  loading?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

const sizeClassName: Record<ButtonSize, string> = {
  md: 'size-10',
  sm: 'size-9',
  xs: 'size-8',
}

const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      ariaLabel,
      className,
      color = 'primary',
      disabled,
      icon,
      iconClass,
      loading,
      size = 'sm',
      variant = 'solid',
      ...props
    },
    ref,
  ) => {
    const variantClassName = getVariantClassName(variant, color)
    const computedClassName = cn(
      variantClassName,
      sizeClassName[size],
      'justify-center',
      className,
    )

    return (
      <button
        aria-label={ariaLabel}
        className={computedClassName}
        data-loading={loading || undefined}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        <Icon
          className={loading ? 'animate-spin' : iconClass}
          name={loading ? 'gg:spinner' : icon}
        />
      </button>
    )
  },
)

IconButton.displayName = 'IconButton'
export default IconButton
