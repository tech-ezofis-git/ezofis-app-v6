import Button from '@/components/base/button/Button'

const NewForm = () => {
  return (
    <Button
      icon='lucide:plus'
      label='New Form'
      suffixIcon='lucide:chevron-down'
    />
  )
}

NewForm.displayName = 'NewForm'
export default NewForm
