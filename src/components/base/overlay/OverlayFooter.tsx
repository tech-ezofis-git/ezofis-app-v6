import { Button } from '@/components/base'

interface Props {
  cancelLabel?: string
  saveButtonColor?: 'primary' | 'red'
  saveLabel?: string
  onCancel?: () => void
  onSave?: () => void
}

const OverlayFooter: React.FC<Props> = ({
  cancelLabel = 'Cancel',
  onCancel,
  onSave,
  saveButtonColor = 'primary',
  saveLabel = 'Save',
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
