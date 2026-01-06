import Button from '@/components/base/button/Button'
import Title from '@/components/base/Title'

const DeleteAccount = () => {
  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <Title
        description='Delete account and all the associated data'
        level={4}
        title='Danger Zone'
      />

      <div className='flex items-center'>
        <Button
          color='red'
          icon='lucide:trash-2'
          label='Delete Account'
          variant='outline'
        />
      </div>
    </div>
  )
}

DeleteAccount.displayName = 'DeleteAccount'
export default DeleteAccount
