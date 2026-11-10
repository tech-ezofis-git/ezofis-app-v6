import { type ReactNode, useId } from 'react'
import cn from '@/utils/cn'
import InputLabel from './InputLabel'
import { classNames } from './shared/constants'

interface Props {
  /** The control for this setting, e.g. an input or a select without its own label. */
  children: ReactNode
  label: string
  className?: string
  /** Replaces the help sentence while it is set. */
  error?: string
  /** One short, plain sentence that explains the setting. */
  help?: string
  optional?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
}

/**
 * One setting in a settings panel: the label, the control, then a short help sentence.
 * It uses the same label and help styles as the other inputs in `components/base/inputs`,
 * so every setting looks the same, whatever control it holds.
 */
const SettingRow = ({
  children,
  className,
  error,
  help,
  label,
  optional,
  required,
  tooltip,
  tooltipWidth,
}: Props) => {
  const id = useId()
  const labelId = `${id}-label`
  const noteId = `${id}-note`
  const note = error || help

  return (
    <div
      aria-describedby={note ? noteId : undefined}
      aria-labelledby={labelId}
      className={cn('w-full', className)}
      role='group'
    >
      <div id={labelId}>
        <InputLabel
          className={classNames.label}
          label={label}
          optional={optional}
          required={required}
          tooltip={tooltip}
          tooltipWidth={tooltipWidth}
        />
      </div>
      {children}
      {note ? (
        <p
          className={cn(error ? classNames.error : classNames.description)}
          id={noteId}
        >
          {note}
        </p>
      ) : null}
    </div>
  )
}

SettingRow.displayName = 'SettingRow'
export default SettingRow
