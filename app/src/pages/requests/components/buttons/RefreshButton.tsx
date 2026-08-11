import React from 'react'
import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'

interface RefreshButtonProps {
  onClick: () => void
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick }) => {
  const { t } = useLingui()
  return (
    <IconButton
      aria-label={t`Refresh`}
      color='gray'
      icon='tabler:refresh'
      tooltip={t`Refresh`}
      variant='outline'
      onClick={onClick}
    />
  )
}

export default RefreshButton
