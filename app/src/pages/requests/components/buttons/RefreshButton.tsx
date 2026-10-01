import { useLingui } from '@lingui/react/macro'
import React, { useState } from 'react'
import IconButton from '@/components/base/button/IconButton'

interface RefreshButtonProps {
  loading?: boolean
  onClick: () => void | Promise<void>
}

const RefreshButton: React.FC<RefreshButtonProps> = ({
  loading: externalLoading,
  onClick,
}) => {
  const { t } = useLingui()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleClick = async () => {
    if (isRefreshing) return
    try {
      setIsRefreshing(true)
      await Promise.resolve(onClick())
    } finally {
      setIsRefreshing(false)
    }
  }

  const isLoading = Boolean(externalLoading || isRefreshing)

  return (
    <IconButton
      aria-label={t`Refresh`}
      color='gray'
      disabled={isLoading}
      icon='tabler:refresh'
      iconClass={isLoading ? 'animate-spin' : undefined}
      tooltip={t`Refresh`}
      variant='outline'
      onClick={() => void handleClick()}
    />
  )
}

export default RefreshButton
