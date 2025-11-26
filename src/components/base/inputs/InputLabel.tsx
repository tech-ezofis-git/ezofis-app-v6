import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

interface Props {
  className?: string
  label?: string
  optional?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
}

const InputLabel = ({
  className,
  label,
  optional,
  required,
  tooltip,
  tooltipWidth,
}: Props) => {
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-13 font-medium text-gray-11',
        className,
      )}
    >
      {label}
      {optional && <span className='font-normal text-gray-10'>(optional)</span>}
      {required && <span className='text-red-11'>*</span>}
      {tooltip && (
        <Tooltip content={tooltip} position='top-start' width={tooltipWidth}>
          <Icon
            className='hover:text-gray -mt-0.5 cursor-pointer text-gray-9 transition-colors'
            name='tabler:help'
          />
        </Tooltip>
      )}
    </div>
  )
}

InputLabel.displayName = 'InputLabel'
export default InputLabel
