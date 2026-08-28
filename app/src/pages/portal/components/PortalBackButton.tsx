import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'

type PortalBackButtonProps = {
  label?: string
  onClick: () => void
}

export default function PortalBackButton({
  label,
  onClick,
}: PortalBackButtonProps) {
  const { t } = useLingui()

  return (
    <Button
      className='rounded-lg border-gray-4 bg-surface'
      color='gray'
      icon='lucide:arrow-left'
      label={label || t`Back`}
      size='sm'
      variant='outline'
      onClick={onClick}
    />
  )
}
