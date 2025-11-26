import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'

const User = () => {
  return (
    <div className='flex items-center gap-3 p-2'>
      <Avatar
        image={avatar}
        imageLabel='user picture'
        initials='CV'
        size={32}
      />
      <div className='min-w-0 flex-1'>
        <div className='font-medium text-gray-13'>Charles Vinoth</div>
        <div className='truncate'>charles@ezofis.com</div>
      </div>
    </div>
  )
}

User.displayName = 'User'
export default User
