import cn from '@/utils/cn'

interface Props {
  title: string
  className?: string
  description?: string
  descriptionClassName?: string
  level?: 1 | 2 | 3 | 4
  titleClassName?: string
}

const Title = ({
  className,
  description,
  descriptionClassName,
  level = 4,
  title,
  titleClassName,
}: Props) => {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <h1
        className={cn(
          'text-gray-13',
          level === 1 && 'text-20/7 font-semibold',
          level === 2 && 'text-18/6 font-semibold',
          level === 3 && 'text-15/5 font-semibold',
          level === 4 && 'text-13/4.5 font-medium',
          titleClassName,
        )}
      >
        {title}
      </h1>
      {description && (
        <p
          className={cn(
            'text-13/5 text-pretty text-gray-11',
            level === 4 && 'text-12/4.5',
            descriptionClassName,
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}

Title.displayName = 'Title'
export default Title
