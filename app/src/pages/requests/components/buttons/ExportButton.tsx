import React from 'react'
import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'

interface ExportButtonProps {
  onClick: () => void
}

const ExportButton: React.FC<ExportButtonProps> = ({ onClick }) => {
  const { t } = useLingui()
  return (
    <IconButton
      aria-label={t`Export`}
      color='gray'
      icon='tabler:download'
      tooltip={t`Export`}
      variant='outline'
      onClick={onClick}
    />
  )
}

export default ExportButton
