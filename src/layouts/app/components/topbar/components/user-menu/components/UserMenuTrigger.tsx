// import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'
import authUserStore from '@/stores/authUserStore'

const UserMenuTrigger = () => {
  const API_URI = import.meta.env?.VITE_BASE_URL
  const store = authUserStore?.getState()

  const imageUrl = `${API_URI}/user/avatar/${store?.session?.tenantId}/${store?.session?.id}`

  return (
    <Avatar
      className='ml-2 cursor-pointer'
      image={imageUrl}
      imageLabel='user picture'
      initials='CV'
    />
  )
}

UserMenuTrigger.displayName = 'UserMenuTrigger'
export default UserMenuTrigger
