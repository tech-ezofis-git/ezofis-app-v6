import React from 'react'
import IconButton from '@/components/base/button/IconButton'

interface ExportButtonProps {
  onClick: () => void
}

const ExportButton: React.FC<ExportButtonProps> = ({ onClick }) => {
  return (
    <IconButton
      aria-label='Export'
      color='gray'
      icon='tabler:download'
      tooltip='Export'
      variant='outline'
      onClick={onClick}
    />
  )
}

export default ExportButton
