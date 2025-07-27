import Button from '@/components/base/button/Button'

interface Props {
  cancelLabel?: string
  saveButtonColor?: 'primary' | 'red'
  saveLabel?: string
  onCancel?: () => void
  onSave?: () => void
}

const OverlayFooter: React.FC<Props> = ({
  cancelLabel = 'Cancel',
  saveButtonColor = 'primary',
  saveLabel = 'Save',
  onCancel,
  onSave,
}) => {
  return (
    <footer className='flex h-17 items-center justify-end gap-2 border-t border-gray-600/5 px-4'>
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
