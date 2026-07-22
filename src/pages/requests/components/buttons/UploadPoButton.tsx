import React from 'react'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

interface UploadPoButtonProps {
  label: string
  onClick: () => void
}

const UploadPoButton: React.FC<UploadPoButtonProps> = ({ label, onClick }) => {
  return (
    <Tooltip content='Import PO Data' position='top'>
      <div>
        <IconButton
          aria-label={label}
          color='primary'
          icon='tabler:upload'
          variant='outline'
          onClick={onClick}
        />
      </div>
    </Tooltip>
  )
}

export default UploadPoButton
