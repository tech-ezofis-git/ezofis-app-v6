import { useLingui } from '@lingui/react/macro'
import cn from '@/utils/cn'
import { getSetupProgressStyle } from '../helpers/settingsSetupProgress'

type SetupProgressBarProps = {
  progress: number
}

export default function SetupProgressBar({ progress }: SetupProgressBarProps) {
  const { t } = useLingui()
  const { barClassName, textClassName } = getSetupProgressStyle(progress)

  return (
    <div className='w-44'>
      <div
        className={cn(
          'mb-2 text-right text-[12px] font-semibold transition-colors duration-300',
          textClassName,
        )}
      >
        {t`${progress}% Complete`}
      </div>
      <div className='h-1.5 overflow-hidden rounded-full bg-[var(--gray-3)]'>
        <div
          style={{ width: `${progress}%` }}
          className={cn(
            'h-full rounded-full transition-all duration-300',
            barClassName,
          )}
        />
      </div>
    </div>
  )
}
