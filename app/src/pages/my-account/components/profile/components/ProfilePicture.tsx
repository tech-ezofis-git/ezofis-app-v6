import Avatar from '@/components/base/Avatar'
import Button from '@/components/base/button/Button'
import Title from '@/components/base/Title'
import authUserStore from '@/stores/authUserStore'
import useProfileImage from '@/hooks/useProfileImage'

const ProfilePicture = () => {
  const session = authUserStore((state) => state.session)
  const imageUrl = useProfileImage()

  const getInitials = () => {
    if (!session) return 'U'
    const name =
      session.name ||
      (session.firstName
        ? `${session.firstName} ${session.lastName || ''}`.trim()
        : '')
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Title
        description='Photos help your teammates recognize you'
        level={4}
        title='Profile Picture'
      />

      <div className='flex gap-6 md:items-center'>
        <Avatar
          className='rounded border border-gray-4'
          image={imageUrl}
          imageLabel='user picture'
          initials={getInitials()}
          size={60}
        />

        <div className='flex min-h-15 flex-col justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Button
              color='gray'
              icon='lucide:upload'
              label='Upload'
              variant='outline'
            />
            <Button
              color='red'
              icon='lucide:trash-2'
              label='Remove'
              variant='outline'
            />
          </div>
          <div className='text-xs text-gray-10 md:text-13 md:leading-none'>
            We support PNGs and JPEGs under 5MB
          </div>
        </div>
      </div>
    </div>
  )
}

ProfilePicture.displayName = 'ProfilePicture'
export default ProfilePicture
