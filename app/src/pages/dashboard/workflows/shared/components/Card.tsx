import type { ReactNode } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  title: string
  bodyClassName?: string
  headerClassName?: string
  icon?: string
  suffixIcon?: string
}

const Card = ({
  bodyClassName,
  children,
  headerClassName,
  icon,
  suffixIcon,
  title,
}: Props) => {
  return (
    <div className='rounded-xl border border-gray-3 bg-surface-muted'>
      <div className={cn('flex h-10 items-center gap-3 px-4', headerClassName)}>
        {!!icon && <Icon name={icon} />}
        <div className='text-13 font-medium text-gray-12'>{title}</div>
        <div className='flex-1'></div>
        {!!suffixIcon && <Icon name={suffixIcon} />}
      </div>

      <div
        className={cn(
          'rounded-xl border-t border-gray-3 bg-surface px-5 py-4',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}

Card.displayName = 'Card'
export default Card
