import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'

interface Props {
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}

/** Sends a finished request back through the workflow (End block setting). */
const ReinitiateRequestButton = ({ disabled, loading, onClick }: Props) => {
  const { t } = useLingui()
  return (
    <Button
      className='animate-in fade-in h-8 rounded-lg text-[13px] font-semibold'
      color='primary'
      disabled={disabled}
      icon='lucide:rotate-ccw'
      iconClass='size-4'
      label={t`Re-initiate`}
      loading={loading}
      size='md'
      variant='outline'
      onClick={onClick}
    />
  )
}

export default ReinitiateRequestButton
