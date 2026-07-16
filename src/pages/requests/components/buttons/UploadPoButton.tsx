import React from 'react'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

interface UploadPoButtonProps {
  label: string
  onClick: () => void
}

const UploadPoButton: React.FC<UploadPoButtonProps> = ({ label, onClick }) => {
  return (
    <Tooltip content="Import PO" position="top">
      <div>
        <IconButton
          color="primary"
          icon="tabler:upload"
          aria-label={label}
          variant="outline"
          onClick={onClick}
        />
      </div>
    </Tooltip>
  )
}

export default UploadPoButton
