import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import cn from '@/utils/cn'

interface Props {
  description: string
  icon: string
  title: string
  className?: string
  primaryActionLabel?: string
  secondaryActionLabel?: string
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
}

const EmptyState = ({
  className,
  description,
  icon,
  primaryActionLabel,
  secondaryActionLabel,
  title,
  onPrimaryAction,
  onSecondaryAction,
}: Props) => {
  return (
    <div className={cn('max-w-xl', className)}>
      <IconIllustrated icon={icon} />

      <div className='mt-4 space-y-1 text-center'>
        <h1 className='font-poppins text-xl font-semibold text-gray-13'>
          {title}
        </h1>
        <p className='text-sm leading-6 text-pretty text-gray-11'>
          {description}
        </p>
      </div>

      <div className='mt-6 flex justify-center gap-3'>
        {secondaryActionLabel && (
          <Button
            color='gray'
            label={secondaryActionLabel}
            variant='outline'
            onClick={onSecondaryAction}
          />
        )}

        {primaryActionLabel && (
          <Button label={primaryActionLabel} onClick={onPrimaryAction} />
        )}
      </div>
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
export default EmptyState
