import { type HTMLMotionProps, motion } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { ButtonColor, ButtonSize, ButtonVariant } from './types'
import { getVariantClassName } from './helpers'

interface Props extends HTMLMotionProps<'button'> {
  children?: ReactNode
  className?: string
  color?: ButtonColor
  icon?: string
  iconClass?: string
  label?: string
  labelClass?: string
  leftSection?: ReactNode
  loading?: boolean
  rightSection?: ReactNode
  size?: ButtonSize
  suffixIcon?: string
  suffixIconClass?: string
  variant?: ButtonVariant
}

const sizeClassName: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-12',
  sm: 'h-7 px-2.5 text-13',
  md: 'h-8 px-3 text-13',
  lg: 'h-9 px-3.5 text-13',
  xl: 'h-10 px-4 text-15',
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
      leftSection,
      loading,
      rightSection,
      size = 'md',
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
      <motion.button
        className={_className}
        data-loading={loading || undefined}
        disabled={disabled}
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {children ?? (
          <>
            {loading || iconClass?.includes('animate-spin') ? (
              <Icon
                className={cn('-ml-1 animate-spin', iconClass)}
                name={
                  icon &&
                  (icon.includes('refresh') ||
                    icon.includes('rotate') ||
                    icon.includes('sync'))
                    ? icon
                    : 'fa:spinner'
                }
              />
            ) : leftSection ? (
              <span className='-ml-1 inline-flex items-center'>
                {leftSection}
              </span>
            ) : icon ? (
              <Icon className={cn('-ml-1', iconClass)} name={icon} />
            ) : null}
            {label && <span className={labelClass}>{label}</span>}
            {suffixIcon && (
              <Icon
                className={cn('-mr-1', suffixIconClass)}
                name={suffixIcon}
              />
            )}
            {rightSection && <span className='-mr-1'>{rightSection}</span>}
          </>
        )}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'
export default Button
