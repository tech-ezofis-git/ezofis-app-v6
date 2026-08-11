import Button from '@/components/base/button/Button'

interface Props {
  isPrimaryDisabled?: boolean
  isPrimaryLoading?: boolean
  isSecondaryDisabled?: boolean
  primaryLabel?: string
  secondaryLabel?: string
  onClose?: () => void
  onPrimaryClick?: () => void
}

const Footer = ({
  isPrimaryDisabled = false,
  // secondaryLabel = "Back",
  isPrimaryLoading = false,
  primaryLabel = 'Submit',
  onClose,
  onPrimaryClick,
  // isSecondaryDisabled = false,
}: Props) => {
  return (
    <div className='bg-slate-50 flex items-center justify-between border-t border-gray-3 px-4 py-3'>
      {/* Right: actions */}
      <div className='ml-auto flex items-center gap-2'>
        {/* <Button
                    label={secondaryLabel}
                    variant="outline"
                    size="md"
                    onClick={onClose}
                    disabled={isSecondaryDisabled || isPrimaryLoading}
                /> */}
        <Button
          disabled={isPrimaryDisabled || isPrimaryLoading}
          label={primaryLabel}
          loading={isPrimaryLoading}
          size='md'
          variant='solid'
          onClick={onPrimaryClick ?? onClose}
        />
      </div>
    </div>
  )
}

Footer.displayName = 'Footer'
export default Footer
