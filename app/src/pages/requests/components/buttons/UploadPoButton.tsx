import React from 'react'
import { useLingui } from '@lingui/react/macro'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'

interface UploadPoButtonProps {
  label: string
  onClick: () => void
}

const UploadPoButton: React.FC<UploadPoButtonProps> = ({ label, onClick }) => {
  const { t } = useLingui()
  return (
    <Tooltip content={t`Import PO Data`} position='top'>
      <div>
        <IconButton
          aria-label={label}
          color='primary'
          icon='tabler:table-import'
          variant='outline'
          onClick={onClick}
        />
      </div>
    </Tooltip>
  )
}

export default UploadPoButton
