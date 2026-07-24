import Icon from '@/components/base/icon/Icon'

interface Props {
  className?: string
  size?: number
}

/** Shared tabler:sparkles icon used for AI suggestion / Ask AI UI. */
const AiSparkleIcon = ({ className, size = 18 }: Props) => (
  <Icon
    className={className ?? 'shrink-0 text-[var(--primary-9)]'}
    name='tabler:sparkles'
    style={{ height: size, width: size }}
  />
)

AiSparkleIcon.displayName = 'AiSparkleIcon'
export default AiSparkleIcon
