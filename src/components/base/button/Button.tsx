import { type ComponentProps, forwardRef, type ReactNode } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { ButtonColor, ButtonSize, ButtonVariant } from './types'
import { getVariantClassName } from './helpers'

interface Props extends ComponentProps<'button'> {
  children?: ReactNode
  className?: string
  color?: ButtonColor
  icon?: string
  iconClass?: string
  label?: string
  labelClass?: string
  loading?: boolean
  rightSection?: ReactNode
  size?: ButtonSize
  suffixIcon?: string
  suffixIconClass?: string
  variant?: ButtonVariant
}

const sizeClassName: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-xs',
  sm: 'h-7 px-2.5 text-sm',
  md: 'h-8 px-3 text-sm',
  lg: 'h-9 px-3.5 text-sm',
  xl: 'h-10 px-4 text-sm',
}

const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      className,
      color = 'primary',
      disabled,
      icon,
      iconClass,
      label,
      labelClass,
      loading,
      rightSection,
      size = 'lg',
      suffixIcon,
      suffixIconClass,
      variant = 'solid',
      ...props
    },
    ref,
  ) => {
    const variantClassName = getVariantClassName(variant, color)
    const _className = cn(variantClassName, sizeClassName[size], className)

    return (
      <button
        className={_className}
        data-loading={loading || undefined}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children ?? (
          <>
            {loading && (
              <Icon className='-ml-1 animate-spin' name='gg:spinner' />
            )}
            {!loading && icon && (
              <Icon className={cn('-ml-1', iconClass)} name={icon} />
            )}
            <span className={labelClass}>{label}</span>
            {suffixIcon && (
              <Icon
                className={cn('-mr-1', suffixIconClass)}
                name={suffixIcon}
              />
            )}
            {rightSection && <span className='-mr-1'>{rightSection}</span>}
          </>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
export default Button
