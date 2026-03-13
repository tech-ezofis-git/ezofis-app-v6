// import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'
import authUserStore from '@/stores/authUserStore'

const User = () => {
  const API_URI = import.meta.env?.VITE_BASE_URL
  const store = authUserStore?.getState()

  const name = store?.session?.firstName
  const imageUrl = `${API_URI}/user/avatar/${store?.session?.tenantId}/${store?.session?.id}`

  return (
    <div className='flex items-center gap-3 p-2'>
      <Avatar
        image={imageUrl}
        imageLabel='user picture'
        initials='CV'
        size={36}
      />
      <div className='min-w-0 flex-1'>
        <div className='font-medium text-gray-13'>{name}</div>
        <div className='truncate'>{store?.session?.email}</div>
      </div>
    </div>
  )
}

User.displayName = 'User'
export default User
