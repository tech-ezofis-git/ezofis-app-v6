import { type ComponentProps, forwardRef, type ReactNode } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { ButtonColor, ButtonSize, ButtonVariant } from './types'
import { getVariantClassName } from './helpers'

interface Props extends ComponentProps<'button'> {
  ariaLabel?: string
  children?: ReactNode
  className?: string
  color?: ButtonColor
  disabled?: boolean
  icon?: string
  iconClass?: string
  loading?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

const sizeClassName: Record<ButtonSize, string> = {
  xs: 'size-6',
  sm: 'size-7',
  md: 'size-8',
  lg: 'size-9',
  xl: 'size-10',
}

const IconButton = forwardRef<HTMLButtonElement, Props>(
  (
    {
      ariaLabel,
      children,
      className,
      color = 'primary',
      disabled,
      icon,
      iconClass,
      loading,
      size = 'lg',
      variant = 'solid',
      ...props
    },
    ref,
  ) => {
    const variantClassName = getVariantClassName(variant, color)
    const _className = cn(
      variantClassName,
      sizeClassName[size],
      'justify-center',
      className,
    )

    return (
      <button
        aria-label={ariaLabel}
        className={_className}
        data-loading={loading || undefined}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children}
        {icon && (
          <Icon
            className={loading ? 'animate-spin' : iconClass}
            name={loading ? 'gg:spinner' : icon}
          />
        )}
      </button>
    )
  },
)

IconButton.displayName = 'IconButton'
export default IconButton
