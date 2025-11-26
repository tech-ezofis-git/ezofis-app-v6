import avatar from '@/assets/avatar.jpg'
import Avatar from '@/components/base/Avatar'
import Button from '@/components/base/button/Button'
import SectionTitle from '../../SectionTitle'

const ProfilePicture = () => {
  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <SectionTitle
        description='Photos help your teammates recognize you'
        title='Profile Picture'
      />

      <div className='flex gap-6 md:items-center'>
        <Avatar
          className='rounded border border-gray-4'
          image={avatar}
          imageLabel='user picture'
          initials='CV'
          size={60}
        />

        <div className='flex min-h-15 flex-col justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Button
              color='gray'
              icon='tabler:upload'
              label='Upload'
              variant='outline'
            />
            <Button
              color='red'
              icon='tabler:trash'
              label='Remove'
              variant='outline'
            />
          </div>
          <div className='text-12 text-gray-10 md:text-13 md:leading-none'>
            We support PNGs and JPEGs under 5MB
          </div>
        </div>
      </div>
    </div>
  )
}

ProfilePicture.displayName = 'ProfilePicture'
export default ProfilePicture
