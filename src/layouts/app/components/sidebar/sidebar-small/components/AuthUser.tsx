import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'

const AuthUser = () => {
  return (
    <div className='flex size-15 shrink-0 items-center justify-center'>
      <Avatar image={avatar} imageLabel='user picture' initials='CV' />
    </div>
  )
}

AuthUser.displayName = 'AuthUser'
export default AuthUser
