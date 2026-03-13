import type { ReactNode } from 'react'
import { Radio as Base } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import InputRadioIndicator from './InputRadioIndicator'

interface Props {
  checked?: boolean
  children?: ReactNode
  className?: string
  description?: string
  disabled?: boolean
  icon?: string
  label?: string
  labelSlot?: ReactNode
  value?: string
  size?: 'sm' | 'md'
  onClick?: () => void
}

const InputRadioCard = ({
  checked,
  children,
  className,
  description,
  disabled,
  icon,
  label,
  labelSlot,
  value,
  size = 'md',
  onClick,
}: Props) => {
  const isSmall = size === 'sm'

  return (
    <Base.Card
      checked={checked}
      disabled={disabled}
      radius='md'
      value={value}
      className={cn(
        'border-slate-100 rounded p-4 shadow-sm outline-primary-8 disabled:pointer-events-none data-checked:border-primary-9',
        className,
      )}
      onClick={onClick}
    >
      {children ? (
        children
      ) : (
        <div className={cn('flex gap-3', isSmall && 'gap-2.5')}>
          {icon && (
            <div className={cn(
              'flex items-center justify-center rounded-xl bg-gray-1 border border-gray-2 text-gray-11 transition-all group-hover:border-accent-soft group-hover:text-accent-primary',
              isSmall ? 'size-8' : 'size-10'
            )}>
              <Icon className={cn(isSmall ? 'size-4' : 'size-5')} name={icon} />
            </div>
          )}

          {!disabled && (
            <div
              className={cn(
                'flex size-5 items-center justify-center self-start',
                icon && 'order-last',
                isSmall && 'size-4'
              )}
            >
              <InputRadioIndicator checked={checked} />
            </div>
          )}

          <div className='flex-1 space-y-1 text-13'>
            {labelSlot}
            {label && (
              <div
                className={cn(
                  'font-medium tracking-tight',
                  isSmall ? 'text-12' : 'text-13',
                  description ? 'text-gray-13' : 'text-gray-12',
                )}
              >
                {label}
              </div>
            )}
            {description && (
              <div className={cn('text-pretty text-gray-10', isSmall ? 'text-11 leading-tight' : 'text-13/6')}>
                {description}
              </div>
            )}
          </div>
        </div>
      )}
    </Base.Card>
  )
}

InputRadioCard.displayName = 'InputRadioCard'
export default InputRadioCard
