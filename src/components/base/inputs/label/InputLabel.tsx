import { Icon, Tooltip } from '@/components/base'

interface Props {
  isOptional?: boolean
  isRequired?: boolean
  label?: string
  tooltip?: string
  tooltipWidth?: number
}

const InputLabel: React.FC<Props> = ({
  isOptional,
  isRequired,
  label,
  tooltip,
  tooltipWidth,
}) => {
  return (
    <div className='flex items-center gap-1'>
      {label}
      {isOptional && <span className='text-sx text-gray-500'>(optional)</span>}
      {isRequired && <span className='text-red'>*</span>}
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
