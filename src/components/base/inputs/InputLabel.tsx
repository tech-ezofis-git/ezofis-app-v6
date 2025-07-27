import Icon from '@/components/base/Icon'
import Tooltip from '@/components/base/Tooltip'

interface Props {
  label?: string
  optional?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
}

const InputLabel: React.FC<Props> = ({
  label,
  optional,
  required,
  tooltip,
  tooltipWidth,
}) => {
  return (
    <div className='flex items-center gap-1'>
      {label}
      {optional && <span className='text-sx text-gray-500'>(optional)</span>}
      {required && <span className='text-red'>*</span>}
      {tooltip && (
        <Tooltip content={tooltip} position='top-start' width={tooltipWidth}>
          <Icon className='-mt-0.5 text-gray-400' name='tabler:help' />
        </Tooltip>
      )}
    </div>
  )
}

InputLabel.displayName = 'InputLabel'
export default InputLabel
