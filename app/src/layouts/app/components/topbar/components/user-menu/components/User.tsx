// import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'
import authUserStore from '@/stores/authUserStore'

const User = () => {
  const API_URI = import.meta.env?.VITE_BASE_URL
  const session = authUserStore((state) => state.session)

  const name =
    session?.firstName ||
    session?.name ||
    session?.email?.split('@')[0] ||
    'User'
  const imageUrl = session
    ? `${API_URI}/user/avatar/${session.tenantId}/${session.id}`
    : ''

  const getInitials = () => {
    if (!session) return 'U'
    const fullName =
      session.name ||
      (session.firstName
        ? `${session.firstName} ${session.lastName || ''}`.trim()
        : '')
    if (!fullName) return 'U'
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className='flex items-center gap-3 p-2'>
      <Avatar
        image={imageUrl}
        imageLabel='user picture'
        initials={getInitials()}
        size={36}
      />
      <div className='min-w-0 flex-1'>
        <div className='font-medium text-gray-13'>{name}</div>
        <div className='truncate'>{session?.email}</div>
      </div>
    </div>
  )
}

User.displayName = 'User'
export default User
