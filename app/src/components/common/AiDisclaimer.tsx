import { useLingui } from '@lingui/react/macro'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'

interface AiDisclaimerProps {
  className?: string
  /** Shorter wording for narrow spots (side panels, dropdown footers). */
  compact?: boolean
}

/**
 * Reminder shown wherever AI-generated results are displayed. Keep one
 * wording app-wide so it is translated once.
 */
const AiDisclaimer = ({ className, compact = false }: AiDisclaimerProps) => {
  const { t } = useLingui()

  return (
    <p
      role='note'
      className={cn(
        'flex min-w-0 items-start gap-1.5 text-left text-[11px] leading-4 text-gray-11',
        className,
      )}
    >
      <AiBrandIcon
        alt=''
        className='mt-px size-3 shrink-0'
        variant='outline-purple'
      />
      <span>
        {compact
          ? t`AI can make mistakes. Verify results.`
          : t`AI can make mistakes. Please check and verify the results.`}
      </span>
    </p>
  )
}

AiDisclaimer.displayName = 'AiDisclaimer'
export default AiDisclaimer
