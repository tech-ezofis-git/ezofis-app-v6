import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import cn from '@/utils/cn'
import Title from './Title'

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

      <Title
        className='mt-6 text-center'
        description={description}
        level={3}
        title={title}
      />

      {(primaryActionLabel || secondaryActionLabel) && (
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
      )}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
export default EmptyState
