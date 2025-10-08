import { Radio as Base } from '@mantine/core'
import cn from '@/utils/cn'

interface Props {
  checked?: boolean
}

const InputRadioIndicator = ({ checked }: Props) => {
  return (
    <Base.Indicator
      className='size-4 min-h-4 min-w-4 border-gray-8 bg-transparent transition-colors data-[checked]:border-primary-9 data-[checked]:bg-primary-9'
      classNames={{
        icon: cn('size-1.5', checked ? 'text-white' : 'text-transparent'),
      }}
    />
  )
}

InputRadioIndicator.displayName = 'InputRadioIndicator'
export default InputRadioIndicator
