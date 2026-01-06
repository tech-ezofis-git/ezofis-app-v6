import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'

const Form = () => {
  const onDropHandler = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    console.log(e.dataTransfer.getData('text'))
  }

  return (
    <div className='mx-auto w-2xl py-4'>
      <div
        className='rounded border border-gray-3 bg-surface p-4'
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropHandler}
      >
        <div className='flex h-20 w-full items-center justify-center text-gray-9'>
          Drag and drop questions from the left-hand side to build your form.
        </div>
      </div>
      <div className='mt-4 flex items-center'>
        <Divider className='flex-1' />
        <Button
          color='gray'
          icon='lucide:plus'
          label='Add Page'
          variant='subtle'
        />
        <Divider className='flex-1' />
      </div>
    </div>
  )
}

Form.displayName = 'Form'
export default Form
