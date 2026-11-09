import cn from '@/utils/cn'
import InputSwitch from './InputSwitch'

interface Props {
  title: string
  /** A setting that was never saved is off. */
  checked?: boolean
  className?: string
  disabled?: boolean
  /** Replaces the help sentence while it is set. */
  error?: string
  /** One short, plain sentence that explains what the switch does. */
  help?: string
  /** Not needed for a switch that is always disabled. */
  onChange?: (checked: boolean) => void
}

/**
 * An on/off setting in a settings panel: a bordered row with a title and a short sentence
 * on the left and the switch on the right. The whole row is clickable.
 */
const SettingSwitchRow = ({
  checked = false,
  className,
  disabled,
  error,
  help,
  title,
  onChange,
}: Props) => {
  const note = error || help

  return (
    <label
      className={cn(
        'animate-in fade-in flex w-full items-center justify-between gap-3 rounded-lg border bg-surface px-3 py-2.5 shadow-xs transition-all duration-200',
        error ? 'border-red-8' : 'border-gray-3',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:border-primary-5 active:scale-[0.995]',
        className,
      )}
    >
      <span className='min-w-0'>
        <span className='block text-13 font-semibold text-gray-12'>
          {title}
        </span>
        {note ? (
          <span
            className={cn(
              'mt-0.5 block text-12',
              error ? 'text-red-11' : 'text-gray-10',
            )}
          >
            {note}
          </span>
        ) : null}
      </span>
      <InputSwitch checked={checked} disabled={disabled} onChange={onChange} />
    </label>
  )
}

SettingSwitchRow.displayName = 'SettingSwitchRow'
export default SettingSwitchRow
