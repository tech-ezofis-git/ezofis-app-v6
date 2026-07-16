import React from 'react'
import IconButton from '@/components/base/button/IconButton'

interface RefreshButtonProps {
  onClick: () => void
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick }) => {
  return (
    <IconButton
      color="gray"
      icon="tabler:refresh"
      aria-label="Refresh"
      variant="outline"
      onClick={onClick}
    />
  )
}

export default RefreshButton
