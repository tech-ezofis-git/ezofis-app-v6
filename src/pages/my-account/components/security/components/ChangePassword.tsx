import Button from '@/components/base/button/Button'
import SectionTitle from '../../SectionTitle'

const ChangePassword = () => {
  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <SectionTitle
        description='Receive an email containing password set link'
        title='Change Password'
      />

      <div className='flex items-center'>
        <Button
          color='gray'
          icon='tabler:mail'
          label='Send Link'
          variant='outline'
        />
      </div>
    </div>
  )
}

ChangePassword.displayName = 'ChangePassword'
export default ChangePassword
