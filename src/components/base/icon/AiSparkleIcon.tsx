import AiBrandIcon from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'

interface Props {
  className?: string
  size?: number
}

/** Shared AiBrandIcon used for AI suggestion / Ask AI UI. */
const AiSparkleIcon = ({ className, size = 18 }: Props) => (
  <AiBrandIcon
    className={cn('shrink-0', className)}
    style={{ height: size, width: size }}
    variant='outline-purple'
  />
)

AiSparkleIcon.displayName = 'AiSparkleIcon'
export default AiSparkleIcon
