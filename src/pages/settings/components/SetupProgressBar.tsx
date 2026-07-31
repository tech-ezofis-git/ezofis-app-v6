import cn from '@/utils/cn'
import { getSetupProgressStyle } from '../helpers/settingsSetupProgress'

type SetupProgressBarProps = {
  progress: number
}

export default function SetupProgressBar({ progress }: SetupProgressBarProps) {
  const { barClassName, textClassName } = getSetupProgressStyle(progress)

  return (
    <div className='flex flex-col items-end gap-1'>
      <span
        className={cn(
          'text-13/5 font-semibold transition-colors duration-500',
          textClassName,
        )}
      >
        {progress}% Complete
      </span>
      <div className='h-1.5 w-32 overflow-hidden rounded-full bg-gray-3'>
        <div
          className={cn('h-full transition-all duration-500', barClassName)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
