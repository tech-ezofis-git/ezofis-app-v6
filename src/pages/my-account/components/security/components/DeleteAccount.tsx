import Button from '@/components/base/button/Button'
import SectionTitle from '../../SectionTitle'

const DeleteAccount = () => {
  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <SectionTitle
        description='Delete account and all the associated data'
        title='Danger Zone'
      />

      <div className='flex items-center'>
        <Button
          color='red'
          icon='tabler:trash'
          label='Delete Account'
          variant='outline'
        />
      </div>
    </div>
  )
}

DeleteAccount.displayName = 'DeleteAccount'
export default DeleteAccount
