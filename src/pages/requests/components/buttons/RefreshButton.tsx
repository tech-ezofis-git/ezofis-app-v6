import React from 'react'
import IconButton from '@/components/base/button/IconButton'

interface RefreshButtonProps {
  onClick: () => void
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick }) => {
  return (
    <IconButton
      aria-label='Refresh'
      color='gray'
      icon='tabler:refresh'
      tooltip='Refresh'
      variant='outline'
      onClick={onClick}
    />
  )
}

export default RefreshButton
