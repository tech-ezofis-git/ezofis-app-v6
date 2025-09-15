import Button from '@/components/base/button/Button'

interface Props {
  cancelLabel?: string
  saveButtonColor?: 'primary' | 'red'
  saveLabel?: string
  onCancel?: () => void
  onSave?: () => void
}

const OverlayFooter = ({
  cancelLabel = 'Cancel',
  saveButtonColor = 'primary',
  saveLabel = 'Save',
  onCancel,
  onSave,
}: Props) => {
  return (
    <footer className='flex h-15 items-center justify-end gap-2 border-t border-gray-3 px-4'>
      <Button
        color='gray'
        label={cancelLabel}
        variant='outline'
        onClick={onCancel}
      />
      <Button color={saveButtonColor} label={saveLabel} onClick={onSave} />
    </footer>
  )
}

OverlayFooter.displayName = 'OverlayFooter'
export default OverlayFooter
