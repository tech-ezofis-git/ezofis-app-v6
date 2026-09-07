import { Button } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'

interface Props {
  onClick: () => void
}

const AddSectionButton = ({ onClick }: Props) => {
  return (
    <div className='group/add-section animate-in fade-in slide-in-from-bottom-2 flex w-full justify-center duration-500'>
      <Button
        className='hover:bg-gray-50 h-10 rounded-lg border border-gray-3 bg-white px-8 text-sm font-bold text-gray-13 shadow-sm transition-all hover:shadow-md'
        color='gray'
        variant='subtle'
        leftSection={
          <Icon
            className='text-gray-13'
            height={16}
            name='lucide:plus'
            width={16}
          />
        }
        onClick={onClick}
      >
        Add Section
      </Button>
    </div>
  )
}

export default AddSectionButton
