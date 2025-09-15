import Icon from '@/components/base/icon/Icon'

interface Props {
  icon: string
}

const IconIllustrated = ({ icon }: Props) => {
  return (
    <div className='flex items-center justify-center'>
      <div className='flex size-24 items-center justify-center rounded-full bg-gray-3'>
        <div className='bg-gray flex size-16 items-center justify-center rounded-full bg-surface text-gray-11 shadow-xs'>
          <Icon className='size-8' name={icon} />
        </div>
      </div>
    </div>
  )
}

IconIllustrated.displayName = 'IconIllustrated'
export default IconIllustrated
