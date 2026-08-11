import Button from '@/components/base/button/Button'
import Title from '@/components/base/Title'

const ChangePassword = () => {
  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Title
        description='Receive an email containing password set link'
        level={4}
        title='Change Password'
      />

      <div className='flex items-center'>
        <Button
          color='gray'
          icon='lucide:mail'
          label='Send Link'
          variant='outline'
        />
      </div>
    </div>
  )
}

ChangePassword.displayName = 'ChangePassword'
export default ChangePassword
