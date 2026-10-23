import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'

type PortalBackButtonProps = {
  label?: string
  onClick: () => void
}

// Borderless arrow, as on the in-app new request header; the label is the
// tooltip and accessible name.
export default function PortalBackButton({
  label,
  onClick,
}: PortalBackButtonProps) {
  const { t } = useLingui()
  const text = label || t`Back`

  return (
    <IconButton
      ariaLabel={text}
      className='-ml-2 shrink-0 text-gray-10 hover:text-gray-12'
      color='gray'
      icon='tabler:arrow-left'
      iconClass='size-4.5'
      tooltip={text}
      variant='ghost'
      onClick={onClick}
    />
  )
}
