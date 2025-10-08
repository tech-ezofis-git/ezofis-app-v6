import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'
import Icon from '@/components/base/icon/Icon'

const AuthUser = () => {
  return (
    <div className='mt-2 flex cursor-pointer items-center gap-3 border-t border-gray-3 pt-3'>
      <Avatar
        image={avatar}
        imageLabel='user picture'
        initials='CV'
        size={36}
      />

      <div className='min-w-0 flex-1'>
        <div className='font-medium text-gray-13'>Charles Vinoth</div>
        <div className='truncate'>charles@ezofis.com</div>
      </div>

      <Icon name='tabler:dots-vertical' />
    </div>
  )
}

AuthUser.displayName = 'AuthUser'
export default AuthUser
