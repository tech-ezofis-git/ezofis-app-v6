// import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'
import authUserStore from '@/stores/authUserStore'

const UserMenuTrigger = () => {
  const API_URI = import.meta.env?.VITE_BASE_URL
  const session = authUserStore((state) => state.session)

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
    <Avatar
      className='ml-2 cursor-pointer'
      image={imageUrl}
      imageLabel='user picture'
      initials={getInitials()}
    />
  )
}

UserMenuTrigger.displayName = 'UserMenuTrigger'
export default UserMenuTrigger
