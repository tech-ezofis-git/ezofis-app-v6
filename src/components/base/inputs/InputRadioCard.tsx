import type { ReactNode } from 'react'
import { Radio as Base } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

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
  onClick,
}: Props) => {
  return (
    <Base.Card
      checked={checked}
      disabled={disabled}
      radius='md'
      value={value}
      className={cn(
        'rounded-md border-gray-6 p-3 outline-primary-8 disabled:pointer-events-none data-[checked]:border-primary-9',
        className,
      )}
      onClick={onClick}
    >
      {children ? (
        children
      ) : (
        <div className='flex gap-3'>
          {icon && (
            <div className='flex size-11 items-center justify-center rounded-full bg-gray-3 text-gray-11'>
              <Icon className='size-5' name={icon} />
            </div>
          )}

          {!disabled && (
            <div
              className={cn(
                'flex size-5 items-center justify-center self-start',
                icon && 'order-last',
              )}
            >
              <Base.Indicator
                className='size-4 min-h-4 min-w-4 border-gray-8 bg-transparent transition-colors data-[checked]:border-primary-9 data-[checked]:bg-primary-9'
                classNames={{
                  icon: cn(
                    'size-1.5',
                    checked ? 'text-white' : 'text-transparent',
                  ),
                }}
              />
            </div>
          )}

          <div className='flex-1 space-y-1 text-sm'>
            {labelSlot}
            {label && <div className='font-medium text-gray-13'>{label}</div>}
            {description && (
              <div className='text-pretty text-gray-10'>{description}</div>
            )}
          </div>
        </div>
      )}
    </Base.Card>
  )
}

InputRadioCard.displayName = 'InputRadioCard'
export default InputRadioCard
