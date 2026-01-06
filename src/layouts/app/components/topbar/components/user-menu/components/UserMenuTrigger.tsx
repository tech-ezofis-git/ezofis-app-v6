import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'

const UserMenuTrigger = () => {
  return (
    <Avatar
      className='ml-4 cursor-pointer'
      image={avatar}
      imageLabel='user picture'
      initials='CV'
    />
  )
}

UserMenuTrigger.displayName = 'UserMenuTrigger'
export default UserMenuTrigger
