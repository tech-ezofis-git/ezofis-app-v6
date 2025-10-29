import Button from '@/components/base/button/Button'
import OverlayFooterWrapper from './OverlayFooterWrapper'

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
    <OverlayFooterWrapper className='justify-end gap-2'>
      <Button
        color='gray'
        label={cancelLabel}
        variant='outline'
        onClick={onCancel}
      />
      <Button color={saveButtonColor} label={saveLabel} onClick={onSave} />
    </OverlayFooterWrapper>
  )
}

OverlayFooter.displayName = 'OverlayFooter'
export default OverlayFooter
